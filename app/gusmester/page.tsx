'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Star, AlertCircle, CheckCircle, TrendingUp, MapPin, FileText } from 'lucide-react';
import { members } from '@/lib/supabase-sdk';
import { cachedMembers } from '@/lib/cachedMembers';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { format, parseISO } from 'date-fns';
import { da } from 'date-fns/locale';

interface AvailableSpot {
  id: string;
  spotId: string;
  name: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  hostName: string;
  spotType: string;
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
  gusmesterSpot?: {
    id: string;
    status: string;
    spotType: string;
    autoRelease: boolean;
    canManuallyRelease: boolean;
  } | null;
  guestSpot?: {
    id: string;
    status: string;
    spotType: string;
    guestName?: string;
    guestEmail?: string;
    canRelease: boolean;
    willEarnPoints: boolean;
    autoRelease: boolean;
  } | null;
  hoursUntilEvent: number;
}

interface PointsHistoryItem {
  id: string;
  amount: number;
  reason: string;
  timestamp: string;
  related_session_id?: string;
  related_booking_id?: string;
  sessionName?: string;
  sessionDate?: string;
  sessionTime?: string;
}

export default function GusmesterPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [employeeStats, setEmployeeStats] = useState<{ employeeName: string; points: number; pointsHistory: PointsHistoryItem[]; autoReleasePreference?: string } | null>(null);
  const [availableSpots, setAvailableSpots] = useState<AvailableSpot[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [hostingSessions, setHostingSessions] = useState<HostingSession[]>([]);
  const [showPointsHistory, setShowPointsHistory] = useState(false);
  const [autoReleasePreference, setAutoReleasePreference] = useState<string>('never');
  
  // Tab state - default to 'hosting'
  const [activeTab, setActiveTab] = useState<'hosting' | 'available' | 'bookings' | 'settings'>('hosting');
  
  // Week filter state
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = this week, 1 = next week, -1 = last week
  
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
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedSessionForParticipants, setSelectedSessionForParticipants] = useState<HostingSession | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [attendanceState, setAttendanceState] = useState<Record<string, boolean>>({});
  
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

  // Helper function to get week start and end dates
  const getWeekDates = (weekOffset: number) => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay; // Monday as start of week
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { start: monday, end: sunday };
  };

  // Filter sessions by current week
  const filterByWeek = <T extends { date: string }>(items: T[]): T[] => {
    const { start, end } = getWeekDates(currentWeekOffset);
    return items.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= start && itemDate <= end;
    });
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Load employee stats
      const stats = await members.getEmployeeStats();
      setEmployeeStats(stats);
      setAutoReleasePreference(stats.autoReleasePreference || 'never');

      // Load available spots and sort by date/time
      const spotsData = await members.getAvailableGusmesterSpots();
      const sortedSpots = spotsData.spots.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
      setAvailableSpots(sortedSpots);

      // Load my bookings and sort by date/time
      const bookingsData = await cachedMembers.getMyGusmesterBookings();
      const sortedBookings = bookingsData.bookings.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
      setMyBookings(sortedBookings);

      // Load hosting sessions and sort by date/time
      const hostingData = await members.getMyHostingSessions();
      const sortedHosting = hostingData.sessions.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
      setHostingSessions(sortedHosting);

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

      await cachedMembers.bookGusmesterSpot(selectedSpot.id);

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

      await cachedMembers.cancelGusmesterBooking(selectedBooking.id);

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

      // Invalidate caches to refresh session availability
      cachedMembers.invalidateAfterBooking();

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

  const handleBookSelfAsGuest = async (sessionId: string) => {
    if (!employeeStats) return;

    try {
      setIsSubmitting(true);
      setError('');

      // Book self - use employee's own name and email
      await members.bookSelfAsGuest(sessionId);

      setSuccess('Du har booket dig selv som gæst!');

      // Reload data
      await loadData();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('[Gusmester] Book self error:', err);
      setError(err.message || 'Kunne ikke booke dig selv');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookGuestForSession = async () => {
    if (!selectedSessionForGuest) return;

    // Validate guest details - only name is required
    if (!guestDetails.name) {
      setError('Udfyld venligst gæstens navn');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await members.bookGuestForSession(
        selectedSessionForGuest.id,
        guestDetails.name,
        guestDetails.email || '', // Email is optional
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

  const handleUpdateAutoRelease = async (preference: string) => {
    try {
      setIsSubmitting(true);
      setError('');

      await members.updateAutoReleasePreference(preference);
      setAutoReleasePreference(preference);
      setSuccess('Automatisk frigivelse opdateret!');

      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      console.error('[Gusmester] Update auto-release error:', err);
      setError(err.message || 'Kunne ikke opdatere indstilling');
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

          {/* Tabs Navigation */}
          <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 overflow-hidden">
            {/* Week Navigation - Only show for non-settings tabs */}
            {activeTab !== 'settings' && (
              <div className="flex items-center justify-between px-6 py-3 bg-amber-50 border-b border-[#502B30]/10">
                <button
                  onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
                  className="px-4 py-2 text-sm bg-white text-[#502B30] rounded-sm hover:bg-gray-50 transition-colors border border-[#502B30]/20"
                >
                  ← Forrige Uge
                </button>
                <div className="text-center">
                  <p className="text-sm font-medium text-[#502B30]">
                    {currentWeekOffset === 0 ? 'Denne Uge' : currentWeekOffset > 0 ? `Om ${currentWeekOffset} uge${currentWeekOffset > 1 ? 'r' : ''}` : `${Math.abs(currentWeekOffset)} uge${Math.abs(currentWeekOffset) > 1 ? 'r' : ''} siden`}
                  </p>
                  <p className="text-xs text-[#502B30]/60">
                    {format(getWeekDates(currentWeekOffset).start, 'd. MMM', { locale: da })} - {format(getWeekDates(currentWeekOffset).end, 'd. MMM yyyy', { locale: da })}
                  </p>
                </div>
                <button
                  onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
                  className="px-4 py-2 text-sm bg-white text-[#502B30] rounded-sm hover:bg-gray-50 transition-colors border border-[#502B30]/20"
                >
                  Næste Uge →
                </button>
              </div>
            )}
            <div className="flex border-b border-[#502B30]/10">
              <button
                onClick={() => setActiveTab('hosting')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === 'hosting'
                    ? 'bg-[#502B30] text-amber-100'
                    : 'text-[#502B30] hover:bg-[#502B30]/5'
                }`}
              >
                <div className="flex items-center justify-center">
                  <User className="h-5 w-5 mr-2" />
                  Mine Gusmester Sessioner ({filterByWeek(hostingSessions).length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('available')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === 'available'
                    ? 'bg-[#502B30] text-amber-100'
                    : 'text-[#502B30] hover:bg-[#502B30]/5'
                }`}
              >
                <div className="flex items-center justify-center">
                  <Star className="h-5 w-5 mr-2" />
                  Ledige Gusmester Pladser ({filterByWeek(availableSpots).length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === 'bookings'
                    ? 'bg-[#502B30] text-amber-100'
                    : 'text-[#502B30] hover:bg-[#502B30]/5'
                }`}
              >
                <div className="flex items-center justify-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Mine Bookinger ({filterByWeek(myBookings).length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-[#502B30] text-amber-100'
                    : 'text-[#502B30] hover:bg-[#502B30]/5'
                }`}
              >
                <div className="flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Indstillinger
                </div>
              </button>
            </div>
          </div>

          {/* Settings Tab */}
          {activeTab === 'settings' && employeeStats && (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-6 mb-8 border border-[#502B30]/10">
              <div className="flex items-center justify-between mb-4">
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
              
              <button
                onClick={() => setShowPointsHistory(!showPointsHistory)}
                className="w-full px-4 py-2 bg-[#502B30]/10 text-[#502B30] rounded-sm hover:bg-[#502B30]/20 transition-colors flex items-center justify-center"
              >
                <FileText className="h-4 w-4 mr-2" />
                {showPointsHistory ? 'Skjul Point Historik' : 'Vis Point Historik'}
              </button>

              {showPointsHistory && (
                <div className="mt-4 border-t border-[#502B30]/10 pt-4">
                  <h3 className="text-lg font-semibold text-[#502B30] mb-3">Point Historik</h3>
                  
                  {employeeStats.pointsHistory && employeeStats.pointsHistory.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {employeeStats.pointsHistory
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 rounded-sm border ${
                              item.amount > 0
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className={`font-semibold ${
                                  item.amount > 0 ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {item.amount > 0 ? '+' : ''}{item.amount} points
                                </p>
                                <p className="text-sm text-[#502B30]/70 mt-1">{item.reason}</p>
                                {item.sessionName && (
                                  <div className="mt-2 pt-2 border-t border-[#502B30]/10">
                                    <p className="text-sm font-medium text-[#502B30]">{item.sessionName}</p>
                                    {item.sessionDate && (
                                      <p className="text-xs text-[#502B30]/60 mt-1">
                                        {format(parseISO(item.sessionDate), 'd. MMMM yyyy', { locale: da })}
                                        {item.sessionTime && ` kl. ${item.sessionTime.substring(0, 5)}`}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-[#502B30]/60">
                                  {format(new Date(item.timestamp), 'd. MMM yyyy', { locale: da })}
                                </p>
                                <p className="text-xs text-[#502B30]/60">
                                  {format(new Date(item.timestamp), 'HH:mm', { locale: da })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#502B30]/60 text-center py-4">
                      Ingen point historik endnu
                    </p>
                  )}
                </div>
              )}

              {/* Auto-Release Preference */}
              <div className="mt-4 border-t border-[#502B30]/10 pt-4">
                <h3 className="text-lg font-semibold text-[#502B30] mb-3">Automatisk Frigivelse af Gæsteplads</h3>
                <p className="text-sm text-[#502B30]/60 mb-4">
                  Vælg hvornår din gæsteplads skal frigives automatisk, hvis du ikke har booket den:
                </p>
                
                <div className="space-y-3">
                  <label className="flex items-start p-3 border border-[#502B30]/20 rounded-sm cursor-pointer hover:bg-[#502B30]/5 transition-colors">
                    <input
                      type="radio"
                      name="autoRelease"
                      value="never"
                      checked={autoReleasePreference === 'never'}
                      onChange={(e) => handleUpdateAutoRelease(e.target.value)}
                      disabled={isSubmitting}
                      className="mt-1 mr-3 text-[#502B30] focus:ring-[#502B30]"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-[#502B30]">Min Gusmesterplads skal ikke frigives automatisk</p>
                      <p className="text-sm text-[#502B30]/60 mt-1">Du skal frigive manuelt</p>
                    </div>
                  </label>

                  <label className="flex items-start p-3 border border-[#502B30]/20 rounded-sm cursor-pointer hover:bg-[#502B30]/5 transition-colors">
                    <input
                      type="radio"
                      name="autoRelease"
                      value="24_hours"
                      checked={autoReleasePreference === '24_hours'}
                      onChange={(e) => handleUpdateAutoRelease(e.target.value)}
                      disabled={isSubmitting}
                      className="mt-1 mr-3 text-[#502B30] focus:ring-[#502B30]"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-[#502B30]">Min Gusmesterplads skal frigives automatisk 24 timer før min gus, hvis jeg ikke har booket den</p>
                      <p className="text-sm text-[#502B30]/60 mt-1">Maksimerer chancen for at andre kan booke pladsen</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Available Spots Tab */}
          {activeTab === 'available' && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#502B30] mb-4 flex items-center">
              <Star className="h-6 w-6 mr-2" />
              Ledige Gus Mester Pladser
            </h2>
            
            {filterByWeek(availableSpots).length === 0 ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow p-8 text-center border border-[#502B30]/10">
                <p className="text-[#502B30]/60">Ingen ledige pladser lige nu</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filterByWeek(availableSpots).map((spot) => (
                  <div key={spot.spotId} className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-6 border border-[#502B30]/10 hover:border-[#502B30] transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-[#502B30]">{spot.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        spot.spotType === 'gusmester_spot' 
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {spot.spotType === 'gusmester_spot' ? 'Gusmester Plads' : 'Gæste Plads'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-[#502B30]/70">
                        <Calendar className="h-4 w-4 mr-2" />
                        {format(new Date(spot.date), "EEEE d. MMMM yyyy", { locale: da })}
                      </div>
                      <div className="flex items-center text-[#502B30]/70">
                        <Clock className="h-4 w-4 mr-2" />
                        {spot.time.substring(0, 5)} ({spot.duration} min)
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
          )}

          {/* My Bookings Tab */}
          {activeTab === 'bookings' && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#502B30] mb-4 flex items-center">
              <Calendar className="h-6 w-6 mr-2" />
              Mine Bookede Spots
            </h2>
            
            {filterByWeek(myBookings).length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow p-8 text-center border border-[#502B30]/10">
              <p className="text-[#502B30]/60">Du har ingen bookede spots</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filterByWeek(myBookings).map((booking) => (
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
                      {booking.time.substring(0, 5)} ({booking.duration} min)
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
          )}

          {/* Hosting Sessions Tab */}
          {activeTab === 'hosting' && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#502B30] mb-4 flex items-center">
              <User className="h-6 w-6 mr-2" />
              Mine Hosting Sessioner
            </h2>
            
            {filterByWeek(hostingSessions).length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow p-8 text-center border border-[#502B30]/10">
              <p className="text-[#502B30]/60">Du har ingen hosting sessioner</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filterByWeek(hostingSessions).map((session) => (
                <div key={session.id} className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-6 border border-blue-200">
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-[#502B30] mb-2">{session.name}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-[#502B30]/70">
                        <Calendar className="h-4 w-4 mr-2" />
                        {format(new Date(session.date), "EEEE d. MMMM yyyy", { locale: da })}
                      </div>
                      <div className="flex items-center text-[#502B30]/70">
                        <Clock className="h-4 w-4 mr-2" />
                        {session.time.substring(0, 5)} ({session.duration} min)
                      </div>
                    </div>
                  </div>

                  {/* Gusmester Spot - Auto-released 3h before */}
                  {session.gusmesterSpot && (
                    <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-amber-900 flex items-center">
                          <Star className="h-4 w-4 mr-1" />
                          Gusmester Plads
                        </h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          session.gusmesterSpot.status === 'reserved_for_host' 
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {session.gusmesterSpot.status === 'reserved_for_host' && 'Reserveret'}
                          {session.gusmesterSpot.status === 'released_to_public' && 'Frigivet'}
                          {session.gusmesterSpot.status === 'booked_by_gusmester' && 'Booket'}
                        </span>
                      </div>
                      <p className="text-xs text-amber-700">
                        Automatisk frigivet 3 timer før event
                      </p>
                    </div>
                  )}

                  {/* Guest Spot - Manually releasable, earns points */}
                  {session.guestSpot && (
                    <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-blue-900 flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          Gæste Plads
                        </h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          session.guestSpot.status === 'reserved_for_host' 
                            ? 'bg-blue-100 text-blue-800'
                            : session.guestSpot.status === 'booked_by_host'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {session.guestSpot.status === 'reserved_for_host' && 'Reserveret'}
                          {session.guestSpot.status === 'booked_by_host' && 'Booket'}
                          {session.guestSpot.status === 'released_to_public' && 'Frigivet'}
                        </span>
                      </div>
                      
                      {session.guestSpot.guestName && (
                        <p className="text-sm text-blue-700 mb-2">
                          Gæst: {session.guestSpot.guestName}
                        </p>
                      )}

                      <div className="flex gap-2 mt-3">
                        {session.guestSpot.status === 'reserved_for_host' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedSessionForGuest(session);
                                setShowBookGuestModal(true);
                              }}
                              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors"
                            >
                              Book Gæst
                            </button>
                            {session.guestSpot.canRelease && (
                              <button
                                onClick={() => {
                                  setSelectedHosting(session);
                                  setShowReleaseModal(true);
                                }}
                                className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-sm hover:bg-green-700 transition-colors"
                              >
                                Frigiv {session.guestSpot.willEarnPoints && '(+150)'}
                              </button>
                            )}
                          </>
                        )}
                        {session.guestSpot.status === 'booked_by_host' && (
                          <p className="text-sm text-[#502B30]/60 text-center w-full">
                            {session.guestSpot.guestName ? `Gæst booket: ${session.guestSpot.guestName}` : 'Vært bruger pladsen'}
                          </p>
                        )}
                        {session.guestSpot.status === 'released_to_public' && (
                          <p className="text-sm text-green-600 text-center w-full">
                            Frigivet til offentligheden
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* View Participants Button */}
                  <button
                    onClick={async () => {
                      setSelectedSessionForParticipants(session);
                      setShowParticipantsModal(true);
                      setLoadingParticipants(true);
                      try {
                        const participantsList = await members.getStaffSessionParticipants(session.id);
                        setParticipants(participantsList || []);
                        
                        // Initialize attendance state from participant data
                        const initialAttendance: Record<string, boolean> = {};
                        (participantsList || []).forEach((p: any) => {
                          const key = p.isGuest ? `guest_${p.patientId}` : `booking_${p.patientId}`;
                          initialAttendance[key] = p.attended || false;
                        });
                        setAttendanceState(initialAttendance);
                      } catch (err) {
                        console.error('Error loading participants:', err);
                        setParticipants([]);
                      } finally {
                        setLoadingParticipants(false);
                      }
                    }}
                    className="w-full px-4 py-2 bg-[#502B30] text-white rounded-sm hover:bg-[#5e3023] transition-colors flex items-center justify-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Se Deltagere
                  </button>
                </div>
              ))}
            </div>
          )}
          </div>
          )}
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
              <p className="text-[#502B30]/80"><strong>Tid:</strong> {selectedSpot.time.substring(0, 5)}</p>
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
              <p className="text-[#502B30]/80"><strong>Tid:</strong> {selectedBooking.time.substring(0, 5)}</p>
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
              <p className="text-[#502B30]/80"><strong>Tid:</strong> {selectedHosting.time.substring(0, 5)}</p>
            </div>

            {selectedHosting.guestSpot?.willEarnPoints ? (
              <p className="text-sm text-green-600 mb-6">
                Du får <strong>150 points</strong> for denne frigivelse.
              </p>
            ) : (
              <p className="text-sm text-amber-600 mb-6">
                Gæstepladsen vil blive frigivet, men du vil ikke få points da der er mindre end 3 timer til sessionen.
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
              <p className="text-[#502B30]/80"><strong>Tid:</strong> {selectedSessionForGuest.time.substring(0, 5)}</p>
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
                  Gæstens Email (valgfrit)
                </label>
                <input
                  type="text"
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
                disabled={isSubmitting || !guestDetails.name}
                className="flex-1 px-4 py-2 bg-[#502B30] text-amber-100 rounded-sm hover:bg-[#5e3023] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Booker...' : 'Book Gæst'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipantsModal && selectedSessionForParticipants && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <h3 className="text-xl font-bold text-[#502B30] mb-4">Deltagere</h3>
            
            <div className="space-y-3 mb-6">
              <p className="text-[#502B30]/80"><strong>Session:</strong> {selectedSessionForParticipants.name}</p>
              <p className="text-[#502B30]/80"><strong>Dato:</strong> {format(new Date(selectedSessionForParticipants.date), "d. MMMM yyyy", { locale: da })}</p>
              <p className="text-[#502B30]/80"><strong>Tid:</strong> {selectedSessionForParticipants.time.substring(0, 5)}</p>
            </div>

            {loadingParticipants ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#502B30] mx-auto mb-4"></div>
                <p className="text-[#502B30]/60">Indlæser deltagere...</p>
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[#502B30]/60">Ingen deltagere endnu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {participants.map((participant, index) => (
                  <div key={index} className="bg-gray-50 rounded-sm p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-[#502B30]">{participant.patientName}</p>
                        {participant.patientEmail && (
                          <p className="text-sm text-[#502B30]/60">{participant.patientEmail}</p>
                        )}
                        {participant.patientPhone && (
                          <p className="text-sm text-[#502B30]/60">{participant.patientPhone}</p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-xs text-[#502B30]/50">
                          <span>{participant.spots} {participant.spots === 1 ? 'plads' : 'pladser'}</span>
                          <span>Betaling: {participant.paymentMethod === 'punch_card' ? 'Klippekort' : participant.paymentMethod === 'gusmester' ? 'Points' : 'Kort'}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={attendanceState[participant.isGuest ? `guest_${participant.patientId}` : `booking_${participant.patientId}`] || false}
                            onChange={() => {
                              const key = participant.isGuest ? `guest_${participant.patientId}` : `booking_${participant.patientId}`;
                              setAttendanceState(prev => ({
                                ...prev,
                                [key]: !prev[key]
                              }));
                            }}
                            className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            title="Markér som mødt op"
                          />
                          <span className="ml-2 text-sm text-[#502B30]/70">Mødt</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowParticipantsModal(false);
                  setSelectedSessionForParticipants(null);
                  setParticipants([]);
                  setAttendanceState({});
                }}
                className="flex-1 px-4 py-2 border border-[#502B30] text-[#502B30] rounded-sm hover:bg-[#502B30]/5 transition-colors"
                disabled={isSubmitting}
              >
                Annuller
              </button>
              <button
                onClick={async () => {
                  if (!selectedSessionForParticipants) return;

                  try {
                    setIsSubmitting(true);
                    setError('');

                    // Save attendance for each participant
                    for (const participant of participants) {
                      const key = participant.isGuest ? `guest_${participant.patientId}` : `booking_${participant.patientId}`;
                      const attended = attendanceState[key] || false;

                      await members.updateParticipantAttendance(
                        selectedSessionForParticipants.id,
                        participant.patientId,
                        attended,
                        participant.isGuest
                      );
                    }

                    setSuccess('Fremmøde gemt!');
                    setShowParticipantsModal(false);
                    setSelectedSessionForParticipants(null);
                    setParticipants([]);
                    setAttendanceState({});

                    setTimeout(() => setSuccess(''), 3000);
                  } catch (err: any) {
                    console.error('[Gusmester] Save attendance error:', err);
                    setError(err.message || 'Kunne ikke gemme fremmøde');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="flex-1 px-4 py-2 bg-[#502B30] text-white rounded-sm hover:bg-[#5e3023] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Gemmer...' : 'Gem Fremmøde'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

