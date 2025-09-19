import { APP_VERSION, VERSION_CHECK_ENDPOINT } from '@/constants/Version';

export interface VersionCheckResponse {
  isLatest: boolean;
  currentVersion?: string;
  latestVersion?: string;
}

export interface VersionCheckError {
  error: string;
  message: string;
}

/**
 * Checks if the current app version is the latest version
 * @returns Promise<VersionCheckResponse | VersionCheckError>
 */
export async function checkAppVersion(): Promise<VersionCheckResponse | VersionCheckError> {
  try {
    console.log(`Checking version: ${APP_VERSION} against ${VERSION_CHECK_ENDPOINT}`);
    
    // Create a timeout promise for React Native compatibility
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
    });

    const fetchPromise = fetch(VERSION_CHECK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `UniLink/${APP_VERSION}`,
      },
      body: JSON.stringify({
        version: APP_VERSION,
        platform: 'mobile',
      }),
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
    
    // Clear timeout if fetch completes first
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Version check response:', data);
    
    // Handle the response based on the API contract
    if (typeof data === 'boolean') {
      return {
        isLatest: data,
        currentVersion: APP_VERSION,
      };
    }
    
    // If the API returns an object with more details
    return {
      isLatest: data.isLatest || data.isUpToDate || false,
      currentVersion: APP_VERSION,
      latestVersion: data.latestVersion || data.version,
    };
  } catch (error) {
    console.error('Version check failed:', error);
    
    // Clear timeout if it exists (in case of error)
    if (typeof timeoutId !== 'undefined') {
      clearTimeout(timeoutId);
    }
    
    return {
      error: 'VERSION_CHECK_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Performs a version check and returns whether an update is needed
 * @returns Promise<boolean> - true if update is needed, false if up to date
 */
export async function isUpdateNeeded(): Promise<boolean> {
  const result = await checkAppVersion();
  
  if ('error' in result) {
    // If version check fails, assume no update is needed to avoid blocking users
    console.warn('Version check failed, assuming no update needed:', result.message);
    return false;
  }
  
  return !result.isLatest;
}
