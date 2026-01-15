'use client';

import { useEffect, useState, useMemo } from 'react';
import { members } from '@/lib/supabase-sdk';
import { supabase } from '@/lib/supabase';
import type { AuthState } from '@/lib/supabase-sdk';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ClientDetailsModal } from '../components/ClientDetailsModal';
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
  Loader2 as LoaderIcon,
  TrendingUp,
  Filter,
  RefreshCw,
  History,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
  BarChart3
} from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks, getWeek, addDays, isSameDay, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
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

interface Employee {
  id: string;
  name: string;
  email: string;
}

type ViewMode = 'calendar' | 'list';

export default function PersonalePage() {
  const [isEmployee, setIsEmployee] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessions, setSessions] = useState<StaffSession[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1, locale: da });
  });
  const [activeTab, setActiveTab] = useState<'sessions' | 'clients'>('sessions');
  const [clientSearch, setClientSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  
  // Filters
  const [selectedGusmester, setSelectedGusmester] = useState<string>('');
  const [selectedGroupType, setSelectedGroupType] = useState<string>('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('');
  const [showOnlyBookedPrivate, setShowOnlyBookedPrivate] = useState<boolean>(false);
  
  // Booking management state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [showSessionDetailsModal, setShowSessionDetailsModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<StaffSession | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [availableSessions, setAvailableSessions] = useState<StaffSession[]>([]);
  const [targetSessionId, setTargetSessionId] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [newGusmesterId, setNewGusmesterId] = useState('');
  
  // Client details modal state
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = members.onAuthStateChanged(async (authState: AuthState) => {
      if (!authState.isLoading) {
        if (!authState.isAuthenticated) {
          window.location.href = '/login';
        } else {
          try {
            const employeeCheck = await members.checkIfEmployee();
            if (employeeCheck.isEmployee && employeeCheck.frontendPermissions?.staff) {
              setIsEmployee(true);
              setIsCheckingAuth(false);
              loadData();
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

  const loadData = async () => {
    await Promise.all([
      loadSessions(),
      loadEmployees()
    ]);
  };

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

  const loadEmployees = async () => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('id, name, email')
        .eq('status', 'active')
        .order('name');
      
      if (data) {
        setEmployees(data);
      }
    } catch (err: any) {
      console.error('[Personale] Error loading employees:', err);
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

  const handleViewSessionDetails = (session: StaffSession) => {
    setSelectedSession(session);
    setShowSessionDetailsModal(true);
  };

  const handleEditSession = (session: StaffSession) => {
    setSelectedSession(session);
    setNewGusmesterId(session.employeeIds[0] || '');
    setShowEditSessionModal(true);
  };

  const handleSaveSessionChanges = async () => {
    if (!selectedSession || !newGusmesterId) return;
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      // Update session_employees
      await supabase
        .from('session_employees')
        .delete()
        .eq('session_id', selectedSession.id);
      
      await supabase
        .from('session_employees')
        .insert({
          session_id: selectedSession.id,
          employee_id: newGusmesterId
        });
      
      setActionSuccess('Gusmester opdateret!');
      setShowEditSessionModal(false);
      await loadSessions();
      
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Kunne ikke opdatere session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveBooking = async (participant: StaffSessionParticipant, currentSession: StaffSession) => {
    setSelectedBooking({ ...participant, currentSession });
    setActionError(null);
    setActionSuccess(null);
    setActionReason('');
    setTargetSessionId('');

    // Load available sessions first
    try {
      const { sessions: allSessions } = await members.getStaffSessions({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(addWeeks(new Date(), 4), 'yyyy-MM-dd')
      });

      // Check if current session is a private event
      const isPrivateEvent = participant.selectedThemeId || currentSession.groupTypeName.toLowerCase().includes('privat');

      // Filter sessions based on booking type
      const filtered = allSessions.filter(s => {
        if (s.id === currentSession.id) return false; // Exclude current session
        
        // If moving a private event booking, only show empty private event sessions
        if (isPrivateEvent) {
          const isPrivate = s.groupTypeName.toLowerCase().includes('privat');
          const isEmpty = s.currentParticipants === 0;
          return isPrivate && isEmpty;
        }
        
        // For regular bookings, show all sessions with available spots
        return s.availableSpots >= participant.spots;
      });

      setAvailableSessions(filtered);

      // Close session details modal and open move modal
      setShowSessionDetailsModal(false);
      setShowMoveModal(true);
    } catch (err: any) {
      setActionError('Kunne ikke indlæse tilgængelige sessioner');
    }
  };

  const handleCancelBooking = (participant: StaffSessionParticipant) => {
    setSelectedBooking(participant);
    setActionError(null);
    setActionSuccess(null);
    setActionReason('');
    
    // Close session details modal and open cancel modal
    setShowSessionDetailsModal(false);
    setShowCancelModal(true);
  };

  const confirmMoveBooking = async () => {
    if (!selectedBooking || !targetSessionId || !actionReason.trim()) {
      setActionError('Udfyld venligst både session og årsag');
      return;
    }
    
    setActionLoading(true);
    setActionError(null);
    
    try {
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
      
      const result = await members.adminMoveBooking(bookings[0].id, targetSessionId, actionReason);
      
      setActionSuccess(result.message);
      setShowMoveModal(false);
      setTargetSessionId('');
      setActionReason('');
      
      await loadSessions();
    } catch (err: any) {
      setActionError(err.message || 'Kunne ikke flytte booking');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmCancelBooking = async (issueCompensation: boolean) => {
    if (!selectedBooking || !actionReason.trim()) {
      setActionError('Angiv venligst en årsag til aflysningen');
      return;
    }
    
    setActionLoading(true);
    setActionError(null);
    
    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', selectedBooking.patientId)
        .eq('status', 'confirmed')
        .limit(1);
      
      if (!bookings || bookings.length === 0) {
        throw new Error('Booking ikke fundet');
      }
      
      const result = await members.adminCancelBooking(bookings[0].id, actionReason, issueCompensation);
      
      setActionSuccess(result.message);
      setShowCancelModal(false);
      setActionReason('');
      
      await loadSessions();
    } catch (err: any) {
      setActionError(err.message || 'Kunne ikke aflyse booking');
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

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setShowClientModal(true);
  };

  const handleClientModalSuccess = () => {
    // Reload clients and sessions data
    loadClients();
    loadSessions();
  };

  const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1, locale: da });
  const currentMonthYear = format(currentWeekStart, 'MMMM yyyy', { locale: da });

  // Generate week days
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  }, [currentWeekStart]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (selectedGusmester && !session.employeeIds.includes(selectedGusmester)) {
        return false;
      }
      if (selectedGroupType && session.groupTypeId !== selectedGroupType) {
        return false;
      }
      if (selectedPaymentStatus) {
        const hasMatchingPayment = session.participants.some(p => p.paymentStatus === selectedPaymentStatus);
        if (!hasMatchingPayment) return false;
      }
      // Filter: Only show booked private events
      if (showOnlyBookedPrivate) {
        const isPrivate = session.groupTypeName.toLowerCase().includes('privat');
        const hasBookings = session.currentParticipants > 0;
        if (!isPrivate || !hasBookings) return false;
      }
      return true;
    });
  }, [sessions, selectedGusmester, selectedGroupType, selectedPaymentStatus, showOnlyBookedPrivate]);

  // Group sessions by date for calendar view
  const sessionsByDate = useMemo(() => {
    const grouped = new Map<string, StaffSession[]>();
    
    filteredSessions.forEach(session => {
      const dateKey = format(parseISO(session.date), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(session);
    });
    
    grouped.forEach((daySessions) => {
      daySessions.sort((a, b) => a.time.localeCompare(b.time));
    });
    
    return grouped;
  }, [filteredSessions]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const totalBookings = filteredSessions.reduce((sum, s) => sum + s.currentParticipants, 0);
    const averageOccupancy = totalSessions > 0 
      ? (filteredSessions.reduce((sum, s) => sum + (s.currentParticipants / s.maxParticipants * 100), 0) / totalSessions)
      : 0;
    
    // Count unbooked private events (private events with 0 participants)
    const unbookedPrivateEvents = filteredSessions.filter(s => 
      s.groupTypeName.toLowerCase().includes('privat') && s.currentParticipants === 0
    ).length;
    
    return {
      totalSessions,
      totalBookings,
      unbookedPrivateEvents,
      averageOccupancy: Math.round(averageOccupancy)
    };
  }, [filteredSessions]);

  const filteredClients = useMemo(() => {
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

  const groupTypes = useMemo(() => {
    const types = new Map<string, { id: string; name: string; color: string }>();
    sessions.forEach(session => {
      if (!types.has(session.groupTypeId)) {
        types.set(session.groupTypeId, {
          id: session.groupTypeId,
          name: session.groupTypeName,
          color: session.groupTypeColor
        });
      }
    });
    return Array.from(types.values());
  }, [sessions]);

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
              onClick={() => window.location.href = '/mine-hold'}
              className="mt-6 bg-[#502B30] text-amber-100 px-6 py-3 rounded-sm hover:bg-[#5e3023] transition-colors"
            >
              Tilbage til Mine Hold
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
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#502B30] tracking-wide flex items-center">
              <BarChart3 className="h-10 w-10 mr-3" />
              Ledelse
            </h1>
            <p className="mt-3 text-lg text-[#4a2329]/80">
              Administrer alle sessioner, bookinger og deltagere
            </p>
          </div>

          {/* Success Message */}
          {actionSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-sm p-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <p className="text-green-800">{actionSuccess}</p>
            </div>
          )}

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
              {/* Statistics Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#502B30]/60 mb-1">Sessioner</p>
                      <p className="text-3xl font-bold text-[#502B30]">{stats.totalSessions}</p>
                    </div>
                    <Calendar className="h-10 w-10 text-[#502B30]/20" />
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#502B30]/60 mb-1">Bookinger</p>
                      <p className="text-3xl font-bold text-[#502B30]">{stats.totalBookings}</p>
                    </div>
                    <Users className="h-10 w-10 text-[#502B30]/20" />
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#502B30]/60 mb-1">Belægning</p>
                      <p className="text-3xl font-bold text-[#502B30]">{stats.averageOccupancy}%</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-[#502B30]/20" />
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#502B30]/60 mb-1">Ubenyttede Private Events</p>
                      <p className="text-3xl font-bold text-[#502B30]">{stats.unbookedPrivateEvents}</p>
                      <p className="text-xs text-[#502B30]/50 mt-1">Ledig kapacitet</p>
                    </div>
                    <AlertCircle className="h-10 w-10 text-[#502B30]/20" />
                  </div>
                </div>
              </div>

              {/* Filters and View Toggle */}
              <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-6 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Filter className="h-5 w-5 text-[#502B30]/60" />
                    
                    <select
                      value={selectedGusmester}
                      onChange={(e) => setSelectedGusmester(e.target.value)}
                      className="px-3 py-2 border border-[#502B30]/20 rounded-sm text-sm focus:ring-2 focus:ring-[#502B30]/30"
                    >
                      <option value="">Alle gusmesters</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>

                    <select
                      value={selectedGroupType}
                      onChange={(e) => setSelectedGroupType(e.target.value)}
                      className="px-3 py-2 border border-[#502B30]/20 rounded-sm text-sm focus:ring-2 focus:ring-[#502B30]/30"
                    >
                      <option value="">Alle typer</option>
                      {groupTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>

                    <select
                      value={selectedPaymentStatus}
                      onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                      className="px-3 py-2 border border-[#502B30]/20 rounded-sm text-sm focus:ring-2 focus:ring-[#502B30]/30"
                    >
                      <option value="">Alle betalinger</option>
                      <option value="paid">Betalt</option>
                      <option value="pending">Afventer</option>
                      <option value="failed">Fejlet</option>
                    </select>

                    <label className="flex items-center gap-2 px-3 py-2 border border-[#502B30]/20 rounded-sm text-sm cursor-pointer hover:bg-[#502B30]/5 transition-colors">
                      <input
                        type="checkbox"
                        checked={showOnlyBookedPrivate}
                        onChange={(e) => setShowOnlyBookedPrivate(e.target.checked)}
                        className="w-4 h-4 text-[#502B30] border-[#502B30]/30 rounded focus:ring-[#502B30] focus:ring-2"
                      />
                      <span className="text-[#502B30]">Kun bookede private events</span>
                    </label>

                    {(selectedGusmester || selectedGroupType || selectedPaymentStatus || showOnlyBookedPrivate) && (
                      <button
                        onClick={() => {
                          setSelectedGusmester('');
                          setSelectedGroupType('');
                          setSelectedPaymentStatus('');
                          setShowOnlyBookedPrivate(false);
                        }}
                        className="px-3 py-2 text-sm text-[#502B30]/60 hover:text-[#502B30] flex items-center gap-1"
                      >
                        <XIcon className="h-4 w-4" />
                        Nulstil
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('calendar')}
                      className={`p-2 rounded-sm transition-colors ${
                        viewMode === 'calendar'
                          ? 'bg-[#502B30] text-white'
                          : 'bg-white text-[#502B30] border border-[#502B30]/20 hover:bg-[#502B30]/10'
                      }`}
                      title="Kalendervisning"
                    >
                      <Grid className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-sm transition-colors ${
                        viewMode === 'list'
                          ? 'bg-[#502B30] text-white'
                          : 'bg-white text-[#502B30] border border-[#502B30]/20 hover:bg-[#502B30]/10'
                      }`}
                      title="Listevisning"
                    >
                      <List className="h-5 w-5" />
                    </button>
                  </div>
                </div>
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
                      <ChevronLeft className="h-5 w-5 text-[#502B30]/80" />
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
                      <ChevronRight className="h-5 w-5 text-[#502B30]/80" />
                    </button>

                    <button
                      onClick={loadSessions}
                      className="p-2 rounded-sm border border-[#502B30]/20 hover:bg-[#502B30]/10 transition-colors ml-2"
                      title="Genindlæs"
                    >
                      <RefreshCw className="h-5 w-5 text-[#502B30]/80" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar Grid View */}
              {viewMode === 'calendar' && (
                <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 overflow-hidden">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-7 border-b border-[#502B30]/10">
                    {weekDays.map((day, idx) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div
                          key={idx}
                          className={`p-4 text-center border-r border-[#502B30]/10 last:border-r-0 ${
                            isToday ? 'bg-[#502B30]/5' : ''
                          }`}
                        >
                          <div className="text-xs font-medium text-[#502B30]/60 uppercase">
                            {format(day, 'EEE', { locale: da })}
                          </div>
                          <div className={`text-2xl font-bold mt-1 ${
                            isToday ? 'text-[#502B30]' : 'text-[#502B30]/80'
                          }`}>
                            {format(day, 'd')}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calendar Body */}
                  <div className="grid grid-cols-7 min-h-[600px]">
                    {weekDays.map((day, idx) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const daySessions = sessionsByDate.get(dateKey) || [];
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div
                          key={idx}
                          className={`border-r border-[#502B30]/10 last:border-r-0 p-2 ${
                            isToday ? 'bg-[#502B30]/5' : ''
                          }`}
                        >
                          <div className="space-y-2">
                            {daySessions.map(session => (
                              <button
                                key={session.id}
                                onClick={() => handleViewSessionDetails(session)}
                                className="w-full text-left p-3 rounded-sm border-l-4 hover:shadow-md transition-all"
                                style={{ 
                                  borderLeftColor: session.groupTypeColor,
                                  backgroundColor: `${session.groupTypeColor}10`
                                }}
                              >
                                <div className="text-xs font-semibold text-[#502B30] mb-1">
                                  {session.time.substring(0, 5)}
                                </div>
                                <div className="text-sm font-bold text-[#502B30] mb-1 line-clamp-1">
                                  {session.name}
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-[#502B30]/60">
                                    {session.currentParticipants}/{session.maxParticipants}
                                  </span>
                                  {session.employeeNames[0] && (
                                    <span className="text-[#502B30]/60 truncate ml-1">
                                      {session.employeeNames[0].split(' ')[0]}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className="space-y-4">
                  {Array.from(sessionsByDate.entries())
                    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                    .map(([dateKey, daySessions]) => (
                      <div key={dateKey} className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 overflow-hidden">
                        <div className="bg-[#502B30]/5 px-6 py-4 border-b border-[#502B30]/10">
                          <h3 className="text-lg font-semibold text-[#502B30] capitalize">
                            {format(parseISO(dateKey), 'EEEE d. MMMM yyyy', { locale: da })}
                          </h3>
                          <p className="text-sm text-[#502B30]/60 mt-1">
                            {daySessions.length} {daySessions.length === 1 ? 'session' : 'sessioner'}
                          </p>
                        </div>

                        <div className="divide-y divide-[#502B30]/10">
                          {daySessions.map(session => {
                            const isExpanded = expandedSessions.has(session.id);
                            const [hours, minutes] = session.time.split(':').map(Number);
                            const endMinutes = hours * 60 + minutes + session.duration;
                            const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

                            return (
                              <div key={session.id} className="p-6">
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
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditSession(session);
                                          }}
                                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                        >
                                          <UserCog className="h-4 w-4" />
                                          Skift gusmester
                                        </button>
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

                  {filteredSessions.length === 0 && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-12 text-center">
                      <Calendar className="h-16 w-16 text-[#502B30]/30 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-[#502B30] mb-2">
                        Ingen sessioner fundet
                      </h3>
                      <p className="text-sm text-[#502B30]/60">
                        Prøv at justere dine filtre eller vælg en anden uge
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10">
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
                      <tr 
                        key={client.id} 
                        onClick={() => handleClientClick(client)}
                        className="hover:bg-[#502B30]/5 cursor-pointer transition-colors"
                      >
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

              {filteredClients.length === 0 && (
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

        {/* Session Details Modal */}
        {showSessionDetailsModal && selectedSession && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-4 w-4 rounded-full" 
                      style={{ backgroundColor: selectedSession.groupTypeColor }}
                    />
                    <h2 className="text-2xl font-bold text-[#502B30]">{selectedSession.name}</h2>
                    <span className="text-sm px-3 py-1 rounded-sm bg-[#502B30]/10 text-[#502B30] font-medium">
                      {selectedSession.groupTypeName}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSessionDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-[#4a2329]/70 mt-4">
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1.5" />
                    {format(parseISO(selectedSession.date), 'EEEE d. MMMM yyyy', { locale: da })}
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1.5" />
                    {selectedSession.time} ({selectedSession.duration} min)
                  </span>
                  {selectedSession.location && (
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1.5" />
                      {selectedSession.location}
                    </span>
                  )}
                  {selectedSession.employeeNames.length > 0 && (
                    <span className="flex items-center">
                      <User className="h-4 w-4 mr-1.5" />
                      {selectedSession.employeeNames.join(', ')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-6 mt-4">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1.5 text-[#502B30]/60" />
                    <span className="text-sm font-semibold text-[#502B30]">
                      {selectedSession.currentParticipants}/{selectedSession.maxParticipants} deltagere
                    </span>
                  </div>
                  {selectedSession.availableSpots > 0 ? (
                    <span className="text-sm text-green-600 font-medium">
                      {selectedSession.availableSpots} ledige pladser
                    </span>
                  ) : (
                    <span className="text-sm text-orange-600 font-medium">
                      Fuldt booket
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setShowSessionDetailsModal(false);
                      handleEditSession(selectedSession);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <UserCog className="h-4 w-4" />
                    Skift gusmester
                  </button>
                </div>
              </div>

              <div className="p-6">
                {selectedSession.participants.length > 0 ? (
                  <div className="space-y-3">
                    <h5 className="font-semibold text-[#502B30] mb-4">
                      Deltagerliste ({selectedSession.participants.length})
                    </h5>
                    {selectedSession.participants.map((participant, idx) => (
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
                            
                            {!participant.isGuest && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleMoveBooking(participant, selectedSession)}
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
                  <div className="text-center py-12 text-[#502B30]/60">
                    <Users className="h-16 w-16 mx-auto mb-3 opacity-30" />
                    <p className="text-lg">Ingen deltagere endnu</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowSessionDetailsModal(false)}
                  className="w-full px-4 py-2 bg-[#502B30] text-white rounded-lg hover:bg-[#3d2024] transition-colors"
                >
                  Luk
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Session Modal */}
        {showEditSessionModal && selectedSession && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[#502B30]">Skift Gusmester</h2>
                  <button
                    onClick={() => setShowEditSessionModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XIcon className="h-6 w-6" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {selectedSession.name} - {format(parseISO(selectedSession.date), 'd. MMM yyyy', { locale: da })}
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
                    Vælg ny gusmester
                  </label>
                  <select
                    value={newGusmesterId}
                    onChange={(e) => setNewGusmesterId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                  >
                    <option value="">Vælg gusmester...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEditSessionModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={actionLoading}
                  >
                    Annuller
                  </button>
                  <button
                    onClick={handleSaveSessionChanges}
                    disabled={!newGusmesterId || actionLoading}
                    className="flex-1 px-4 py-2 bg-[#502B30] text-white rounded-lg hover:bg-[#3d2024] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <>
                        <LoaderIcon className="h-4 w-4 animate-spin" />
                        Gemmer...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Gem ændringer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

                <div className="space-y-4 mb-6">
                  <div>
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Årsag til flytning <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      rows={3}
                      placeholder="F.eks. Kunde ønskede anden tid, sygdom, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Årsagen vil være synlig på kvitteringen og for kunden
                    </p>
                  </div>
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
                    disabled={!targetSessionId || !actionReason.trim() || actionLoading}
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

                <p className="text-gray-700 mb-4">
                  Er du sikker på, at du vil aflyse bookingen for <strong>{selectedBooking?.patientName}</strong>?
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Årsag til aflysning <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    rows={3}
                    placeholder="F.eks. Kunde aflyste, sygdom, vejrforhold, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Årsagen vil være synlig på kvitteringen og klippekortet
                  </p>
                </div>

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
                    disabled={!actionReason.trim() || actionLoading}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    Aflys uden klip
                  </button>
                  <button
                    onClick={() => confirmCancelBooking(true)}
                    disabled={!actionReason.trim() || actionLoading}
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

        {/* Client Details Modal */}
        {showClientModal && selectedClient && (
          <ClientDetailsModal
            client={selectedClient}
            onClose={() => {
              setShowClientModal(false);
              setSelectedClient(null);
            }}
            onSuccess={handleClientModalSuccess}
          />
        )}
      </div>
      <Footer />
    </>
  );
}
