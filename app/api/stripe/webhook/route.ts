import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getStripeInstance } from '@/lib/stripe-server';

// Create server-side Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
    const { sessionId, source, shopProductId, patientId } = paymentIntent.metadata;

    // Handle shop purchases (punch cards)
    if (source === 'shop' && shopProductId && patientId) {
      console.log('Processing shop purchase for product:', shopProductId);
      
      // Get shop product details
      const { data: product } = await supabase
        .from('shop_products')
        .select('*')
        .eq('id', shopProductId)
        .single();

      if (product) {
        // Create punch card for user
        const { data: newPunchCard, error: punchCardError } = await supabase
          .from('punch_cards')
          .insert({
            user_id: patientId,
            name: product.name,
            total_punches: product.total_punches,
            remaining_punches: product.total_punches,
            price: paymentIntent.amount / 100, // Convert from øre to DKK
            valid_for_group_types: product.valid_for_group_types || [],
            expiry_date: product.validity_months 
              ? new Date(Date.now() + product.validity_months * 30 * 24 * 60 * 60 * 1000).toISOString()
              : null,
            status: 'active',
          })
          .select()
          .single();

        if (!punchCardError && newPunchCard) {
          console.log('Punch card created:', newPunchCard.id);
          
          // Create invoice for shop purchase
          const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
          const { error: invoiceError } = await supabase
            .from('invoices')
            .insert({
              user_id: patientId,
              invoice_number: invoiceNumber,
              amount: paymentIntent.amount / 100,
              vat_amount: 0,
              total_amount: paymentIntent.amount / 100,
              description: `${product.name} - Klippekort`,
              payment_method: 'stripe',
              payment_status: 'paid',
              stripe_payment_intent_id: paymentIntent.id,
              punch_card_id: newPunchCard.id,
              paid_at: new Date().toISOString(),
            });

          if (invoiceError) {
            console.error('Error creating invoice for shop purchase:', invoiceError);
          } else {
            console.log('Invoice created for shop purchase:', invoiceNumber);
          }
          
          // Send purchase confirmation email
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', 'https://')}/api/email/punch-card-purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ punchCardId: newPunchCard.id }),
          }).catch(err => console.error('Error sending punch card purchase email:', err));
        } else {
          console.error('Error creating punch card:', punchCardError);
        }
      }
      
      return;
    }

    // Handle booking payments
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

