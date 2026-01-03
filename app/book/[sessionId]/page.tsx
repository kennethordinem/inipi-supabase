'use client';

import { useEffect, useState } from 'react';
import { members } from '@/lib/clinio';
import type { Session, PunchCard } from '@/lib/members-sdk/dist/types';

export default function BookingPage({ params }: { params: { sessionId: string } }) {
  const [session, setSession] = useState<Session | null>(null);
  const [punchCards, setPunchCards] = useState<PunchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [spots, setSpots] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'punchcard' | 'mobilepay'>('card');
  const [selectedPunchCard, setSelectedPunchCard] = useState<string>('');

  useEffect(() => {
    // Check if user is logged in
    if (!members.isAuthenticated()) {
      window.location.href = '/login';
      return;
    }

    loadData();
  }, [params.sessionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionData, punchCardsData] = await Promise.all([
        members.getSessionDetails(params.sessionId),
        members.getPunchCards()
      ]);

      setSession(sessionData);
      setPunchCards(punchCardsData.punchCards.filter((pc: PunchCard) => pc.remainingPunches > 0));
    } catch (error: any) {
      alert('Fejl: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) return;

    setBookingInProgress(true);

    try {
      const bookingData: any = {
        sessionId: params.sessionId,
        spots,
        paymentMethod
      };

      if (paymentMethod === 'punchcard' && selectedPunchCard) {
        bookingData.punchCardId = selectedPunchCard;
      }

      const result = await members.bookSession(bookingData);

      if (result.requiresPayment && result.paymentUrl) {
        // Redirect to payment
        window.location.href = result.paymentUrl;
      } else {
        // Booking complete
        alert('Booking gennemført!');
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      alert('Fejl: ' + error.message);
    } finally {
      setBookingInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#502B30] mx-auto mb-4"></div>
          <p className="text-[#502B30]/80">Indlæser...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 max-w-md text-center border border-[#502B30]/10">
          <p className="text-red-600 mb-4">Session ikke fundet</p>
          <a href="/sessions" className="text-[#502B30] hover:text-[#5e3023] transition-colors">
            ← Tilbage til gus tider
          </a>
        </div>
      </div>
    );
  }

  const totalPrice = (session.price || 0) * spots;

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <header className="bg-[#502B30] text-amber-100 py-6 px-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <a href="/" className="text-2xl font-bold tracking-wide">INIPI</a>
          <nav className="flex gap-6">
            <a href="/sessions" className="hover:text-amber-100/80 transition-colors">Gus Tider</a>
            <a href="/dashboard" className="hover:text-amber-100/80 transition-colors">Min Side</a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 border border-[#502B30]/10">
            <h1 className="text-3xl font-bold text-[#502B30] mb-6 tracking-wide">Book Saunagus</h1>

            {/* Session Details */}
            <div className="mb-8 p-6 bg-[#faf8f5] rounded-sm border border-[#502B30]/10">
              <h2 className="text-xl font-semibold text-[#502B30] mb-4">
                {session.name}
              </h2>
              <div className="space-y-2 text-[#4a2329]/80">
                <p>📅 {new Date(session.date).toLocaleDateString('da-DK', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}</p>
                <p>🕐 {session.time}</p>
                <p>⏱️ {session.duration} minutter</p>
                {session.description && (
                  <p className="mt-4 text-[#4a2329]/70">{session.description}</p>
                )}
              </div>
            </div>

            {/* Booking Form */}
            <form onSubmit={handleBooking} className="space-y-6">
              {/* Number of Spots */}
              <div>
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  Antal pladser
                </label>
                <select
                  value={spots}
                  onChange={(e) => setSpots(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-[#502B30]/20 rounded-sm focus:ring-2 focus:ring-[#502B30] focus:border-transparent bg-white"
                >
                  {Array.from({ length: Math.min(session.maxParticipants > 0 ? session.availableSpots : 10, 10) }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  Betalingsmetode
                </label>
                <div className="space-y-2">
                  {punchCards.length > 0 && (
                    <label className="flex items-center gap-3 p-4 border border-[#502B30]/20 rounded-sm cursor-pointer hover:bg-[#502B30]/5 transition-colors">
                      <input
                        type="radio"
                        value="punchcard"
                        checked={paymentMethod === 'punchcard'}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="text-[#502B30] focus:ring-[#502B30]"
                      />
                      <span className="flex-1 text-[#502B30]">
                        Brug klippekort
                        {paymentMethod === 'punchcard' && (
                          <select
                            value={selectedPunchCard}
                            onChange={(e) => setSelectedPunchCard(e.target.value)}
                            className="ml-4 mt-2 w-full px-3 py-1 border border-[#502B30]/20 rounded-sm bg-white"
                            required
                          >
                            <option value="">Vælg klippekort</option>
                            {punchCards.map(pc => (
                              <option key={pc.id} value={pc.id}>
                                {pc.name} ({pc.remainingPunches} klip tilbage)
                              </option>
                            ))}
                          </select>
                        )}
                      </span>
                    </label>
                  )}
                  
                  <label className="flex items-center gap-3 p-4 border border-[#502B30]/20 rounded-sm cursor-pointer hover:bg-[#502B30]/5 transition-colors">
                    <input
                      type="radio"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="text-[#502B30] focus:ring-[#502B30]"
                    />
                    <span className="text-[#502B30]">Betalingskort</span>
                  </label>

                  <label className="flex items-center gap-3 p-4 border border-[#502B30]/20 rounded-sm cursor-pointer hover:bg-[#502B30]/5 transition-colors">
                    <input
                      type="radio"
                      value="mobilepay"
                      checked={paymentMethod === 'mobilepay'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="text-[#502B30] focus:ring-[#502B30]"
                    />
                    <span className="text-[#502B30]">MobilePay</span>
                  </label>
                </div>
              </div>

              {/* Price Summary */}
              {paymentMethod !== 'punchcard' && totalPrice > 0 && (
                <div className="p-4 bg-[#faf8f5] rounded-sm border border-[#502B30]/10">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#502B30]">Total:</span>
                    <span className="text-2xl font-bold text-[#502B30]">
                      {totalPrice} kr
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={bookingInProgress || (paymentMethod === 'punchcard' && !selectedPunchCard)}
                className="w-full bg-[#502B30] hover:bg-[#5e3023] text-amber-100 py-4 rounded-sm font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bookingInProgress ? 'Behandler...' : 'Gennemfør Booking'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a href="/sessions" className="text-sm text-[#502B30] hover:text-[#5e3023] transition-colors">
                ← Tilbage til gus tider
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

