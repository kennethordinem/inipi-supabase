'use client';

import { useEffect, useState } from 'react';
import { members } from '@/lib/supabase-sdk';
import type { AuthState } from '@/lib/supabase-sdk';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  Users, AlertCircle, Search, Loader2, X, Calendar, Clock, MapPin, 
  Ticket, Mail, Phone, CreditCard, ArrowRight, XCircle, CheckCircle, User
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { da } from 'date-fns/locale';

interface AdminMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  memberSince: string | null;
  activeBookings: number;
  totalBookings: number;
}

interface AdminBooking {
  id: string;
  appointmentId: string;
  sessionId: string | null;
  sessionName: string;
  groupTypeId: string | null;
  date: string;
  time: string;
  duration: number;
  spots: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentAmount: number;
  location: string;
  color: string;
  punchCardId: string | null;
  createdAt: string | null;
}

interface AdminPunchCard {
  id: string;
  name: string;
  totalPunches: number;
  remainingPunches: number;
  groupTypes: string[];
  purchaseDate: string | null;
  price: number;
}

interface AdminMemberDetails {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    cpr: string;
    address: any;
    memberSince: string | null;
    status: string;
  };
  upcomingBookings: AdminBooking[];
  pastBookings: AdminBooking[];
  punchCards: AdminPunchCard[];
  stats: {
    totalBookings: number;
    upcomingBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    activePunchCards: number;
    totalPunchesRemaining: number;
  };
}

export default function AdministrationPage() {
  const [hasAccess, setHasAccess] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Members list state
  const [members_list, setMembersList] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Member details modal state
  const [selectedMember, setSelectedMember] = useState<AdminMemberDetails | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false);
  
  // Cancel booking state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<AdminBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState('');
  const [cancelError, setCancelError] = useState('');
  
  // Move booking state
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [bookingToMove, setBookingToMove] = useState<AdminBooking | null>(null);
  const [moveReason, setMoveReason] = useState('');
  const [newSessionId, setNewSessionId] = useState('');
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [moving, setMoving] = useState(false);
  const [moveSuccess, setMoveSuccess] = useState('');
  const [moveError, setMoveError] = useState('');

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = members.onAuthStateChanged(async (authState: AuthState) => {
      if (!authState.isLoading) {
        if (!authState.isAuthenticated) {
          // Not logged in, redirect to login
          window.location.href = '/login';
        } else {
          // Check if user has administration access
          try {
            const employeeCheck = await members.checkIfEmployee();
            if (employeeCheck.isEmployee && employeeCheck.frontendPermissions?.administration) {
              setHasAccess(true);
              setIsCheckingAuth(false);
              loadMembers();
            } else {
              setHasAccess(false);
              setIsCheckingAuth(false);
              setError('Du har ikke adgang til administration. Kontakt din administrator for at få adgang.');
            }
          } catch (err: any) {
            console.error('Error checking administration access:', err);
            setHasAccess(false);
            setIsCheckingAuth(false);
            setError('Kunne ikke verificere adgang.');
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const result = await members.getAdminMembers(page, 50, searchQuery);
      setMembersList(result.members);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      console.error('[Administration] Error loading members:', err);
      setError('Kunne ikke indlæse medlemmer');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page on search
  };

  const handleSearch = () => {
    loadMembers();
  };

  const handleMemberClick = async (member: AdminMember) => {
    try {
      setLoadingMemberDetails(true);
      setShowMemberModal(true);
      const details = await members.getAdminMemberDetails(member.id);
      setSelectedMember(details);
    } catch (err: any) {
      console.error('[Administration] Error loading member details:', err);
      setError('Kunne ikke indlæse medlemsdetaljer');
      setShowMemberModal(false);
    } finally {
      setLoadingMemberDetails(false);
    }
  };

  const handleCancelClick = (booking: AdminBooking) => {
    setBookingToCancel(booking);
    setShowCancelDialog(true);
    setCancelReason('');
    setCancelSuccess('');
    setCancelError('');
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel || !selectedMember || !cancelReason.trim()) {
      setCancelError('Angiv venligst en årsag');
      return;
    }

    try {
      setCancelling(true);
      const result = await members.adminCancelBooking(
        bookingToCancel.appointmentId,
        cancelReason || 'Aflyst af administrator',
        true // Issue compensation
      );

      if (result.success) {
        setCancelSuccess(result.message);
        
        // Reload member details
        const details = await members.getAdminMemberDetails(selectedMember.member.id);
        setSelectedMember(details);
        
        // Also reload members list to update booking counts
        loadMembers();

        // Close dialog after showing success
        setTimeout(() => {
          setShowCancelDialog(false);
          setBookingToCancel(null);
          setCancelReason('');
          setCancelSuccess('');
        }, 2000);
      }
    } catch (err: any) {
      console.error('[Administration] Cancel error:', err);
      setCancelError(err.message || 'Kunne ikke aflyse booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleMoveClick = async (booking: AdminBooking) => {
    if (!booking.groupTypeId) {
      setMoveError('Kun gruppesessioner kan flyttes');
      return;
    }

    setBookingToMove(booking);
    setShowMoveDialog(true);
    setMoveReason('');
    setNewSessionId('');
    setMoveSuccess('');
    setMoveError('');
    
    // Load available sessions of the same type
    try {
      const result = await members.getClasses({
        groupTypeId: booking.groupTypeId,
        startDate: new Date().toISOString().split('T')[0]
      });
      
      // Filter out the current session and past sessions
      const now = new Date();
      const filtered = result.sessions.filter((s: any) => {
        const sessionDate = parseISO(s.date);
        return s.id !== booking.sessionId && sessionDate >= now && s.availableSpots > 0;
      });
      
      setAvailableSessions(filtered);
    } catch (err: any) {
      console.error('[Administration] Error loading sessions:', err);
      setMoveError('Kunne ikke indlæse tilgængelige sessioner');
    }
  };

  const handleConfirmMove = async () => {
    if (!bookingToMove || !selectedMember || !newSessionId || !moveReason.trim()) {
      setMoveError('Udfyld alle felter');
      return;
    }

    try {
      setMoving(true);
      const result = await members.adminMoveBooking(
        bookingToMove.appointmentId,
        newSessionId,
        moveReason || 'Flyttet af administrator'
      );

      if (result.success) {
        setMoveSuccess(result.message);
        
        // Reload member details
        const details = await members.getAdminMemberDetails(selectedMember.member.id);
        setSelectedMember(details);

        // Close dialog after showing success
        setTimeout(() => {
          setShowMoveDialog(false);
          setBookingToMove(null);
          setMoveReason('');
          setNewSessionId('');
          setMoveSuccess('');
        }, 2000);
      }
    } catch (err: any) {
      console.error('[Administration] Move error:', err);
      setMoveError(err.message || 'Kunne ikke flytte booking');
    } finally {
      setMoving(false);
    }
  };

  if (isCheckingAuth) {
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

  if (!hasAccess || (error && !hasAccess)) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-sm p-8 max-w-md shadow-lg text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-red-800 font-semibold mb-2 text-xl">Ingen adgang</h2>
            <p className="text-red-600">{error || 'Du har ikke adgang til administration.'}</p>
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#502B30] tracking-wide flex items-center">
              <Users className="h-10 w-10 mr-3" />
              Administration
            </h1>
            <p className="mt-3 text-lg text-[#4a2329]/80">
              Administrer medlemmer og bookinger
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#502B30]/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Søg efter navn, email eller telefon..."
                  className="w-full pl-10 pr-4 py-2 border border-[#502B30]/20 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#502B30]/50"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-[#502B30] text-amber-100 rounded-sm hover:bg-[#5e3023] transition-colors disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Søger...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Søg
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Members Table */}
          {loading && members_list.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-12 text-center border border-[#502B30]/10">
              <Loader2 className="h-12 w-12 text-[#502B30] mx-auto mb-4 animate-spin" />
              <p className="text-[#4a2329]/80">Indlæser medlemmer...</p>
            </div>
          ) : members_list.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-12 text-center border border-[#502B30]/10">
              <Users className="h-12 w-12 text-[#502B30]/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#502B30] mb-2">
                Ingen medlemmer fundet
              </h3>
              <p className="text-[#4a2329]/80">
                {searchQuery ? 'Prøv en anden søgning' : 'Der er ingen registrerede medlemmer endnu'}
              </p>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg border border-[#502B30]/10 overflow-hidden">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#502B30] uppercase tracking-wider">
                        Aktive bookinger
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#502B30] uppercase tracking-wider">
                        Total bookinger
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#502B30]/10">
                    {members_list.map((member) => (
                      <tr
                        key={member.id}
                        onClick={() => handleMemberClick(member)}
                        className="hover:bg-[#502B30]/5 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-[#502B30]">
                            {member.firstName} {member.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[#4a2329]/80">{member.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[#4a2329]/80">{member.phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[#4a2329]/80">
                            {member.memberSince ? format(parseISO(member.memberSince), 'd. MMM yyyy', { locale: da }) : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {member.activeBookings}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#4a2329]/80">
                          {member.totalBookings}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-[#502B30]/10 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setPage(Math.max(1, page - 1));
                      loadMembers();
                    }}
                    disabled={page === 1 || loading}
                    className="px-4 py-2 text-sm text-[#502B30] border border-[#502B30]/20 rounded-sm hover:bg-[#502B30]/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Forrige
                  </button>
                  <span className="text-sm text-[#4a2329]/80">
                    Side {page} af {totalPages}
                  </span>
                  <button
                    onClick={() => {
                      setPage(Math.min(totalPages, page + 1));
                      loadMembers();
                    }}
                    disabled={page === totalPages || loading}
                    className="px-4 py-2 text-sm text-[#502B30] border border-[#502B30]/20 rounded-sm hover:bg-[#502B30]/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Næste
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      <Footer />

      {/* Member Details Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-sm max-w-4xl w-full my-8 shadow-xl max-h-[90vh] overflow-y-auto">
            {loadingMemberDetails ? (
              <div className="p-12 text-center">
                <Loader2 className="h-12 w-12 text-[#502B30] mx-auto mb-4 animate-spin" />
                <p className="text-[#4a2329]/80">Indlæser medlemsdetaljer...</p>
              </div>
            ) : selectedMember ? (
              <>
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-[#502B30]/10 flex items-center justify-between sticky top-0 bg-white z-10">
                  <h2 className="text-2xl font-bold text-[#502B30]">
                    {selectedMember.member.firstName} {selectedMember.member.lastName}
                  </h2>
                  <button
                    onClick={() => {
                      setShowMemberModal(false);
                      setSelectedMember(null);
                    }}
                    className="text-[#502B30]/60 hover:text-[#502B30] transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Member Info */}
                  <div className="bg-[#502B30]/5 rounded-sm p-4">
                    <h3 className="text-lg font-semibold text-[#502B30] mb-3">Kontaktinformation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-[#502B30]/60" />
                        <span className="text-[#4a2329]/80">{selectedMember.member.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-[#502B30]/60" />
                        <span className="text-[#4a2329]/80">{selectedMember.member.phone || 'Ikke angivet'}</span>
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-[#502B30]/60" />
                        <span className="text-[#4a2329]/80">
                          Medlem siden: {selectedMember.member.memberSince ? format(parseISO(selectedMember.member.memberSince), 'd. MMMM yyyy', { locale: da }) : 'Ukendt'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-sm p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedMember.stats.upcomingBookings}</div>
                      <div className="text-xs text-blue-800 mt-1">Kommende</div>
                    </div>
                    <div className="bg-green-50 rounded-sm p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedMember.stats.completedBookings}</div>
                      <div className="text-xs text-green-800 mt-1">Gennemført</div>
                    </div>
                    <div className="bg-red-50 rounded-sm p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{selectedMember.stats.cancelledBookings}</div>
                      <div className="text-xs text-red-800 mt-1">Aflyst</div>
                    </div>
                    <div className="bg-amber-50 rounded-sm p-4 text-center">
                      <div className="text-2xl font-bold text-amber-600">{selectedMember.stats.totalPunchesRemaining}</div>
                      <div className="text-xs text-amber-800 mt-1">Klip tilbage</div>
                    </div>
                  </div>

                  {/* Upcoming Bookings */}
                  <div>
                    <h3 className="text-lg font-semibold text-[#502B30] mb-3">Kommende Bookinger</h3>
                    {selectedMember.upcomingBookings.length === 0 ? (
                      <p className="text-[#4a2329]/60 text-sm">Ingen kommende bookinger</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedMember.upcomingBookings.map((booking) => {
                          const bookingDate = parseISO(booking.date);
                          const [hours, minutes] = booking.time.split(':').map(Number);
                          const bookingStartTime = new Date(bookingDate);
                          bookingStartTime.setHours(hours, minutes, 0, 0);
                          const endTime = new Date(bookingStartTime.getTime() + booking.duration * 60000);

                          return (
                            <div key={booking.id} className="bg-white border border-[#502B30]/20 rounded-sm p-4">
                              {booking.color && (
                                <div className="h-1 -mt-4 -mx-4 mb-3 rounded-t-sm" style={{ backgroundColor: booking.color }} />
                              )}
                              
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-[#502B30] mb-2">{booking.sessionName}</h4>
                                  
                                  <div className="space-y-1 text-sm text-[#4a2329]/70">
                                    <div className="flex items-center">
                                      <Calendar className="h-3 w-3 mr-2" />
                                      <span>{format(bookingDate, 'EEEE d. MMMM yyyy', { locale: da })}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <Clock className="h-3 w-3 mr-2" />
                                      <span>{booking.time.substring(0, 5)} - {format(endTime, 'HH:mm')} ({booking.duration} min)</span>
                                    </div>
                                    {booking.location && (
                                      <div className="flex items-center">
                                        <MapPin className="h-3 w-3 mr-2" />
                                        <span>{booking.location}</span>
                                      </div>
                                    )}
                                    {booking.spots > 1 && (
                                      <div className="flex items-center">
                                        <Ticket className="h-3 w-3 mr-2" />
                                        <span>{booking.spots} pladser</span>
                                      </div>
                                    )}
                                    <div className="flex items-center">
                                      <CreditCard className="h-3 w-3 mr-2" />
                                      <span>
                                        {booking.paymentMethod === 'punch_card' ? (
                                          <span className="text-green-600 font-medium">Klippekort</span>
                                        ) : (
                                          <span>{booking.paymentAmount} kr ({booking.paymentMethod === 'stripe' || booking.paymentMethod === 'card' ? 'Kort' : 'MobilePay'})</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="ml-4 flex flex-col gap-2">
                                  {booking.sessionId && (
                                    <button
                                      onClick={() => handleMoveClick(booking)}
                                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded-sm hover:bg-blue-700 transition-colors flex items-center whitespace-nowrap"
                                    >
                                      <ArrowRight className="h-3 w-3 mr-1" />
                                      Flyt
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleCancelClick(booking)}
                                    className="px-3 py-1 text-xs bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors flex items-center whitespace-nowrap"
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Aflys
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Punch Cards */}
                  {selectedMember.punchCards.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-[#502B30] mb-3">Aktive Klippekort</h3>
                      <div className="space-y-2">
                        {selectedMember.punchCards.map((card) => (
                          <div key={card.id} className="bg-amber-50 border border-amber-200 rounded-sm p-3 flex items-center justify-between">
                            <div>
                              <div className="font-medium text-[#502B30]">{card.name}</div>
                              <div className="text-sm text-[#4a2329]/70">
                                {card.remainingPunches} / {card.totalPunches} klip tilbage
                              </div>
                            </div>
                            <Ticket className="h-6 w-6 text-amber-600" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Past Bookings (Collapsed) */}
                  {selectedMember.pastBookings.length > 0 && (
                    <details className="border border-[#502B30]/20 rounded-sm">
                      <summary className="px-4 py-3 cursor-pointer hover:bg-[#502B30]/5 font-semibold text-[#502B30]">
                        Tidligere Bookinger ({selectedMember.pastBookings.length})
                      </summary>
                      <div className="px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
                        {selectedMember.pastBookings.slice(0, 10).map((booking) => (
                          <div key={booking.id} className="text-sm text-[#4a2329]/70 py-2 border-b border-[#502B30]/10 last:border-0">
                            <div className="font-medium text-[#502B30]">{booking.sessionName}</div>
                            <div>{format(parseISO(booking.date), 'd. MMM yyyy', { locale: da })} - {booking.time.substring(0, 5)}</div>
                            <div className="text-xs">
                              Status: <span className={booking.status === 'cancelled' ? 'text-red-600' : 'text-green-600'}>
                                {booking.status === 'cancelled' ? 'Aflyst' : 'Gennemført'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Cancel Booking Dialog */}
      {showCancelDialog && bookingToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-b from-[#faf8f5] to-white rounded-sm max-w-md w-full p-6 shadow-2xl border-2 border-[#502B30]/20">
            <h3 className="text-2xl font-bold text-[#502B30] mb-4 tracking-wide">Aflys Booking</h3>

            {!cancelSuccess ? (
              <>
                <div className="space-y-3 mb-6">
                  <p className="text-[#502B30]/80"><strong>Session:</strong> {bookingToCancel.sessionName}</p>
                  <p className="text-[#502B30]/80">
                    <strong>Dato:</strong> {format(parseISO(bookingToCancel.date), 'd. MMMM yyyy', { locale: da })} kl. {bookingToCancel.time.substring(0, 5)}
                  </p>
                  {bookingToCancel.spots > 1 && (
                    <p className="text-[#502B30]/80"><strong>Pladser:</strong> {bookingToCancel.spots}</p>
                  )}
                </div>

                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-sm">
                  <p className="text-sm text-blue-800">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    {bookingToCancel.paymentMethod === 'punch_card' 
                      ? 'Klip vil blive returneret til klippekort'
                      : `Et nyt klippekort med ${bookingToCancel.spots} klip vil blive oprettet`
                    }
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Årsag til aflysning *
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#502B30]/20 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#502B30]/50"
                    placeholder="Angiv årsag..."
                  />
                </div>

                {cancelError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm flex items-start">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-800">{cancelError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCancelDialog(false);
                      setBookingToCancel(null);
                      setCancelReason('');
                      setCancelError('');
                    }}
                    disabled={cancelling}
                    className="flex-1 px-4 py-3 border-2 border-[#502B30]/30 text-[#502B30] rounded-sm hover:bg-[#502B30]/5 transition-all disabled:opacity-50 font-medium"
                  >
                    Annuller
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    disabled={cancelling || !cancelReason.trim()}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center font-medium shadow-lg hover:shadow-xl"
                  >
                    {cancelling ? (
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
      )}

      {/* Move Booking Dialog */}
      {showMoveDialog && bookingToMove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-b from-[#faf8f5] to-white rounded-sm max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto border-2 border-[#502B30]/20">
            <h3 className="text-2xl font-bold text-[#502B30] mb-4 tracking-wide">Flyt Booking</h3>

            {!moveSuccess ? (
              <>
                <div className="space-y-3 mb-6">
                  <p className="text-[#502B30]/80"><strong>Nuværende session:</strong> {bookingToMove.sessionName}</p>
                  <p className="text-[#502B30]/80">
                    <strong>Dato:</strong> {format(parseISO(bookingToMove.date), 'd. MMMM yyyy', { locale: da })} kl. {bookingToMove.time.substring(0, 5)}
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Vælg ny session *
                  </label>
                  <select
                    value={newSessionId}
                    onChange={(e) => setNewSessionId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#502B30]/30 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#502B30] focus:border-[#502B30] bg-white text-[#502B30] font-medium transition-all"
                  >
                    <option value="">Vælg session...</option>
                    {availableSessions.map((session: any) => (
                      <option key={session.id} value={session.id}>
                        {session.name} - {format(parseISO(session.date), 'd. MMM yyyy', { locale: da })} kl. {session.time.substring(0, 5)} ({session.availableSpots} ledige)
                      </option>
                    ))}
                  </select>
                  {availableSessions.length === 0 && (
                    <p className="text-sm text-red-600 mt-2">Ingen tilgængelige sessioner fundet</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Årsag til flytning *
                  </label>
                  <textarea
                    value={moveReason}
                    onChange={(e) => setMoveReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[#502B30]/20 rounded-sm focus:outline-none focus:ring-2 focus:ring-[#502B30]/50"
                    placeholder="Angiv årsag..."
                  />
                </div>

                {moveError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm flex items-start">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-800">{moveError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowMoveDialog(false);
                      setBookingToMove(null);
                      setMoveReason('');
                      setNewSessionId('');
                      setMoveError('');
                    }}
                    disabled={moving}
                    className="flex-1 px-4 py-3 border-2 border-[#502B30]/30 text-[#502B30] rounded-sm hover:bg-[#502B30]/5 transition-all disabled:opacity-50 font-medium"
                  >
                    Annuller
                  </button>
                  <button
                    onClick={handleConfirmMove}
                    disabled={moving || !newSessionId || !moveReason.trim()}
                    className="flex-1 px-4 py-3 bg-[#502B30] text-amber-100 rounded-sm hover:bg-[#5e3023] transition-all disabled:opacity-50 flex items-center justify-center font-medium shadow-lg hover:shadow-xl"
                  >
                    {moving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Flytter...
                      </>
                    ) : (
                      'Bekræft Flytning'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold text-green-600 mb-2">Booking flyttet!</p>
                <p className="text-sm text-[#4a2329]/80">{moveSuccess}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

