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

  // Restore punch card if used
  let punchCardRestored = false;
  if (booking.punch_card_id) {
    await supabase.rpc('restore_punch_card', {
      card_id: booking.punch_card_id,
      spots_to_restore: booking.spots,
    });
    punchCardRestored = true;
  }

  return {
    success: true,
    punchCardRestored,
    message: 'Booking cancelled successfully',
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

  return { payments: data || [] };
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

async function getAvailableGusmesterSpots(): Promise<{ spots: any[] }> {
  // TODO: Implement gusmester spots
  return { spots: [] };
}

async function getMyGusmesterBookings(): Promise<{ bookings: any[] }> {
  // TODO: Implement gusmester bookings
  return { bookings: [] };
}

async function bookGusmesterSpot(sessionId: string): Promise<{ success: boolean; newPoints: number }> {
  // TODO: Implement book gusmester spot
  throw new Error('Gusmester features not yet implemented');
}

async function cancelGusmesterBooking(bookingId: string): Promise<{ success: boolean; newPoints: number }> {
  // TODO: Implement cancel gusmester booking
  throw new Error('Gusmester features not yet implemented');
}

async function getMyHostingSessions(): Promise<{ sessions: any[] }> {
  // TODO: Implement hosting sessions
  return { sessions: [] };
}

async function releaseGuestSpot(sessionId: string): Promise<{ success: boolean; earnedPoints: boolean; newPoints: number }> {
  // TODO: Implement release guest spot
  throw new Error('Gusmester features not yet implemented');
}

async function bookGuestForSession(sessionId: string, guestName: string, guestEmail: string, guestPhone?: string): Promise<{ success: boolean; guestName: string }> {
  // TODO: Implement book guest
  throw new Error('Gusmester features not yet implemented');
}

async function getStaffSessions(filters?: any): Promise<{ sessions: any[]; count: number }> {
  // TODO: Implement staff sessions
  return { sessions: [], count: 0 };
}

async function getStaffSessionParticipants(sessionId: string): Promise<any> {
  // TODO: Implement staff session participants
  throw new Error('Staff features not yet implemented');
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
};

