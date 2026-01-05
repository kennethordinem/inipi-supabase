import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { getStripeInstance } from '@/lib/stripe-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Get webhook secret from database
    const { data: config } = await supabase
      .from('stripe_config')
      .select('webhook_secret')
      .single();

    if (!config || !config.webhook_secret) {
      console.error('Webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const stripe = await getStripeInstance();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        config.webhook_secret
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(failedPayment);
        break;

      case 'charge.refunded':
        const refund = event.data.object as Stripe.Charge;
        await handleRefund(refund);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    const { sessionId, spots } = paymentIntent.metadata;

    if (!sessionId) {
      console.error('No sessionId in payment intent metadata');
      return;
    }

    // Find booking by payment intent ID and update status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found for payment intent:', paymentIntent.id);
      return;
    }

    // Update booking payment status
    await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
      })
      .eq('id', booking.id);

    // Update invoice if exists
    await supabase
      .from('invoices')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('booking_id', booking.id);

    console.log('Payment successful for booking:', booking.id);

  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Find booking and update status
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (booking) {
      await supabase
        .from('bookings')
        .update({
          payment_status: 'failed',
          status: 'cancelled',
        })
        .eq('id', booking.id);

      console.log('Payment failed for booking:', booking.id);
    }

  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

/**
 * Handle refund
 */
async function handleRefund(charge: Stripe.Charge) {
  try {
    // Find booking by payment intent ID
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('stripe_payment_intent_id', charge.payment_intent as string)
      .single();

    if (booking) {
      await supabase
        .from('bookings')
        .update({
          payment_status: 'refunded',
          status: 'cancelled',
        })
        .eq('id', booking.id);

      // Update invoice
      await supabase
        .from('invoices')
        .update({
          payment_status: 'refunded',
        })
        .eq('booking_id', booking.id);

      console.log('Refund processed for booking:', booking.id);
    }

  } catch (error) {
    console.error('Error handling refund:', error);
  }
}

