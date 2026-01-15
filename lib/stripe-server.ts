/**
 * Server-side Stripe utilities
 * Used in API routes for payment processing
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

let stripeInstance: Stripe | null = null;

/**
 * Get Stripe instance with current configuration
 */
export async function getStripeInstance(): Promise<Stripe | null> {
  try {
    // Get Stripe config from database using service role client
    const { data: config, error } = await supabaseAdmin
      .from('stripe_config')
      .select('secret_key, enabled')
      .single();

    if (error || !config || !config.enabled || !config.secret_key) {
      console.error('Stripe config error:', error);
      return null;
    }

    // Create new Stripe instance (always create fresh instance for now)
    stripeInstance = new Stripe(config.secret_key, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });

    return stripeInstance;
  } catch (err) {
    console.error('Error getting Stripe instance:', err);
    return null;
  }
}

/**
 * Get Stripe publishable key
 */
export async function getStripePublishableKey(): Promise<string | null> {
  try {
    const { data: config, error } = await supabaseAdmin
      .from('stripe_config')
      .select('publishable_key, enabled')
      .single();

    if (error || !config || !config.enabled || !config.publishable_key) {
      console.error('Stripe publishable key error:', error);
      return null;
    }

    return config.publishable_key;
  } catch (err) {
    console.error('Error getting Stripe publishable key:', err);
    return null;
  }
}

// REMOVED: getEnabledPaymentMethods() function
// Stripe's automatic_payment_methods handles this automatically based on Dashboard settings

/**
 * Create a payment intent for a booking
 * Uses automatic_payment_methods to respect Stripe Dashboard settings
 */
export async function createPaymentIntent(params: {
  amount: number; // in øre (DKK cents)
  currency?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.PaymentIntent | null> {
  try {
    const stripe = await getStripeInstance();
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency || 'dkk',
      metadata: params.metadata || {},
      // Use automatic payment methods - Stripe will show only what's enabled in Dashboard
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('[Stripe] Payment intent created with automatic payment methods');
    return paymentIntent;
  } catch (err) {
    console.error('Error creating payment intent:', err);
    return null;
  }
}

/**
 * Create a refund for a payment intent
 */
export async function createRefund(params: {
  paymentIntentId: string;
  amount?: number; // Optional: partial refund in øre (DKK cents). If not provided, full refund.
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}): Promise<Stripe.Refund | null> {
  try {
    const stripe = await getStripeInstance();
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: params.paymentIntentId,
      reason: params.reason || 'requested_by_customer',
    };

    // Add amount only if partial refund
    if (params.amount) {
      refundParams.amount = params.amount;
    }

    const refund = await stripe.refunds.create(refundParams);

    console.log('Refund created:', refund.id);
    return refund;
  } catch (err) {
    console.error('Error creating refund:', err);
    return null;
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event | null {
  try {
    if (!stripeInstance) {
      throw new Error('Stripe not initialized');
    }

    const event = stripeInstance.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    return event;
  } catch (err) {
    console.error('Error verifying webhook signature:', err);
    return null;
  }
}

