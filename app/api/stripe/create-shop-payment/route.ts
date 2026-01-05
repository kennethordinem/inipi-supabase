import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/stripe-server';
import { supabase } from '@/lib/supabase';

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

    // If buying a punch card, get details
    let itemName = 'Shop Purchase';
    if (punchCardId) {
      const { data: punchCard, error } = await supabase
        .from('punch_card_templates')
        .select('name, total_punches')
        .eq('id', punchCardId)
        .single();

      if (!error && punchCard) {
        itemName = punchCard.name;
        metadata.punchCardTemplateId = punchCardId;
        metadata.punchCardName = punchCard.name;
        metadata.punchCardPunches = punchCard.total_punches;
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

