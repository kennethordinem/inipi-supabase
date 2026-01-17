/**
 * API route to remove seats from an existing booking
 * Only allows removing seats that were added after the original booking
 * Processes refunds via Stripe for the removed seats
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
    const { bookingId, seatsToRemove, userId } = await request.json();

    if (!bookingId || !seatsToRemove || !userId) {
      return NextResponse.json(
        { error: 'Booking ID, seats to remove, and user ID are required' },
        { status: 400 }
      );
    }

    if (seatsToRemove < 1) {
      return NextResponse.json(
        { error: 'Must remove at least 1 seat' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    // Get Stripe instance
    const stripe = await getStripeInstance();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        sessions!session_id(id, name, date, time, max_participants, current_participants)
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

    // Check timing - must be at least 3 hours before session
    const session = booking.sessions;
    const sessionDateTime = new Date(`${session.date}T${session.time}`);
    const hoursUntil = (sessionDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntil < 3) {
      return NextResponse.json(
        { error: 'Du skal fjerne pladser mindst 3 timer før sessionen starter' },
        { status: 400 }
      );
    }

    // Get all additional seat payments (LIFO order - newest first)
    const { data: payments, error: paymentsError } = await supabase
      .from('booking_payments')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('payment_type', 'additional_seats')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('[Remove-Seats] Error fetching payments:', paymentsError);
      return NextResponse.json(
        { error: 'Could not fetch payment history' },
        { status: 500 }
      );
    }

    // Calculate total seats that can be removed (only added seats)
    const totalAddedSeats = payments?.reduce((sum, p) => sum + (p.seats_count || 0), 0) || 0;

    if (totalAddedSeats === 0) {
      return NextResponse.json(
        { error: 'Kan kun fjerne pladser der blev tilføjet efter den oprindelige booking' },
        { status: 400 }
      );
    }

    if (seatsToRemove > totalAddedSeats) {
      return NextResponse.json(
        { error: `Kan kun fjerne op til ${totalAddedSeats} plads${totalAddedSeats > 1 ? 'er' : ''}` },
        { status: 400 }
      );
    }

    if (seatsToRemove >= booking.spots) {
      return NextResponse.json(
        { error: 'Kan ikke fjerne alle pladser. Brug "Aflys Booking" i stedet.' },
        { status: 400 }
      );
    }

    // Process refunds in LIFO order (newest payments first)
    let seatsRemaining = seatsToRemove;
    const refundedPayments = [];

    for (const payment of payments || []) {
      if (seatsRemaining <= 0) break;

      const seatsInThisPayment = payment.seats_count || 0;
      const seatsToRefundFromThis = Math.min(seatsRemaining, seatsInThisPayment);
      const refundAmount = (payment.amount / seatsInThisPayment) * seatsToRefundFromThis;

      // Issue Stripe refund
      if (payment.stripe_payment_intent_id) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: payment.stripe_payment_intent_id,
            amount: Math.round(refundAmount * 100), // Convert to øre
            reason: 'requested_by_customer',
            metadata: {
              bookingId: bookingId,
              seatsRemoved: seatsToRefundFromThis.toString(),
              userId: userId,
            },
          });

          refundedPayments.push({
            paymentId: payment.id,
            refundId: refund.id,
            amount: refundAmount,
            seats: seatsToRefundFromThis,
          });

          seatsRemaining -= seatsToRefundFromThis;
        } catch (stripeError: any) {
          console.error('[Remove-Seats] Stripe refund error:', stripeError);
          return NextResponse.json(
            { error: `Refund fejlede: ${stripeError.message}` },
            { status: 500 }
          );
        }
      }
    }

    // Update booking with new seat count
    const newTotalSeats = booking.spots - seatsToRemove;
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        spots: newTotalSeats,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[Remove-Seats] Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      );
    }

    // Decrement session participants count
    const { error: participantsError } = await supabase.rpc('decrement_session_participants', {
      session_id: session.id,
      decrement_by: seatsToRemove,
    });

    if (participantsError) {
      console.error('[Remove-Seats] Error updating participants:', participantsError);
    }

    return NextResponse.json({
      success: true,
      bookingId: bookingId,
      seatsRemoved: seatsToRemove,
      newTotalSeats: newTotalSeats,
      refundedPayments: refundedPayments,
      message: `${seatsToRemove} plads${seatsToRemove > 1 ? 'er' : ''} fjernet og refunderet`,
    });

  } catch (error: any) {
    console.error('[Remove-Seats] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove seats' },
      { status: 500 }
    );
  }
}
