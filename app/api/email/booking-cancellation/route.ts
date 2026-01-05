import { NextRequest, NextResponse } from 'next/server';
import { sendBookingCancellation } from '@/lib/email';
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
    const { bookingId, refundInfo, punchCardAdded } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get booking details with session and user info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        sessions(name, date, time),
        profiles(email, first_name, last_name)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const session = booking.sessions;
    const profile = booking.profiles;

    // Format date
    const date = new Date(session.date);
    const formattedDate = date.toLocaleDateString('da-DK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send email
    await sendBookingCancellation({
      to: profile.email,
      userName: `${profile.first_name} ${profile.last_name}`,
      sessionName: session.name,
      sessionDate: formattedDate,
      sessionTime: session.time,
      refundInfo: refundInfo || 'Din betaling vil blive refunderet',
      punchCardAdded: punchCardAdded || false,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending cancellation email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

