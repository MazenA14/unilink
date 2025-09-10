# Proxy Rotation System

This system implements load balancing across multiple proxy servers to prevent overload and improve reliability for transcript and study year fetching operations.

## Configuration

### Proxy Servers
Edit `utils/config/proxyConfig.ts` to configure your 4 proxy servers:

```typescript
export const PROXY_SERVERS = [
  'https://guc-connect-login.vercel.app/api',        // Primary proxy server
  'https://uni-link-proxy-server-1.vercel.app/api',  // Secondary proxy server
  'https://uni-link-proxy-server-2.vercel.app/api',  // Tertiary proxy server  
  'https://uni-link-proxy-server-3.vercel.app/api'   // Quaternary proxy server
];
```

### Rotation Settings
```typescript
export const PROXY_CONFIG = {
  ENABLE_ROTATION: true,           // Enable proxy rotation
  MAX_RETRIES_PER_PROXY: 2,        // Max retries per proxy before trying next
  MIN_DELAY: 1000,                 // Minimum delay between requests (ms)
  MAX_DELAY: 3000,                 // Maximum delay between requests (ms)
  BACKOFF_MULTIPLIER: 2            // Exponential backoff multiplier
};
```

## How It Works

### 1. Round-Robin Rotation
- Each request automatically rotates to the next proxy server
- Tracks current proxy index and cycles through all 4 servers
- Provides even distribution of load across all proxies

### 2. Advanced Bypass Strategies
When `useProxyRotation: true` is enabled, the system also uses:
- **IP Rotation**: Rotates IP addresses for each request
- **Random User Agents**: Uses different user agents
- **Random Headers**: Varies request headers
- **Request Timing**: Random delays between requests
- **Session Rotation**: Rotates session cookies
- **Cookie Rotation**: Varies cookie values
- **Referer Spoofing**: Uses different referer headers
- **Accept Language Rotation**: Varies language preferences

### 3. Retry Logic
- **Exponential Backoff**: Delays increase exponentially between retries
- **Multiple Attempts**: Up to 5 attempts for study years, 3 for transcript data
- **Random Delays**: Prevents predictable request patterns
- **Session Clearing**: Clears session cookies between attempts

## Usage

### For Study Years
```typescript
import { GUCAPIProxy } from '@/utils/gucApiProxy';

// Automatically uses proxy rotation
const studyYears = await GUCAPIProxy.getAvailableStudyYears();
```

### For Transcript Data
```typescript
import { GUCAPIProxy } from '@/utils/gucApiProxy';

// Automatically uses proxy rotation
const transcriptData = await GUCAPIProxy.getTranscriptData(studyYearId);
```

## Benefits

1. **Load Distribution**: Spreads requests across multiple servers
2. **Overload Prevention**: Reduces risk of server overload
3. **Improved Reliability**: If one proxy fails, others can handle requests
4. **Better Performance**: Distributes load for faster response times
5. **Bypass Detection**: Advanced strategies help avoid rate limiting

## Monitoring

The system logs detailed information about:
- Which proxy server is being used for each request
- Request timing and delays
- Success/failure rates
- Retry attempts and backoff delays

Check the console logs to monitor proxy rotation and performance.

## Troubleshooting

### If All Proxies Fail
- Check that all proxy URLs are correct and accessible
- Verify that the proxy servers are running and responding
- Check network connectivity
- Review console logs for specific error messages

### Performance Issues
- Adjust `MIN_DELAY` and `MAX_DELAY` values
- Modify `BACKOFF_MULTIPLIER` for different retry patterns
- Consider adding more proxy servers to the rotation

### Rate Limiting
- Increase delay values in `PROXY_CONFIG`
- Enable more bypass strategies
- Consider implementing request queuing for high-volume usage
