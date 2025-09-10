/**
 * Proxy server configuration for load balancing and overload prevention
 * 
 * Replace the placeholder URLs below with your actual 4 proxy server URLs
 */
export const PROXY_SERVERS = [
  'https://guc-connect-login.vercel.app/api',        // Primary proxy server
  'https://uni-link-proxy-server-1.vercel.app/api',  // Secondary proxy server
  'https://uni-link-proxy-server-2.vercel.app/api',  // Tertiary proxy server  
  'https://uni-link-proxy-server-3.vercel.app/api'   // Quaternary proxy server
];

/**
 * Proxy rotation settings
 */
export const PROXY_CONFIG = {
  // Enable proxy rotation for transcript requests
  ENABLE_ROTATION: false,
  
  // Maximum retries per proxy server before trying next one
  MAX_RETRIES_PER_PROXY: 2,
  
  // Delay between requests to prevent overload (in milliseconds)
  MIN_DELAY: 1000,  // 1 second
  MAX_DELAY: 3000,  // 3 seconds
  
  // Exponential backoff multiplier for retries
  BACKOFF_MULTIPLIER: 2
};
