/**
 * Simple in-memory cache for API responses
 * Reduces API calls and improves performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get cached data if still valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if expired
    if (age > entry.expiresIn) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache data with TTL (time to live) in milliseconds
   */
  set<T>(key: string, data: T, expiresInMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: expiresInMs
    });
  }

  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// Singleton instance
export const cache = new CacheManager();

// Cache duration constants (in milliseconds)
export const CACHE_DURATION = {
  CONFIG: 30 * 60 * 1000,        // 30 minutes - rarely changes
  SESSIONS: 2 * 60 * 1000,       // 2 minutes - changes frequently
  EMPLOYEE_CHECK: 60 * 60 * 1000, // 60 minutes - rarely changes
  PROFILE: 10 * 60 * 1000,       // 10 minutes - medium frequency
  PUNCH_CARDS: 5 * 60 * 1000,    // 5 minutes - changes when used
  BOOKINGS: 3 * 60 * 1000,       // 3 minutes - changes when booking
};

