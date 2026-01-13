'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { members } from '@/lib/supabase-sdk';

interface AddSeatsModalProps {
  booking: {
    id: string;
    spots?: number;
    sessionId?: string;
    selectedThemeId?: string;
    type: string;
    date: string;
    time: string;
    price: number;
  };
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddSeatsForm({ 
  booking, 
  userId, 
  clientSecret, 
  additionalSeats,
  totalAmount,
  onSuccess, 
  onBack 
}: { 
  booking: AddSeatsModalProps['booking'];
  userId: string;
  clientSecret: string;
  additionalSeats: number;
  totalAmount: number;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message || 'Betalingen fejlede');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Complete the booking update
        const response = await fetch('/api/bookings/complete-add-seats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            bookingId: booking.id,
            userId: userId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Kunne ikke opdatere booking');
        }

        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      console.error('[AddSeatsForm] Error:', err);
      setError(err.message || 'Der opstod en fejl');
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-[#502B30] mb-2">Pladser tilføjet!</h3>
        <p className="text-[#4a2329]/70">
          Du har nu {(booking.spots || 0) + additionalSeats} pladser i alt
        </p>
        <p className="text-sm text-[#4a2329]/60 mt-2">
          Du modtager en kvittering på email
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-sm p-4">
        <p className="text-sm text-blue-800">
          <strong>Nuværende pladser:</strong> {booking.spots || 0}
        </p>
        <p className="text-sm text-blue-800">
          <strong>Tilføjer:</strong> +{additionalSeats} pladser
        </p>
        <p className="text-sm text-blue-800 font-bold mt-2">
          <strong>Nye total:</strong> {(booking.spots || 0) + additionalSeats} pladser
        </p>
      </div>

      <div className="bg-[#faf8f5] p-4 rounded-sm border border-[#502B30]/20">
        <p className="text-sm text-[#4a2329]/70 mb-2">Beløb at betale:</p>
        <p className="text-3xl font-bold text-[#502B30]">{totalAmount.toFixed(2)} kr</p>
        <p className="text-xs text-[#4a2329]/60 mt-1">
          {additionalSeats} × {(totalAmount / additionalSeats).toFixed(2)} kr
        </p>
      </div>

      <div className="border border-[#502B30]/20 rounded-sm p-4">
        <PaymentElement />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-sm p-3 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1 px-6 py-3 border-2 border-[#502B30] text-[#502B30] rounded-sm font-medium hover:bg-[#502B30]/5 transition-colors disabled:opacity-50"
        >
          Tilbage
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-[#502B30] to-[#5e3023] text-white rounded-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Behandler...
            </>
          ) : (
            <>Betal {totalAmount.toFixed(2)} kr</>
          )}
        </button>
      </div>
    </form>
  );
}

export function AddSeatsModal({ booking, userId, onClose, onSuccess }: AddSeatsModalProps) {
  const [step, setStep] = useState<'select' | 'payment'>('select');
  const [additionalSeats, setAdditionalSeats] = useState(1);
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [pricePerSeat, setPricePerSeat] = useState<number>(0);
  const [themeName, setThemeName] = useState<string>('');

  const currentSpots = booking.spots || 1;

  // Initialize Stripe and fetch theme price on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize Stripe
        console.log('[AddSeatsModal] Initializing Stripe...');
        const config = await members.getStripeConfig();
        
        if (config && config.enabled && config.publishable_key && config.publishable_key.startsWith('pk_')) {
          console.log('[AddSeatsModal] Stripe key found:', config.publishable_key.substring(0, 15) + '...');
          setStripePromise(loadStripe(config.publishable_key));
        } else {
          console.error('[AddSeatsModal] Stripe not configured properly:', config);
          setError('Betalingssystem er ikke konfigureret. Kontakt administrator.');
          return;
        }

        // Fetch theme price from database
        if (booking.selectedThemeId) {
          console.log('[AddSeatsModal] Fetching theme price for:', booking.selectedThemeId);
          const { data: theme, error: themeError } = await members.supabase
            .from('themes')
            .select('price_per_seat, name')
            .eq('id', booking.selectedThemeId)
            .single();

          if (themeError || !theme) {
            console.error('[AddSeatsModal] Error fetching theme:', themeError);
            setError('Kunne ikke hente tema information');
            return;
          }

          console.log('[AddSeatsModal] Theme price per seat:', theme.price_per_seat);
          setPricePerSeat(theme.price_per_seat || 0);
          setThemeName(theme.name || '');
        } else {
          console.error('[AddSeatsModal] No theme ID found on booking');
          setError('Denne booking har ikke et tema');
        }
      } catch (err) {
        console.error('[AddSeatsModal] Error during initialization:', err);
        setError('Kunne ikke initialisere');
      }
    };

    init();
  }, [booking.selectedThemeId]);

  const handleContinueToPayment = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/bookings/add-seats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          additionalSeats,
          userId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kunne ikke oprette betaling');
      }

      setClientSecret(result.clientSecret);
      setTotalAmount(result.amount);
      setStep('payment');
    } catch (err: any) {
      console.error('[AddSeatsModal] Error:', err);
      setError(err.message || 'Der opstod en fejl');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#502B30] to-[#5e3023] text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Tilføj pladser</h2>
            <p className="text-sm text-white/80 mt-1">{booking.type}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select' ? (
            <div className="space-y-6">
              {/* Current booking info */}
              <div className="bg-[#faf8f5] p-4 rounded-sm border border-[#502B30]/20">
                <h3 className="font-semibold text-[#502B30] mb-2">Din nuværende booking:</h3>
                <p className="text-sm text-[#4a2329]/70">
                  <strong>Dato:</strong> {new Date(booking.date).toLocaleDateString('da-DK')} kl. {booking.time}
                </p>
                <p className="text-sm text-[#4a2329]/70">
                  <strong>Nuværende pladser:</strong> {currentSpots}
                </p>
                <p className="text-sm text-[#4a2329]/70">
                  <strong>Pris pr. plads:</strong> {pricePerSeat.toFixed(2)} kr
                </p>
              </div>

              {/* Seat selector */}
              <div>
                <label className="block text-sm font-semibold text-[#502B30] mb-3">
                  Hvor mange ekstra pladser vil du tilføje?
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setAdditionalSeats(Math.max(1, additionalSeats - 1))}
                    className="w-12 h-12 border-2 border-[#502B30] text-[#502B30] rounded-sm font-bold hover:bg-[#502B30]/5 transition-colors"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-4xl font-bold text-[#502B30]">{additionalSeats}</div>
                    <div className="text-sm text-[#4a2329]/70">ekstra pladser</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdditionalSeats(additionalSeats + 1)}
                    className="w-12 h-12 border-2 border-[#502B30] text-[#502B30] rounded-sm font-bold hover:bg-[#502B30]/5 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price calculation */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-sm border-2 border-[#502B30]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[#4a2329]/70">Ekstra pladser:</span>
                  <span className="font-semibold text-[#502B30]">
                    {additionalSeats} × {pricePerSeat.toFixed(2)} kr
                  </span>
                </div>
                <div className="border-t border-[#502B30]/20 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-[#502B30]">Total at betale:</span>
                    <span className="text-2xl font-bold text-[#502B30]">
                      {(pricePerSeat * additionalSeats).toFixed(2)} kr
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#4a2329]/60 mt-3">
                  Efter betaling vil du have {currentSpots + additionalSeats} pladser i alt
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-sm p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border-2 border-[#502B30] text-[#502B30] rounded-sm font-medium hover:bg-[#502B30]/5 transition-colors"
                >
                  Annuller
                </button>
                <button
                  type="button"
                  onClick={handleContinueToPayment}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#502B30] to-[#5e3023] text-white rounded-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Indlæser...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Fortsæt til betaling
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <AddSeatsForm
                booking={booking}
                userId={userId}
                clientSecret={clientSecret}
                additionalSeats={additionalSeats}
                totalAmount={totalAmount}
                onSuccess={onSuccess}
                onBack={() => setStep('select')}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
