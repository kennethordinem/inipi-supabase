import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/stripe-server';
import { createClient } from '@supabase/supabase-js';

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
    const body = await request.json();
    const { punchCardId, amount, metadata } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // If buying a punch card, get details from shop_products
    let itemName = 'Shop Purchase';
    if (punchCardId) {
      const { data: product, error } = await supabase
        .from('shop_products')
        .select('name, total_punches, validity_months, valid_for_group_types')
        .eq('id', punchCardId)
        .single();

      if (!error && product) {
        itemName = product.name;
        metadata.shopProductId = punchCardId;
        metadata.shopProductName = product.name;
        metadata.shopProductPunches = product.total_punches;
        metadata.shopProductValidityMonths = product.validity_months;
        metadata.shopProductGroupTypes = JSON.stringify(product.valid_for_group_types || []);
      }
    }

    // Calculate amount in øre (DKK cents)
    const amountInOre = Math.round(amount * 100);

    // Create payment intent
    const paymentIntent = await createPaymentIntent({
      amount: amountInOre,
      currency: 'dkk',
      metadata: {
        ...metadata,
        itemName,
        source: 'shop',
      },
    });

    if (!paymentIntent) {
      return NextResponse.json(
        { error: 'Failed to create payment intent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error: any) {
    console.error('Error creating shop payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

