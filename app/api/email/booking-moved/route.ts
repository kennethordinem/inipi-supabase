import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendBookingMoved } from '@/lib/email';
import { format, parseISO } from 'date-fns';
import { da } from 'date-fns/locale';

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
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('[Booking-Moved] Error fetching booking:', bookingError);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Get old session details
    const { data: oldSession, error: oldSessionError } = await supabase
      .from('sessions')
      .select('id, name, date, time, location')
      .eq('id', booking.old_session_id)
      .single();

    // Get new session details
    const { data: newSession, error: newSessionError } = await supabase
      .from('sessions')
      .select('id, name, date, time, location')
      .eq('id', booking.session_id)
      .single();

    if (newSessionError || !newSession) {
      console.error('[Booking-Moved] Error fetching new session:', newSessionError);
      return NextResponse.json({ error: 'New session not found' }, { status: 404 });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('id', booking.user_id)
      .single();

    if (profileError || !userProfile || !userProfile.email) {
      console.error('[Booking-Moved] Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const userName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Kunde';

    // Send email
    await sendBookingMoved({
      to: userProfile.email,
      userName,
      oldSessionName: oldSession?.name || 'Session',
      oldSessionDate: oldSession?.date ? format(parseISO(oldSession.date), 'd. MMMM yyyy', { locale: da }) : '',
      oldSessionTime: oldSession?.time || '',
      newSessionName: newSession?.name || 'Session',
      newSessionDate: newSession?.date ? format(parseISO(newSession.date), 'd. MMMM yyyy', { locale: da }) : '',
      newSessionTime: newSession?.time || '',
      location: newSession?.location || 'Havkajakvej, Amagerstrand',
      spots: booking.spots,
      reason: booking.admin_reason || 'Flyttet af personalet',
      bookingId: booking.id
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Booking-Moved] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
