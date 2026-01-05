/**
 * Server-side Stripe utilities
 * Used in API routes for payment processing
 */

import Stripe from 'stripe';
import { supabase } from './supabase';

let stripeInstance: Stripe | null = null;

/**
 * Get Stripe instance with current configuration
 */
export async function getStripeInstance(): Promise<Stripe | null> {
  try {
    // Get Stripe config from database
    const { data: config, error } = await supabase
      .from('stripe_config')
      .select('secret_key, enabled')
      .single();

    if (error || !config || !config.enabled || !config.secret_key) {
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
    const { data: config, error } = await supabase
      .from('stripe_config')
      .select('publishable_key, enabled')
      .single();

    if (error || !config || !config.enabled || !config.publishable_key) {
      return null;
    }

    return config.publishable_key;
  } catch (err) {
    console.error('Error getting Stripe publishable key:', err);
    return null;
  }
}

/**
 * Create a payment intent for a booking
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
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (err) {
    console.error('Error creating payment intent:', err);
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

