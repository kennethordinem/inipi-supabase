import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent, getStripePublishableKey } from '@/lib/stripe-server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, spots } = body;

    if (!sessionId || !spots) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get session details to calculate price
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('price, name, date, time')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Calculate amount in øre (DKK cents)
    const amount = Math.round(parseFloat(session.price) * spots * 100);

    // Create payment intent
    const paymentIntent = await createPaymentIntent({
      amount,
      currency: 'dkk',
      metadata: {
        sessionId,
        spots: spots.toString(),
        sessionName: session.name,
        sessionDate: session.date,
        sessionTime: session.time,
      },
    });

    if (!paymentIntent) {
      return NextResponse.json(
        { error: 'Failed to create payment intent' },
        { status: 500 }
      );
    }

    // Get publishable key
    const publishableKey = await getStripePublishableKey();

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey,
    });

  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

