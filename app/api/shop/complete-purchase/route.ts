import { NextRequest, NextResponse } from 'next/server';
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
    const { paymentIntentId, userId, shopProductId } = body;

    if (!paymentIntentId || !userId || !shopProductId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[CompletePurchase] Processing purchase:', { paymentIntentId, userId, shopProductId });

    // Check if punch card already exists for this payment
    const { data: existingCard } = await supabase
      .from('punch_cards')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (existingCard) {
      console.log('[CompletePurchase] Punch card already exists:', existingCard.id);
      return NextResponse.json({
        success: true,
        punchCardId: existingCard.id,
        message: 'Punch card already created',
      });
    }

    // Get shop product details
    const { data: product, error: productError } = await supabase
      .from('shop_products')
      .select('*')
      .eq('id', shopProductId)
      .single();

    if (productError || !product) {
      console.error('[CompletePurchase] Product not found:', productError);
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Create punch card
    const { data: newPunchCard, error: punchCardError } = await supabase
      .from('punch_cards')
      .insert({
        user_id: userId,
        name: product.name,
        total_punches: product.total_punches,
        remaining_punches: product.total_punches,
        price: product.price,
        valid_for_group_types: product.valid_for_group_types || [],
        expiry_date: product.validity_months 
          ? new Date(Date.now() + product.validity_months * 30 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        status: 'active',
        stripe_payment_intent_id: paymentIntentId,
      })
      .select()
      .single();

    if (punchCardError) {
      console.error('[CompletePurchase] Error creating punch card:', punchCardError);
      return NextResponse.json(
        { error: 'Failed to create punch card: ' + punchCardError.message },
        { status: 500 }
      );
    }

    console.log('[CompletePurchase] Punch card created:', newPunchCard.id);

    // Create invoice
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        invoice_number: invoiceNumber,
        amount: product.price,
        vat_amount: 0,
        total_amount: product.price,
        description: `${product.name} - Klippekort`,
        payment_method: 'stripe',
        payment_status: 'paid',
        stripe_payment_intent_id: paymentIntentId,
        punch_card_id: newPunchCard.id,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('[CompletePurchase] Error creating invoice:', invoiceError);
      // Don't fail the whole request if invoice creation fails
    } else {
      console.log('[CompletePurchase] Invoice created:', invoice.id);
    }

    // Send purchase confirmation email
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/email/punch-card-purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ punchCardId: newPunchCard.id }),
      });
    } catch (emailError) {
      console.error('[CompletePurchase] Error sending email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      punchCardId: newPunchCard.id,
      invoiceId: invoice?.id,
      invoiceNumber: invoice?.invoice_number,
    });

  } catch (error: any) {
    console.error('[CompletePurchase] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

