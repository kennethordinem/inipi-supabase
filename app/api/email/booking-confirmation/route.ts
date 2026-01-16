import { NextRequest, NextResponse } from 'next/server';
import { sendBookingConfirmation } from '@/lib/email';
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
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get booking details with session info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        sessions!session_id(name, date, time, location, price)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const session = booking.sessions;

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
      console.error('No email found for user:', booking.user_id);
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    // Format date
    const date = new Date(session.date);
    const formattedDate = date.toLocaleDateString('da-DK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send email
    await sendBookingConfirmation({
      to: userEmail,
      userName: userName || 'Medlem',
      sessionName: session.name,
      sessionDate: formattedDate,
      sessionTime: session.time.substring(0, 5),
      location: session.location,
      spots: booking.spots,
      price: session.price * booking.spots,
      paymentMethod: booking.payment_method === 'punch_card' ? 'Klippekort' : `${session.price * booking.spots} DKK`,
      bookingId: booking.confirmation_number || booking.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending booking confirmation email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

