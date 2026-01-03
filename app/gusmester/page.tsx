'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Star, AlertCircle, CheckCircle, TrendingUp, MapPin } from 'lucide-react';
import { members } from '@/lib/supabase-sdk';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

interface AvailableSpot {
  id: string;
  name: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  hostName: string;
  pointCost: number;
}

interface MyBooking {
  id: string;
  name: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  hostName: string;
  canCancel: boolean;
}

interface HostingSession {
  id: string;
  name: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  guestSpotStatus: string;
  guestName?: string;
  guestEmail?: string;
  canRelease: boolean;
  willEarnPoints: boolean;
  hoursUntilEvent: number;
}

export default function GusmesterPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [employeeStats, setEmployeeStats] = useState<{ employeeName: string; points: number } | null>(null);
  const [availableSpots, setAvailableSpots] = useState<AvailableSpot[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [hostingSessions, setHostingSessions] = useState<HostingSession[]>([]);
  
  // Modal states
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<AvailableSpot | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<MyBooking | null>(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedHosting, setSelectedHosting] = useState<HostingSession | null>(null);
  const [showBookGuestModal, setShowBookGuestModal] = useState(false);
  const [selectedSessionForGuest, setSelectedSessionForGuest] = useState<HostingSession | null>(null);
  const [guestDetails, setGuestDetails] = useState({ name: '', email: '', phone: '' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Wait for authentication before loading data
  useEffect(() => {
    const unsubscribe = members.onAuthStateChanged((authState: any) => {
      setIsAuthenticated(authState.isAuthenticated);
      if (authState.isAuthenticated) {
        loadData();
      } else {
        setIsLoading(false);
        setError('Du skal være logget ind for at se denne side');
      }
    });

    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Load employee stats
      const stats = await members.getEmployeeStats();
      setEmployeeStats(stats);

      // Load available spots
      const spotsData = await members.getAvailableGusmesterSpots();
      setAvailableSpots(spotsData.spots);

      // Load my bookings
      const bookingsData = await members.getMyGusmesterBookings();
      setMyBookings(bookingsData.bookings);

      // Load hosting sessions
      const hostingData = await members.getMyHostingSessions();
      setHostingSessions(hostingData.sessions);

    } catch (err: any) {
      console.error('[Gusmester] Error loading data:', err);
      setError(err.message || 'Kunne ikke hente data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSpot = async () => {
    if (!selectedSpot) return;

    try {
      setIsSubmitting(true);
      setError('');

      await members.bookGusmesterSpot(selectedSpot.id);

      setSuccess('Spot booket! 150 points trukket fra din saldo.');
      setShowBookModal(false);
      setSelectedSpot(null);

      // Reload data
      await loadData();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('[Gusmester] Book error:', err);
      setError(err.message || 'Kunne ikke booke spot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    try {
      setIsSubmitting(true);
      setError('');

      await members.cancelGusmesterBooking(selectedBooking.id);

      setSuccess('Booking annulleret. 150 points returneret.');
      setShowCancelModal(false);
      setSelectedBooking(null);

      // Reload data
      await loadData();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('[Gusmester] Cancel error:', err);
      setError(err.message || 'Kunne ikke annullere booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReleaseGuestSpot = async () => {
    if (!selectedHosting) return;

    try {
      setIsSubmitting(true);
      setError('');

      const result = await members.releaseGuestSpot(selectedHosting.id);

      if (result.earnedPoints) {
        setSuccess('Gæsteplads frigivet! +150 points tilføjet.');
      } else {
        setSuccess('Gæsteplads frigivet (ingen points - for sent).');
      }
      setShowReleaseModal(false);
      setSelectedHosting(null);

      // Reload data
      await loadData();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('[Gusmester] Release error:', err);
      setError(err.message || 'Kunne ikke frigive gæsteplads');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookGuestForSession = async () => {
    if (!selectedSessionForGuest) return;

    // Validate guest details
    if (!guestDetails.name || !guestDetails.email) {
      setError('Udfyld venligst gæstens navn og email');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await members.bookGuestForSession(
        selectedSessionForGuest.id,
        guestDetails.name,
        guestDetails.email,
        guestDetails.phone
      );

      setSuccess('Gæst booket!');
      setShowBookGuestModal(false);
      setSelectedSessionForGuest(null);
      setGuestDetails({ name: '', email: '', phone: '' });

      // Reload data
      await loadData();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('[Gusmester] Book guest error:', err);
      setError(err.message || 'Kunne ikke booke gæst');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#502B30] mx-auto mb-4"></div>
            <p className="text-[#502B30]/80">Henter Gus Mester data...</p>
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
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-[#502B30] tracking-wide inline-flex items-center">
              <Star className="h-10 w-10 mr-3 text-amber-600" />
              Gus Mester
            </h1>
            <p className="mt-3 text-lg text-[#4a2329]/80">
              Book saunagus spots og administrer dine hosting sessioner
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm flex items-start shadow">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-sm flex items-start shadow">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Employee Stats Card */}
          {employeeStats && (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-6 mb-8 border border-[#502B30]/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#502B30]">{employeeStats.employeeName}</h2>
                  <p className="text-[#502B30]/60">Gus Mester</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-4xl font-bold text-amber-600">
                    <TrendingUp className="h-8 w-8 mr-2" />
                    {employeeStats.points}
                  </div>
                  <p className="text-sm text-[#502B30]/60">Points</p>
                </div>
              </div>
            </div>
          )}

          {/* Available Spots */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#502B30] mb-4 flex items-center">
              <Calendar className="h-6 w-6 mr-2" />
              Ledige Gus Mester Pladser ({availableSpots.length})
            </h2>
            
            {availableSpots.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow p-8 text-center border border-[#502B30]/10">
                <p className="text-[#502B30]/60">Ingen ledige pladser lige nu</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {availableSpots.map((spot) => (
                  <div key={spot.id} className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-6 border border-[#502B30]/10 hover:border-[#502B30] transition-colors">
                    <h3 className="text-xl font-bold text-[#502B30] mb-3">{spot.name}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-[#502B30]/70">
                        <Calendar className="h-4 w-4 mr-2" />
                        {format(new Date(spot.date), "EEEE d. MMMM yyyy", { locale: da })}
                      </div>
                      <div className="flex items-center text-[#502B30]/70">
                        <Clock className="h-4 w-4 mr-2" />
                        {spot.time} ({spot.duration} min)
                      </div>
                      {spot.location && (
                        <div className="flex items-center text-[#502B30]/70">
                          <MapPin className="h-4 w-4 mr-2" />
                          {spot.location}
                        </div>
                      )}
                      <div className="flex items-center text-[#502B30]/70">
                        <User className="h-4 w-4 mr-2" />
                        Vært: {spot.hostName}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[#502B30]/10">
                      <div className="flex items-center text-amber-600 font-bold">
                        <Star className="h-5 w-5 mr-2" />
                        {spot.pointCost} points
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSpot(spot);
                          setShowBookModal(true);
                        }}
                        disabled={!employeeStats || employeeStats.points < spot.pointCost}
                        className="px-4 py-2 bg-[#502B30] text-amber-100 rounded-sm hover:bg-[#5e3023] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Book Spot
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Bookings */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#502B30] mb-4 flex items-center">
              <CheckCircle className="h-6 w-6 mr-2" />
              Mine Bookede Spots ({myBookings.length})
            </h2>
            
            {myBookings.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow p-8 text-center border border-[#502B30]/10">
              <p className="text-[#502B30]/60">Du har ingen bookede spots</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myBookings.map((booking) => (
                <div key={booking.id} className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-6 border border-green-200">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-[#502B30]">{booking.name}</h3>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Booket</span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-[#502B30]/70">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(new Date(booking.date), "EEEE d. MMMM yyyy", { locale: da })}
                    </div>
                    <div className="flex items-center text-[#502B30]/70">
                      <Clock className="h-4 w-4 mr-2" />
                      {booking.time} ({booking.duration} min)
                    </div>
                    <div className="flex items-center text-[#502B30]/70">
                      <User className="h-4 w-4 mr-2" />
                      Vært: {booking.hostName}
                    </div>
                  </div>

                  {booking.canCancel ? (
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowCancelModal(true);
                      }}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors"
                    >
                      Annuller Booking
                    </button>
                  ) : (
                    <p className="text-sm text-[#502B30]/60 text-center">
                      Kan ikke annulleres (mindre end 24 timer til start)
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>

          {/* Hosting Sessions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#502B30] mb-4 flex items-center">
              <User className="h-6 w-6 mr-2" />
              Mine Hosting Sessioner ({hostingSessions.length})
            </h2>
            
            {hostingSessions.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow p-8 text-center border border-[#502B30]/10">
              <p className="text-[#502B30]/60">Du har ingen hosting sessioner</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {hostingSessions.map((session) => (
                <div key={session.id} className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-6 border border-blue-200">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-[#502B30]">{session.name}</h3>
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      session.guestSpotStatus === 'reserved_for_host' 
                        ? 'bg-blue-100 text-blue-800'
                        : session.guestSpotStatus === 'booked_by_host'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {session.guestSpotStatus === 'reserved_for_host' && 'Gæsteplads Reserveret'}
                      {session.guestSpotStatus === 'booked_by_host' && 'Gæst Booket'}
                      {session.guestSpotStatus === 'released_to_public' && 'Frigivet'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-[#502B30]/70">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(new Date(session.date), "EEEE d. MMMM yyyy", { locale: da })}
                    </div>
                    <div className="flex items-center text-[#502B30]/70">
                      <Clock className="h-4 w-4 mr-2" />
                      {session.time} ({session.duration} min)
                    </div>
                    {session.guestName && (
                      <div className="flex items-center text-[#502B30]/70">
                        <User className="h-4 w-4 mr-2" />
                        Gæst: {session.guestName}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {session.guestSpotStatus === 'reserved_for_host' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedSessionForGuest(session);
                            setShowBookGuestModal(true);
                          }}
                          className="flex-1 px-4 py-2 bg-[#502B30] text-amber-100 rounded-sm hover:bg-[#5e3023] transition-colors"
                        >
                          Book Gæst
                        </button>
                        {session.canRelease && (
                          <button
                            onClick={() => {
                              setSelectedHosting(session);
                              setShowReleaseModal(true);
                            }}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors"
                          >
                            Frigiv (+150 points)
                          </button>
                        )}
                      </>
                    )}
                    {session.guestSpotStatus === 'booked_by_host' && (
                      <p className="text-sm text-[#502B30]/60 text-center w-full">
                        Gæst booket: {session.guestName}
                      </p>
                    )}
                    {session.guestSpotStatus === 'released_to_public' && (
                      <p className="text-sm text-green-600 text-center w-full">
                        Gæsteplads frigivet til offentligheden
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </main>
      </div>
      <Footer />

      {/* Book Spot Modal */}
      {showBookModal && selectedSpot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-[#502B30] mb-4">Book Gus Mester Spot</h3>
            
            <div className="space-y-3 mb-6">
              <p className="text-[#502B30]/80"><strong>Session:</strong> {selectedSpot.name}</p>
              <p className="text-[#502B30]/80"><strong>Dato:</strong> {format(new Date(selectedSpot.date), "d. MMMM yyyy", { locale: da })}</p>
              <p className="text-[#502B30]/80"><strong>Tid:</strong> {selectedSpot.time}</p>
              <p className="text-[#502B30]/80"><strong>Vært:</strong> {selectedSpot.hostName}</p>
              <p className="text-amber-600 font-bold text-lg"><strong>Pris:</strong> {selectedSpot.pointCost} points</p>
            </div>

            <p className="text-sm text-[#502B30]/60 mb-6">
              Efter booking vil du have {(employeeStats?.points || 0) - selectedSpot.pointCost} points tilbage.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBookModal(false);
                  setSelectedSpot(null);
                }}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
              >
                Annuller
              </button>
              <button
                onClick={handleBookSpot}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-[#502B30] text-amber-100 rounded-sm hover:bg-[#5e3023] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Booker...' : 'Bekræft Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-[#502B30] mb-4">Annuller Booking</h3>
            
            <div className="space-y-3 mb-6">
              <p className="text-[#502B30]/80"><strong>Session:</strong> {selectedBooking.name}</p>
              <p className="text-[#502B30]/80"><strong>Dato:</strong> {format(new Date(selectedBooking.date), "d. MMMM yyyy", { locale: da })}</p>
              <p className="text-[#502B30]/80"><strong>Tid:</strong> {selectedBooking.time}</p>
            </div>

            <p className="text-sm text-green-600 mb-6">
              150 points vil blive returneret til din konto.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedBooking(null);
                }}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
              >
                Behold Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Annullerer...' : 'Bekræft Annullering'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Release Guest Spot Modal */}
      {showReleaseModal && selectedHosting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-[#502B30] mb-4">Frigiv Gæsteplads</h3>
            
            <div className="space-y-3 mb-6">
              <p className="text-[#502B30]/80"><strong>Session:</strong> {selectedHosting.name}</p>
              <p className="text-[#502B30]/80"><strong>Dato:</strong> {format(new Date(selectedHosting.date), "d. MMMM yyyy", { locale: da })}</p>
              <p className="text-[#502B30]/80"><strong>Tid:</strong> {selectedHosting.time}</p>
            </div>

            {selectedHosting.willEarnPoints ? (
              <p className="text-sm text-green-600 mb-6">
                Du vil tjene <strong>150 points</strong> ved at frigive gæstepladsen mindst 3 timer før sessionen.
              </p>
            ) : (
              <p className="text-sm text-amber-600 mb-6">
                Gæstepladsen vil blive frigivet, men du vil ikke tjene points da der er mindre end 3 timer til sessionen.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReleaseModal(false);
                  setSelectedHosting(null);
                }}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
              >
                Annuller
              </button>
              <button
                onClick={handleReleaseGuestSpot}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Frigiver...' : 'Frigiv Gæsteplads'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book Guest Modal */}
      {showBookGuestModal && selectedSessionForGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-[#502B30] mb-4">Book Gæst</h3>
            
            <div className="space-y-3 mb-6">
              <p className="text-[#502B30]/80"><strong>Session:</strong> {selectedSessionForGuest.name}</p>
              <p className="text-[#502B30]/80"><strong>Dato:</strong> {format(new Date(selectedSessionForGuest.date), "d. MMMM yyyy", { locale: da })}</p>
              <p className="text-[#502B30]/80"><strong>Tid:</strong> {selectedSessionForGuest.time}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  Gæstens Navn *
                </label>
                <input
                  type="text"
                  value={guestDetails.name}
                  onChange={(e) => setGuestDetails({ ...guestDetails, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  placeholder="Fulde navn"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  Gæstens Email *
                </label>
                <input
                  type="email"
                  value={guestDetails.email}
                  onChange={(e) => setGuestDetails({ ...guestDetails, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  placeholder="email@eksempel.dk"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  Gæstens Telefon (valgfrit)
                </label>
                <input
                  type="tel"
                  value={guestDetails.phone}
                  onChange={(e) => setGuestDetails({ ...guestDetails, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  placeholder="+45 12 34 56 78"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBookGuestModal(false);
                  setSelectedSessionForGuest(null);
                  setGuestDetails({ name: '', email: '', phone: '' });
                }}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors"
              >
                Annuller
              </button>
              <button
                onClick={handleBookGuestForSession}
                disabled={isSubmitting || !guestDetails.name || !guestDetails.email}
                className="flex-1 px-4 py-2 bg-[#502B30] text-amber-100 rounded-sm hover:bg-[#5e3023] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Booker...' : 'Book Gæst'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

