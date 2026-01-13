/**
 * API route to add seats to an existing private event booking
 * Creates a new Stripe payment for the additional seats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

function getStripeClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    throw new Error('Missing Stripe secret key');
  }
  
  return new Stripe(stripeSecretKey, {
    apiVersion: '2025-12-15.clover',
  });
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
    const stripe = getStripeClient();

    // Get booking details with session and theme info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        sessions(
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

    // Verify this is a private event (has theme)
    if (!booking.selected_theme_id) {
      return NextResponse.json(
        { error: 'Can only add seats to private events' },
        { status: 400 }
      );
    }

    const session = booking.sessions;
    const theme = Array.isArray(booking.themes) ? booking.themes[0] : booking.themes;

    if (!session || !theme) {
      return NextResponse.json(
        { error: 'Session or theme not found' },
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
    const pricePerSeat = theme.price_per_seat || session.price || 0;
    const totalAmount = pricePerSeat * additionalSeats;

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to øre
      currency: 'dkk',
      metadata: {
        bookingId: booking.id,
        sessionId: session.id,
        userId: userId,
        additionalSeats: additionalSeats.toString(),
        paymentType: 'additional_seats',
        themeName: theme.name,
      },
      description: `Tilføj ${additionalSeats} pladser til ${theme.name} - ${session.name}`,
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
