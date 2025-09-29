import AsyncStorage from '@react-native-async-storage/async-storage';
import { StaffListData } from './parsers/staffListParser';

const STAFF_LIST_CACHE_KEY = 'staff_list_cache';
const CACHE_EXPIRY_DAYS = 30;
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 30 days in milliseconds

interface CachedStaffListData {
  data: StaffListData;
  timestamp: number;
  expiry: number;
}

/**
 * Staff List Cache Manager
 * Handles caching of staff list data with 30-day expiration
 */
export class StaffListCache {
  /**
   * Get cached staff list data if it exists and is not expired
   */
  static async getCachedStaffList(): Promise<StaffListData | null> {
    try {
      const cachedDataString = await AsyncStorage.getItem(STAFF_LIST_CACHE_KEY);
      
      if (!cachedDataString) {
        return null;
      }

      const cachedData: CachedStaffListData = JSON.parse(cachedDataString);
      const now = Date.now();

      // Check if cache is expired
      if (now > cachedData.expiry) {
        // Cache expired, remove it
        await this.clearCache();
        return null;
      }

      return cachedData.data;
    } catch (error) {
      console.error('Error reading staff list cache:', error);
      // If there's an error reading cache, clear it
      await this.clearCache();
      return null;
    }
  }

  /**
   * Cache staff list data with timestamp and expiry
   */
  static async cacheStaffList(data: StaffListData): Promise<void> {
    try {
      const now = Date.now();
      const cachedData: CachedStaffListData = {
        data,
        timestamp: now,
        expiry: now + CACHE_EXPIRY_MS,
      };

      await AsyncStorage.setItem(STAFF_LIST_CACHE_KEY, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Error caching staff list:', error);
    }
  }

  /**
   * Clear the staff list cache
   */
  static async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STAFF_LIST_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing staff list cache:', error);
    }
  }

  /**
   * Check if cache exists and is valid
   */
  static async isCacheValid(): Promise<boolean> {
    try {
      const cachedDataString = await AsyncStorage.getItem(STAFF_LIST_CACHE_KEY);
      
      if (!cachedDataString) {
        return false;
      }

      const cachedData: CachedStaffListData = JSON.parse(cachedDataString);
      const now = Date.now();

      return now <= cachedData.expiry;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  /**
   * Get cache age in days
   */
  static async getCacheAge(): Promise<number | null> {
    try {
      const cachedDataString = await AsyncStorage.getItem(STAFF_LIST_CACHE_KEY);
      
      if (!cachedDataString) {
        return null;
      }

      const cachedData: CachedStaffListData = JSON.parse(cachedDataString);
      const now = Date.now();
      const ageMs = now - cachedData.timestamp;
      
      return Math.floor(ageMs / (24 * 60 * 60 * 1000)); // Convert to days
    } catch (error) {
      console.error('Error getting cache age:', error);
      return null;
    }
  }

  /**
   * Get cache expiry date
   */
  static async getCacheExpiry(): Promise<Date | null> {
    try {
      const cachedDataString = await AsyncStorage.getItem(STAFF_LIST_CACHE_KEY);
      
      if (!cachedDataString) {
        return null;
      }

      const cachedData: CachedStaffListData = JSON.parse(cachedDataString);
      return new Date(cachedData.expiry);
    } catch (error) {
      console.error('Error getting cache expiry:', error);
      return null;
    }
  }
}
