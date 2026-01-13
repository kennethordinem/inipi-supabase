/**
 * API route to complete adding seats after successful Stripe payment
 * Updates the booking, creates invoice, and tracks the payment
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
    const { paymentIntentId, bookingId, userId } = await request.json();

    if (!paymentIntentId || !bookingId || !userId) {
      return NextResponse.json(
        { error: 'Payment intent ID, booking ID, and user ID are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    // Get Stripe instance from database config
    const stripe = await getStripeInstance();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Verify payment intent is successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    const additionalSeats = parseInt(paymentIntent.metadata.additionalSeats || '0');
    const sessionId = paymentIntent.metadata.sessionId;
    const themeName = paymentIntent.metadata.themeName || '';

    // Get current booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        sessions(name, date, time, location)
      `)
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const session = booking.sessions;
    const newTotalSeats = booking.spots + additionalSeats;
    const amount = paymentIntent.amount / 100; // Convert from øre to DKK

    // Update booking with new seat count
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        spots: newTotalSeats,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[Complete-Add-Seats] Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      );
    }

    // Update session participants count
    const { error: participantsError } = await supabase.rpc('increment_session_participants', {
      session_id: sessionId,
      increment_by: additionalSeats,
    });

    if (participantsError) {
      console.error('[Complete-Add-Seats] Error updating participants:', participantsError);
    }

    // Create invoice for the additional seats
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const sessionDateTime = `${session.date} kl. ${session.time}`;

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        booking_id: bookingId,
        invoice_number: invoiceNumber,
        amount: amount.toString(),
        payment_method: 'stripe',
        payment_status: 'paid',
        items: [
          {
            description: `Ekstra pladser til ${themeName}`,
            session: session.name,
            date: sessionDateTime,
            location: session.location || 'INIPI',
            quantity: additionalSeats,
            unitPrice: amount / additionalSeats,
            total: amount,
          }
        ],
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('[Complete-Add-Seats] Error creating invoice:', invoiceError);
    }

    // Track the payment in booking_payments table
    const { error: paymentTrackError } = await supabase
      .from('booking_payments')
      .insert({
        booking_id: bookingId,
        stripe_payment_intent_id: paymentIntentId,
        amount: amount,
        seats_count: additionalSeats,
        payment_type: 'additional_seats',
        invoice_id: invoice?.id || null,
      });

    if (paymentTrackError) {
      console.error('[Complete-Add-Seats] Error tracking payment:', paymentTrackError);
    }

    // Send confirmation email (async, don't wait)
    // Reuse the private event confirmation email since this is for a private event
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://inipi.dk'}/api/email/private-event-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: bookingId }),
    }).catch(err => console.error('Error sending confirmation email:', err));

    return NextResponse.json({
      success: true,
      bookingId: bookingId,
      newTotalSeats: newTotalSeats,
      additionalSeats: additionalSeats,
      invoiceId: invoice?.id,
      invoiceNumber: invoiceNumber,
    });

  } catch (error: any) {
    console.error('[Complete-Add-Seats] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete adding seats' },
      { status: 500 }
    );
  }
}
