'use client';

import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import type { PunchCard } from '@/lib/supabase-sdk';

interface ShopPaymentFormProps {
  amount: number;
  onSuccess: (result: {
    invoiceId: string;
    invoiceNumber?: string;
    itemName: string;
    amount: number;
    itemType: 'product' | 'punchCard';
  }) => void;
  onError: (error: string) => void;
  selectedPunchCard: PunchCard | null;
  itemName: string;
}

export function ShopPaymentForm({
  amount,
  onSuccess,
  onError,
  selectedPunchCard,
  itemName
}: ShopPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Submit payment element
      const { error: submitError } = await elements.submit();
      
      if (submitError) {
        setError(submitError.message || 'Der opstod en fejl ved betalingen');
        setIsProcessing(false);
        onError(submitError.message || 'Der opstod en fejl ved betalingen');
        return;
      }

      // Confirm payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: window.location.href,
        },
      });

      if (confirmError) {
        console.error('[ShopPaymentForm] Payment confirmation error:', confirmError);
        setError(confirmError.message || 'Betaling fejlede');
        onError(confirmError.message || 'Betaling fejlede');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
        console.log('[ShopPaymentForm] Payment succeeded:', paymentIntent.id);
        
        // Get metadata from localStorage (saved before payment)
        const savedMetadata = localStorage.getItem('pendingShopPayment');
        let metadata: any = {};
        
        if (savedMetadata) {
          metadata = JSON.parse(savedMetadata);
        }

        // Complete the purchase (create punch card and invoice)
        console.log('[ShopPaymentForm] Completing purchase...');
        try {
          const completeResponse = await fetch('/api/shop/complete-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              userId: metadata.patientId,
              shopProductId: metadata.shopItemId,
            }),
          });

          const completeResult = await completeResponse.json();
          
          if (!completeResponse.ok || !completeResult.success) {
            console.error('[ShopPaymentForm] Error completing purchase:', completeResult.error);
            setError('Betaling gennemført, men kunne ikke oprette klippekort. Kontakt support.');
            onError('Betaling gennemført, men kunne ikke oprette klippekort. Kontakt support.');
            setIsProcessing(false);
            return;
          }

          console.log('[ShopPaymentForm] Purchase completed successfully:', completeResult);

          // Call success callback with payment info
          onSuccess({
            invoiceId: completeResult.invoiceId || paymentIntent.id,
            invoiceNumber: completeResult.invoiceNumber,
            itemName: metadata.shopItemName || itemName,
            amount: amount,
            itemType: metadata.shopItemType || 'punchCard'
          });

          // Clear pending payment data
          localStorage.removeItem('pendingShopPayment');
        } catch (completeError: any) {
          console.error('[ShopPaymentForm] Error completing purchase:', completeError);
          setError('Betaling gennemført, men kunne ikke oprette klippekort. Kontakt support.');
          onError('Betaling gennemført, men kunne ikke oprette klippekort. Kontakt support.');
          setIsProcessing(false);
          return;
        }
        
      } else if (paymentIntent.status === 'requires_action') {
        setError('Betalingen kræver yderligere handling');
        onError('Betalingen kræver yderligere handling');
        setIsProcessing(false);
      } else {
        setError('Betaling kunne ikke gennemføres');
        onError('Betaling kunne ikke gennemføres');
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('[ShopPaymentForm] Payment error:', err);
      const errorMsg = err.message || 'Der opstod en fejl ved betalingen';
      setError(errorMsg);
      onError(errorMsg);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-6">
        <PaymentElement 
          options={{
            layout: 'tabs'
          }}
        />
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}
      
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Behandler betaling...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-2" />
            Betal {amount.toLocaleString('da-DK')} kr.
          </>
        )}
      </button>
    </form>
  );
}
















