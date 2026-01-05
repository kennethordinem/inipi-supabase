'use client';

import { useEffect, useState, useMemo } from 'react';
import { members } from '@/lib/supabase-sdk';
import { supabase } from '@/lib/supabase';
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
  AlertCircle,
  Edit2,
  Trash2,
  X as XIcon,
  Save,
  Loader2 as LoaderIcon
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

interface Client {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  member_since: string;
  isEmployee: boolean;
}

export default function PersonalePage() {
  const [isEmployee, setIsEmployee] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessions, setSessions] = useState<StaffSession[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1, locale: da });
  });
  const [activeTab, setActiveTab] = useState<'sessions' | 'clients'>('sessions');
  const [clientSearch, setClientSearch] = useState('');
  
  // Booking management state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [availableSessions, setAvailableSessions] = useState<StaffSession[]>([]);
  const [targetSessionId, setTargetSessionId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: allClients } = await members.getAllClients();
      setClients(allClients || []);
    } catch (err: any) {
      console.error('[Personale] Error loading clients:', err);
      setError(err.message || 'Kunne ikke indlæse klienter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEmployee && activeTab === 'clients') {
      loadClients();
    }
  }, [activeTab, isEmployee]);

  const handleMoveBooking = async (participant: StaffSessionParticipant, currentSession: StaffSession) => {
    setSelectedBooking({ ...participant, currentSession });
    setActionError(null);
    setActionSuccess(null);
    
    // Load available sessions (excluding current one)
    try {
      const { sessions: allSessions } = await members.getStaffSessions({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(addWeeks(new Date(), 4), 'yyyy-MM-dd')
      });
      
      setAvailableSessions(allSessions.filter(s => s.id !== currentSession.id));
      setShowMoveModal(true);
    } catch (err: any) {
      setActionError('Kunne ikke indlæse tilgængelige sessioner');
    }
  };

  const handleCancelBooking = (participant: StaffSessionParticipant) => {
    setSelectedBooking(participant);
    setActionError(null);
    setActionSuccess(null);
    setShowCancelModal(true);
  };

  const confirmMoveBooking = async () => {
    if (!selectedBooking || !targetSessionId) return;
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      // Find booking ID - we need to get it from the database
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', selectedBooking.patientId)
        .eq('session_id', selectedBooking.currentSession.id)
        .eq('status', 'confirmed')
        .limit(1);
      
      if (!bookings || bookings.length === 0) {
        throw new Error('Booking ikke fundet');
      }
      
      const result = await members.adminMoveBooking(bookings[0].id, targetSessionId);
      
      setActionSuccess(result.message);
      setShowMoveModal(false);
      setTargetSessionId('');
      
      // Reload sessions
      await loadSessions();
    } catch (err: any) {
      setActionError(err.message || 'Kunne ikke flytte booking');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmCancelBooking = async (issueCompensation: boolean) => {
    if (!selectedBooking) return;
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      // Find booking ID
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', selectedBooking.patientId)
        .eq('status', 'confirmed')
        .limit(1);
      
      if (!bookings || bookings.length === 0) {
        throw new Error('Booking ikke fundet');
      }
      
      const result = await members.adminCancelBooking(bookings[0].id, issueCompensation);
      
      setActionSuccess(result.message);
      setShowCancelModal(false);
      
      // Reload sessions
      await loadSessions();
    } catch (err: any) {
      setActionError(err.message || 'Kunne ikke aflysebooking');
    } finally {
      setActionLoading(false);
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

  const filteredClients = useMemo(() => {
    // Filter out employees - only show actual clients
    const nonEmployeeClients = clients.filter(client => !client.isEmployee);
    
    const search = clientSearch.toLowerCase();
    if (!search) return nonEmployeeClients;
    
    return nonEmployeeClients.filter(client => 
      client.first_name?.toLowerCase().includes(search) ||
      client.last_name?.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone?.toLowerCase().includes(search)
    );
  }, [clients, clientSearch]);

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
              Ledelse
            </h1>
            <p className="mt-3 text-lg text-[#4a2329]/80">
              Administrer alle sessioner, bookinger og deltagere
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex gap-2 border-b border-[#502B30]/20">
              <button
                onClick={() => setActiveTab('sessions')}
                className={`px-6 py-3 font-semibold transition-colors relative ${
                  activeTab === 'sessions'
                    ? 'text-[#502B30] border-b-2 border-[#502B30]'
                    : 'text-[#502B30]/60 hover:text-[#502B30]/80'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-2" />
                Sessioner
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`px-6 py-3 font-semibold transition-colors relative ${
                  activeTab === 'clients'
                    ? 'text-[#502B30] border-b-2 border-[#502B30]'
                    : 'text-[#502B30]/60 hover:text-[#502B30]/80'
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Klienter
              </button>
            </div>
          </div>

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <>
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

                                        <div className="ml-4 flex items-center gap-4">
                                          <div className="text-right">
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
                                          
                                          {/* Action Buttons */}
                                          {!participant.isGuest && (
                                            <div className="flex gap-2">
                                              <button
                                                onClick={() => handleMoveBooking(participant, session)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Flyt booking"
                                              >
                                                <Edit2 className="h-4 w-4" />
                                              </button>
                                              <button
                                                onClick={() => handleCancelBooking(participant)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Aflys booking"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </div>
                                          )}
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
          </>
          )}

          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10">
              {/* Search */}
              <div className="p-6 border-b border-[#502B30]/10">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#502B30]/40 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Søg efter navn, email eller telefon..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-[#502B30]/20 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Clients Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#502B30]/5 border-b border-[#502B30]/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#502B30] uppercase tracking-wider">
                        Navn
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#502B30] uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#502B30] uppercase tracking-wider">
                        Telefon
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#502B30] uppercase tracking-wider">
                        Medlem siden
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#502B30]/10">
                    {filteredClients.map((client) => (
                        <tr key={client.id} className="hover:bg-[#502B30]/5">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-[#502B30]">
                              {client.first_name} {client.last_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-[#4a2329]/80">
                              <Mail className="h-4 w-4 mr-2 text-[#502B30]/40" />
                              {client.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-[#4a2329]/80">
                              <Phone className="h-4 w-4 mr-2 text-[#502B30]/40" />
                              {client.phone || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4a2329]/80">
                            {format(parseISO(client.member_since), 'dd MMM yyyy', { locale: da })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {clients.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="h-16 w-16 text-[#502B30]/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#502B30] mb-2">
                    Ingen klienter fundet
                  </h3>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Move Booking Modal */}
        {showMoveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[#502B30]">Flyt Booking</h2>
                  <button
                    onClick={() => setShowMoveModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XIcon className="h-6 w-6" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Flyt {selectedBooking?.patientName} til en anden session
                </p>
              </div>

              <div className="p-6">
                {actionError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {actionError}
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vælg ny session
                  </label>
                  <select
                    value={targetSessionId}
                    onChange={(e) => setTargetSessionId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  >
                    <option value="">Vælg session...</option>
                    {availableSessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.name} - {format(parseISO(session.date), 'd. MMM yyyy', { locale: da })} kl. {session.time}
                        ({session.availableSpots} ledige pladser)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowMoveModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={actionLoading}
                  >
                    Annuller
                  </button>
                  <button
                    onClick={confirmMoveBooking}
                    disabled={!targetSessionId || actionLoading}
                    className="flex-1 px-4 py-2 bg-[#502B30] text-white rounded-lg hover:bg-[#3d2024] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <>
                        <LoaderIcon className="h-4 w-4 animate-spin" />
                        Flytter...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Flyt Booking
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Booking Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[#502B30]">Aflys Booking</h2>
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {actionError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {actionError}
                  </div>
                )}

                <p className="text-gray-700 mb-6">
                  Er du sikker på, at du vil aflyse bookingen for <strong>{selectedBooking?.patientName}</strong>?
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-amber-800">
                    <strong>Kompensation:</strong> Hvis kunden ikke betalte med klippekort, vil de automatisk modtage et kompensationsklip.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={actionLoading}
                  >
                    Annuller
                  </button>
                  <button
                    onClick={() => confirmCancelBooking(false)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    Aflys uden klip
                  </button>
                  <button
                    onClick={() => confirmCancelBooking(true)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <>
                        <LoaderIcon className="h-4 w-4 animate-spin" />
                        Aflyser...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Aflys med klip
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

