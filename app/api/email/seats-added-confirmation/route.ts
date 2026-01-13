import { NextRequest, NextResponse } from 'next/server';
import { sendSeatsAddedConfirmation } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Seats-Added-Email] Received request');
    const { bookingId, additionalSeats, amount, invoiceNumber } = await request.json();
    console.log('[Seats-Added-Email] Payload:', { bookingId, additionalSeats, amount, invoiceNumber });

    if (!bookingId || !additionalSeats || !amount || !invoiceNumber) {
      console.error('[Seats-Added-Email] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    console.log('[Seats-Added-Email] Fetching booking details...');

    // Get booking details with session and theme info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        sessions(name, date, time, location),
        themes(name, price_per_seat)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('[Seats-Added-Email] Booking not found:', bookingError);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    console.log('[Seats-Added-Email] Booking found, fetching user info...');
    const session = booking.sessions;
    const theme = booking.themes;

    // Get user info - check both profiles and employees tables
    let userEmail: string | null = null;
    let userName: string | null = null;

    // Try profiles table first
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', booking.user_id)
      .single();

    if (profile && profile.email) {
      userEmail = profile.email;
      userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    } else {
      // Try employees table
      const { data: employee } = await supabase
        .from('employees')
        .select('email, name')
        .eq('id', booking.user_id)
        .single();

      if (employee && employee.email) {
        userEmail = employee.email;
        userName = employee.name;
      }
    }

    if (!userEmail) {
      console.error('[Seats-Added-Email] No email found for user:', booking.user_id);
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    console.log('[Seats-Added-Email] User email found:', userEmail);
    console.log('[Seats-Added-Email] Sending email...');

    // Format date
    const date = new Date(session.date);
    const formattedDate = date.toLocaleDateString('da-DK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send email
    await sendSeatsAddedConfirmation({
      to: userEmail,
      userName: userName || 'Medlem',
      themeName: theme.name,
      sessionName: session.name,
      sessionDate: formattedDate,
      sessionTime: session.time,
      location: session.location || 'INIPI Amagerstrand',
      additionalSeats: additionalSeats,
      newTotalSeats: booking.spots,
      amount: amount,
      pricePerSeat: amount / additionalSeats,
      invoiceNumber: invoiceNumber,
    });

    console.log('[Seats-Added-Email] Email sent successfully!');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Seats-Added-Email] Error sending seats added confirmation email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
