/**
 * API route to add seats to an existing private event booking
 * Creates a new Stripe payment for the additional seats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripeInstance } from '@/lib/stripe-server';

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
    const { bookingId, additionalSeats, userId } = await request.json();

    if (!bookingId || !additionalSeats || !userId) {
      return NextResponse.json(
        { error: 'Booking ID, additional seats, and user ID are required' },
        { status: 400 }
      );
    }

    if (additionalSeats < 1) {
      return NextResponse.json(
        { error: 'Additional seats must be at least 1' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    // Get Stripe instance from database config
    const stripe = await getStripeInstance();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please configure Stripe in admin settings.' },
        { status: 500 }
      );
    }

    // Get booking details with session and theme info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        sessions!session_id(
          id,
          name,
          date,
          time,
          max_participants,
          current_participants,
          price
        ),
        themes:selected_theme_id(
          id,
          name,
          price_per_seat
        )
      `)
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or you do not have permission' },
        { status: 404 }
      );
    }

    const session = booking.sessions;
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if there's enough space
    const availableSpots = session.max_participants - session.current_participants;
    if (additionalSeats > availableSpots) {
      return NextResponse.json(
        { error: `Only ${availableSpots} seats available` },
        { status: 400 }
      );
    }

    // Calculate price for additional seats
    // For private events: use theme price per seat
    // For Fyraftensgus: use session price
    let pricePerSeat = session.price || 0;
    let sessionTypeName = session.name;
    
    if (booking.selected_theme_id) {
      // Private event - get theme pricing
      const theme = Array.isArray(booking.themes) ? booking.themes[0] : booking.themes;
      if (theme) {
        pricePerSeat = theme.price_per_seat || pricePerSeat;
        sessionTypeName = theme.name;
      }
    }
    
    const totalAmount = pricePerSeat * additionalSeats;

    // Create Stripe payment intent with explicit payment methods
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to øre
      currency: 'dkk',
      // Only card and mobilepay - confirmed working in Dashboard
      payment_method_types: ['card', 'mobilepay'],
      metadata: {
        bookingId: booking.id,
        sessionId: session.id,
        userId: userId,
        additionalSeats: additionalSeats.toString(),
        paymentType: 'additional_seats',
        themeName: sessionTypeName,
        isPrivateEvent: booking.selected_theme_id ? 'true' : 'false',
      },
      description: `Tilføj ${additionalSeats} pladser til ${sessionTypeName} - ${session.name}`,
    });

    // Return payment intent client secret for frontend
    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
      additionalSeats,
      pricePerSeat,
    });

  } catch (error: any) {
    console.error('[Add-Seats] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment for additional seats' },
      { status: 500 }
    );
  }
}
