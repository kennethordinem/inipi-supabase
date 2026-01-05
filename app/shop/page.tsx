'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { ShoppingBag, CreditCard, Ticket, Package, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ShopPaymentForm } from '../components/ShopPaymentForm';
import { members } from '@/lib/supabase-sdk';
import type { PunchCard } from '@/lib/supabase-sdk';

// INIPI uniqueId (from Clinio config)
const INIPI_UNIQUE_ID = 'inipi';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  inStock: boolean;
}

interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
}

type PurchaseSuccess = {
  invoiceId: string;
  invoiceNumber?: string;
  itemName: string;
  amount: number;
  itemType: 'product' | 'punchCard';
};

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [punchCards, setPunchCards] = useState<PunchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Payment state
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedPunchCard, setSelectedPunchCard] = useState<PunchCard | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string>('');
  
  // Success/Error state
  const [purchaseSuccess, setPurchaseSuccess] = useState<PurchaseSuccess | null>(null);
  const [purchaseError, setPurchaseError] = useState<string>('');

  useEffect(() => {
    loadShopItems();
    initializeStripe();
  }, []);

  const initializeStripe = async () => {
    try {
      console.log('[Shop] Getting Stripe configuration from Supabase');
      
      // Get Stripe config from our database
      const config = await members.getStripeConfig();
      
      if (!config || !config.enabled) {
        console.log('[Shop] Stripe not configured or not enabled');
        setError('Betalingssystem er ikke aktiveret endnu');
        return;
      }
      
      const publicKey = config.publishable_key;
      
      if (!publicKey || publicKey.trim() === '' || !publicKey.startsWith('pk_')) {
        console.error('[Shop] Invalid Stripe public key received:', publicKey);
        setError('Betalingssystem kunne ikke initialiseres - ugyldig public key');
        return;
      }

      console.log('[Shop] Initializing Stripe with key:', publicKey.substring(0, 15) + '...');
      setStripePromise(loadStripe(publicKey));
      
    } catch (err: any) {
      console.error('[Shop] Error initializing Stripe:', err);
      setError('Kunne ikke initialisere betalingssystem: ' + err.message);
    }
  };

  const loadShopItems = async () => {
    try {
      setLoading(true);
      
      // Load shop punch cards
      const punchCardsData = await members.getShopPunchCards();
      setPunchCards(punchCardsData.punchCards);
      
      // TODO: Add products when SDK supports it
      setProducts([]);

    } catch (err: any) {
      console.error('[Shop] Error loading shop items:', err);
      setError('Kunne ikke indlæse shop produkter');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item: Product | PunchCard, type: 'product' | 'punchCard') => {
    try {
      setPurchaseError('');
      setLoading(true);

      // Check authentication
      const userId = localStorage.getItem('userId');
      const userEmail = localStorage.getItem('userEmail');
      
      if (!userId || !userEmail) {
        setPurchaseError('Du skal være logget ind for at købe');
        window.location.href = '/login';
        return;
      }

      console.log('[Shop] Starting purchase for:', item.name);

      // Get user profile to get patientId
      const profile = await members.getProfile();
      
      if (!profile || !profile.id) {
        setPurchaseError('Kunne ikke finde bruger profil');
        setLoading(false);
        return;
      }

      // Get price based on type
      const itemPrice = type === 'product' ? (item as Product).price : (item as any).price;

      // Prepare metadata for payment intent
      const shopMetadata: any = {
        clinicId: INIPI_UNIQUE_ID,
        patientId: profile.id,
        patientName: `${profile.firstName} ${profile.lastName}`,
        patientEmail: profile.email,
        shopItemType: type,
        shopItemId: item.id,
        shopItemName: item.name,
        shopItemPrice: itemPrice.toString(),
        amount: itemPrice,
        bookingSource: 'inipi_shop',
        patientPhone: profile.phone || '',
        paymentCreatedAt: new Date().toISOString(),
        currency: 'DKK',
        vatRate: '25'
      };

      // Add punch card specific fields
      if (type === 'punchCard') {
        const punchCard = item as any;
        if (punchCard.numberOfPunches) {
          shopMetadata['shopItemPunches'] = punchCard.numberOfPunches.toString();
        }
        if (punchCard.appointmentTypes) {
          shopMetadata['shopItemAppointmentTypes'] = JSON.stringify(punchCard.appointmentTypes);
        }
        if (punchCard.groupTypes) {
          shopMetadata['shopItemGroupTypes'] = JSON.stringify(punchCard.groupTypes);
        }
        if (punchCard.validityMonths) {
          shopMetadata['shopItemValidityMonths'] = punchCard.validityMonths.toString();
        }
      }

      // Save to localStorage (fallback for metadata)
      localStorage.setItem('pendingShopPayment', JSON.stringify(shopMetadata));
      console.log('[Shop] Metadata saved to localStorage');

      // Create payment intent via our API
      console.log('[Shop] Creating payment intent for amount:', itemPrice);
      const response = await fetch('/api/stripe/create-shop-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          punchCardId: type === 'punchCard' ? item.id : null,
          amount: itemPrice,
          metadata: shopMetadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kunne ikke oprette betalingsintent');
      }

      const paymentResult = await response.json();

      if (!paymentResult || !paymentResult.clientSecret) {
        throw new Error('Kunne ikke oprette betalingsintent');
      }

      console.log('[Shop] Payment intent created successfully:', paymentResult.paymentIntentId);

      // Show payment form
      setClientSecret(paymentResult.clientSecret);
      setSelectedAmount(itemPrice);
      setSelectedItemName(item.name);
      
      if (type === 'punchCard') {
        setSelectedPunchCard(item as any);
      }

    } catch (err: any) {
      console.error('[Shop] Purchase error:', err);
      setPurchaseError(err.message || 'Der opstod en fejl ved købet');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (result: PurchaseSuccess) => {
    console.log('[Shop] Payment successful:', result);
    
    // Clear payment state
    setClientSecret(null);
    setSelectedAmount(null);
    setSelectedPunchCard(null);
    setSelectedItemName('');
    
    // Show success screen
    setPurchaseSuccess(result);
    
    // Clear pending payment data
    localStorage.removeItem('pendingShopPayment');
  };

  const handlePaymentError = (errorMsg: string) => {
    console.error('[Shop] Payment error:', errorMsg);
    setPurchaseError(errorMsg);
  };

  const handleBackToShop = () => {
    setClientSecret(null);
    setSelectedAmount(null);
    setSelectedPunchCard(null);
    setSelectedItemName('');
    setPurchaseError('');
  };

  const handleNewPurchase = () => {
    setPurchaseSuccess(null);
    setPurchaseError('');
    loadShopItems(); // Refresh items
  };

  // Loading state
  if (loading && !clientSecret && !purchaseSuccess) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#502B30] mx-auto mb-4"></div>
            <p className="text-[#502B30]/80">Indlæser shop...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Error state
  if (error && products.length === 0 && punchCards.length === 0 && !clientSecret) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 text-center max-w-md border border-[#502B30]/10">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#502B30] mb-2">
              Der opstod en fejl
            </h3>
            <p className="text-[#4a2329]/80 mb-4">{error}</p>
            <button
              onClick={loadShopItems}
              className="bg-[#502B30] hover:bg-[#5e3023] text-amber-100 px-6 py-2 rounded-sm font-medium transition-colors"
            >
              Prøv igen
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Success state
  if (purchaseSuccess) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] py-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 text-center border border-[#502B30]/10">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-[#502B30] mb-4">
                Køb gennemført!
              </h2>
              <p className="text-[#4a2329]/80 mb-6">
                Dit køb er gennemført, og du har modtaget en kvittering på email.
              </p>
              
              <div className="bg-[#faf8f5] rounded-sm p-6 mb-8 border border-[#502B30]/10">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[#502B30]/70">Produkt:</span>
                    <span className="font-medium text-[#502B30]">{purchaseSuccess.itemName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#502B30]/70">Beløb:</span>
                    <span className="font-medium text-[#502B30]">
                      {purchaseSuccess.amount.toLocaleString('da-DK')} kr.
                    </span>
                  </div>
                  {purchaseSuccess.invoiceNumber && (
                    <div className="flex justify-between">
                      <span className="text-[#502B30]/70">Fakturanr.:</span>
                      <span className="font-medium text-[#502B30]">
                        {purchaseSuccess.invoiceNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {purchaseSuccess.itemType === 'punchCard' && (
                <p className="text-sm text-[#4a2329]/80 mb-6">
                  Dit klippekort er nu aktivt og klar til brug. Du kan se det under "Mine Klippekort".
                </p>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleNewPurchase}
                  className="w-full bg-[#502B30] hover:bg-[#5e3023] text-amber-100 px-6 py-3 rounded-sm font-medium transition-colors"
                >
                  Fortsæt med at shoppe
                </button>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full border-2 border-[#502B30]/20 hover:bg-[#502B30]/10 text-[#502B30] px-6 py-3 rounded-sm font-medium transition-colors"
                >
                  Gå til dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Payment form state
  if (clientSecret && stripePromise && selectedAmount !== null) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] py-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Back button */}
            <button
              onClick={handleBackToShop}
              className="mb-6 text-[#502B30] hover:text-[#5e3023] flex items-center transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbage til shop
            </button>

            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-6 border border-[#502B30]/10">
              <h2 className="text-xl font-semibold text-[#502B30] mb-6">
                Gennemfør betaling
              </h2>

              {/* Order summary */}
              <div className="mb-6 p-4 bg-[#faf8f5] rounded-sm border border-[#502B30]/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[#502B30]/70">Produkt:</span>
                  <span className="font-medium text-[#502B30]">{selectedItemName}</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="font-medium text-[#502B30]">Total:</span>
                  <span className="font-bold text-[#502B30]">
                    {selectedAmount.toLocaleString('da-DK')} kr.
                  </span>
                </div>
              </div>

              {/* Payment form */}
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <ShopPaymentForm
                  amount={selectedAmount}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  selectedPunchCard={selectedPunchCard}
                  itemName={selectedItemName}
                />
              </Elements>

              {purchaseError && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-sm">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                    <span className="text-sm text-red-700">{purchaseError}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Main shop view
  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#faf8f5]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-[#502B30] tracking-wide">
              Shop
            </h1>
            <p className="mt-3 text-lg text-[#4a2329]/80">
              Køb klippekort og produkter online
            </p>
          </div>

          {purchaseError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                <span className="text-sm text-red-700">{purchaseError}</span>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* Products Section */}
            {products.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-[#502B30] mb-6">
                  Produkter
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/20 overflow-hidden hover:shadow-xl hover:border-[#502B30] transition-all duration-200"
                    >
                      <div className="p-6">
                        <div className="flex items-center mb-3">
                          <Package className="h-5 w-5 text-[#502B30]/70 mr-2" />
                          <h3 className="text-lg font-semibold text-[#502B30]">
                            {product.name}
                          </h3>
                        </div>
                        {product.description && (
                          <p className="text-sm text-[#4a2329]/80 mb-4 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-bold text-[#502B30]">
                            {product.price.toFixed(2)} kr.
                          </span>
                          <button
                            onClick={() => handlePurchase(product, 'product')}
                            disabled={!product.inStock}
                            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-sm shadow-sm text-sm font-medium text-amber-100 transition-colors duration-200 ${
                              product.inStock
                                ? 'bg-[#502B30] hover:bg-[#5e3023]'
                                : 'bg-[#502B30]/40 cursor-not-allowed'
                            }`}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            {product.inStock ? 'Køb' : 'Udsolgt'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Punch Cards Section */}
            {punchCards.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-[#502B30] mb-6">
                  Klippekort
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {punchCards.map((punchCard) => (
                    <div
                      key={punchCard.id}
                      className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/20 overflow-hidden hover:shadow-xl hover:border-[#502B30] transition-all duration-200"
                    >
                      {/* Card Header with gradient */}
                      <div className="bg-gradient-to-r from-[#502B30] to-[#5e3023] p-4">
                        <div className="flex items-center text-amber-100">
                          <Ticket className="h-5 w-5 mr-2" />
                          <span className="font-semibold">Klippekort</span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-[#502B30] mb-2">
                          {punchCard.name}
                        </h3>
                        {(punchCard as any).description && (
                          <p className="text-sm text-[#4a2329]/80 mb-3 line-clamp-2">
                            {(punchCard as any).description}
                          </p>
                        )}
                        <div className="text-sm text-[#502B30]/70 mb-4 space-y-1">
                          <p>• {(punchCard as any).numberOfPunches || 0} klip inkluderet</p>
                          {(punchCard as any).validityMonths && (
                            <p>• Gyldig i {(punchCard as any).validityMonths} måned{(punchCard as any).validityMonths > 1 ? 'er' : ''}</p>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-bold text-[#502B30]">
                            {((punchCard as any).price || 0).toFixed(2)} kr.
                          </span>
                          <button
                            onClick={() => handlePurchase(punchCard, 'punchCard')}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-sm shadow-sm text-sm font-medium text-amber-100 bg-[#502B30] hover:bg-[#5e3023] transition-colors duration-200"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Køb
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {products.length === 0 && punchCards.length === 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 text-center border border-[#502B30]/10">
                <ShoppingBag className="h-12 w-12 text-[#502B30]/40 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#502B30] mb-2">
                  Ingen produkter tilgængelige
                </h3>
                <p className="text-[#4a2329]/80">
                  Der er i øjeblikket ingen produkter eller klippekort tilgængelige for online køb.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
