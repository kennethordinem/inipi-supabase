'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { members } from '@/lib/clinio';
import { cachedMembers } from '@/lib/cachedMembers';
import type { PunchCard, Booking, AuthState } from '@/lib/members-sdk/dist/types';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Calendar, Ticket, CreditCard, Users, Clock, MapPin, User } from 'lucide-react';
import { format, parseISO, startOfMonth } from 'date-fns';
import { da } from 'date-fns/locale';

interface UpcomingClass {
  id: string;
  sessionName: string;
  date: string;
  time: string;
  duration: number;
  location?: string;
  employeeName?: string;
  color: string;
  spots: number;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([]);
  const [punchCards, setPunchCards] = useState<PunchCard[]>([]);
  const [visitsThisMonth, setVisitsThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = members.onAuthStateChanged((authState: AuthState) => {
      if (!authState.isLoading) {
        if (!authState.isAuthenticated) {
          // Not logged in, redirect to login
          window.location.href = '/login';
        } else {
          // Logged in, load data
          const email = localStorage.getItem('userEmail') || authState.user?.email || '';
          setUserEmail(email);
          loadData();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel (CACHED)
      const [profileData, bookingsData, punchCardsData] = await Promise.all([
        cachedMembers.getProfile(),
        cachedMembers.getMyBookings(),
        cachedMembers.getPunchCards()
      ]);

      setProfile(profileData);
      setPunchCards(punchCardsData.punchCards.filter((card: PunchCard) => 
        card.status === 'active' && card.remainingPunches > 0
      ));

      // Process upcoming bookings into upcoming classes format
      const upcomingBookings = bookingsData.upcoming || [];
      const upcoming: UpcomingClass[] = upcomingBookings.slice(0, 5).map((booking: any) => ({
        id: booking.id,
        sessionName: booking.type || 'Saunagus',
        date: booking.date,
        time: booking.time,
        duration: booking.duration || 60,
        location: booking.location,
        employeeName: booking.employeeName,
        color: booking.color || '#f59e0b', // Default amber color
        spots: booking.spots || 1
      }));

      setUpcomingClasses(upcoming);

      // Count visits this month
      const monthStart = startOfMonth(new Date());
      const pastBookings = bookingsData.past || [];
      const thisMonthVisits = pastBookings.filter((booking: any) => {
        try {
          const bookingDate = parseISO(booking.date);
          return bookingDate >= monthStart;
        } catch {
          return false;
        }
      }).length;

      setVisitsThisMonth(thisMonthVisits);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#502B30] mx-auto mb-4"></div>
            <p className="text-[#502B30]/80">Indlæser...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const totalPunches = punchCards.reduce((sum, card) => sum + card.remainingPunches, 0);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#faf8f5]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#502B30] tracking-wide">
              Velkommen til INIPI
            </h1>
            <p className="mt-3 text-lg text-[#4a2329]/80">
              Logget ind som: {userEmail}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Upcoming Sessions */}
            <Link 
              href="/sessions"
              className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6 hover:shadow-xl hover:border-[#502B30]/30 transition-all"
            >
              <div className="flex items-center">
                <div className="p-3 rounded-sm bg-[#502B30]/10">
                  <Calendar className="h-6 w-6 text-[#502B30]" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-[#4a2329]/70">Kommende gus</p>
                  <p className="text-2xl font-semibold text-[#502B30]">{upcomingClasses.length}</p>
                </div>
              </div>
            </Link>

            {/* Remaining Punches */}
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-sm bg-green-100">
                  <Ticket className="h-6 w-6 text-green-700" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-[#4a2329]/70">Klip tilbage</p>
                  <p className="text-2xl font-semibold text-[#502B30]">{totalPunches}</p>
                </div>
              </div>
            </div>

            {/* Visits This Month */}
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-sm bg-amber-100">
                  <Users className="h-6 w-6 text-amber-700" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-[#4a2329]/70">Besøg denne måned</p>
                  <p className="text-2xl font-semibold text-[#502B30]">{visitsThisMonth}</p>
                </div>
              </div>
            </div>

            {/* Active Cards */}
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-sm bg-orange-100">
                  <CreditCard className="h-6 w-6 text-orange-700" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-[#4a2329]/70">Aktive kort</p>
                  <p className="text-2xl font-semibold text-[#502B30]">{punchCards.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Classes Widget */}
          {upcomingClasses.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#502B30]">
                  Kommende Gus
                </h2>
                <Link
                  href="/sessions"
                  className="text-sm text-[#502B30] hover:text-[#5e3023] hover:underline font-medium"
                >
                  Se alle
                </Link>
              </div>
              <div className="space-y-3">
                {upcomingClasses.map(cls => (
                  <div key={cls.id} className="border-l-4 pl-4 py-2" style={{ borderColor: cls.color }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-[#502B30]">{cls.sessionName}</h3>
                        <div className="flex items-center text-sm text-[#4a2329]/70 mt-1 space-x-3">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(parseISO(cls.date), 'd. MMM', { locale: da })}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {cls.time}
                          </span>
                          {cls.location && (
                            <span className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {cls.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-[#502B30]">
                        {cls.spots} {cls.spots === 1 ? 'plads' : 'pladser'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Punch Cards Widget */}
          {punchCards.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#502B30]">
                  Dine Klippekort
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {punchCards.slice(0, 3).map(card => (
                  <div key={card.id} className="border border-[#502B30]/20 rounded-sm p-4 hover:border-green-600 hover:shadow-md transition-all bg-white/50">
                    <div className="flex items-start mb-3">
                      <div className="p-2 bg-green-100 rounded-sm">
                        <Ticket className="h-5 w-5 text-green-700" />
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className="font-semibold text-[#502B30] text-base">{card.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-[#502B30]/10">
                      <span className="text-sm text-[#4a2329]/70">Klip tilbage</span>
                      <span className="text-2xl font-bold text-green-700">
                        {card.remainingPunches}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {upcomingClasses.length === 0 && punchCards.length === 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-8 text-center">
              <Calendar className="h-12 w-12 text-[#502B30]/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#502B30] mb-2">
                Kom i gang
              </h3>
              <p className="text-[#4a2329]/80 mb-6">
                Du har ingen kommende gus. Book din første saunagus nu!
              </p>
              <Link
                href="/sessions"
                className="inline-flex items-center px-6 py-3 bg-[#502B30] hover:bg-[#5e3023] text-amber-100 font-medium rounded-sm transition-colors shadow-md"
              >
                Se tilgængelige gus tider
              </Link>
            </div>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
