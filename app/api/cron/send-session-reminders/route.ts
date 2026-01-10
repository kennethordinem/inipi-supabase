import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Session-Reminders] Starting session reminder job...');

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    // Find all bookings for sessions starting in 23-24 hours
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        spots,
        confirmation_number,
        sessions!inner(
          id,
          name,
          date,
          time,
          location,
          start_time
        )
      `)
      .eq('status', 'confirmed')
      .eq('payment_status', 'paid')
      .gte('sessions.start_time', in23Hours.toISOString())
      .lte('sessions.start_time', in24Hours.toISOString());

    if (bookingsError) {
      console.error('[Session-Reminders] Error fetching bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      console.log('[Session-Reminders] No bookings found for reminder window');
      return NextResponse.json({
        success: true,
        message: 'No reminders to send',
        remindersSent: 0,
      });
    }

    console.log(`[Session-Reminders] Found ${bookings.length} bookings to send reminders for`);

    const remindersSent: any[] = [];
    const errors: any[] = [];

    for (const booking of bookings) {
      try {
        // TypeScript fix: sessions is a single object, not an array
        const session = Array.isArray(booking.sessions) ? booking.sessions[0] : booking.sessions;
        
        if (!session) {
          console.error(`[Session-Reminders] No session found for booking ${booking.id}`);
          continue;
        }

        // Check if we already sent a reminder for this booking
        // We can use a simple flag or check if email was sent in last 25 hours
        const { data: existingReminder } = await supabase
          .from('email_log')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('email_type', 'session_reminder')
          .gte('created_at', new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString())
          .single();

        if (existingReminder) {
          console.log(`[Session-Reminders] Already sent reminder for booking ${booking.id}`);
          continue;
        }

        // Send reminder email
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://inipi.dk'}/api/email/session-reminder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: booking.id }),
        });

        if (!response.ok) {
          throw new Error(`Email API returned ${response.status}`);
        }

        // Log that we sent the reminder
        await supabase
          .from('email_log')
          .insert({
            booking_id: booking.id,
            user_id: booking.user_id,
            email_type: 'session_reminder',
            sent_at: now.toISOString(),
          });

        remindersSent.push({
          bookingId: booking.id,
          sessionName: session.name,
          sessionTime: session.start_time,
        });

        console.log(`[Session-Reminders] Sent reminder for booking ${booking.id} - ${session.name}`);
      } catch (error: any) {
        console.error(`[Session-Reminders] Error sending reminder for booking ${booking.id}:`, error);
        errors.push({
          bookingId: booking.id,
          error: error.message,
        });
      }
    }

    console.log(`[Session-Reminders] Job complete. Sent ${remindersSent.length} reminders, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      remindersSent: remindersSent.length,
      errors: errors.length,
      details: {
        sent: remindersSent,
        errors,
      },
    });
  } catch (error: any) {
    console.error('[Session-Reminders] Job failed:', error);
    return NextResponse.json(
      { error: error.message || 'Job failed' },
      { status: 500 }
    );
  }
}
