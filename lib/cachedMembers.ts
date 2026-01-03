/**
 * Cached wrapper around members SDK
 * Automatically caches API responses to improve performance
 */

import { members } from './clinio';
import { cache, CACHE_DURATION } from './cache';
import type { Session, PunchCard, AuthState } from './members-sdk/dist/types';

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
    const filterKey = filters ? JSON.stringify(filters) : 'all';
    const cacheKey = `sessions_${filterKey}`;
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
  async checkIfEmployee() {
    const cacheKey = 'employee_check';
    const cached = cache.get(cacheKey);
    
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
  async getPunchCardHistory() {
    const cacheKey = 'punch_card_history';
    const cached = cache.get(cacheKey);
    
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
  async getMyBookings(includeHistory: boolean = false) {
    const cacheKey = `bookings_${includeHistory ? 'with_history' : 'upcoming'}`;
    const cached = cache.get(cacheKey);
    
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
  async getPaymentHistory(limit?: number) {
    const cacheKey = `payments_${limit || 'all'}`;
    const cached = cache.get(cacheKey);
    
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
    // Refresh sessions to get updated availability
    Object.keys(cache).forEach(key => {
      if (key.startsWith('sessions_')) {
        cache.clear(key);
      }
    });
  },

  // Pass-through methods that don't need caching (write operations)
  login: (...args: any[]) => members.login(...args),
  logout: async (...args: any[]) => {
    const result = await members.logout(...args);
    cachedMembers.clearAllCaches();
    return result;
  },
  register: (...args: any[]) => members.register(...args),
  isAuthenticated: (...args: any[]) => members.isAuthenticated(...args),
  getCurrentUser: (...args: any[]) => members.getCurrentUser(...args),
  onAuthStateChanged: (...args: any[]) => members.onAuthStateChanged(...args),
  
  getGroupTypes: (...args: any[]) => members.getGroupTypes(...args),
  getSessionDetails: (...args: any[]) => members.getSessionDetails(...args),
  getShopProducts: (...args: any[]) => members.getShopProducts(...args),
  getShopPunchCards: (...args: any[]) => members.getShopPunchCards(...args),
  
  updateProfile: async (...args: any[]) => {
    const result = await members.updateProfile(...args);
    cache.clear('user_profile');
    return result;
  },
  createPaymentIntent: (...args: any[]) => members.createPaymentIntent(...args),
  
  bookSession: async (...args: any[]) => {
    const result = await members.bookSession(...args);
    cachedMembers.invalidateAfterBooking();
    return result;
  },
  cancelBooking: async (...args: any[]) => {
    const result = await members.cancelBooking(...args);
    cachedMembers.invalidateAfterBooking();
    return result;
  },
  
  // Employee/Gusmester methods
  getEmployeeStats: (...args: any[]) => members.getEmployeeStats(...args),
  getAvailableGusmesterSpots: (...args: any[]) => members.getAvailableGusmesterSpots(...args),
  getMyGusmesterBookings: (...args: any[]) => members.getMyGusmesterBookings(...args),
  bookGusmesterSpot: async (...args: any[]) => {
    const result = await members.bookGusmesterSpot(...args);
    cachedMembers.invalidateAfterBooking();
    return result;
  },
  cancelGusmesterBooking: async (...args: any[]) => {
    const result = await members.cancelGusmesterBooking(...args);
    cachedMembers.invalidateAfterBooking();
    return result;
  },
  getMyHostingSessions: (...args: any[]) => members.getMyHostingSessions(...args),
  releaseGuestSpot: (...args: any[]) => members.releaseGuestSpot(...args),
  bookGuestForSession: (...args: any[]) => members.bookGuestForSession(...args),
};

