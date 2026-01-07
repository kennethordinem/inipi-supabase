/**
 * INIPI Supabase SDK
 * Replaces Clinio Members SDK with identical API
 * This ensures frontend code doesn't need to change
 */

'use client';

import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

// ============================================
// TYPES (matching Clinio SDK types)
// ============================================

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Session {
  id: string;
  name: string;
  description?: string;
  date: string;
  time: string;
  duration: number;
  maxParticipants: number;
  minimumParticipants: number;
  currentParticipants: number;
  availableSpots: number;
  groupTypeId: string;
  groupTypeName: string;
  groupTypeColor: string;
  employeeIds: string[];
  employeeNames: string[];
  price?: number;
  location?: string;
  themes?: any[];
  status?: string;
  maxSpotsPerBooking?: number;
  isPrivate?: boolean;
}

export interface Booking {
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
}

export interface PunchCard {
  id: string;
  name: string;
  totalPunches: number;
  remainingPunches: number;
  validForGroupTypes: string[];
  expiryDate?: string;
  status: string;
}

export interface MemberProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  memberSince: string | null;
  clinicId?: string;
  rootPatientId?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get current authenticated user
 */
async function getCurrentAuthUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Format session data from database
 */
function formatSession(dbSession: any, employees: any[] = [], groupType: any = null, releasedGuestSpots: number = 0): Session {
  const employeeNames = employees.map(e => e.name);
  const employeeIds = employees.map(e => e.id);
  
  // Calculate available spots including released guest spots
  const baseAvailableSpots = dbSession.max_participants - dbSession.current_participants;
  const totalAvailableSpots = baseAvailableSpots + releasedGuestSpots;
  
  return {
    id: dbSession.id,
    name: dbSession.name,
    description: dbSession.description,
    date: dbSession.date,
    time: dbSession.time,
    duration: dbSession.duration,
    maxParticipants: dbSession.max_participants,
    minimumParticipants: dbSession.minimum_participants || 1,
    currentParticipants: dbSession.current_participants,
    availableSpots: totalAvailableSpots,
    groupTypeId: dbSession.group_type_id,
    groupTypeName: groupType?.name || '',
    groupTypeColor: groupType?.color || '#6366f1',
    employeeIds,
    employeeNames,
    price: parseFloat(dbSession.price),
    location: dbSession.location,
    status: dbSession.status,
    maxSpotsPerBooking: dbSession.max_seats_per_booking || 6,
    isPrivate: groupType?.is_private || false,
  };
}

// ============================================
// AUTHENTICATION METHODS
// ============================================

/**
 * Login with email and password
 */
async function login(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Login failed');

  return data.user;
}

/**
 * Logout current user
 */
async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Register new user
 */
async function register(params: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}): Promise<{ success: boolean; userId: string; patientId: string }> {
  const { email, password, name, phone } = params;
  
  // Split name into first and last
  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phone || '',
      },
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Registration failed');

  return {
    success: true,
    userId: data.user.id,
    patientId: data.user.id,
  };
}

/**
 * Check if user is authenticated
 */
function isAuthenticated(): boolean {
  // Synchronous check - will be true if session exists
  return typeof window !== 'undefined' && localStorage.getItem('userId') !== null;
}

/**
 * Get current user (synchronous)
 */
function getCurrentUser(): User | null {
  // This is a simplified version - real implementation would use Supabase session
  return null;
}

/**
 * Reset password - sends password reset email
 */
async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Listen to auth state changes
 */
function onAuthStateChanged(callback: (state: AuthState) => void): () => void {
  // Initial state
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback({
      user: session?.user || null,
      isAuthenticated: !!session?.user,
      isLoading: false,
    });
  });

  // Listen for changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback({
      user: session?.user || null,
      isAuthenticated: !!session?.user,
      isLoading: false,
    });
  });

  return () => {
    subscription.unsubscribe();
  };
}

// ============================================
// SESSION METHODS
// ============================================

/**
 * Get all available sessions/classes
 */
async function getClasses(filters?: {
  typeFilter?: string;
  groupTypeId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ sessions: Session[]; count: number }> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  let query = supabase
    .from('sessions')
    .select(`
      *,
      group_types!inner(id, name, color, is_private, minimum_seats),
      session_employees(
        employees(id, name)
      ),
      guest_spots(id, status)
    `)
    .eq('status', 'active')
    .gte('date', todayStr)
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (filters?.typeFilter) {
    query = query.eq('group_types.name', filters.typeFilter);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  // Format sessions
  let sessions = (data || []).map((dbSession: any) => {
    const employees = dbSession.session_employees?.map((se: any) => se.employees) || [];
    
    // Count released guest spots (these are now available for booking)
    const releasedGuestSpots = (dbSession.guest_spots || []).filter(
      (spot: any) => spot.status === 'released_to_public'
    ).length;
    
    // Count booked gusmester spots (these are occupied but not in current_participants)
    const bookedGusmesterSpots = (dbSession.guest_spots || []).filter(
      (spot: any) => spot.status === 'booked_by_gusmester'
    ).length;
    
    // Count reserved gusmester spots (not yet released or booked)
    const reservedGusmesterSpots = (dbSession.guest_spots || []).filter(
      (spot: any) => spot.status === 'reserved_for_host' || spot.status === 'booked_as_self'
    ).length;
    
    // Adjust current participants to include:
    // - booked gusmester spots (someone booked with points)
    // - reserved gusmester spots (not yet released to public)
    const adjustedSession = {
      ...dbSession,
      current_participants: dbSession.current_participants + bookedGusmesterSpots + reservedGusmesterSpots
    };
    
    return formatSession(adjustedSession, employees, dbSession.group_types, releasedGuestSpots);
  });

  // Filter by date range based on session type
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  const oneYearFromNow = new Date(today);
  oneYearFromNow.setFullYear(today.getFullYear() + 1);

  sessions = sessions.filter((session: Session) => {
    const sessionDate = new Date(session.date);
    const isPrivate = session.isPrivate || session.groupTypeName?.toLowerCase().includes('privat');
    
    // Hide private events that already have participants (already booked)
    if (isPrivate && session.currentParticipants > 0) {
      return false;
    }
    
    if (isPrivate) {
      // Private events: show up to 1 year ahead (only if not booked)
      return sessionDate <= oneYearFromNow;
    } else {
      // Fyraftensgus: show only 30 days ahead
      return sessionDate <= thirtyDaysFromNow;
    }
  });

  return {
    sessions,
    count: sessions.length,
  };
}

/**
 * Get session details by ID
 */
async function getSessionDetails(sessionId: string): Promise<any> {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      group_types(id, name, description, color, is_private, minimum_seats),
      session_employees(
        employees(id, name, title, public_profile)
      ),
      guest_spots(id, status)
    `)
    .eq('id', sessionId)
    .single();

  if (error) throw new Error(error.message);

  const employees = data.session_employees?.map((se: any) => se.employees) || [];
  
  // Count released guest spots
  const releasedGuestSpots = (data.guest_spots || []).filter(
    (spot: any) => spot.status === 'released_to_public'
  ).length;
  
  // Count booked gusmester spots (these are occupied but not in current_participants)
  const bookedGusmesterSpots = (data.guest_spots || []).filter(
    (spot: any) => spot.status === 'booked_by_gusmester'
  ).length;
  
  // Count reserved gusmester spots (not yet released or booked)
  const reservedGusmesterSpots = (data.guest_spots || []).filter(
    (spot: any) => spot.status === 'reserved_for_host' || spot.status === 'booked_as_self'
  ).length;
  
  // Adjust current participants to include:
  // - booked gusmester spots (someone booked with points)
  // - reserved gusmester spots (not yet released to public)
  const adjustedData = {
    ...data,
    current_participants: data.current_participants + bookedGusmesterSpots + reservedGusmesterSpots
  };
  
  // For private events, load all active themes for client selection
  let themes: any[] = [];
  if (data.group_types?.is_private) {
    const { data: themesData, error: themesError } = await supabase
      .from('themes')
      .select('id, name, description, image_url, color, price_per_seat')
      .eq('status', 'active')
      .order('name', { ascending: true });
    
    if (!themesError && themesData) {
      themes = themesData.map((theme: any) => ({
        ...theme,
        pricePerSeat: theme.price_per_seat,
      }));
    }
  }

  return {
    session: formatSession(adjustedData, employees, data.group_types, releasedGuestSpots),
    employees,
    groupType: data.group_types,
    themes,
  };
}

// ============================================
// BOOKING METHODS
// ============================================

/**
 * Book a session
 */
async function bookSession(params: {
  sessionId: string;
  spots: number;
  themeId?: string;
  paymentMethod: 'stripe' | 'punch_card' | 'manual';
  punchCardId?: string;
  paymentIntentId?: string;
  transactionId?: string;
}): Promise<{ 
  success: boolean; 
  appointmentId: string; 
  confirmationNumber: string;
  requiresPayment?: boolean;
  paymentUrl?: string;
}> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Generate confirmation number
  const confirmationNumber = `INIPI-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Get session and theme details for pricing
  const { data: sessionData } = await supabase
    .from('sessions')
    .select('name, price, date, time')
    .eq('id', params.sessionId)
    .single();

  // If theme is selected, get theme price and name; otherwise use session price
  let pricePerSeat = sessionData?.price || 0;
  let themeName: string | null = null;
  if (params.themeId) {
    const { data: themeData } = await supabase
      .from('themes')
      .select('name, price_per_seat')
      .eq('id', params.themeId)
      .single();
    
    if (themeData) {
      themeName = themeData.name;
      if (themeData.price_per_seat) {
        pricePerSeat = themeData.price_per_seat;
      }
    }
  }

  const totalAmount = pricePerSeat * params.spots;

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      user_id: user.id,
      session_id: params.sessionId,
      spots: params.spots,
      selected_theme_id: params.themeId, // Save selected theme
      payment_method: params.paymentMethod,
      payment_status: params.paymentMethod === 'stripe' ? 'paid' : 'pending',
      punch_card_id: params.punchCardId,
      stripe_payment_intent_id: params.paymentIntentId,
      confirmation_number: confirmationNumber,
      status: 'confirmed',
    })
    .select()
    .single();

  if (bookingError) throw new Error(bookingError.message);

  // Update session participants
  const { error: updateError } = await supabase.rpc('increment_session_participants', {
    session_id: params.sessionId,
    increment_by: params.spots,
  });

  if (updateError) {
    console.error('Error updating session participants:', updateError);
  }

  // If using punch card, deduct punches
  if (params.punchCardId) {
    const { error: punchError } = await supabase.rpc('use_punch_card', {
      card_id: params.punchCardId,
      spots_to_use: params.spots,
      booking_id: booking.id,
    });

    if (punchError) {
      console.error('Error using punch card:', punchError);
    }
  }

  // Create invoice for this booking
  const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  // Format session date and time for invoice
  let sessionDateTime = '';
  if (sessionData?.date && sessionData?.time) {
    const sessionDate = new Date(sessionData.date);
    const formattedDate = sessionDate.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const formattedTime = sessionData.time.substring(0, 5); // HH:MM format
    sessionDateTime = ` - ${formattedDate} kl. ${formattedTime}`;
  }
  
  // Build description with theme info if applicable
  let invoiceDescription = `${sessionData?.name || 'Saunagus'}${sessionDateTime} - ${params.spots} plads${params.spots > 1 ? 'er' : ''}`;
  if (themeName) {
    invoiceDescription += ` (${themeName} - ${pricePerSeat} kr/plads)`;
  }
  
  const { error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      invoice_number: invoiceNumber,
      amount: totalAmount,
      vat_amount: 0, // No VAT for now
      total_amount: totalAmount,
      description: invoiceDescription,
      payment_method: params.paymentMethod,
      payment_status: params.paymentMethod === 'stripe' ? 'paid' : params.paymentMethod === 'punch_card' ? 'paid' : 'pending',
      stripe_payment_intent_id: params.paymentIntentId,
      booking_id: booking.id,
      paid_at: params.paymentMethod === 'stripe' || params.paymentMethod === 'punch_card' ? new Date().toISOString() : null,
    });

  if (invoiceError) {
    console.error('Error creating invoice:', invoiceError);
  }

  // Send booking confirmation email (async, don't wait)
  fetch('/api/email/booking-confirmation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: booking.id }),
  }).catch(err => console.error('Error sending booking confirmation email:', err));

  // If using punch card, send punch card used email
  if (params.punchCardId) {
    fetch('/api/email/punch-card-used', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: booking.id, punchCardId: params.punchCardId }),
    }).catch(err => console.error('Error sending punch card used email:', err));
  }

  return {
    success: true,
    appointmentId: booking.id,
    confirmationNumber,
  };
}

/**
 * Cancel a booking
 */
async function cancelBooking(bookingId: string): Promise<{
  success: boolean;
  punchCardRestored?: boolean;
  message?: string;
}> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Get booking details
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*, sessions(*)')
    .eq('id', bookingId)
    .eq('user_id', user.id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  // Calculate hours until session starts
  const sessionDateTime = new Date(`${booking.sessions.date}T${booking.sessions.time}`);
  const hoursUntil = (sessionDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
  
  // Determine if eligible for compensation (24-hour rule)
  const eligibleForCompensation = hoursUntil >= 24;
  const cancelReason = eligibleForCompensation 
    ? 'Aflyst af bruger mere end 24 timer før sessionens start'
    : 'Aflyst af bruger mindre end 24 timer før sessionens start (ingen kompensation)';

  // Update booking status with automatic reason
  const { error: cancelError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      admin_reason: cancelReason, // Store automatic reason
    })
    .eq('id', bookingId);

  if (cancelError) throw new Error(cancelError.message);

  // Restore session participants
  await supabase.rpc('decrement_session_participants', {
    session_id: booking.session_id,
    decrement_by: booking.spots,
  });

  // Restore punch card if used, or create compensation punch card if paid AND >24 hours
  let punchCardRestored = false;
  let compensationMessage = '';
  
  if (booking.punch_card_id) {
    // Always restore punches to existing punch card (regardless of timing)
    await supabase.rpc('restore_punch_card', {
      card_id: booking.punch_card_id,
      spots_to_restore: booking.spots,
      booking_id: bookingId,
    });
    punchCardRestored = true;
    compensationMessage = `Dine ${booking.spots} klip er blevet returneret til dit klippekort`;
  } else if ((booking.payment_method === 'stripe' || booking.payment_method === 'card' || booking.payment_method === 'manual') && eligibleForCompensation) {
    // Create compensation punch card ONLY if paid AND cancelled >24 hours before
    const { data: session } = await supabase
      .from('sessions')
      .select('group_type_id, price')
      .eq('id', booking.session_id)
      .single();

    const { error: punchCardError } = await supabase
      .from('punch_cards')
      .insert({
        user_id: user.id,
        name: `Kompensation - Aflyst booking`,
        total_punches: booking.spots,
        remaining_punches: booking.spots,
        price: 0,
        valid_for_group_types: session?.group_type_id ? [session.group_type_id] : [],
        status: 'active',
        reason: cancelReason,
        related_booking_id: bookingId
      });

    if (punchCardError) {
      console.error('Error creating compensation punch card:', punchCardError);
      compensationMessage = 'Booking aflyst';
    } else {
      compensationMessage = `Booking aflyst. Du har fået et nyt klippekort med ${booking.spots} klip som kompensation`;
    }
  } else if (!eligibleForCompensation && !booking.punch_card_id) {
    // Cancelled less than 24 hours before - no compensation
    compensationMessage = 'Booking aflyst. Ingen kompensation da aflysningen skete mindre end 24 timer før sessionens start';
  } else {
    compensationMessage = 'Booking aflyst';
  }

  // Send cancellation email (async, don't wait)
  fetch('/api/email/booking-cancellation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      bookingId, 
      refundInfo: compensationMessage,
      punchCardAdded: !booking.punch_card_id && eligibleForCompensation && (booking.payment_method === 'stripe' || booking.payment_method === 'card' || booking.payment_method === 'manual'),
    }),
  }).catch(err => console.error('Error sending cancellation email:', err));

  return {
    success: true,
    punchCardRestored,
    message: compensationMessage,
  };
}

/**
 * Get user's bookings
 */
async function getMyBookings(includeHistory: boolean = false): Promise<{
  upcoming: Booking[];
  past: Booking[];
}> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      sessions(name, date, time, duration, location, price, group_types(name, color)),
      invoices(amount)
    `)
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .order('sessions(date)', { ascending: true });

  if (error) throw new Error(error.message);

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const upcoming: Booking[] = [];
  const past: Booking[] = [];

  (data || []).forEach((booking: any) => {
    const session = booking.sessions;
    const bookingDate = session.date;
    
    // Calculate price from invoice if available, otherwise from session price × spots
    let price = 0;
    if (booking.invoices && booking.invoices.length > 0) {
      price = parseFloat(booking.invoices[0].amount || 0);
    } else if (session.price && booking.spots) {
      price = parseFloat(session.price) * booking.spots;
    }

    const formattedBooking: Booking = {
      id: booking.id,
      date: session.date,
      time: session.time,
      duration: session.duration,
      type: session.group_types?.name || 'Session',
      status: booking.status,
      paymentStatus: booking.payment_status,
      paymentMethod: booking.payment_method,
      price: price,
      spots: booking.spots,
      location: session.location,
      color: session.group_types?.color || '#6366f1',
      punchCardId: booking.punch_card_id,
    };

    if (bookingDate >= today) {
      upcoming.push(formattedBooking);
    } else if (includeHistory) {
      past.push(formattedBooking);
    }
  });

  return { upcoming, past };
}

// ============================================
// PUNCH CARD METHODS
// ============================================

/**
 * Get user's punch cards
 */
async function getPunchCards(): Promise<{ punchCards: PunchCard[] }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('punch_cards')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .gt('remaining_punches', 0);

  if (error) throw new Error(error.message);

  const punchCards = (data || []).map((card: any) => ({
    id: card.id,
    name: card.name,
    totalPunches: card.total_punches,
    remainingPunches: card.remaining_punches,
    validForGroupTypes: card.valid_for_group_types || [],
    expiryDate: card.expiry_date,
    status: card.status,
  }));

  return { punchCards };
}

/**
 * Get punch card history
 */
async function getPunchCardHistory(): Promise<{ punchCards: any[] }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  console.log('[getPunchCardHistory] Loading punch cards for user:', user.id);

  // Get punch cards without joining (to avoid FK issues)
  const { data: punchCardsData, error: punchCardsError } = await supabase
    .from('punch_cards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (punchCardsError) {
    console.error('[getPunchCardHistory] Error:', punchCardsError);
    throw new Error(punchCardsError.message);
  }

  console.log('[getPunchCardHistory] Found punch cards:', punchCardsData?.length || 0);

  // Get usage history AND adjustments for each punch card
  const punchCardsWithHistory = await Promise.all(
    (punchCardsData || []).map(async (card: any) => {
      // Fetch usage history with session details
      const { data: usageData } = await supabase
        .from('punch_card_usage')
        .select(`
          id,
          booking_id,
          spots_used,
          remaining_after,
          used_at,
          bookings!inner(
            session_id,
            sessions!inner(
              id,
              name,
              date,
              time
            )
          )
        `)
        .eq('punch_card_id', card.id)
        .order('used_at', { ascending: false });

      // Fetch adjustment history (refunds, compensations, etc.)
      const { data: adjustmentData } = await supabase
        .from('punch_card_adjustments')
        .select('*')
        .eq('punch_card_id', card.id)
        .order('adjusted_at', { ascending: false});

      // Format usage data with session info
      const formattedUsage = (usageData || []).map((u: any) => {
        // Access nested session data (bookings is an object, sessions is an object)
        const session = u.bookings?.sessions;
        return {
          id: u.id,
          type: 'usage',
          timestamp: u.used_at,
          spotsUsed: u.spots_used,
          remainingAfter: u.remaining_after,
          sessionName: session?.name || 'Session',
          sessionDate: session?.date,
          sessionTime: session?.time,
          usedAt: u.used_at
        };
      });

      // Combine and sort both histories by timestamp
      const combinedHistory = [
        ...formattedUsage,
        ...(adjustmentData || []).map(a => ({ ...a, type: 'adjustment', timestamp: a.adjusted_at }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        id: card.id,
        name: card.name,
        totalPunches: card.total_punches,
        remainingPunches: card.remaining_punches,
        validForGroupTypes: card.valid_for_group_types || [],
        expiryDate: card.expiry_date,
        status: card.status,
        purchaseDate: card.created_at,
        price: card.price || 0,
        usageHistory: combinedHistory,
      };
    })
  );

  console.log('[getPunchCardHistory] Returning formatted cards:', punchCardsWithHistory.length);

  return { punchCards: punchCardsWithHistory };
}

// ============================================
// PROFILE METHODS
// ============================================

/**
 * Get user profile
 */
async function getProfile(): Promise<MemberProfile> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    memberSince: data.member_since,
  };
}

/**
 * Update user profile
 */
async function updateProfile(updates: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}): Promise<void> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: updates.firstName,
      last_name: updates.lastName,
      phone: updates.phone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) throw new Error(error.message);
}

// ============================================
// EMPLOYEE METHODS
// ============================================

/**
 * Check if user is an employee
 */
async function checkIfEmployee(): Promise<{
  isEmployee: boolean;
  employeeId?: string;
  employeeName?: string;
  points?: number;
  frontendPermissions?: {
    gusmester: boolean;
    staff: boolean;
    administration: boolean;
  };
}> {
  const user = await getCurrentAuthUser();
  if (!user) return { isEmployee: false };

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return { isEmployee: false };
  }

  return {
    isEmployee: true,
    employeeId: data.id,
    employeeName: data.name,
    points: data.points,
    frontendPermissions: data.frontend_permissions,
  };
}

/**
 * Get employee stats
 */
async function getEmployeeStats(): Promise<{
  employeeId: string;
  employeeName: string;
  points: number;
  pointsHistory: any[];
  autoReleasePreference: string;
}> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  const { data: employee, error } = await supabase
    .from('employees')
    .select('id, name, points, auto_release_guest_spot')
    .eq('user_id', user.id)
    .single();

  if (error) throw new Error(error.message);

  // Get points history separately with proper ordering
  const { data: pointsHistory, error: historyError } = await supabase
    .from('employee_points_history')
    .select('*')
    .eq('employee_id', employee.id)
    .order('timestamp', { ascending: false });

  if (historyError) {
    console.error('[getEmployeeStats] Error loading points history:', historyError);
  }

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    points: employee.points,
    pointsHistory: pointsHistory || [],
    autoReleasePreference: employee.auto_release_guest_spot || '3_hours',
  };
}

/**
 * Update auto-release preference
 */
async function updateAutoReleasePreference(preference: string): Promise<{ success: boolean }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Validate preference
  if (!['never', '3_hours', '24_hours'].includes(preference)) {
    throw new Error('Invalid preference value');
  }

  const { error } = await supabase
    .from('employees')
    .update({ auto_release_guest_spot: preference })
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  return { success: true };
}

/**
 * Get employee public profile (for editing own profile)
 */
async function getEmployeePublicProfile(): Promise<{
  employeeId: string;
  name: string;
  title: string;
  publicProfile: {
    bio?: string;
    photoUrl?: string;
    specializations?: string[];
    qualifications?: string[];
    experience?: string;
    showInBooking?: boolean;
  };
}> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  const { data: employee, error } = await supabase
    .from('employees')
    .select('id, name, title, public_profile')
    .eq('user_id', user.id)
    .single();

  if (error) throw new Error(error.message);

  return {
    employeeId: employee.id,
    name: employee.name,
    title: employee.title || '',
    publicProfile: employee.public_profile || {},
  };
}

/**
 * Update employee public profile (for editing own profile)
 */
async function updateEmployeePublicProfile(data: {
  title?: string;
  bio?: string;
  photoUrl?: string;
  specializations?: string[];
  qualifications?: string[];
  experience?: string;
  showInBooking?: boolean;
}): Promise<{ success: boolean }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Get current profile
  const { data: employee } = await supabase
    .from('employees')
    .select('public_profile')
    .eq('user_id', user.id)
    .single();

  const currentProfile = employee?.public_profile || {};

  // Merge with new data
  const updatedProfile = {
    ...currentProfile,
    bio: data.bio !== undefined ? data.bio : currentProfile.bio,
    photoUrl: data.photoUrl !== undefined ? data.photoUrl : currentProfile.photoUrl,
    specializations: data.specializations !== undefined ? data.specializations : currentProfile.specializations,
    qualifications: data.qualifications !== undefined ? data.qualifications : currentProfile.qualifications,
    experience: data.experience !== undefined ? data.experience : currentProfile.experience,
    showInBooking: data.showInBooking !== undefined ? data.showInBooking : currentProfile.showInBooking,
  };

  const updateData: any = {
    public_profile: updatedProfile,
  };

  if (data.title !== undefined) {
    updateData.title = data.title;
  }

  const { error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  return { success: true };
}

/**
 * Admin: Update employee public profile
 */
async function adminUpdateEmployeeProfile(employeeId: string, data: {
  title?: string;
  bio?: string;
  photoUrl?: string;
  specializations?: string[];
  qualifications?: string[];
  experience?: string;
  showInBooking?: boolean;
}): Promise<{ success: boolean }> {
  // Get current profile
  const { data: employee } = await supabase
    .from('employees')
    .select('public_profile')
    .eq('id', employeeId)
    .single();

  const currentProfile = employee?.public_profile || {};

  // Merge with new data
  const updatedProfile = {
    ...currentProfile,
    bio: data.bio !== undefined ? data.bio : currentProfile.bio,
    photoUrl: data.photoUrl !== undefined ? data.photoUrl : currentProfile.photoUrl,
    specializations: data.specializations !== undefined ? data.specializations : currentProfile.specializations,
    qualifications: data.qualifications !== undefined ? data.qualifications : currentProfile.qualifications,
    experience: data.experience !== undefined ? data.experience : currentProfile.experience,
    showInBooking: data.showInBooking !== undefined ? data.showInBooking : currentProfile.showInBooking,
  };

  const updateData: any = {
    public_profile: updatedProfile,
  };

  if (data.title !== undefined) {
    updateData.title = data.title;
  }

  const { error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', employeeId);

  if (error) throw new Error(error.message);

  return { success: true };
}

// ============================================
// SHOP METHODS
// ============================================

/**
 * Get shop punch cards
 */
async function getShopPunchCards(): Promise<{ punchCards: any[] }> {
  try {
    const { data: shopProducts, error } = await supabase
      .from('shop_products')
      .select('*')
      .eq('status', 'active')
      .order('price', { ascending: true });

    if (error) {
      console.error('[getShopPunchCards] Error:', error);
      throw new Error(error.message);
    }

    // Format shop products to match PunchCard interface expected by shop page
    const punchCards = (shopProducts || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      numberOfPunches: product.total_punches,
      validityMonths: product.validity_months,
      groupTypes: product.valid_for_group_types || [],
      status: product.status,
    }));

    return { punchCards };
  } catch (error: any) {
    console.error('[getShopPunchCards] Error loading shop punch cards:', error);
    return { punchCards: [] };
  }
}

/**
 * Create payment intent
 */
async function createPaymentIntent(params: {
  amount: number;
  metadata: any;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  // This will call a Supabase Edge Function
  // For now, throw error
  throw new Error('Payment integration not yet implemented');
}

/**
 * Get payment history
 */
async function getPaymentHistory(limit?: number): Promise<{ payments: any[] }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  // Format invoices to match expected payment format
  const payments = (data || []).map(invoice => ({
    id: invoice.id,
    amount: parseFloat(invoice.total_amount || invoice.amount || 0),
    description: invoice.description,
    date: invoice.paid_at || invoice.created_at,
    status: invoice.payment_status,
    method: invoice.payment_method,
  }));

  return { payments };
}

// ============================================
// PLACEHOLDER METHODS (Not yet implemented)
// ============================================

async function getConfig(): Promise<any> {
  // Return company configuration with actual company information
  return {
    clinicName: 'INIPI Amagerstrand',
    currency: 'DKK',
    companyInfo: {
      address: {
        street: 'Havkajakvej 8',
        zipCode: '2300',
        city: 'København S',
      },
      cvr: '38114174',
      email: 'mail@inipi.dk',
      phone: '+45 31 20 60 11',
    },
    branding: {},
    terminology: {},
  };
}

async function getGroupTypes() {
  throw new Error('Not implemented');
}

async function getShopProducts() {
  throw new Error('Not implemented');
}

/**
 * Get available gusmester spots (sessions with released guest spots)
 */
async function getAvailableGusmesterSpots(): Promise<{ spots: any[] }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Get gusmester spots that are available for booking with points
  // These are spots with spot_type = 'gusmester_spot' that are either:
  // - reserved_for_host (not yet released to public, but bookable by gusmesters)
  // - released_to_public (released to public, still bookable by gusmesters)
  const { data, error } = await supabase
    .from('guest_spots')
    .select(`
      *,
      sessions!inner(
        id,
        name,
        date,
        time,
        duration,
        location,
        status
      ),
      host_employee:employees!host_employee_id(
        name
      )
    `)
    .eq('spot_type', 'gusmester_spot')
    .in('status', ['reserved_for_host', 'released_to_public'])
    .gte('sessions.date', new Date().toISOString().split('T')[0])
    .eq('sessions.status', 'active');

  if (error) throw new Error(error.message);

  const spots = (data || []).map(spot => ({
    id: spot.session_id,
    spotId: spot.id,
    name: spot.sessions.name,
    date: spot.sessions.date,
    time: spot.sessions.time,
    duration: spot.sessions.duration,
    location: spot.sessions.location,
    hostName: spot.host_employee?.name || 'Unknown',
    spotType: spot.spot_type || 'guest_spot',
    pointCost: 150, // Standard cost
  }));

  return { spots };
}

/**
 * Get my gusmester bookings
 */
async function getMyGusmesterBookings(): Promise<{ bookings: any[] }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Get employee record
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!employee) return { bookings: [] };

  // Get gusmester bookings
  const { data: bookingsData, error: bookingsError } = await supabase
    .from('gusmester_bookings')
    .select('*')
    .eq('employee_id', employee.id)
    .eq('status', 'active');

  if (bookingsError) throw new Error(bookingsError.message);
  if (!bookingsData || bookingsData.length === 0) return { bookings: [] };

  // Get session IDs
  const sessionIds = bookingsData.map(b => b.session_id);

  // Fetch sessions
  const { data: sessionsData, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .in('id', sessionIds)
    .gte('date', new Date().toISOString().split('T')[0]);

  if (sessionsError) throw new Error(sessionsError.message);

  // Fetch guest spots for these sessions
  const { data: guestSpotsData, error: guestSpotsError } = await supabase
    .from('guest_spots')
    .select('session_id, host_employee_id')
    .in('session_id', sessionIds);

  if (guestSpotsError) throw new Error(guestSpotsError.message);

  // Fetch host employees
  const hostEmployeeIds = [...new Set((guestSpotsData || []).map(gs => gs.host_employee_id))];
  const { data: employeesData } = await supabase
    .from('employees')
    .select('id, name')
    .in('id', hostEmployeeIds);

  // Create maps for easy lookup
  const sessionsMap = new Map((sessionsData || []).map(s => [s.id, s]));
  const guestSpotsMap = new Map((guestSpotsData || []).map(gs => [gs.session_id, gs]));
  const employeesMap = new Map((employeesData || []).map(e => [e.id, e]));

  const bookings = bookingsData
    .map(booking => {
      const session = sessionsMap.get(booking.session_id);
      if (!session) return null;

      const guestSpot = guestSpotsMap.get(booking.session_id);
      const hostEmployee = guestSpot ? employeesMap.get(guestSpot.host_employee_id) : null;

      const sessionDate = new Date(`${session.date}T${session.time}`);
      const hoursUntil = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);
      
      return {
        id: booking.id,
        name: session.name,
        date: session.date,
        time: session.time,
        duration: session.duration,
        location: session.location,
        hostName: hostEmployee?.name || 'Unknown',
        canCancel: hoursUntil > 24,
      };
    })
    .filter(b => b !== null);

  return { bookings };
}

/**
 * Book a gusmester spot (costs 150 points)
 */
async function bookGusmesterSpot(sessionId: string): Promise<{ success: boolean; newPoints: number }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Get employee record
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, points')
    .eq('user_id', user.id)
    .single();

  if (empError || !employee) throw new Error('Not an employee');
  if (employee.points < 150) throw new Error('Insufficient points');

  // Check if gusmester spot exists and is available (gusmester_spot type, not guest_spot)
  const { data: guestSpot, error: spotError } = await supabase
    .from('guest_spots')
    .select('id, status, session_id, spot_type')
    .eq('session_id', sessionId)
    .eq('spot_type', 'gusmester_spot')
    .single();

  if (spotError || !guestSpot) {
    throw new Error('No gusmester spot exists for this session');
  }

  // Gusmester spots can be booked if they are reserved_for_host OR released_to_public
  if (guestSpot.status !== 'reserved_for_host' && guestSpot.status !== 'released_to_public') {
    throw new Error('This spot is not available (already booked or reserved)');
  }

  // Check if employee already has an active booking for this session
  const { data: existingBooking } = await supabase
    .from('gusmester_bookings')
    .select('id')
    .eq('employee_id', employee.id)
    .eq('session_id', sessionId)
    .eq('status', 'active')
    .maybeSingle();

  if (existingBooking) {
    throw new Error('You have already booked this spot');
  }

  // Update guest spot status FIRST (this will fail if someone else just booked it)
  // Match either reserved_for_host OR released_to_public
  const { data: updateResult, error: spotUpdateError, count } = await supabase
    .from('guest_spots')
    .update({ status: 'booked_by_gusmester' })
    .eq('session_id', sessionId)
    .eq('spot_type', 'gusmester_spot') // Target the gusmester spot specifically
    .in('status', ['reserved_for_host', 'released_to_public']) // Allow booking from either status
    .select();

  console.log('[bookGusmesterSpot] Update result:', { updateResult, spotUpdateError, count });

  if (spotUpdateError) {
    console.error('[bookGusmesterSpot] Update error:', spotUpdateError);
    throw new Error('Failed to claim spot: ' + spotUpdateError.message);
  }

  // Check if any rows were actually updated
  if (!updateResult || updateResult.length === 0) {
    console.error('[bookGusmesterSpot] No rows updated - spot may already be booked');
    throw new Error('Spot was claimed by another gusmester or is no longer available');
  }

  console.log('[bookGusmesterSpot] Successfully claimed spot:', updateResult[0]);

  // Create gusmester booking
  const { error: bookingError } = await supabase
    .from('gusmester_bookings')
    .insert({
      employee_id: employee.id,
      session_id: sessionId,
      point_cost: 150,
      status: 'active',
    });

  if (bookingError) {
    // Rollback: Release the spot back to its original status
    // Set it back to reserved_for_host (the default for gusmester spots)
    await supabase
      .from('guest_spots')
      .update({ status: 'reserved_for_host' })
      .eq('session_id', sessionId)
      .eq('spot_type', 'gusmester_spot');
    throw new Error(bookingError.message);
  }

  // Deduct points
  const newPoints = employee.points - 150;
  const { error: updateError } = await supabase
    .from('employees')
    .update({ points: newPoints })
    .eq('id', employee.id);

  if (updateError) {
    // Rollback: Cancel booking and release spot back to reserved_for_host
    await supabase
      .from('gusmester_bookings')
      .update({ status: 'cancelled' })
      .eq('employee_id', employee.id)
      .eq('session_id', sessionId);
    await supabase
      .from('guest_spots')
      .update({ status: 'reserved_for_host' })
      .eq('session_id', sessionId)
      .eq('spot_type', 'gusmester_spot');
    throw new Error(updateError.message);
  }

  // Record points history
  await supabase.from('employee_points_history').insert({
    employee_id: employee.id,
    amount: -150,
    reason: 'Booked gusmester spot',
    related_session_id: sessionId,
  });

  return { success: true, newPoints };
}

/**
 * Cancel a gusmester booking (refund 150 points if >24h before)
 */
async function cancelGusmesterBooking(bookingId: string): Promise<{ success: boolean; newPoints: number }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Get booking details
  const { data: booking, error: bookingError } = await supabase
    .from('gusmester_bookings')
    .select(`
      *,
      sessions(date, time),
      employees(id, points, user_id)
    `)
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) throw new Error('Booking not found');
  if (booking.employees.user_id !== user.id) throw new Error('Not your booking');

  // Check if can cancel (>3h before)
  const sessionDate = new Date(`${booking.sessions.date}T${booking.sessions.time}`);
  const hoursUntil = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);
  
  if (hoursUntil <= 3) {
    throw new Error('Du kan ikke aflyse mindre end 3 timer før sessionen');
  }

  // Cancel booking
  const { error: cancelError } = await supabase
    .from('gusmester_bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', bookingId);

  if (cancelError) throw new Error(cancelError.message);

  // Refund points
  const newPoints = booking.employees.points + 150;
  await supabase
    .from('employees')
    .update({ points: newPoints })
    .eq('id', booking.employee_id);

  // Record points history
  await supabase.from('employee_points_history').insert({
    employee_id: booking.employee_id,
    amount: 150,
    reason: 'Gusmester booking cancelled',
    related_booking_id: bookingId,
  });

  // Release gusmester spot back to public
  await supabase
    .from('guest_spots')
    .update({ status: 'released_to_public' })
    .eq('session_id', booking.session_id)
    .eq('spot_type', 'gusmester_spot');

  return { success: true, newPoints };
}

/**
 * Get sessions where I'm hosting (have a guest spot)
 */
async function getMyHostingSessions(): Promise<{ sessions: any[] }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Get employee record
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!employee) return { sessions: [] };

  // Get guest spots where I'm the host
  const { data: guestSpotsData, error: guestSpotsError } = await supabase
    .from('guest_spots')
    .select('*')
    .eq('host_employee_id', employee.id);

  if (guestSpotsError) throw new Error(guestSpotsError.message);
  if (!guestSpotsData || guestSpotsData.length === 0) return { sessions: [] };

  // Get session IDs
  const sessionIds = guestSpotsData.map(gs => gs.session_id);

  // Fetch sessions
  const { data: sessionsData, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .in('id', sessionIds)
    .gte('date', new Date().toISOString().split('T')[0]);

  if (sessionsError) throw new Error(sessionsError.message);

  // Group guest spots by session and type
  const sessionSpotsMap = new Map<string, { gusmesterSpot?: any; guestSpot?: any }>();
  
  guestSpotsData.forEach(gs => {
    if (!sessionSpotsMap.has(gs.session_id)) {
      sessionSpotsMap.set(gs.session_id, {});
    }
    const spots = sessionSpotsMap.get(gs.session_id)!;
    if (gs.spot_type === 'gusmester_spot') {
      spots.gusmesterSpot = gs;
    } else {
      spots.guestSpot = gs;
    }
  });

  const sessions = (sessionsData || []).map(session => {
    const spots = sessionSpotsMap.get(session.id);
    if (!spots) return null;

    const sessionDate = new Date(`${session.date}T${session.time}`);
    const hoursUntil = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);

    return {
      id: session.id,
      name: session.name,
      date: session.date,
      time: session.time,
      duration: session.duration,
      location: session.location,
      // Gusmester Spot (auto-released 3h before, no manual control)
      gusmesterSpot: spots.gusmesterSpot ? {
        id: spots.gusmesterSpot.id,
        status: spots.gusmesterSpot.status,
        spotType: 'gusmester_spot',
        autoRelease: true,
        canManuallyRelease: false,
      } : null,
      // Guest Spot (manually releasable, earns points)
      guestSpot: spots.guestSpot ? {
        id: spots.guestSpot.id,
        status: spots.guestSpot.status,
        spotType: 'guest_spot',
        guestName: spots.guestSpot.guest_name,
        guestEmail: spots.guestSpot.guest_email,
        canRelease: spots.guestSpot.status === 'reserved_for_host',
        willEarnPoints: hoursUntil > 3,
        autoRelease: false,
      } : null,
      hoursUntilEvent: hoursUntil,
    };
  }).filter(s => s !== null);

  return { sessions };
}

/**
 * Release guest spot to public (earn 150 points if >3h before)
 * NOTE: Only works for 'guest_spot' type, not 'gusmester_spot' (which is auto-released)
 */
async function releaseGuestSpot(sessionId: string, spotId?: string): Promise<{ success: boolean; earnedPoints: boolean; newPoints: number }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Get employee record
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, points')
    .eq('user_id', user.id)
    .single();

  if (empError || !employee) throw new Error('Not an employee');

  // Get the guest spot to verify it's the right type and belongs to this employee
  const spotQuery = supabase
    .from('guest_spots')
    .select('id, session_id, spot_type, status')
    .eq('host_employee_id', employee.id)
    .eq('spot_type', 'guest_spot'); // Only allow releasing guest_spot type
  
  if (spotId) {
    spotQuery.eq('id', spotId);
  } else {
    spotQuery.eq('session_id', sessionId);
  }

  const { data: guestSpot, error: spotError } = await spotQuery.single();

  if (spotError || !guestSpot) {
    throw new Error('Guest spot not found or you do not have permission');
  }

  if (guestSpot.status !== 'reserved_for_host' && guestSpot.status !== 'booked_by_host') {
    throw new Error('This spot has already been released');
  }

  // Get session details
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('date, time')
    .eq('id', guestSpot.session_id)
    .single();

  if (sessionError) throw new Error(sessionError.message);

  // Check hours until event
  const sessionDate = new Date(`${session.date}T${session.time}`);
  const hoursUntil = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const earnPoints = hoursUntil > 3;

  // Update guest spot status
  const { error: updateError } = await supabase
    .from('guest_spots')
    .update({
      status: 'released_to_public',
      released_at: new Date().toISOString(),
      points_earned: earnPoints,
    })
    .eq('id', guestSpot.id);

  if (updateError) throw new Error(updateError.message);

  let newPoints = employee.points;

  // Award points if released >3h before
  if (earnPoints) {
    newPoints = employee.points + 150;
    await supabase
      .from('employees')
      .update({ points: newPoints })
      .eq('id', employee.id);

    // Record points history
    await supabase.from('employee_points_history').insert({
      employee_id: employee.id,
      amount: 150,
      reason: 'Released guest spot to public',
      related_session_id: guestSpot.session_id,
    });
  }

  return { success: true, earnedPoints: earnPoints, newPoints };
}

/**
 * Book self as guest for my hosting session (no details needed)
 */
async function bookSelfAsGuest(sessionId: string): Promise<{ success: boolean }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Get employee record
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!employee) throw new Error('Not an employee');

  // Mark guest spot as used by host (no guest details stored)
  // Only works for guest_spot type
  const { error } = await supabase
    .from('guest_spots')
    .update({
      status: 'booked_by_host',
      guest_name: null,
      guest_email: null,
      guest_phone: null,
    })
    .eq('session_id', sessionId)
    .eq('host_employee_id', employee.id)
    .eq('spot_type', 'guest_spot')
    .eq('status', 'reserved_for_host');

  if (error) throw new Error(error.message);

  return { success: true };
}

/**
 * Book a guest for my hosting session
 */
async function bookGuestForSession(sessionId: string, guestName: string, guestEmail: string, guestPhone?: string): Promise<{ success: boolean; guestName: string }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Get employee record
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!employee) throw new Error('Not an employee');

  // Update guest spot with guest details
  // Only works for guest_spot type
  const { error } = await supabase
    .from('guest_spots')
    .update({
      status: 'booked_by_host',
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone || null,
    })
    .eq('session_id', sessionId)
    .eq('host_employee_id', employee.id)
    .eq('spot_type', 'guest_spot')
    .eq('status', 'reserved_for_host');

  if (error) throw new Error(error.message);

  return { success: true, guestName };
}

/**
 * Get ALL sessions for staff/management (not filtered by employee assignment)
 */
async function getStaffSessions(filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ sessions: any[]; count: number }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Build query - get ALL active sessions (not filtered by employee)
  let query = supabase
    .from('sessions')
    .select(`
      *,
      group_types(id, name, color),
      session_employees(
        employees(id, name)
      )
    `)
    .eq('status', 'active');

  // Apply date filters
  if (filters?.startDate) {
    query = query.gte('date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('date', filters.endDate);
  }

  // Order by date and time
  query = query.order('date', { ascending: true }).order('time', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('[getStaffSessions] Query error:', error);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return { sessions: [], count: 0 };
  }

  // Format sessions and load participants
  const sessionsWithParticipants = await Promise.all(
    (data || []).map(async (dbSession: any) => {
      const employees = dbSession.session_employees?.map((se: any) => se.employees) || [];
      const session = formatSession(dbSession, employees, dbSession.group_types);
      
      // Load participants for this session
      const participants = await getStaffSessionParticipants(dbSession.id);
      
      return {
        ...session,
        participants: participants || [],
      };
    })
  );

  return {
    sessions: sessionsWithParticipants,
    count: sessionsWithParticipants.length,
  };
}

/**
 * Get all clients (profiles) for management view
 */
async function getAllClients(): Promise<{ data: any[]; count: number }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Check if user has staff permission
  const employeeCheck = await checkIfEmployee();
  if (!employeeCheck.isEmployee || !employeeCheck.frontendPermissions?.staff) {
    throw new Error('Unauthorized - staff permission required');
  }

  // Get all profiles with employee status
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('member_since', { ascending: false});

  if (profilesError) {
    console.error('[getAllClients] Error loading profiles:', profilesError);
    throw new Error(profilesError.message);
  }

  // Get all employees to mark which profiles are employees
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('user_id');

  if (employeesError) {
    console.error('[getAllClients] Error loading employees:', employeesError);
  }

  const employeeUserIds = new Set(employees?.map(e => e.user_id) || []);

  const clientsWithEmployeeStatus = (profiles || []).map(profile => ({
    ...profile,
    isEmployee: employeeUserIds.has(profile.id)
  }));

  return {
    data: clientsWithEmployeeStatus,
    count: clientsWithEmployeeStatus.length
  };
}

/**
 * Get participants for a specific session (for staff view)
 */
async function getStaffSessionParticipants(sessionId: string): Promise<any[]> {
  try {
    // Get regular bookings WITHOUT joining profiles (no FK relationship exists)
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'confirmed');

    if (bookingsError) {
      console.error('[getStaffSessionParticipants] Bookings error:', bookingsError);
      throw bookingsError;
    }

    console.log('[getStaffSessionParticipants] Raw bookings:', bookings);

    // Get gusmester bookings
    const { data: gusmesterBookings, error: gusmesterError } = await supabase
      .from('gusmester_bookings')
      .select(`
        *,
        guest_spots!inner(session_id)
      `)
      .eq('guest_spots.session_id', sessionId)
      .eq('status', 'confirmed');

    if (gusmesterError) {
      console.error('[getStaffSessionParticipants] Gusmester bookings error:', gusmesterError);
    }

    console.log('[getStaffSessionParticipants] Raw gusmester bookings:', gusmesterBookings);

    // Get all user IDs from bookings
    const userIds = (bookings || []).map(b => b.user_id).filter(Boolean);
    
    // Fetch profiles for all users in one query
    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, phone')
        .in('id', userIds);
      
      if (!profilesError && profiles) {
        profiles.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      } else {
        console.error('[getStaffSessionParticipants] Profiles error:', profilesError);
      }
    }

    console.log('[getStaffSessionParticipants] Profiles map:', profilesMap);

    // Format regular bookings with profile data
    const regularParticipants = (bookings || []).map((booking: any) => {
      const profile = profilesMap.get(booking.user_id);
      return {
        patientId: booking.user_id,
        patientName: profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Ukendt bruger'
          : 'Ukendt bruger',
        patientEmail: profile?.email || '',
        patientPhone: profile?.phone || '',
        spots: booking.spots,
        bookedAt: booking.created_at,
        paymentStatus: booking.payment_status,
        paymentMethod: booking.payment_method,
        paymentAmount: booking.amount,
        selectedThemeId: booking.theme_id,
        punchCardId: booking.punch_card_id,
        isGuest: false,
      };
    });

    // Format gusmester bookings
    const guestParticipants = (gusmesterBookings || []).map((booking: any) => ({
      patientId: booking.id,
      patientName: booking.guest_name || 'Gæst',
      patientEmail: '',
      patientPhone: '',
      spots: booking.spots_used,
      bookedAt: booking.created_at,
      paymentStatus: 'paid',
      paymentMethod: 'gusmester',
      isGuest: true,
    }));

    console.log('[getStaffSessionParticipants] Regular participants:', regularParticipants);
    console.log('[getStaffSessionParticipants] Guest participants:', guestParticipants);

    return [...regularParticipants, ...guestParticipants];
  } catch (error) {
    console.error('[getStaffSessionParticipants] Error loading session participants:', error);
    return [];
  }
}

async function getAdminMembers(page?: number, limit?: number, search?: string): Promise<{
  members: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  // TODO: Implement admin members list
  // For now, return empty result to allow compilation
  return {
    members: [],
    total: 0,
    page: page || 1,
    limit: limit || 50,
    totalPages: 0,
  };
}

async function getAdminMemberDetails(memberId: string): Promise<any> {
  // TODO: Implement admin member details
  // For now, return null to allow compilation
  return null;
}

/**
 * Admin: Cancel a booking and optionally issue compensation punch card
 */
async function adminCancelBooking(bookingId: string, reason: string, issueCompensation: boolean = true): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Check if user has staff permission
  const employeeCheck = await checkIfEmployee();
  if (!employeeCheck.isEmployee || !employeeCheck.frontendPermissions?.staff) {
    throw new Error('Unauthorized - staff permission required');
  }

  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, sessions(*)')
      .eq('id', bookingId)
      .single();

    if (bookingError) throw bookingError;
    if (!booking) throw new Error('Booking not found');

    // Cancel the booking with admin tracking
    const { error: cancelError } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        admin_action: 'cancelled',
        admin_reason: reason,
        admin_user_id: user.id,
        admin_action_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (cancelError) throw cancelError;

    // Restore session participants
    await supabase.rpc('decrement_session_participants', {
      session_id: booking.session_id,
      decrement_by: booking.spots,
    });

    // Handle compensation based on payment method
    if (booking.punch_card_id) {
      // If paid with punch card, always restore the clips
      await supabase.rpc('restore_punch_card', {
        card_id: booking.punch_card_id,
        spots_to_restore: booking.spots,
        booking_id: bookingId,
      });
    } else if (issueCompensation && (booking.payment_method === 'stripe' || booking.payment_method === 'card' || booking.payment_method === 'manual')) {
      // If paid with card/stripe/manual and compensation is requested, create compensation punch card
      const { error: punchCardError } = await supabase
        .from('punch_cards')
        .insert({
          user_id: booking.user_id,
          name: 'Kompensation - Aflyst booking',
          total_punches: booking.spots,
          remaining_punches: booking.spots,
          price: 0,
          status: 'active',
          reason: `Kompensation for aflyst booking. Årsag: ${reason}`,
          issued_by: user.id,
          related_booking_id: bookingId
        });

      if (punchCardError) {
        console.error('Error issuing compensation punch card:', punchCardError);
      }
    }

    return {
      success: true,
      message: booking.punch_card_id 
        ? `Booking aflyst og ${booking.spots} klip returneret` 
        : (issueCompensation ? 'Booking aflyst og kompensation udstedt' : 'Booking aflyst')
    };
  } catch (error: any) {
    console.error('[adminCancelBooking] Error:', error);
    throw new Error(error.message || 'Could not cancel booking');
  }
}

/**
 * Admin: Move a booking to a different session
 */
async function adminMoveBooking(bookingId: string, newSessionId: string, reason: string): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Check if user has staff permission
  const employeeCheck = await checkIfEmployee();
  if (!employeeCheck.isEmployee || !employeeCheck.frontendPermissions?.staff) {
    throw new Error('Unauthorized - staff permission required');
  }

  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError) throw bookingError;
    if (!booking) throw new Error('Booking not found');

    // Check if new session has availability
    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .select('max_participants, current_participants')
      .eq('id', newSessionId)
      .single();

    if (sessionError) throw sessionError;
    if (!newSession) throw new Error('Target session not found');

    const availableSpots = newSession.max_participants - newSession.current_participants;
    if (availableSpots < booking.spots) {
      throw new Error('Not enough available spots in target session');
    }

    // Move the booking with admin tracking
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        session_id: newSessionId,
        admin_action: 'moved',
        admin_reason: reason,
        admin_user_id: user.id,
        admin_action_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    return {
      success: true,
      message: 'Booking flyttet til ny session'
    };
  } catch (error: any) {
    console.error('[adminMoveBooking] Error:', error);
    throw new Error(error.message || 'Could not move booking');
  }
}

// ============================================
// STRIPE METHODS
// ============================================

/**
 * Get Stripe configuration
 */
async function getStripeConfig(): Promise<any> {
  const { data, error } = await supabase
    .from('stripe_config')
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Update Stripe configuration
 */
async function updateStripeConfig(config: {
  publishable_key: string;
  secret_key: string;
  webhook_secret?: string;
  mode: 'test' | 'live';
  enabled: boolean;
}): Promise<void> {
  // Get the existing config ID
  const { data: existing } = await supabase
    .from('stripe_config')
    .select('id')
    .single();

  if (!existing) {
    throw new Error('Stripe config not found');
  }

  const { error } = await supabase
    .from('stripe_config')
    .update({
      publishable_key: config.publishable_key,
      secret_key: config.secret_key,
      webhook_secret: config.webhook_secret,
      mode: config.mode,
      enabled: config.enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) throw new Error(error.message);
}

// ============================================
// EXPORT SDK (Same API as Clinio SDK)
// ============================================

export const members = {
  // Auth
  login,
  logout,
  register,
  resetPassword,
  isAuthenticated,
  getCurrentUser,
  onAuthStateChanged,

  // Config
  getConfig,

  // Sessions
  getClasses,
  getGroupTypes,
  getSessionDetails,

  // Bookings
  bookSession,
  cancelBooking,
  getMyBookings,

  // Punch Cards
  getPunchCards,
  getPunchCardHistory,

  // Profile
  getProfile,
  updateProfile,
  getPaymentHistory,

  // Shop
  getShopProducts,
  getShopPunchCards,
  createPaymentIntent,

  // Employee/Gusmester
  checkIfEmployee,
  getEmployeeStats,
  updateAutoReleasePreference,
  getEmployeePublicProfile,
  updateEmployeePublicProfile,
  getAvailableGusmesterSpots,
  getMyGusmesterBookings,
  bookGusmesterSpot,
  cancelGusmesterBooking,
  getMyHostingSessions,
  releaseGuestSpot,
  bookSelfAsGuest,
  bookGuestForSession,

  // Staff
  getStaffSessions,
  getStaffSessionParticipants,
  getAllClients,

  // Admin
  getAdminMembers,
  getAdminMemberDetails,
  adminCancelBooking,
  adminMoveBooking,
  adminUpdateEmployeeProfile,
  
  // Stripe
  getStripeConfig,
  updateStripeConfig,
};

