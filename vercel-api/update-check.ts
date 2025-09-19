// Vercel API endpoint: /api/update-check (TypeScript Version)
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface VersionCheckRequest {
  version: string;
  platform?: string;
}

interface VersionCheckResponse {
  isLatest: boolean;
  currentVersion: string;
  latestVersion: string;
  updateNeeded: boolean;
  platform?: string;
  timestamp: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are allowed' 
    });
    return;
  }

  try {
    const { version, platform }: VersionCheckRequest = req.body;

    // Validate required fields
    if (!version || typeof version !== 'string') {
      res.status(400).json({
        error: 'Invalid version',
        message: 'Version parameter is required and must be a string'
      });
      return;
    }

    // Define the latest version - UPDATE THIS when releasing new versions
    const LATEST_VERSION = '1.0.0';

    // Compare versions
    const isLatest = compareVersions(version, LATEST_VERSION) >= 0;

    // Log the version check
    console.log(`Version check: ${version} (${platform || 'unknown'}) -> ${isLatest ? 'LATEST' : 'UPDATE_NEEDED'}`);

    // Prepare response
    const response: VersionCheckResponse = {
      isLatest,
      currentVersion: version,
      latestVersion: LATEST_VERSION,
      updateNeeded: !isLatest,
      platform: platform || 'mobile',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Version check error:', error);
    
    // Return safe default on error
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check version',
      isLatest: true // Default to true to avoid blocking users
    });
  }
}

/**
 * Compare two semantic versions
 * Returns:
 * -1 if version1 < version2
 *  0 if version1 = version2
 *  1 if version1 > version2
 */
function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  // Ensure both arrays have the same length
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  while (v1Parts.length < maxLength) v1Parts.push(0);
  while (v2Parts.length < maxLength) v2Parts.push(0);
  
  for (let i = 0; i < maxLength; i++) {
    if (v1Parts[i] < v2Parts[i]) return -1;
    if (v1Parts[i] > v2Parts[i]) return 1;
  }
  
  return 0;
}
