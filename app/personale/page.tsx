'use client';

import { useEffect, useState, useMemo } from 'react';
import { members } from '@/lib/supabase-sdk';
import type { AuthState } from '@/lib/supabase-sdk';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  Calendar, 
  Users, 
  Clock, 
  MapPin, 
  Mail, 
  Phone,
  ChevronDown,
  ChevronUp,
  User,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks, getWeek } from 'date-fns';
import { da } from 'date-fns/locale';

interface StaffSession {
  id: string;
  name: string;
  description?: string;
  date: string;
  time: string;
  duration: number;
  maxParticipants: number;
  currentParticipants: number;
  availableSpots: number;
  groupTypeId: string;
  groupTypeName: string;
  groupTypeColor: string;
  employeeIds: string[];
  employeeNames: string[];
  price: number;
  location?: string;
  participants: StaffSessionParticipant[];
  reservedSpots: any | null;
}

interface StaffSessionParticipant {
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  spots: number;
  bookedAt: string | null;
  paymentStatus: string;
  paymentMethod: string;
  paymentAmount?: number;
  selectedThemeId?: string | null;
  punchCardId?: string | null;
  isGuest: boolean;
}

export default function PersonalePage() {
  const [isEmployee, setIsEmployee] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessions, setSessions] = useState<StaffSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1, locale: da });
  });

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = members.onAuthStateChanged(async (authState: AuthState) => {
      if (!authState.isLoading) {
        if (!authState.isAuthenticated) {
          // Not logged in, redirect to login
          window.location.href = '/login';
        } else {
          // Check if user is an employee with staff permission
          try {
            const employeeCheck = await members.checkIfEmployee();
            if (employeeCheck.isEmployee && employeeCheck.frontendPermissions?.staff) {
              setIsEmployee(true);
              setIsCheckingAuth(false);
              loadSessions();
            } else {
              setIsEmployee(false);
              setIsCheckingAuth(false);
              setError('Du har ikke adgang til medarbejderområdet. Kontakt din administrator for at få adgang.');
            }
          } catch (err: any) {
            console.error('Error checking employee status:', err);
            setIsEmployee(false);
            setIsCheckingAuth(false);
            setError('Kunne ikke verificere medarbejderstatus.');
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isEmployee) {
      loadSessions();
    }
  }, [currentWeekStart, isEmployee]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1, locale: da });
      
      const { sessions: data } = await members.getStaffSessions({
        startDate: format(currentWeekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd')
      });
      
      setSessions(data);
    } catch (err: any) {
      console.error('[Personale] Error loading sessions:', err);
      setError(err.message || 'Kunne ikke indlæse sessioner');
    } finally {
      setLoading(false);
    }
  };

  const toggleSessionExpanded = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };
  
  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };
  
  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1, locale: da }));
  };

  const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1, locale: da });
  const currentMonthYear = format(currentWeekStart, 'MMMM yyyy', { locale: da });

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped = new Map<string, StaffSession[]>();
    
    sessions.forEach(session => {
      const dateKey = format(parseISO(session.date), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(session);
    });
    
    // Sort sessions within each day by time
    grouped.forEach((daySessions) => {
      daySessions.sort((a, b) => a.time.localeCompare(b.time));
    });
    
    return grouped;
  }, [sessions]);

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'punch_card':
      case 'punchCard':
        return 'Klippekort';
      case 'stripe':
        return 'Kort';
      case 'vipps':
        return 'MobilePay';
      case 'manual':
        return 'Manuel';
      default:
        return method;
    }
  };

  if (isCheckingAuth || loading) {
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

  if (!isEmployee || error) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-sm p-8 max-w-md shadow-lg text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-red-800 font-semibold mb-2 text-xl">Ingen adgang</h2>
            <p className="text-red-600">{error || 'Du har ikke adgang til personaleområdet.'}</p>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="mt-6 bg-[#502B30] text-amber-100 px-6 py-3 rounded-sm hover:bg-[#5e3023] transition-colors"
            >
              Tilbage til Dashboard
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#502B30] tracking-wide flex items-center">
              <Users className="h-10 w-10 mr-3" />
              Medarbejder
            </h1>
            <p className="mt-3 text-lg text-[#4a2329]/80">
              Oversigt over alle bookinger og deltagere
            </p>
          </div>

          {/* Week Navigation */}
          <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-[#502B30]/60" />
                <div>
                  <h2 className="text-lg font-semibold text-[#502B30] capitalize">
                    {currentMonthYear}
                  </h2>
                  <p className="text-sm text-[#502B30]/60">
                    Uge {weekNumber}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousWeek}
                  className="p-2 rounded-sm border border-[#502B30]/20 hover:bg-[#502B30]/10 transition-colors"
                  title="Forrige uge"
                >
                  <svg className="h-5 w-5 text-[#502B30]/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={goToToday}
                  className="px-3 py-2 rounded-sm border border-[#502B30]/20 hover:bg-[#502B30]/10 transition-colors text-sm font-medium text-[#502B30]"
                >
                  I dag
                </button>
                
                <button
                  onClick={goToNextWeek}
                  className="p-2 rounded-sm border border-[#502B30]/20 hover:bg-[#502B30]/10 transition-colors"
                  title="Næste uge"
                >
                  <svg className="h-5 w-5 text-[#502B30]/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Sessions List */}
          <div className="space-y-4">
            {Array.from(sessionsByDate.entries())
              .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
              .map(([dateKey, daySessions]) => (
                <div key={dateKey} className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 overflow-hidden">
                  {/* Date Header */}
                  <div className="bg-[#502B30]/5 px-6 py-4 border-b border-[#502B30]/10">
                    <h3 className="text-lg font-semibold text-[#502B30] capitalize">
                      {format(parseISO(dateKey), 'EEEE d. MMMM yyyy', { locale: da })}
                    </h3>
                    <p className="text-sm text-[#502B30]/60 mt-1">
                      {daySessions.length} {daySessions.length === 1 ? 'session' : 'sessioner'}
                    </p>
                  </div>

                  {/* Sessions for this day */}
                  <div className="divide-y divide-[#502B30]/10">
                    {daySessions.map(session => {
                      const isExpanded = expandedSessions.has(session.id);
                      const [hours, minutes] = session.time.split(':').map(Number);
                      const endMinutes = hours * 60 + minutes + session.duration;
                      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

                      return (
                        <div key={session.id} className="p-6">
                          {/* Session Header */}
                          <button
                            onClick={() => toggleSessionExpanded(session.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div 
                                    className="h-3 w-3 rounded-full" 
                                    style={{ backgroundColor: session.groupTypeColor }}
                                  />
                                  <h4 className="text-xl font-bold text-[#502B30]">
                                    {session.name}
                                  </h4>
                                  <span className="text-sm px-3 py-1 rounded-sm bg-[#502B30]/10 text-[#502B30] font-medium">
                                    {session.groupTypeName}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-sm text-[#4a2329]/70">
                                  <span className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1.5" />
                                    {session.time} - {endTime} ({session.duration} min)
                                  </span>
                                  {session.location && (
                                    <span className="flex items-center">
                                      <MapPin className="h-4 w-4 mr-1.5" />
                                      {session.location}
                                    </span>
                                  )}
                                  {session.employeeNames.length > 0 && (
                                    <span className="flex items-center">
                                      <User className="h-4 w-4 mr-1.5" />
                                      {session.employeeNames.join(', ')}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-6 mt-3">
                                  <div className="flex items-center">
                                    <Users className="h-4 w-4 mr-1.5 text-[#502B30]/60" />
                                    <span className="text-sm font-semibold text-[#502B30]">
                                      {session.currentParticipants}/{session.maxParticipants} deltagere
                                    </span>
                                  </div>
                                  {session.availableSpots > 0 ? (
                                    <span className="text-sm text-green-600 font-medium">
                                      {session.availableSpots} ledige pladser
                                    </span>
                                  ) : (
                                    <span className="text-sm text-orange-600 font-medium">
                                      Fuldt booket
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="ml-4">
                                {isExpanded ? (
                                  <ChevronUp className="h-6 w-6 text-[#502B30]/60" />
                                ) : (
                                  <ChevronDown className="h-6 w-6 text-[#502B30]/60" />
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Participants List (Expanded) */}
                          {isExpanded && (
                            <div className="mt-6 pt-6 border-t border-[#502B30]/10">
                              {session.participants.length > 0 ? (
                                <div className="space-y-3">
                                  <h5 className="font-semibold text-[#502B30] mb-4">
                                    Deltagerliste ({session.participants.length})
                                  </h5>
                                  {session.participants.map((participant, idx) => (
                                    <div 
                                      key={idx}
                                      className="bg-[#faf8f5] rounded-sm p-4 border border-[#502B30]/10"
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2">
                                            <User className="h-4 w-4 text-[#502B30]/60" />
                                            <span className="font-semibold text-[#502B30]">
                                              {participant.patientName}
                                            </span>
                                            {participant.isGuest && (
                                              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-sm">
                                                Gæst
                                              </span>
                                            )}
                                          </div>

                                          <div className="space-y-1 text-sm text-[#4a2329]/70">
                                            {participant.patientEmail && (
                                              <div className="flex items-center">
                                                <Mail className="h-3 w-3 mr-2" />
                                                {participant.patientEmail}
                                              </div>
                                            )}
                                            {participant.patientPhone && (
                                              <div className="flex items-center">
                                                <Phone className="h-3 w-3 mr-2" />
                                                {participant.patientPhone}
                                              </div>
                                            )}
                                            <div className="flex items-center gap-4 mt-2">
                                              <span className="flex items-center">
                                                <Users className="h-3 w-3 mr-1.5" />
                                                {participant.spots} {participant.spots === 1 ? 'plads' : 'pladser'}
                                              </span>
                                              {participant.bookedAt && (
                                                <span className="flex items-center text-xs">
                                                  <Clock className="h-3 w-3 mr-1.5" />
                                                  Booket {format(parseISO(participant.bookedAt), 'd. MMM HH:mm', { locale: da })}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="ml-4 text-right">
                                          <div className="flex items-center gap-2 mb-2">
                                            {getPaymentStatusIcon(participant.paymentStatus)}
                                            <span className="text-sm font-medium text-[#502B30]">
                                              {participant.paymentStatus === 'paid' ? 'Betalt' : 
                                               participant.paymentStatus === 'pending' ? 'Afventer' : 
                                               'Fejl'}
                                            </span>
                                          </div>
                                          <div className="text-xs text-[#4a2329]/70">
                                            {getPaymentMethodLabel(participant.paymentMethod)}
                                            {participant.punchCardId && (
                                              <div className="flex items-center justify-end mt-1">
                                                <CreditCard className="h-3 w-3 mr-1" />
                                                Klippekort
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-[#502B30]/60">
                                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                  <p>Ingen deltagere endnu</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

            {sessions.length === 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-12 text-center">
                <Calendar className="h-16 w-16 text-[#502B30]/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[#502B30] mb-2">
                  Ingen sessioner denne uge
                </h3>
                <p className="text-sm text-[#502B30]/60">
                  Der er ingen planlagte sessioner i den valgte periode
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

