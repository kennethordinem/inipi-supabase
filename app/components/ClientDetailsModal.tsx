'use client';

import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Calendar, Clock, MapPin, CreditCard, Ticket, History, Loader2, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { da } from 'date-fns/locale';
import { members } from '@/lib/supabase-sdk';
import { supabase } from '@/lib/supabase';

interface ClientDetailsModalProps {
  client: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    member_since: string;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

interface Booking {
  id: string;
  session_id: string;
  session_name: string;
  session_date: string;
  session_time: string;
  spots: number;
  status: string;
  payment_method: string;
  payment_status: string;
  price: number;
  location?: string;
  selected_theme_id?: string;
  theme_name?: string;
  created_at: string;
  admin_action?: string;
  admin_reason?: string;
  admin_user_id?: string;
  admin_user_name?: string;
  admin_action_at?: string;
  cancelled_at?: string;
}

interface PunchCard {
  id: string;
  name: string;
  total_punches: number;
  remaining_punches: number;
  price: number;
  valid_until: string;
  status: string;
  created_at: string;
  usage_history?: PunchCardUsage[];
}

interface PunchCardUsage {
  id: string;
  booking_id: string;
  spots_used: number;
  remaining_after: number;
  used_at: string;
  session_name?: string;
  session_date?: string;
  session_time?: string;
}

type TabType = 'overview' | 'bookings' | 'punchcards';

export function ClientDetailsModal({ client, onClose, onSuccess }: ClientDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [punchCards, setPunchCards] = useState<PunchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'stripe' | 'punchcard'>('punchcard');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadClientData();
  }, [client.id]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          session_id,
          spots,
          status,
          payment_method,
          payment_status,
          selected_theme_id,
          created_at,
          cancelled_at,
          admin_action,
          admin_reason,
          admin_user_id,
          admin_action_at,
          sessions!inner(
            name,
            date,
            time,
            location,
            price
          ),
          themes!selected_theme_id(
            name
          ),
          invoices(
            amount
          )
        `)
        .eq('user_id', client.id)
        .in('status', ['confirmed', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (bookingsError) throw bookingsError;

      // Fetch admin user names for cancelled bookings
      const adminUserIds = [...new Set(
        (bookingsData || [])
          .filter((b: any) => b.admin_user_id)
          .map((b: any) => b.admin_user_id)
      )];

      let adminUsers: Record<string, string> = {};
      if (adminUserIds.length > 0) {
        const { data: employeesData } = await supabase
          .from('employees')
          .select('id, name')
          .in('id', adminUserIds);

        if (employeesData) {
          adminUsers = Object.fromEntries(
            employeesData.map(emp => [emp.id, emp.name])
          );
        }
      }

      const formattedBookings = (bookingsData || []).map((b: any) => {
        // Calculate price from invoice if available, otherwise from session price × spots
        let price = 0;
        if (b.invoices && b.invoices.length > 0) {
          price = parseFloat(b.invoices[0].amount || 0);
        } else if (b.sessions.price && b.spots) {
          price = parseFloat(b.sessions.price) * b.spots;
        }

        return {
          id: b.id,
          session_id: b.session_id,
          session_name: b.sessions.name,
          session_date: b.sessions.date,
          session_time: b.sessions.time,
          spots: b.spots,
          status: b.status,
          payment_method: b.payment_method,
          payment_status: b.payment_status,
          price: price,
          location: b.sessions.location,
          selected_theme_id: b.selected_theme_id,
          theme_name: b.themes?.name,
          created_at: b.created_at,
          cancelled_at: b.cancelled_at,
          admin_action: b.admin_action,
          admin_reason: b.admin_reason,
          admin_user_id: b.admin_user_id,
          admin_user_name: b.admin_user_id ? adminUsers[b.admin_user_id] : undefined,
          admin_action_at: b.admin_action_at,
        };
      });

      setBookings(formattedBookings);

      // Load punch cards
      const { data: punchCardsData, error: punchCardsError } = await supabase
        .from('punch_cards')
        .select('*')
        .eq('user_id', client.id)
        .order('created_at', { ascending: false });

      if (punchCardsError) throw punchCardsError;

      // Load usage history for each punch card
      const punchCardsWithHistory = await Promise.all(
        (punchCardsData || []).map(async (card: any) => {
          const { data: usageData } = await supabase
            .from('punch_card_usage')
            .select(`
              id,
              booking_id,
              spots_used,
              remaining_after,
              used_at,
              bookings!inner(
                sessions!inner(
                  name,
                  date,
                  time
                )
              )
            `)
            .eq('punch_card_id', card.id)
            .order('used_at', { ascending: false });

          const usage_history = (usageData || []).map((usage: any) => ({
            id: usage.id,
            booking_id: usage.booking_id,
            spots_used: usage.spots_used,
            remaining_after: usage.remaining_after,
            used_at: usage.used_at,
            session_name: usage.bookings?.sessions?.name,
            session_date: usage.bookings?.sessions?.date,
            session_time: usage.bookings?.sessions?.time,
          }));

          return {
            ...card,
            usage_history,
          };
        })
      );

      setPunchCards(punchCardsWithHistory);

    } catch (err: any) {
      console.error('[ClientDetailsModal] Error loading data:', err);
      setError(err.message || 'Kunne ikke indlæse klientdata');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setCancelReason('');
    setCancelError(null);
    setCancelSuccess(null);
    
    // Default to Stripe refund if it's a private event, otherwise punchcard
    setRefundMethod(booking.selected_theme_id ? 'stripe' : 'punchcard');
    
    setShowCancelModal(true);
  };

  const confirmCancelBooking = async () => {
    if (!selectedBooking || !cancelReason.trim()) {
      setCancelError('Angiv venligst en årsag til aflysningen');
      return;
    }

    setCancelLoading(true);
    setCancelError(null);

    try {
      // For private events, only allow Stripe refund (no compensation)
      const isPrivateEvent = !!selectedBooking.selected_theme_id;
      const issueCompensation = isPrivateEvent ? false : (refundMethod === 'punchcard');

      const result = await members.adminCancelBooking(selectedBooking.id, cancelReason, issueCompensation);

      setCancelSuccess(result.message || 'Booking aflyst succesfuldt');
      setShowCancelModal(false);
      
      // Reload data
      await loadClientData();
      
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => setCancelSuccess(null), 3000);
    } catch (err: any) {
      console.error('[ClientDetailsModal] Error cancelling booking:', err);
      setCancelError(err.message || 'Kunne ikke aflyse booking');
    } finally {
      setCancelLoading(false);
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

  const getStatusBadge = (status: string) => {
    if (status === 'confirmed') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Bekræftet
        </span>
      );
    } else if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-gray-100 text-gray-800">
          <XCircle className="h-3 w-3 mr-1" />
          Aflyst
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-orange-100 text-orange-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          {status}
        </span>
      );
    }
  };

  const activeBookings = bookings.filter(b => b.status === 'confirmed' && new Date(b.session_date) >= new Date());
  const pastBookings = bookings.filter(b => b.status === 'cancelled' || new Date(b.session_date) < new Date());
  const activePunchCards = punchCards.filter(pc => pc.status === 'active' && pc.remaining_punches > 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#502B30] to-[#5e3023] text-white p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-full">
                <User className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {client.first_name} {client.last_name}
                </h2>
                <p className="text-amber-100/80 text-sm mt-1">
                  Medlem siden {format(parseISO(client.member_since), 'd. MMMM yyyy', { locale: da })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Success Message */}
          {cancelSuccess && (
            <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-sm p-4 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <p className="text-green-800">{cancelSuccess}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-[#502B30]/20 px-6">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 font-medium transition-colors relative ${
                  activeTab === 'overview'
                    ? 'text-[#502B30] border-b-2 border-[#502B30]'
                    : 'text-[#502B30]/60 hover:text-[#502B30]/80'
                }`}
              >
                <User className="h-4 w-4 inline mr-2" />
                Oversigt
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`px-4 py-3 font-medium transition-colors relative ${
                  activeTab === 'bookings'
                    ? 'text-[#502B30] border-b-2 border-[#502B30]'
                    : 'text-[#502B30]/60 hover:text-[#502B30]/80'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-2" />
                Bookinger ({activeBookings.length})
              </button>
              <button
                onClick={() => setActiveTab('punchcards')}
                className={`px-4 py-3 font-medium transition-colors relative ${
                  activeTab === 'punchcards'
                    ? 'text-[#502B30] border-b-2 border-[#502B30]'
                    : 'text-[#502B30]/60 hover:text-[#502B30]/80'
                }`}
              >
                <Ticket className="h-4 w-4 inline mr-2" />
                Klippekort ({activePunchCards.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#502B30]" />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-red-800">
                {error}
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Contact Info */}
                    <div className="bg-[#faf8f5] rounded-sm p-6 border border-[#502B30]/10">
                      <h3 className="text-lg font-semibold text-[#502B30] mb-4">Kontaktinformation</h3>
                      <div className="space-y-3">
                        <div className="flex items-center text-[#4a2329]">
                          <Mail className="h-5 w-5 mr-3 text-[#502B30]/60" />
                          <span>{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center text-[#4a2329]">
                            <Phone className="h-5 w-5 mr-3 text-[#502B30]/60" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-sm p-4 border border-[#502B30]/10 shadow-sm">
                        <div className="text-sm text-[#502B30]/60 mb-1">Aktive Bookinger</div>
                        <div className="text-2xl font-bold text-[#502B30]">{activeBookings.length}</div>
                      </div>
                      <div className="bg-white rounded-sm p-4 border border-[#502B30]/10 shadow-sm">
                        <div className="text-sm text-[#502B30]/60 mb-1">Aktive Klippekort</div>
                        <div className="text-2xl font-bold text-[#502B30]">{activePunchCards.length}</div>
                      </div>
                      <div className="bg-white rounded-sm p-4 border border-[#502B30]/10 shadow-sm">
                        <div className="text-sm text-[#502B30]/60 mb-1">Total Bookinger</div>
                        <div className="text-2xl font-bold text-[#502B30]">{bookings.length}</div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-[#faf8f5] rounded-sm p-6 border border-[#502B30]/10">
                      <h3 className="text-lg font-semibold text-[#502B30] mb-4 flex items-center">
                        <History className="h-5 w-5 mr-2" />
                        Seneste Aktivitet
                      </h3>
                      {bookings.slice(0, 5).length > 0 ? (
                        <div className="space-y-3">
                          {bookings.slice(0, 5).map((booking) => (
                            <div key={booking.id} className="flex items-center justify-between py-2 border-b border-[#502B30]/10 last:border-0">
                              <div className="flex-1">
                                <div className="font-medium text-[#502B30]">{booking.session_name}</div>
                                <div className="text-sm text-[#4a2329]/70">
                                  {format(parseISO(booking.session_date), 'd. MMM yyyy', { locale: da })} kl. {booking.session_time}
                                </div>
                              </div>
                              {getStatusBadge(booking.status)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[#502B30]/60 text-center py-4">Ingen aktivitet endnu</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Bookings Tab */}
                {activeTab === 'bookings' && (
                  <div className="space-y-6">
                    {/* Active Bookings */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#502B30] mb-4">Aktive Bookinger</h3>
                      {activeBookings.length > 0 ? (
                        <div className="space-y-3">
                          {activeBookings.map((booking) => (
                            <div key={booking.id} className="bg-white rounded-sm p-4 border border-[#502B30]/10 shadow-sm">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-[#502B30]">{booking.session_name}</h4>
                                    {booking.theme_name && (
                                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-sm">
                                        {booking.theme_name}
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1 text-sm text-[#4a2329]/70">
                                    <div className="flex items-center">
                                      <Calendar className="h-4 w-4 mr-2" />
                                      {format(parseISO(booking.session_date), 'EEEE d. MMMM yyyy', { locale: da })}
                                    </div>
                                    <div className="flex items-center">
                                      <Clock className="h-4 w-4 mr-2" />
                                      {booking.session_time}
                                    </div>
                                    {booking.location && (
                                      <div className="flex items-center">
                                        <MapPin className="h-4 w-4 mr-2" />
                                        {booking.location}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-4 mt-2">
                                      <span className="flex items-center">
                                        <User className="h-4 w-4 mr-1" />
                                        {booking.spots} {booking.spots === 1 ? 'plads' : 'pladser'}
                                      </span>
                                      <span className="flex items-center">
                                        <CreditCard className="h-4 w-4 mr-1" />
                                        {getPaymentMethodLabel(booking.payment_method)}
                                      </span>
                                      <span className="font-medium text-[#502B30]">
                                        {booking.price.toFixed(2)} kr
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleCancelBooking(booking)}
                                  className="ml-4 px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Aflys
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-[#faf8f5] rounded-sm p-8 text-center border border-[#502B30]/10">
                          <Calendar className="h-12 w-12 text-[#502B30]/30 mx-auto mb-3" />
                          <p className="text-[#502B30]/60">Ingen aktive bookinger</p>
                        </div>
                      )}
                    </div>

                    {/* Past Bookings */}
                    {pastBookings.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-[#502B30] mb-4">Historik</h3>
                        <div className="space-y-2">
                          {pastBookings.slice(0, 10).map((booking) => (
                            <div key={booking.id} className="bg-[#faf8f5] rounded-sm p-3 border border-[#502B30]/10">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex-1">
                                  <div className="font-medium text-[#502B30] text-sm">{booking.session_name}</div>
                                  <div className="text-xs text-[#4a2329]/70">
                                    {format(parseISO(booking.session_date), 'd. MMM yyyy', { locale: da })} • {getPaymentMethodLabel(booking.payment_method)}
                                  </div>
                                </div>
                                {getStatusBadge(booking.status)}
                              </div>
                              {booking.status === 'cancelled' && booking.admin_reason && (
                                <div className="mt-2 pt-2 border-t border-[#502B30]/10">
                                  <div className="text-xs text-[#4a2329]/60">
                                    <strong>Aflyst af:</strong> {booking.admin_user_name || 'Personale'}
                                    {booking.admin_action_at && (
                                      <span> • {format(parseISO(booking.admin_action_at), 'd. MMM yyyy HH:mm', { locale: da })}</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-[#4a2329]/70 mt-1">
                                    <strong>Årsag:</strong> {booking.admin_reason}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Punch Cards Tab */}
                {activeTab === 'punchcards' && (
                  <div className="space-y-4">
                    {punchCards.length > 0 ? (
                      punchCards.map((card) => (
                        <div key={card.id} className="bg-white rounded-sm p-6 border border-[#502B30]/10 shadow-sm">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-[#502B30] text-lg mb-1">{card.name}</h4>
                              <p className="text-sm text-[#4a2329]/70">
                                Købt {format(parseISO(card.created_at), 'd. MMMM yyyy', { locale: da })}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-sm text-sm font-medium ${
                              card.status === 'active' && card.remaining_punches > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {card.status === 'active' && card.remaining_punches > 0 ? 'Aktiv' : 'Brugt op'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="bg-[#faf8f5] rounded-sm p-3">
                              <div className="text-xs text-[#502B30]/60 mb-1">Tilbage</div>
                              <div className="text-2xl font-bold text-[#502B30]">{card.remaining_punches}</div>
                            </div>
                            <div className="bg-[#faf8f5] rounded-sm p-3">
                              <div className="text-xs text-[#502B30]/60 mb-1">I alt</div>
                              <div className="text-2xl font-bold text-[#502B30]">{card.total_punches}</div>
                            </div>
                            <div className="bg-[#faf8f5] rounded-sm p-3">
                              <div className="text-xs text-[#502B30]/60 mb-1">Pris</div>
                              <div className="text-xl font-bold text-[#502B30]">{card.price} kr</div>
                            </div>
                          </div>

                          {card.valid_until && (
                            <div className="text-sm text-[#4a2329]/70 mb-4">
                              Gyldig til: {format(parseISO(card.valid_until), 'd. MMMM yyyy', { locale: da })}
                            </div>
                          )}

                          {/* Usage History */}
                          {card.usage_history && card.usage_history.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-[#502B30]/10">
                              <h5 className="text-sm font-semibold text-[#502B30] mb-3">Brugshistorik</h5>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {card.usage_history.map((usage) => (
                                  <div key={usage.id} className="bg-[#faf8f5] rounded-sm p-3 text-sm">
                                    <div className="flex items-start justify-between mb-1">
                                      <div className="flex-1">
                                        <div className="font-medium text-[#502B30]">{usage.session_name}</div>
                                        <div className="text-xs text-[#4a2329]/70">
                                          {usage.session_date && format(parseISO(usage.session_date), 'd. MMM yyyy', { locale: da })}
                                          {usage.session_time && ` kl. ${usage.session_time}`}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-semibold text-[#502B30]">-{usage.spots_used} klip</div>
                                        <div className="text-xs text-[#4a2329]/60">{usage.remaining_after} tilbage</div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-[#4a2329]/50 mt-1">
                                      {format(parseISO(usage.used_at), 'd. MMM yyyy HH:mm', { locale: da })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="bg-[#faf8f5] rounded-sm p-12 text-center border border-[#502B30]/10">
                        <Ticket className="h-16 w-16 text-[#502B30]/30 mx-auto mb-4" />
                        <p className="text-[#502B30]/60 text-lg">Ingen klippekort</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#502B30]/20 p-4 bg-[#faf8f5]">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-[#502B30] text-white rounded-sm hover:bg-[#5e3023] transition-colors"
            >
              Luk
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Booking Modal */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-[#502B30]">Aflys Booking</h3>
              <p className="text-sm text-[#4a2329]/70 mt-2">
                {selectedBooking.session_name} • {format(parseISO(selectedBooking.session_date), 'd. MMM yyyy', { locale: da })}
              </p>
            </div>

            <div className="p-6">
              {cancelError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-sm p-3 text-red-800 text-sm">
                  {cancelError}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-[#502B30] mb-2">
                  Årsag til aflysning <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="F.eks. Kunde aflyste, sygdom, etc."
                  className="w-full px-3 py-2 border border-[#502B30]/20 rounded-sm focus:ring-2 focus:ring-[#502B30] focus:border-transparent"
                />
              </div>

              {/* Only show refund choice if NOT a private event */}
              {!selectedBooking.selected_theme_id && selectedBooking.payment_method !== 'punch_card' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#502B30] mb-2">
                    Refunderingsmetode
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border border-[#502B30]/20 rounded-sm cursor-pointer hover:bg-[#502B30]/5">
                      <input
                        type="radio"
                        name="refundMethod"
                        value="punchcard"
                        checked={refundMethod === 'punchcard'}
                        onChange={(e) => setRefundMethod(e.target.value as 'stripe' | 'punchcard')}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-[#502B30]">Klippekort</div>
                        <div className="text-xs text-[#4a2329]/70">Giv kunden et kompensationsklip</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border border-[#502B30]/20 rounded-sm cursor-pointer hover:bg-[#502B30]/5">
                      <input
                        type="radio"
                        name="refundMethod"
                        value="stripe"
                        checked={refundMethod === 'stripe'}
                        onChange={(e) => setRefundMethod(e.target.value as 'stripe' | 'punchcard')}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-[#502B30]">Stripe Refund</div>
                        <div className="text-xs text-[#4a2329]/70">Refunder betalingen til kundens kort</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {selectedBooking.selected_theme_id && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-sm p-3 text-sm text-blue-800">
                  <strong>Private event:</strong> Betalingen vil blive refunderet via Stripe
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelLoading}
                  className="flex-1 px-4 py-2 border border-[#502B30]/20 text-[#502B30] rounded-sm hover:bg-[#502B30]/5 transition-colors"
                >
                  Annuller
                </button>
                <button
                  onClick={confirmCancelBooking}
                  disabled={!cancelReason.trim() || cancelLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cancelLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Aflyser...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Aflys Booking
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
