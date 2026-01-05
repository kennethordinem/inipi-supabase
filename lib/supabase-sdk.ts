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
}

export interface Booking {
  id: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  status: string;
  paymentStatus: string;
  price: number;
  spots?: number;
  location?: string;
  employeeName?: string;
  color?: string;
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
function formatSession(dbSession: any, employees: any[] = [], groupType: any = null): Session {
  const employeeNames = employees.map(e => e.name);
  const employeeIds = employees.map(e => e.id);
  
  return {
    id: dbSession.id,
    name: dbSession.name,
    description: dbSession.description,
    date: dbSession.date,
    time: dbSession.time,
    duration: dbSession.duration,
    maxParticipants: dbSession.max_participants,
    currentParticipants: dbSession.current_participants,
    availableSpots: dbSession.max_participants - dbSession.current_participants,
    groupTypeId: dbSession.group_type_id,
    groupTypeName: groupType?.name || '',
    groupTypeColor: groupType?.color || '#6366f1',
    employeeIds,
    employeeNames,
    price: parseFloat(dbSession.price),
    location: dbSession.location,
    status: dbSession.status,
    maxSpotsPerBooking: dbSession.max_spots_per_booking,
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
  let query = supabase
    .from('sessions')
    .select(`
      *,
      group_types!inner(id, name, color, is_private, minimum_seats),
      session_employees!inner(
        employees!inner(id, name)
      )
    `)
    .eq('status', 'active')
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (filters?.typeFilter) {
    query = query.eq('group_types.name', filters.typeFilter);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  // Format sessions
  const sessions = (data || []).map((dbSession: any) => {
    const employees = dbSession.session_employees?.map((se: any) => se.employees) || [];
    return formatSession(dbSession, employees, dbSession.group_types);
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
      session_themes(
        themes(id, name, description, image_url, color)
      )
    `)
    .eq('id', sessionId)
    .single();

  if (error) throw new Error(error.message);

  const employees = data.session_employees?.map((se: any) => se.employees) || [];
  const themes = data.session_themes?.map((st: any) => st.themes) || [];

  return {
    session: formatSession(data, employees, data.group_types),
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

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      user_id: user.id,
      session_id: params.sessionId,
      spots: params.spots,
      theme_id: params.themeId,
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

  // Get session details for invoice
  const { data: sessionData } = await supabase
    .from('sessions')
    .select('name, price')
    .eq('id', params.sessionId)
    .single();

  const sessionPrice = sessionData?.price || 0;
  const totalAmount = sessionPrice * params.spots;

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
  const { error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      invoice_number: invoiceNumber,
      amount: totalAmount,
      vat_amount: 0, // No VAT for now
      total_amount: totalAmount,
      description: `${sessionData?.name || 'Saunagus'} - ${params.spots} plads${params.spots > 1 ? 'er' : ''}`,
      payment_method: params.paymentMethod,
      payment_status: params.paymentMethod === 'stripe' ? 'paid' : params.paymentMethod === 'punch_card' ? 'paid' : 'pending',
      stripe_payment_intent_id: params.paymentIntentId,
      booking_id: booking.id,
      paid_at: params.paymentMethod === 'stripe' || params.paymentMethod === 'punch_card' ? new Date().toISOString() : null,
    });

  if (invoiceError) {
    console.error('Error creating invoice:', invoiceError);
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

  // Update booking status
  const { error: cancelError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (cancelError) throw new Error(cancelError.message);

  // Restore session participants
  await supabase.rpc('decrement_session_participants', {
    session_id: booking.session_id,
    decrement_by: booking.spots,
  });

  // Restore punch card if used, or create compensation punch card if paid
  let punchCardRestored = false;
  let compensationMessage = '';
  
  if (booking.punch_card_id) {
    // Restore punches to existing punch card
    await supabase.rpc('restore_punch_card', {
      card_id: booking.punch_card_id,
      spots_to_restore: booking.spots,
    });
    punchCardRestored = true;
    compensationMessage = `Dine ${booking.spots} klip er blevet returneret til dit klippekort`;
  } else if (booking.payment_method === 'stripe' || booking.payment_method === 'card' || booking.payment_method === 'manual') {
    // Create compensation punch card for paid bookings
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
      });

    if (punchCardError) {
      console.error('Error creating compensation punch card:', punchCardError);
      compensationMessage = 'Booking aflyst';
    } else {
      compensationMessage = `Booking aflyst. Du har fået et nyt klippekort med ${booking.spots} klip som kompensation`;
    }
  } else {
    compensationMessage = 'Booking aflyst';
  }

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
      sessions(name, date, time, duration, location, group_types(name, color))
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

    const formattedBooking: Booking = {
      id: booking.id,
      date: session.date,
      time: session.time,
      duration: session.duration,
      type: session.group_types?.name || 'Session',
      status: booking.status,
      paymentStatus: booking.payment_status,
      price: parseFloat(booking.payment_amount || 0),
      spots: booking.spots,
      location: session.location,
      color: session.group_types?.color || '#6366f1',
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

  const { data, error } = await supabase
    .from('punch_cards')
    .select(`
      *,
      punch_card_usage(*)
    `)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  return { punchCards: data || [] };
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
}> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  const { data: employee, error } = await supabase
    .from('employees')
    .select(`
      *,
      employee_points_history(*)
    `)
    .eq('user_id', user.id)
    .single();

  if (error) throw new Error(error.message);

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    points: employee.points,
    pointsHistory: employee.employee_points_history || [],
  };
}

// ============================================
// SHOP METHODS
// ============================================

/**
 * Get shop punch cards
 */
async function getShopPunchCards(): Promise<{ punchCards: any[] }> {
  // For now, return empty array - will implement shop later
  return { punchCards: [] };
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
  // TODO: Implement get config
  // For now return empty config to allow compilation
  return {
    clinicName: 'INIPI Amagerstrand',
    currency: 'DKK',
    companyInfo: {},
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

  // Get guest spots that are released to public
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
    .eq('status', 'released_to_public')
    .gte('sessions.date', new Date().toISOString().split('T')[0])
    .eq('sessions.status', 'active');

  if (error) throw new Error(error.message);

  const spots = (data || []).map(spot => ({
    id: spot.session_id,
    name: spot.sessions.name,
    date: spot.sessions.date,
    time: spot.sessions.time,
    duration: spot.sessions.duration,
    location: spot.sessions.location,
    hostName: spot.host_employee?.name || 'Unknown',
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

  // Create gusmester booking
  const { error: bookingError } = await supabase
    .from('gusmester_bookings')
    .insert({
      employee_id: employee.id,
      session_id: sessionId,
      point_cost: 150,
      status: 'active',
    });

  if (bookingError) throw new Error(bookingError.message);

  // Deduct points
  const newPoints = employee.points - 150;
  const { error: updateError } = await supabase
    .from('employees')
    .update({ points: newPoints })
    .eq('id', employee.id);

  if (updateError) throw new Error(updateError.message);

  // Record points history
  await supabase.from('employee_points_history').insert({
    employee_id: employee.id,
    amount: -150,
    reason: 'Booked gusmester spot',
    related_session_id: sessionId,
  });

  // Update guest spot status
  await supabase
    .from('guest_spots')
    .update({ status: 'booked_by_gusmester' })
    .eq('session_id', sessionId)
    .eq('status', 'released_to_public');

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

  // Check if can cancel (>24h before)
  const sessionDate = new Date(`${booking.sessions.date}T${booking.sessions.time}`);
  const hoursUntil = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);
  
  if (hoursUntil <= 24) {
    throw new Error('Cannot cancel less than 24 hours before session');
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

  // Release guest spot back to public
  await supabase
    .from('guest_spots')
    .update({ status: 'released_to_public' })
    .eq('session_id', booking.session_id);

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

  // Create map for easy lookup
  const guestSpotsMap = new Map(guestSpotsData.map(gs => [gs.session_id, gs]));

  const sessions = (sessionsData || []).map(session => {
    const guestSpot = guestSpotsMap.get(session.id);
    if (!guestSpot) return null;

    const sessionDate = new Date(`${session.date}T${session.time}`);
    const hoursUntil = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);

    return {
      id: session.id,
      name: session.name,
      date: session.date,
      time: session.time,
      duration: session.duration,
      location: session.location,
      guestSpotStatus: guestSpot.status,
      guestName: guestSpot.guest_name,
      guestEmail: guestSpot.guest_email,
      canRelease: guestSpot.status === 'reserved_for_host',
      willEarnPoints: hoursUntil > 3,
      hoursUntilEvent: hoursUntil,
    };
  }).filter(s => s !== null);

  return { sessions };
}

/**
 * Release guest spot to public (earn 150 points if >3h before)
 */
async function releaseGuestSpot(sessionId: string): Promise<{ success: boolean; earnedPoints: boolean; newPoints: number }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Get employee record
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, points')
    .eq('user_id', user.id)
    .single();

  if (empError || !employee) throw new Error('Not an employee');

  // Get session details
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('date, time')
    .eq('id', sessionId)
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
    .eq('session_id', sessionId)
    .eq('host_employee_id', employee.id);

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
      related_session_id: sessionId,
    });
  }

  return { success: true, earnedPoints: earnPoints, newPoints };
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
    .eq('status', 'reserved_for_host');

  if (error) throw new Error(error.message);

  return { success: true, guestName };
}

/**
 * Get sessions for staff members (where they are assigned as employees)
 */
async function getStaffSessions(filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ sessions: any[]; count: number }> {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Not authenticated');

  // Get employee record for current user
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (employeeError || !employee) {
    return { sessions: [], count: 0 };
  }

  // Build query
  let query = supabase
    .from('sessions')
    .select(`
      *,
      group_types!inner(id, name, color),
      session_employees!inner(
        employee_id,
        employees!inner(id, name)
      )
    `)
    .eq('session_employees.employee_id', employee.id)
    .eq('status', 'active')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  // Apply date filters
  if (filters?.startDate) {
    query = query.gte('date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('date', filters.endDate);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

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
 * Get participants for a specific session (for staff view)
 */
async function getStaffSessionParticipants(sessionId: string): Promise<any[]> {
  try {
    // Get regular bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles!inner(id, email, first_name, last_name, phone)
      `)
      .eq('session_id', sessionId)
      .eq('status', 'confirmed');

    if (bookingsError) throw bookingsError;

    // Get gusmester bookings
    const { data: gusmesterBookings, error: gusmesterError } = await supabase
      .from('gusmester_bookings')
      .select(`
        *,
        guest_spots!inner(session_id)
      `)
      .eq('guest_spots.session_id', sessionId)
      .eq('status', 'confirmed');

    if (gusmesterError) throw gusmesterError;

    // Format regular bookings
    const regularParticipants = (bookings || []).map((booking: any) => ({
      patientId: booking.user_id,
      patientName: `${booking.profiles.first_name} ${booking.profiles.last_name}`,
      patientEmail: booking.profiles.email,
      patientPhone: booking.profiles.phone,
      spots: booking.spots,
      bookedAt: booking.created_at,
      paymentStatus: booking.payment_status,
      paymentMethod: booking.payment_method,
      paymentAmount: booking.amount,
      selectedThemeId: booking.theme_id,
      punchCardId: booking.punch_card_id,
      isGuest: false,
    }));

    // Format gusmester bookings
    const guestParticipants = (gusmesterBookings || []).map((booking: any) => ({
      patientId: booking.id,
      patientName: booking.guest_name,
      patientEmail: '',
      patientPhone: '',
      spots: booking.spots_used,
      bookedAt: booking.created_at,
      paymentStatus: 'paid',
      paymentMethod: 'gusmester',
      isGuest: true,
    }));

    return [...regularParticipants, ...guestParticipants];
  } catch (error) {
    console.error('Error loading session participants:', error);
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

async function adminCancelBooking(memberId: string, bookingId: string, reason?: string): Promise<{ success: boolean; message: string }> {
  // TODO: Implement admin cancel booking
  throw new Error('Admin features not yet implemented');
}

async function adminMoveBooking(memberId: string, bookingId: string, newSessionId: string, reason?: string): Promise<{ success: boolean; message: string }> {
  // TODO: Implement admin move booking
  throw new Error('Admin features not yet implemented');
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
  getAvailableGusmesterSpots,
  getMyGusmesterBookings,
  bookGusmesterSpot,
  cancelGusmesterBooking,
  getMyHostingSessions,
  releaseGuestSpot,
  bookGuestForSession,

  // Staff
  getStaffSessions,
  getStaffSessionParticipants,

  // Admin
  getAdminMembers,
  getAdminMemberDetails,
  adminCancelBooking,
  adminMoveBooking,
  
  // Stripe
  getStripeConfig,
  updateStripeConfig,
};

