import { NextRequest, NextResponse } from 'next/server';
import { createRefund } from '@/lib/stripe-server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, bookingId, amount } = await request.json();

    if (!paymentIntentId || !bookingId) {
      return NextResponse.json(
        { error: 'Payment Intent ID and Booking ID are required' },
        { status: 400 }
      );
    }

    // Get user from session
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('sb-access-token') || cookieStore.get('sb-localhost-auth-token');
    
    if (!authCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create user-specific supabase client to verify ownership
    const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${authCookie.value}`,
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns this booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('user_id, stripe_payment_intent_id, payment_status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - not your booking' },
        { status: 403 }
      );
    }

    if (booking.payment_status === 'refunded') {
      return NextResponse.json(
        { error: 'Booking already refunded' },
        { status: 400 }
      );
    }

    // Get ALL payments for this booking (initial + additional seats)
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('booking_payments')
      .select('*')
      .eq('booking_id', bookingId);

    let totalRefundAmount = 0;
    const refundResults = [];

    // If we have tracked payments in booking_payments table, refund all of them
    if (payments && payments.length > 0) {
      console.log(`[Refund] Found ${payments.length} payments for booking ${bookingId}`);
      
      for (const payment of payments) {
        try {
          const refund = await createRefund({
            paymentIntentId: payment.stripe_payment_intent_id,
            amount: undefined, // Full refund
            reason: 'requested_by_customer',
          });

          if (refund) {
            totalRefundAmount += refund.amount / 100; // Convert from øre to DKK
            refundResults.push({
              paymentIntentId: payment.stripe_payment_intent_id,
              refundId: refund.id,
              amount: refund.amount / 100,
              paymentType: payment.payment_type,
            });
          }
        } catch (err) {
          console.error(`[Refund] Error refunding payment ${payment.stripe_payment_intent_id}:`, err);
        }
      }
    } else if (booking.stripe_payment_intent_id) {
      // Fallback: Use the payment intent from the booking table (old bookings)
      console.log(`[Refund] No tracked payments, using booking.stripe_payment_intent_id`);
      
    const refund = await createRefund({
        paymentIntentId: booking.stripe_payment_intent_id,
      amount, // Optional: if not provided, full refund
      reason: 'requested_by_customer',
    });

    if (!refund) {
      return NextResponse.json(
        { error: 'Failed to create refund in Stripe' },
        { status: 500 }
        );
      }

      totalRefundAmount = refund.amount / 100;
      refundResults.push({
        paymentIntentId: booking.stripe_payment_intent_id,
        refundId: refund.id,
        amount: refund.amount / 100,
        paymentType: 'initial',
      });
    } else {
      return NextResponse.json(
        { error: 'No payment information found for this booking' },
        { status: 400 }
      );
    }

    // Update booking and invoice payment status
    await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: 'refunded',
        admin_reason: `Refund issued to customer card (${refundResults.length} payment(s), total: ${totalRefundAmount.toFixed(2)} kr)`,
      })
      .eq('id', bookingId);

    await supabaseAdmin
      .from('invoices')
      .update({
        payment_status: 'refunded',
      })
      .eq('booking_id', bookingId);

    return NextResponse.json({
      success: true,
      refunds: refundResults,
      totalAmount: totalRefundAmount,
      refundCount: refundResults.length,
    });

  } catch (error: any) {
    console.error('Refund API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 500 }
    );
  }
}
