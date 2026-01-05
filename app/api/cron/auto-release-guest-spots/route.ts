/**
 * Cron job to auto-release guest spots based on gusmester preferences
 * This should be called periodically (e.g., every hour) by a scheduler like Vercel Cron or external cron service
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const now = new Date();
    const releasedSpots: any[] = [];

    // Get system settings for configurable hours
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['auto_release_3_hours', 'auto_release_24_hours']);

    const hoursConfig = {
      '3_hours': parseInt(settings?.find(s => s.key === 'auto_release_3_hours')?.value || '3'),
      '24_hours': parseInt(settings?.find(s => s.key === 'auto_release_24_hours')?.value || '24'),
    };

    // Process each auto-release preference type
    for (const [preference, hours] of Object.entries(hoursConfig)) {
      const thresholdTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

      // Find guest spots that should be auto-released
      const { data: spotsToRelease, error: spotsError } = await supabase
        .from('guest_spots')
        .select(`
          id,
          status,
          host_employee_id,
          sessions!inner(
            id,
            name,
            start_time
          ),
          employees!guest_spots_host_employee_id_fkey(
            id,
            name,
            email,
            auto_release_guest_spot
          )
        `)
        .eq('status', 'reserved_for_host')
        .eq('employees.auto_release_guest_spot', preference)
        .lte('sessions.start_time', thresholdTime.toISOString())
        .gte('sessions.start_time', now.toISOString()); // Only future sessions

      if (spotsError) {
        console.error(`[Auto-Release] Error fetching spots for ${preference}:`, spotsError);
        continue;
      }

      if (!spotsToRelease || spotsToRelease.length === 0) {
        console.log(`[Auto-Release] No spots to release for ${preference}`);
        continue;
      }

      // Release each guest spot
      for (const guestSpot of spotsToRelease) {
        const session = Array.isArray(guestSpot.sessions) ? guestSpot.sessions[0] : guestSpot.sessions;
        const employee = Array.isArray(guestSpot.employees) ? guestSpot.employees[0] : guestSpot.employees;
        
        if (!session || !employee) continue;

        // Calculate if they should earn points (3+ hours before session)
        const hoursUntilSession = (new Date(session.start_time).getTime() - now.getTime()) / (1000 * 60 * 60);
        const earnPoints = hoursUntilSession >= 3;
        const pointsToAdd = earnPoints ? 150 : 0;

        // Update guest spot status
        const { error: updateError } = await supabase
          .from('guest_spots')
          .update({ status: 'released_to_public' })
          .eq('id', guestSpot.id);

        if (updateError) {
          console.error(`[Auto-Release] Error releasing spot ${guestSpot.id}:`, updateError);
          continue;
        }

        // Award points if applicable
        if (earnPoints) {
          // Use increment to avoid race conditions
          const { error: pointsError } = await supabase.rpc('increment_employee_points', {
            employee_id: employee.id,
            points_to_add: pointsToAdd,
          });

          if (pointsError) {
            console.error(`[Auto-Release] Error awarding points to ${employee.id}:`, pointsError);
          }

          // Log points history
          await supabase
            .from('employee_points_history')
            .insert({
              employee_id: employee.id,
              amount: pointsToAdd,
              reason: `Automatisk frigivelse af gæsteplads for ${session.name}`,
              related_session_id: session.id,
            });
        }

        releasedSpots.push({
          sessionId: session.id,
          sessionName: session.name,
          employeeName: employee.name,
          pointsAwarded: pointsToAdd,
          preference,
        });

        console.log(`[Auto-Release] Released spot for ${employee.name} on ${session.name} (${pointsToAdd} points)`);
      }
    }

    return NextResponse.json({
      success: true,
      releasedCount: releasedSpots.length,
      released: releasedSpots,
      timestamp: now.toISOString(),
    });

  } catch (error: any) {
    console.error('[Auto-Release] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to auto-release guest spots' },
      { status: 500 }
    );
  }
}

// Allow POST as well for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

