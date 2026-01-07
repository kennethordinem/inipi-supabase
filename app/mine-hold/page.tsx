'use client';

import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { members } from '@/lib/supabase-sdk';
import { cachedMembers } from '@/lib/cachedMembers';
import type { AuthState } from '@/lib/supabase-sdk';
import { Calendar, Clock, MapPin, User, Loader2, AlertCircle, CheckCircle, XCircle, Ticket } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { da } from 'date-fns/locale';

interface Booking {
  id: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  price: number;
  spots?: number;
  location?: string;
  employeeName?: string;
  color?: string;
  punchCardId?: string;
  isGusmesterBooking?: boolean;
}

export default function MineHoldPage() {
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string>('');
  const [cancelError, setCancelError] = useState<string>('');

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = members.onAuthStateChanged((authState: AuthState) => {
      if (!authState.isLoading) {
        if (!authState.isAuthenticated) {
          // Not logged in, redirect to login
          window.location.href = '/login';
        } else {
          // Logged in, load data
          loadBookings();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      
      // Load both regular bookings and gusmester bookings
      const [regularResult, gusmesterResult] = await Promise.all([
        cachedMembers.getMyBookings(false),
        cachedMembers.getMyGusmesterBookings().catch(() => ({ bookings: [] }))
      ]);
      
      console.log('[Mine Hold] Regular bookings:', regularResult.upcoming);
      console.log('[Mine Hold] Gusmester bookings:', gusmesterResult.bookings);
      
      // Convert gusmester bookings to the same format as regular bookings
      const gusmesterBookingsFormatted = (gusmesterResult.bookings || []).map((gb: any) => ({
        id: gb.id,
        date: gb.date,
        time: gb.time,
        duration: gb.duration,
        type: gb.name,
        status: 'active',
        paymentStatus: 'paid',
        paymentMethod: 'points',
        price: 150, // Cost in points
        spots: 1,
        location: gb.location,
        employeeName: gb.hostName,
        color: '#f59e0b', // Amber color for gusmester bookings
        isGusmesterBooking: true, // Flag to identify gusmester bookings
      }));
      
      // Combine both types of bookings
      const allBookings = [...(regularResult.upcoming || []), ...gusmesterBookingsFormatted];
      
      // Separate active and cancelled bookings
      const active = allBookings.filter((b: Booking) => b.status !== 'cancelled');
      const cancelled = allBookings.filter((b: Booking) => b.status === 'cancelled');
      
      setUpcomingBookings(active);
      setCancelledBookings(cancelled);
    } catch (err: any) {
      console.error('[Mine Hold] Error loading bookings:', err);
      setError('Kunne ikke indlæse dine bookinger');
    } finally {
      setLoading(false);
    }
  };

  const canCancelBooking = (booking: Booking): { canCancel: boolean; reason?: string; willGetCompensation?: boolean } => {
    // Parse booking date and time
    const bookingDate = parseISO(booking.date);
    const [hours, minutes] = booking.time.split(':').map(Number);
    const bookingStartTime = new Date(bookingDate);
    bookingStartTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const hoursUntil = (bookingStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (bookingStartTime <= now) {
      return { canCancel: false, reason: 'Sessionen er allerede startet' };
    }

    if (hoursUntil < 3) {
      return { canCancel: false, reason: 'Du skal aflyse mindst 3 timer før sessionen starter' };
    }

    // Can cancel, but check if eligible for compensation
    const willGetCompensation = hoursUntil >= 24;
    return { 
      canCancel: true, 
      willGetCompensation,
      reason: willGetCompensation 
        ? undefined 
        : 'Bemærk: Aflysning mindre end 24 timer før giver ikke kompensation'
    };
  };

  const handleCancelClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
    setCancelError('');
    setCancelSuccess('');
  };

  const handleConfirmCancel = async () => {
    if (!selectedBooking) return;

    try {
      setCancellingId(selectedBooking.id);
      setCancelError('');

      // Check if this is a gusmester booking
      if (selectedBooking.isGusmesterBooking) {
        // Cancel gusmester booking (refund points)
        const result = await cachedMembers.cancelGusmesterBooking(selectedBooking.id);
        if (result.success) {
          setCancelSuccess('Gusmester booking aflyst - 150 points refunderet');
        }
      } else {
        // Cancel regular booking
        const result = await members.cancelBooking(selectedBooking.id);
        if (result.success) {
          setCancelSuccess(result.message || 'Booking aflyst');
        }
      }
      
      // Clear cache and reload bookings
      cachedMembers.invalidateAfterBooking();
      await loadBookings();

      // Close modal after showing success
      setTimeout(() => {
        setShowCancelModal(false);
        setSelectedBooking(null);
        setCancelSuccess('');
      }, 2000);
    } catch (err: any) {
      console.error('[Mine Hold] Cancel error:', err);
      setCancelError(err.message || 'Kunne ikke aflyse booking');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#502B30] mx-auto mb-4"></div>
            <p className="text-[#502B30]/80">Indlæser dine bookinger...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 text-center max-w-md border border-[#502B30]/10">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#502B30] mb-2">
              Der opstod en fejl
            </h3>
            <p className="text-[#4a2329]/80 mb-4">{error}</p>
            <button
              onClick={loadBookings}
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

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#faf8f5]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-[#502B30] tracking-wide">
              Mine Hold
            </h1>
            <p className="mt-3 text-lg text-[#4a2329]/80">
              Oversigt over dine kommende saunagus bookinger
            </p>
          </div>

          {/* Cancellation Policy Notice */}
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-sm p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Afbestillingspolitik</p>
                <p>Du kan aflyse dine bookinger op til 3 timer før sessionen starter. Ved afbestilling får du enten dine klip tilbage, eller et nyt klippekort med tilsvarende antal klip.</p>
              </div>
            </div>
          </div>

          {/* Bookings List */}
          {upcomingBookings.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 text-center border border-[#502B30]/10">
              <Calendar className="h-12 w-12 text-[#502B30]/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#502B30] mb-2">
                Ingen kommende bookinger
              </h3>
              <p className="text-[#4a2329]/80 mb-6">
                Du har ingen planlagte saunagus bookinger
              </p>
              <a
                href="/sessions"
                className="inline-flex items-center bg-[#502B30] hover:bg-[#5e3023] text-amber-100 px-6 py-3 rounded-sm font-medium transition-colors shadow-md"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Book Saunagus
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => {
                const cancelStatus = canCancelBooking(booking);
                const bookingDate = parseISO(booking.date);
                const [hours, minutes] = booking.time.split(':').map(Number);
                const bookingStartTime = new Date(bookingDate);
                bookingStartTime.setHours(hours, minutes, 0, 0);
                const endTime = new Date(bookingStartTime.getTime() + booking.duration * 60000);

                return (
                  <div
                    key={booking.id}
                    className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/20 overflow-hidden hover:shadow-xl transition-all"
                  >
                    {/* Color Bar */}
                    {booking.color && (
                      <div className="h-2" style={{ backgroundColor: booking.color }} />
                    )}

                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-[#502B30] mb-3">
                            {booking.type}
                          </h3>

                          <div className="space-y-2 text-[#4a2329]/70">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>{format(bookingDate, 'EEEE d. MMMM yyyy', { locale: da })}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>{booking.time} - {format(endTime, 'HH:mm')} ({booking.duration} min)</span>
                            </div>
                            {booking.location && (
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                <span>{booking.location}</span>
                              </div>
                            )}
                            {booking.employeeName && (
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                <span>{booking.employeeName}</span>
                              </div>
                            )}
                            {booking.spots && booking.spots > 1 && (
                              <div className="flex items-center">
                                <Ticket className="h-4 w-4 mr-2" />
                                <span>{booking.spots} pladser</span>
                              </div>
                            )}
                          </div>

                          {/* Payment Info */}
                          <div className="mt-4 pt-4 border-t border-[#502B30]/10">
                            <div className="flex items-center text-sm">
                              <span className="text-[#502B30]/60 mr-2">Betalt:</span>
                              {booking.isGusmesterBooking ? (
                                <span className="text-amber-600 font-medium">150 points</span>
                              ) : booking.paymentMethod === 'punch_card' ? (
                                <span className="text-green-600 font-medium">Klippekort</span>
                              ) : (
                                <span className="text-[#502B30] font-medium">
                                  {booking.price.toFixed(0)} kr (Kort)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Cancel Button */}
                        <div className="ml-6">
                          {cancelStatus.canCancel ? (
                            <button
                              onClick={() => handleCancelClick(booking)}
                              disabled={cancellingId === booking.id}
                              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                              {cancellingId === booking.id ? (
                                <span className="flex items-center">
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Aflys...
                                </span>
                              ) : (
                                'Aflys Booking'
                              )}
                            </button>
                          ) : (
                            <div className="text-right">
                              <div className="text-sm text-gray-500 mb-1">Kan ikke aflyses</div>
                              <div className="text-xs text-gray-400">{cancelStatus.reason}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cancelled Bookings Section */}
          {cancelledBookings.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-[#502B30] mb-6">Aflyste bookinger</h2>
              <div className="space-y-4">
                {cancelledBookings.map((booking) => {
                  const bookingDate = parseISO(booking.date);
                  const [hours, minutes] = booking.time.split(':').map(Number);
                  const bookingStartTime = new Date(bookingDate);
                  bookingStartTime.setHours(hours, minutes, 0, 0);
                  const endTime = new Date(bookingStartTime.getTime() + booking.duration * 60000);

                  return (
                    <div
                      key={booking.id}
                      className="bg-gray-100 rounded-sm shadow border border-gray-300 overflow-hidden opacity-75"
                    >
                      {/* Color Bar */}
                      {booking.color && (
                        <div className="h-2" style={{ backgroundColor: booking.color, opacity: 0.5 }} />
                      )}

                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-xl font-semibold text-gray-700">
                                {booking.type}
                              </h3>
                              <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-sm">
                                AFLYST
                              </span>
                            </div>

                            <div className="space-y-2 text-gray-600">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                <span>{format(bookingDate, 'EEEE d. MMMM yyyy', { locale: da })}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                <span>{booking.time} - {format(endTime, 'HH:mm')} ({booking.duration} min)</span>
                              </div>
                              {booking.location && (
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2" />
                                  <span>{booking.location}</span>
                                </div>
                              )}
                              {booking.employeeName && (
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-2" />
                                  <span>{booking.employeeName}</span>
                                </div>
                              )}
                              {booking.spots && booking.spots > 1 && (
                                <div className="flex items-center">
                                  <Ticket className="h-4 w-4 mr-2" />
                                  <span>{booking.spots} pladser</span>
                                </div>
                              )}
                            </div>

                            {/* Payment Info */}
                            <div className="mt-4 pt-4 border-t border-gray-300">
                              <div className="flex items-center text-sm">
                                <span className="text-gray-600 mr-2">Betalt:</span>
                                {booking.paymentMethod === 'punch_card' ? (
                                  <span className="text-green-600 font-medium">Klippekort</span>
                                ) : (
                                  <span className="text-gray-700 font-medium">
                                    {booking.price.toFixed(0)} kr (Kort)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
      <Footer />

      {/* Cancel Confirmation Modal */}
      {showCancelModal && selectedBooking && (() => {
        const cancelInfo = canCancelBooking(selectedBooking);
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-sm max-w-md w-full p-6 shadow-xl">
              <h3 className="text-xl font-bold text-[#502B30] mb-4">Bekræft Aflysning</h3>

              {!cancelSuccess ? (
                <>
                  <div className="space-y-3 mb-6">
                    <p className="text-[#502B30]/80"><strong>Session:</strong> {selectedBooking.type}</p>
                    <p className="text-[#502B30]/80">
                      <strong>Dato:</strong> {format(parseISO(selectedBooking.date), 'd. MMMM yyyy HH:mm', { locale: da })}
                    </p>
                    {selectedBooking.spots && selectedBooking.spots > 1 && (
                      <p className="text-[#502B30]/80"><strong>Pladser:</strong> {selectedBooking.spots}</p>
                    )}
                  </div>

                  {selectedBooking.paymentMethod === 'punch_card' ? (
                    <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-sm">
                      <p className="text-sm text-green-800">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Dine klip vil blive returneret til dit klippekort
                      </p>
                    </div>
                  ) : cancelInfo.willGetCompensation ? (
                    <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-sm">
                      <p className="text-sm text-blue-800">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        Du vil få et nyt klippekort med {selectedBooking.spots || 1} klip til samme holdtype
                      </p>
                    </div>
                  ) : (
                    <div className="mb-6 p-3 bg-amber-50 border border-amber-300 rounded-sm">
                      <p className="text-sm text-amber-800 font-medium">
                        ⚠️ Aflysning mindre end 24 timer før giver ikke kompensation
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Da du aflyser mindre end 24 timer før sessionens start, får du ikke et kompensations-klippekort.
                      </p>
                    </div>
                  )}

                {cancelError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm flex items-start">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-800">{cancelError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setSelectedBooking(null);
                      setCancelError('');
                    }}
                    disabled={cancellingId !== null}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Annuller
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    disabled={cancellingId !== null}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {cancellingId ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Aflys...
                      </>
                    ) : (
                      'Bekræft Aflysning'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold text-green-600 mb-2">Booking aflyst!</p>
                <p className="text-sm text-[#4a2329]/80">{cancelSuccess}</p>
              </div>
            )}
          </div>
        </div>
        );
      })()}
    </>
  );
}

