'use client';

import React, { useState, useEffect } from 'react';
import { members } from '@/lib/supabase-sdk';
import { cachedMembers } from '@/lib/cachedMembers';
import type { Session } from '@/lib/supabase-sdk';
import { Check, Loader2, User, Ticket, CreditCard, AlertCircle } from 'lucide-react';
import { MembersAuthForm } from './MembersAuthForm';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Payment Form Component
interface PaymentFormProps {
  clientSecret: string;
  onSuccess: (paymentResult: any) => void;
  onError: (error: string) => void;
}

function PaymentForm({ clientSecret, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        console.error('[PaymentForm] Payment confirmation error:', confirmError);
        setError(confirmError.message || 'Betaling fejlede');
        onError(confirmError.message || 'Betaling fejlede');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        console.log('[PaymentForm] Payment succeeded:', paymentIntent.id);
        
        // Call success with payment info
        onSuccess({
          paymentIntentId: paymentIntent.id,
          paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
          transactionId: paymentIntent.id
        });
      } else {
        setError('Betaling kunne ikke gennemføres');
        onError('Betaling kunne ikke gennemføres');
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('[PaymentForm] Payment error:', err);
      const errorMsg = err.message || 'Der opstod en fejl ved betalingen';
      setError(errorMsg);
      onError(errorMsg);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-[#5e3023]/20 rounded-lg bg-[#faf8f5]">
        <PaymentElement 
          options={{
            layout: 'tabs'
          }}
        />
      </div>
      
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}
      
      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
          isProcessing || !stripe
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-[#502B30] hover:bg-[#5e3023] shadow-lg hover:shadow-xl'
        } text-amber-50`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Behandler betaling...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span>Betal nu</span>
          </>
        )}
      </button>
    </form>
  );
}

interface MembersBookingFlowProps {
  session: Session;
  selectedSpots: number;
  selectedThemeId?: string;
  isPrivateEvent?: boolean;
  onComplete: (result: { appointmentId: string }) => void;
  onCancel: () => void;
}

interface BookingStep {
  id: 'review' | 'payment' | 'confirmation';
  title: string;
}

const STEPS: BookingStep[] = [
  { id: 'review', title: 'Gennemse' },
  { id: 'payment', title: 'Betaling' },
  { id: 'confirmation', title: 'Bekræftelse' }
];

export function MembersBookingFlow({
  session,
  selectedSpots,
  selectedThemeId,
  isPrivateEvent = false,
  onComplete,
  onCancel
}: MembersBookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<'review' | 'payment' | 'confirmation'>('review');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<{ appointmentId: string } | null>(null);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | undefined>();
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  
  // User auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [patientId, setPatientId] = useState<string | undefined>();
  const [patientName, setPatientName] = useState<string | undefined>();
  const [patientEmail, setPatientEmail] = useState<string | undefined>();

  // Punch card state
  const [availablePunchCards, setAvailablePunchCards] = useState<any[]>([]);
  const [isLoadingPunchCards, setIsLoadingPunchCards] = useState(false);
  const [selectedPunchCard, setSelectedPunchCard] = useState<string | undefined>();

  // Theme state
  const [selectedTheme, setSelectedTheme] = useState<{ id: string; name: string; pricePerSeat: number } | null>(null);
  const [isLoadingTheme, setIsLoadingTheme] = useState(false);

  // Calculate total price based on theme or session price
  const pricePerSeat = selectedTheme?.pricePerSeat || session.price!;
  const totalPrice = pricePerSeat * selectedSpots;
  const sessionDate = new Date(session.date);

  // Load theme details if selectedThemeId is provided
  useEffect(() => {
    const loadTheme = async () => {
      if (!selectedThemeId) {
        setSelectedTheme(null);
        return;
      }

      setIsLoadingTheme(true);
      try {
        const sessionDetails = await members.getSessionDetails(session.id);
        const theme = sessionDetails.themes?.find((t: any) => t.id === selectedThemeId);
        if (theme) {
          setSelectedTheme({
            id: theme.id,
            name: theme.name,
            pricePerSeat: theme.pricePerSeat || session.price!,
          });
        }
      } catch (err) {
        console.error('[MembersBookingFlow] Error loading theme:', err);
      } finally {
        setIsLoadingTheme(false);
      }
    };

    loadTheme();
  }, [selectedThemeId, session.id, session.price]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = members.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      if (isAuth) {
        try {
          const profile = await members.getProfile();
          setPatientId(profile.id);
          setPatientName(`${profile.firstName} ${profile.lastName}`.trim());
          setPatientEmail(profile.email);
        } catch (error) {
          console.error('[MembersBookingFlow] Error loading profile:', error);
        }
      }
    };
    
    checkAuth();
  }, []);

  // Initialize Stripe
  useEffect(() => {
    const initStripe = async () => {
      try {
        const { loadStripe } = await import('@stripe/stripe-js');
        
        // Get Stripe config from our database
        const config = await members.getStripeConfig();
        
        if (config && config.enabled && config.publishable_key && config.publishable_key.startsWith('pk_')) {
          console.log('[MembersBookingFlow] Initializing Stripe with key:', config.publishable_key.substring(0, 15) + '...');
          setStripePromise(loadStripe(config.publishable_key));
        } else {
          console.log('[MembersBookingFlow] Stripe not configured or not enabled');
        }
      } catch (err) {
        console.error('[MembersBookingFlow] Error initializing Stripe:', err);
      }
    };

    initStripe();
  }, []);

  // Load punch cards when user becomes authenticated or when selectedSpots changes
  useEffect(() => {
    console.log('[MembersBookingFlow] Auth state or spots changed. isAuthenticated:', isAuthenticated, 'selectedSpots:', selectedSpots);
    if (isAuthenticated) {
      console.log('[MembersBookingFlow] Loading punch cards...');
      loadPunchCards();
    }
  }, [isAuthenticated, selectedSpots]);

  // Check payment requirement when punch cards or total price changes
  useEffect(() => {
    if (isAuthenticated) {
      checkPaymentRequirement();
    }
  }, [availablePunchCards, selectedPunchCard, totalPrice, isAuthenticated]);

  const loadPunchCards = async () => {
    try {
      setIsLoadingPunchCards(true);
      
      const result = await members.getPunchCards();
      const allPunchCards = result.punchCards;
      
      console.log('[MembersBookingFlow] Found punch cards:', allPunchCards.length);
      console.log('[MembersBookingFlow] Session groupTypeId:', session.groupTypeId);
      
      // Filter punch cards that are valid for this group session
      const validPunchCards = allPunchCards.filter((card: any) => {
        const validForGroupTypes = card.validForGroupTypes || [];
        
        // If no group types specified, treat as valid for ALL group sessions (legacy behavior)
        // This ensures backward compatibility with punch cards created before this field existed
        if (validForGroupTypes.length === 0) {
          // Check if punch card has enough punches for selected spots
          const hasEnoughPunches = (card.remainingPunches || 0) >= selectedSpots;
          return hasEnoughPunches;
        }
        
        // Check if this specific group type is included
        const isValidForThisType = validForGroupTypes.includes(session.groupTypeId);
        
        // Also check if punch card has enough punches for selected spots
        const hasEnoughPunches = (card.remainingPunches || 0) >= selectedSpots;
        
        return isValidForThisType && hasEnoughPunches;
      });
      
      console.log('[MembersBookingFlow] Valid punch cards for this session:', validPunchCards.length);
      setAvailablePunchCards(validPunchCards);
      
    } catch (error) {
      console.error('[MembersBookingFlow] Error loading punch cards:', error);
      setAvailablePunchCards([]);
    } finally {
      setIsLoadingPunchCards(false);
    }
  };

  const checkPaymentRequirement = () => {
    // If punch card is selected, no payment required
    if (selectedPunchCard) {
      setPaymentRequired(false);
      return;
    }

    // If total price is 0 or less, no payment required
    if (totalPrice <= 0) {
      setPaymentRequired(false);
      return;
    }

    // Payment required if there's a price and no punch card
    setPaymentRequired(true);
  };

  const createPaymentIntent = async () => {
    try {
      console.log('[MembersBookingFlow] Creating payment intent for session:', session.id, 'spots:', selectedSpots);
      
      // Call our API endpoint to create payment intent
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          spots: selectedSpots,
          themeId: selectedThemeId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunne ikke oprette betalingsintent');
      }

      const result = await response.json();

      if (result && result.clientSecret) {
        setPaymentClientSecret(result.clientSecret);
        console.log('[MembersBookingFlow] Payment intent created successfully');
      } else {
        throw new Error('Kunne ikke oprette betalingsintent');
      }
    } catch (err) {
      console.error('[MembersBookingFlow] Error creating payment intent:', err);
      setError(err instanceof Error ? err.message : 'Kunne ikke oprette betaling');
    }
  };

  const createBooking = async (paymentInfo?: any) => {
    // Ensure user is authenticated
    if (!isAuthenticated) {
      setError('Du skal være logget ind for at booke');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Determine payment method
      let paymentMethod: 'stripe' | 'punch_card' | 'manual';
      
      if (selectedPunchCard) {
        paymentMethod = 'punch_card';
      } else if (paymentInfo && paymentInfo.paymentIntentId) {
        paymentMethod = 'stripe';
      } else {
        paymentMethod = 'manual';
      }

      console.log('[MembersBookingFlow] Creating booking with payment method:', paymentMethod);
      console.log('[MembersBookingFlow] Payment info:', paymentInfo);

      // Book session using SDK (this will create invoice automatically on backend)
      const result = await cachedMembers.bookSession({
        sessionId: session.id,
        spots: selectedSpots,
        themeId: selectedThemeId,
        paymentMethod: paymentMethod as any,
        punchCardId: selectedPunchCard,
        paymentIntentId: paymentInfo?.paymentIntentId,
        transactionId: paymentInfo?.transactionId || paymentInfo?.paymentIntentId
      });

      if (!result.success) {
        throw new Error('Booking failed');
      }

      console.log('[MembersBookingFlow] Booking created successfully:', result.appointmentId);

      // Success!
      const bookingRes = { appointmentId: result.appointmentId };
      setBookingResult(bookingRes);
      setIsProcessing(false);
      setCurrentStep('confirmation');
      
    } catch (err) {
      console.error('[MembersBookingFlow] Error creating booking:', err);
      setError(err instanceof Error ? err.message : 'Der opstod en fejl ved oprettelse af booking');
      setIsProcessing(false);
    }
  };

  const handleAuthSuccess = (userId: string, userName: string, userEmail: string) => {
    console.log('[MembersBookingFlow] User authenticated:', userId);
    setPatientId(userId);
    setPatientName(userName);
    setPatientEmail(userEmail);
    setIsAuthenticated(true);
    // Punch cards will be loaded by the useEffect watching isAuthenticated
  };

  const handleCompleteBooking = () => {
    if (bookingResult) {
      onComplete(bookingResult);
    }
  };

  // Render current step
  const renderStep = () => {
    if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-[#502B30] animate-spin mb-4" />
          <p className="text-[#5e3023]/70">Opretter din booking...</p>
        </div>
      );
    }

    switch (currentStep) {
      case 'review':
        return (
          <div className="space-y-6">
            {/* Session Details */}
            <div className="bg-[#f5f0eb] rounded-xl p-6 border border-[#5e3023]/10">
              <h3 className="text-lg font-semibold text-[#502B30] mb-4">
                Booking Detaljer
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#5e3023]/70">Session:</span>
                  <span className="font-medium text-[#4a2329]">{session.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-[#5e3023]/70">Dato:</span>
                  <span className="font-medium text-[#4a2329]">
                    {sessionDate.toLocaleDateString('da-DK', { 
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-[#5e3023]/70">Tid:</span>
                  <span className="font-medium text-[#4a2329]">{session.time}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-[#5e3023]/70">Varighed:</span>
                  <span className="font-medium text-[#4a2329]">{session.duration} minutter</span>
                </div>
                
                {session.location && (
                  <div className="flex justify-between">
                    <span className="text-[#5e3023]/70">Lokation:</span>
                    <span className="font-medium text-[#4a2329]">{session.location}</span>
                  </div>
                )}
                
                <div className="flex justify-between pt-3 border-t border-[#5e3023]/20">
                  <span className="text-[#5e3023]/70">Antal pladser:</span>
                  <span className="font-medium text-[#4a2329]">{selectedSpots}</span>
                </div>
                
                {selectedTheme && (
                  <div className="flex justify-between text-sm pb-2">
                    <span className="text-[#5e3023]/70">Valgt tema:</span>
                    <span className="font-medium text-[#4a2329]">{selectedTheme.name}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-lg font-semibold pt-3 border-t border-[#5e3023]/20">
                  <span className="text-[#502B30]">Total pris:</span>
                  <span className="text-[#502B30]">{pricePerSeat} kr × {selectedSpots} = {totalPrice} kr</span>
                </div>
              </div>
            </div>

            {/* User Info or Auth Form */}
            {isAuthenticated ? (
              <>
                <div className="bg-[#f5f0eb] rounded-xl p-6 border border-[#5e3023]/10">
                  <h3 className="text-lg font-semibold text-[#502B30] mb-4">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Dine Oplysninger
                    </div>
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#5e3023]/70">Navn:</span>
                      <span className="font-medium text-[#4a2329]">{patientName}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-[#5e3023]/70">Email:</span>
                      <span className="font-medium text-[#4a2329]">{patientEmail}</span>
                    </div>
                  </div>
                </div>

                {/* Punch Card Selection */}
                {isLoadingPunchCards ? (
                  <div className="bg-[#f5f0eb] rounded-xl p-6 border border-[#5e3023]/10">
                    <div className="flex items-center gap-2 text-[#5e3023]/70">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Indlæser klippekort...</span>
                    </div>
                  </div>
                ) : availablePunchCards.length > 0 && !selectedPunchCard && !isPrivateEvent ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-[#502B30] mb-4">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-5 w-5 text-amber-600" />
                        Brug Klippekort
                      </div>
                    </h3>
                    <p className="text-sm text-[#5e3023]/70 mb-4">
                      Du har klippekort tilgængelige for denne session. Der bruges {selectedSpots} {selectedSpots === 1 ? 'klip' : 'klip'}.
                    </p>
                    <div className="space-y-2">
                      {availablePunchCards.map((card: any) => (
                        <button
                          key={card.id}
                          onClick={() => setSelectedPunchCard(card.id)}
                          className="w-full flex items-center justify-between p-4 bg-white 
                            border border-amber-300 rounded-lg
                            hover:bg-amber-50 hover:border-amber-400 transition-all shadow-sm hover:shadow"
                        >
                          <div className="text-left">
                            <div className="font-medium text-[#4a2329]">
                              {card.name || 'Klippekort'}
                            </div>
                            <div className="text-sm text-[#5e3023]/70">
                              {card.remainingPunches} klip tilbage → {card.remainingPunches - selectedSpots} efter booking
                            </div>
                          </div>
                          <Ticket className="h-5 w-5 text-amber-600" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : selectedPunchCard && !isPrivateEvent ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-green-900 mb-1">
                          <div className="flex items-center gap-2">
                            <Ticket className="h-5 w-5" />
                            Bruger Klippekort
                          </div>
                        </h3>
                        <p className="text-sm text-green-700">
                          {availablePunchCards.find(c => c.id === selectedPunchCard)?.name || 'Klippekort'}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          Bruger {selectedSpots} {selectedSpots === 1 ? 'klip' : 'klip'} af {availablePunchCards.find(c => c.id === selectedPunchCard)?.remainingPunches || 0}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedPunchCard(undefined)}
                        className="text-sm text-green-700 hover:text-green-900 underline"
                      >
                        Betal i stedet
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <MembersAuthForm
                onSuccess={handleAuthSuccess}
                primaryColor="#6366f1"
              />
            )}

            {/* Error Display */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 text-base font-medium rounded-lg
                  text-[#502B30]
                  bg-white
                  border border-[#5e3023]/30
                  hover:bg-[#f5f0eb]
                  transition-all duration-200 shadow-sm hover:shadow"
              >
                Annuller
              </button>
              
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={async () => {
                    if (paymentRequired && !selectedPunchCard) {
                      // Need to go to payment step
                      await createPaymentIntent();
                      setCurrentStep('payment');
                    } else {
                      // No payment needed or using punch card
                      await createBooking();
                    }
                  }}
                  disabled={isProcessing}
                  className="px-6 py-3 text-base font-medium rounded-lg
                    text-amber-50 bg-[#502B30] 
                    hover:bg-[#5e3023]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {(paymentRequired && !selectedPunchCard) ? 'Fortsæt til betaling' : 'Bekræft booking'}
                </button>
              )}
            </div>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-[#f5f0eb] rounded-xl p-6 border border-[#5e3023]/10">
              <h3 className="text-lg font-semibold text-[#502B30] mb-4">
                Betalingsoversigt
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#5e3023]/70">Session:</span>
                  <span className="font-medium text-[#4a2329]">{session.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5e3023]/70">Antal pladser:</span>
                  <span className="font-medium text-[#4a2329]">{selectedSpots}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-3 border-t border-[#5e3023]/20">
                  <span className="text-[#502B30]">Total:</span>
                  <span className="text-[#502B30]">{totalPrice} kr</span>
                </div>
              </div>
            </div>

            {/* Stripe Payment Form */}
            {paymentClientSecret && stripePromise ? (
              <div className="bg-white rounded-xl p-6 border border-[#5e3023]/20">
                <h3 className="text-lg font-semibold text-[#502B30] mb-4">
                  Betalingsoplysninger
                </h3>
                <Elements stripe={stripePromise} options={{ clientSecret: paymentClientSecret }}>
                  <PaymentForm
                    clientSecret={paymentClientSecret}
                    onSuccess={async (paymentResult) => {
                      console.log('[MembersBookingFlow] Payment successful:', paymentResult);
                      // Create booking after successful payment
                      await createBooking(paymentResult);
                    }}
                    onError={(errorMsg) => {
                      console.error('[MembersBookingFlow] Payment error:', errorMsg);
                      setError(errorMsg);
                    }}
                  />
                </Elements>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-[#502B30] animate-spin" />
                <span className="ml-3 text-[#5e3023]/70">Forbereder betaling...</span>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Back Button */}
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setCurrentStep('review')}
                disabled={isProcessing}
                className="px-6 py-3 text-base font-medium rounded-lg
                  text-[#502B30]
                  bg-white
                  border border-[#5e3023]/30
                  hover:bg-[#f5f0eb]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200 shadow-sm hover:shadow"
              >
                Tilbage
              </button>
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-[#502B30] mb-4">
              Booking Bekræftet!
            </h2>
            
            <p className="text-[#5e3023]/70 mb-8">
              Din booking til <strong className="text-[#4a2329]">{session.name}</strong> er bekræftet.
              <br />
              {patientEmail && (
                <>Du vil modtage en bekræftelsesmail på <strong className="text-[#4a2329]">{patientEmail}</strong></>
              )}
            </p>
            
            <div className="bg-[#f5f0eb] rounded-xl p-6 mb-8 border border-[#5e3023]/10">
              <div className="space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-[#5e3023]/70">Dato:</span>
                  <span className="font-medium text-[#4a2329]">
                    {sessionDate.toLocaleDateString('da-DK', { 
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5e3023]/70">Tid:</span>
                  <span className="font-medium text-[#4a2329]">{session.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5e3023]/70">Pladser:</span>
                  <span className="font-medium text-[#4a2329]">{selectedSpots}</span>
                </div>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleCompleteBooking}
              className="px-8 py-3 text-base font-medium rounded-lg
                text-amber-50 bg-[#502B30] 
                hover:bg-[#5e3023]
                transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Tilbage til mine hold
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Indicator - Only show if not on confirmation */}
      {currentStep !== 'confirmation' && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = STEPS.findIndex(s => s.id === currentStep) > index;
              const isPaymentStep = step.id === 'payment';
              
              // Hide payment step if not required
              if (isPaymentStep && !paymentRequired) {
                return null;
              }
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-semibold
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      ${isActive ? 'bg-[#502B30] text-amber-50' : ''}
                      ${!isActive && !isCompleted ? 'bg-[#f5f0eb] text-[#5e3023]/50 border border-[#5e3023]/20' : ''}
                    `}>
                      {isCompleted ? <Check className="h-5 w-5" /> : index + 1}
                    </div>
                    <span className={`mt-2 text-sm font-medium ${
                      isActive ? 'text-[#502B30]' : 'text-[#5e3023]/50'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (!isPaymentStep || paymentRequired) && (
                    <div className={`h-1 flex-1 mx-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-[#5e3023]/20'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step Content */}
      {renderStep()}
    </div>
  );
}




