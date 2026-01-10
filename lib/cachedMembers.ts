/**
 * Cached wrapper around members SDK
 * Automatically caches API responses to improve performance
 */

import { members } from './supabase-sdk';
import { cache, CACHE_DURATION } from './cache';
import type { Session, PunchCard, AuthState } from './supabase-sdk';

export const cachedMembers = {
  /**
   * Get clinic config with caching
   */
  async getConfig() {
    const cacheKey = 'clinic_config';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log('[Cache] Using cached config');
      return cached;
    }

    console.log('[Cache] Fetching fresh config');
    const data = await members.getConfig();
    cache.set(cacheKey, data, CACHE_DURATION.CONFIG);
    return data;
  },

  /**
   * Get sessions/classes with caching
   */
  async getClasses(filters?: { typeFilter?: string; startDate?: string; endDate?: string }) {
    // Create cache key based on filters
    // CACHE_VERSION: increment this when schema changes (e.g., added is_private field)
    const CACHE_VERSION = 'v2';
    const filterKey = filters ? JSON.stringify(filters) : 'all';
    const cacheKey = `sessions_${CACHE_VERSION}_${filterKey}`;
    const cached = cache.get<{ sessions: Session[] }>(cacheKey);
    
    if (cached) {
      console.log('[Cache] Using cached sessions');
      return cached;
    }

    console.log('[Cache] Fetching fresh sessions');
    const data = await members.getClasses(filters);
    cache.set(cacheKey, data, CACHE_DURATION.SESSIONS);
    return data;
  },

  /**
   * Check if user is employee with caching
   */
  async checkIfEmployee(): Promise<{
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
    const cacheKey = 'employee_check';
    const cached = cache.get<{
      isEmployee: boolean;
      employeeId?: string;
      employeeName?: string;
      points?: number;
      frontendPermissions?: {
        gusmester: boolean;
        staff: boolean;
        administration: boolean;
      };
    }>(cacheKey);
    
    if (cached) {
      console.log('[Cache] Using cached employee check');
      return cached;
    }

    console.log('[Cache] Checking employee status');
    const data = await members.checkIfEmployee();
    cache.set(cacheKey, data, CACHE_DURATION.EMPLOYEE_CHECK);
    return data;
  },

  /**
   * Get profile with caching
   */
  async getProfile() {
    const cacheKey = 'user_profile';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log('[Cache] Using cached profile');
      return cached;
    }

    console.log('[Cache] Fetching fresh profile');
    const data = await members.getProfile();
    cache.set(cacheKey, data, CACHE_DURATION.PROFILE);
    return data;
  },

  /**
   * Get punch cards with caching
   */
  async getPunchCards() {
    const cacheKey = 'punch_cards';
    const cached = cache.get<{ punchCards: PunchCard[] }>(cacheKey);
    
    if (cached) {
      console.log('[Cache] Using cached punch cards');
      return cached;
    }

    console.log('[Cache] Fetching fresh punch cards');
    const data = await members.getPunchCards();
    cache.set(cacheKey, data, CACHE_DURATION.PUNCH_CARDS);
    return data;
  },

  /**
   * Get punch card history with caching (all punch cards with usage logs)
   */
  async getPunchCardHistory(): Promise<{ punchCards: any[] }> {
    const cacheKey = 'punch_card_history';
    const cached = cache.get<{ punchCards: any[] }>(cacheKey);
    
    if (cached) {
      console.log('[Cache] Using cached punch card history');
      return cached;
    }

    console.log('[Cache] Fetching fresh punch card history');
    const data = await members.getPunchCardHistory();
    cache.set(cacheKey, data, CACHE_DURATION.PUNCH_CARDS);
    return data;
  },

  /**
   * Get bookings with caching
   */
  async getMyBookings(includeHistory: boolean = false): Promise<{
    upcoming: any[];
    past: any[];
  }> {
    const cacheKey = `bookings_${includeHistory ? 'with_history' : 'upcoming'}`;
    const cached = cache.get<{ upcoming: any[]; past: any[] }>(cacheKey);
    
    if (cached) {
      console.log('[Cache] Using cached bookings');
      return cached;
    }

    console.log('[Cache] Fetching fresh bookings');
    const data = await members.getMyBookings(includeHistory);
    cache.set(cacheKey, data, CACHE_DURATION.BOOKINGS);
    return data;
  },

  /**
   * Get payment history with caching
   */
  async getPaymentHistory(limit?: number): Promise<{ payments: any[] }> {
    const cacheKey = `payments_${limit || 'all'}`;
    const cached = cache.get<{ payments: any[] }>(cacheKey);
    
    if (cached) {
      console.log('[Cache] Using cached payments');
      return cached;
    }

    console.log('[Cache] Fetching fresh payments');
    const data = await members.getPaymentHistory(limit);
    cache.set(cacheKey, data, CACHE_DURATION.PROFILE); // Same as profile
    return data;
  },

  /**
   * Clear all caches (call after logout or booking/purchase)
   */
  clearAllCaches() {
    console.log('[Cache] Clearing all caches');
    cache.clearAll();
  },

  /**
   * Clear specific cache entries
   */
  clearCache(keys: string[]) {
    keys.forEach(key => cache.clear(key));
  },

  /**
   * Invalidate caches after booking
   */
  invalidateAfterBooking() {
    console.log('[Cache] Invalidating booking-related caches');
    cache.clear('bookings_upcoming');
    cache.clear('bookings_with_history');
    cache.clear('punch_cards');
    cache.clear('punch_card_history'); // Also clear punch card history
    // Clear payment/invoice caches
    Object.keys(cache).forEach(key => {
      if (key.startsWith('payments_')) {
        cache.clear(key);
      }
    });
    // Refresh sessions to get updated availability
    Object.keys(cache).forEach(key => {
      if (key.startsWith('sessions_')) {
        cache.clear(key);
      }
    });
  },

  // Pass-through methods that don't need caching (write operations)
  login: (email: string, password: string) => members.login(email, password),
  logout: async () => {
    const result = await members.logout();
    cachedMembers.clearAllCaches();
    return result;
  },
  register: (data: any) => members.register(data),
  isAuthenticated: () => members.isAuthenticated(),
  getCurrentUser: () => members.getCurrentUser(),
  onAuthStateChanged: (callback: any) => members.onAuthStateChanged(callback),
  
  getGroupTypes: () => members.getGroupTypes(),
  getSessionDetails: (sessionId: string) => members.getSessionDetails(sessionId),
  getShopProducts: () => members.getShopProducts(),
  getShopPunchCards: () => members.getShopPunchCards(),
  
  updateProfile: async (updates: any) => {
    const result = await members.updateProfile(updates);
    cache.clear('user_profile');
    return result;
  },
  createPaymentIntent: (params: any) => members.createPaymentIntent(params),
  
  bookSession: async (params: any) => {
    const result = await members.bookSession(params);
    cachedMembers.invalidateAfterBooking();
    return result;
  },
  cancelBooking: async (bookingId: string, refundToCard: boolean = false) => {
    const result = await members.cancelBooking(bookingId, refundToCard);
    cachedMembers.invalidateAfterBooking();
    return result;
  },
  
  // Employee/Gusmester methods - use the cached version defined above
  // checkIfEmployee is already defined above with caching
  getEmployeeStats: () => members.getEmployeeStats(),
  getAvailableGusmesterSpots: () => members.getAvailableGusmesterSpots(),
  getMyGusmesterBookings: () => members.getMyGusmesterBookings(),
  bookGusmesterSpot: async (sessionId: string) => {
    const result = await members.bookGusmesterSpot(sessionId);
    cachedMembers.invalidateAfterBooking();
    return result;
  },
  cancelGusmesterBooking: async (bookingId: string) => {
    const result = await members.cancelGusmesterBooking(bookingId);
    cachedMembers.invalidateAfterBooking();
    return result;
  },
  getMyHostingSessions: () => members.getMyHostingSessions(),
  releaseGuestSpot: (sessionId: string) => members.releaseGuestSpot(sessionId),
  bookGuestForSession: (sessionId: string, guestName: string, guestEmail: string, guestPhone?: string) => members.bookGuestForSession(sessionId, guestName, guestEmail, guestPhone),
};

