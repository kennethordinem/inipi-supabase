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

    // ============================================
    // PART 1: Auto-release GUSMESTER SPOTS (always 3 hours before)
    // ============================================
    const gusmesterThreshold = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    const { data: gusmesterSpots, error: gusmesterError } = await supabase
      .from('guest_spots')
      .select(`
        id,
        spot_type,
        host_employee_id,
        sessions!inner(
          id,
          name,
          start_time
        )
      `)
      .eq('status', 'reserved_for_host')
      .eq('spot_type', 'gusmester_spot')
      .lte('sessions.start_time', gusmesterThreshold.toISOString())
      .gte('sessions.start_time', now.toISOString());

    if (gusmesterError) {
      console.error('[Auto-Release] Error fetching gusmester spots:', gusmesterError);
    } else if (gusmesterSpots && gusmesterSpots.length > 0) {
      for (const spot of gusmesterSpots) {
        const session = Array.isArray(spot.sessions) ? spot.sessions[0] : spot.sessions;
        if (!session) continue;

        // Release gusmester spot (no points awarded - this is automatic)
        const { error: updateError } = await supabase
          .from('guest_spots')
          .update({ status: 'released_to_public' })
          .eq('id', spot.id);

        if (updateError) {
          console.error(`[Auto-Release] Error releasing gusmester spot ${spot.id}:`, updateError);
          continue;
        }

        releasedSpots.push({
          sessionId: session.id,
          sessionName: session.name,
          spotType: 'gusmester_spot',
          pointsAwarded: 0,
          reason: 'Automatic 3-hour release',
        });

        console.log(`[Auto-Release] Released gusmester spot for ${session.name} (no points)`);
      }
    }

    // ============================================
    // PART 2: Auto-release GUEST SPOTS (based on employee preference)
    // ============================================
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
          spot_type,
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
        .eq('spot_type', 'guest_spot')
        .eq('employees.auto_release_guest_spot', preference)
        .lte('sessions.start_time', thresholdTime.toISOString())
        .gte('sessions.start_time', now.toISOString()); // Only future sessions

      if (spotsError) {
        console.error(`[Auto-Release] Error fetching guest spots for ${preference}:`, spotsError);
        continue;
      }

      if (!spotsToRelease || spotsToRelease.length === 0) {
        console.log(`[Auto-Release] No guest spots to release for ${preference}`);
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
          console.error(`[Auto-Release] Error releasing guest spot ${guestSpot.id}:`, updateError);
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
          spotType: 'guest_spot',
          pointsAwarded: pointsToAdd,
          preference,
        });

        console.log(`[Auto-Release] Released guest spot for ${employee.name} on ${session.name} (${pointsToAdd} points)`);
      }
    }

    // ============================================
    // PART 3: Award points to gusmesters who HOSTED completed sessions
    // ============================================
    const awardedPoints: any[] = [];

    // Find sessions that have just started (within the last hour) that have a gusmester assigned
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const { data: completedSessions, error: completedError } = await supabase
      .from('sessions')
      .select(`
        id,
        name,
        start_time,
        session_employees!inner(
          employee_id,
          employees!inner(
            id,
            name,
            points
          )
        )
      `)
      .lte('start_time', now.toISOString()) // Session has started
      .gte('start_time', oneHourAgo.toISOString()); // Started within last hour

    if (completedError) {
      console.error('[Award-Points] Error fetching completed sessions:', completedError);
    } else if (completedSessions && completedSessions.length > 0) {
      for (const session of completedSessions) {
        const sessionEmployees = Array.isArray(session.session_employees) ? session.session_employees : [session.session_employees];
        
        for (const se of sessionEmployees) {
          const employee = Array.isArray(se.employees) ? se.employees[0] : se.employees;
          if (!employee) continue;

          // Check if we already awarded points for this session
          const { data: existingAward } = await supabase
            .from('employee_points_history')
            .select('id')
            .eq('employee_id', employee.id)
            .eq('related_session_id', session.id)
            .eq('reason', 'Hosted session')
            .single();

          if (existingAward) {
            // Already awarded, skip
            continue;
          }

          // Award 150 points for hosting
          const { error: pointsError } = await supabase.rpc('increment_employee_points', {
            employee_id: employee.id,
            points_to_add: 150,
          });

          if (pointsError) {
            console.error(`[Award-Points] Error awarding points to ${employee.id}:`, pointsError);
            continue;
          }

          // Log points history
          await supabase
            .from('employee_points_history')
            .insert({
              employee_id: employee.id,
              amount: 150,
              reason: 'Hosted session',
              related_session_id: session.id,
            });

          awardedPoints.push({
            sessionId: session.id,
            sessionName: session.name,
            employeeId: employee.id,
            employeeName: employee.name,
            pointsAwarded: 150,
          });

          console.log(`[Award-Points] Awarded 150 points to ${employee.name} for hosting ${session.name}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      releasedCount: releasedSpots.length,
      released: releasedSpots,
      pointsAwardedCount: awardedPoints.length,
      pointsAwarded: awardedPoints,
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

