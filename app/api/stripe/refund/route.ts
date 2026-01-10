import { NextRequest, NextResponse } from 'next/server';
import { createRefund } from '@/lib/stripe-server';
import { createClient } from '@supabase/supabase-js';

// Create server-side Supabase client
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
    const { paymentIntentId, bookingId, amount } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID is required' },
        { status: 400 }
      );
    }

    // Create refund in Stripe
    const refund = await createRefund({
      paymentIntentId,
      amount, // Optional: if not provided, full refund
      reason: 'requested_by_customer',
    });

    if (!refund) {
      return NextResponse.json(
        { error: 'Failed to create refund' },
        { status: 500 }
      );
    }

    // Update booking status if bookingId provided
    if (bookingId) {
      await supabase
        .from('bookings')
        .update({
          payment_status: 'refunded',
          admin_reason: 'Refund issued to customer card',
        })
        .eq('id', bookingId);

      // Update invoice
      await supabase
        .from('invoices')
        .update({
          payment_status: 'refunded',
        })
        .eq('booking_id', bookingId);
    }

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    });

  } catch (error: any) {
    console.error('Refund API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 500 }
    );
  }
}
