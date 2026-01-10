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

    if (booking.stripe_payment_intent_id !== paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID does not match booking' },
        { status: 400 }
      );
    }

    if (booking.payment_status === 'refunded') {
      return NextResponse.json(
        { error: 'Booking already refunded' },
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
        { error: 'Failed to create refund in Stripe' },
        { status: 500 }
      );
    }

    // Update booking and invoice payment status
    await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: 'refunded',
        admin_reason: 'Refund issued to customer card',
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
