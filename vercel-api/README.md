# Vercel API Endpoint for Version Check

This directory contains the Vercel API endpoint code for checking app versions.

## Files

- `update-check.js` - Full-featured JavaScript version with detailed response
- `update-check-simple.js` - Simple JavaScript version that returns boolean only
- `update-check.ts` - TypeScript version with type safety

## Deployment Instructions

### Option 1: Deploy to Vercel (Recommended)

1. **Create a new Vercel project:**
   ```bash
   npx vercel
   ```

2. **Copy the API file to your Vercel project:**
   - Choose one of the files above (recommend `update-check.js`)
   - Place it in the `api/` directory of your Vercel project
   - Rename it to `update-check.js` (or `.ts` if using TypeScript)

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### Option 2: Manual Upload

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Create a new project
3. Upload your API file to the `api/` directory
4. Deploy

## API Usage

### Endpoint
```
POST https://your-project.vercel.app/api/update-check
```

### Request Body
```json
{
  "version": "1.0.0",
  "platform": "mobile"
}
```

### Response (Full Version)
```json
{
  "isLatest": true,
  "currentVersion": "1.0.0",
  "latestVersion": "1.0.0",
  "updateNeeded": false,
  "platform": "mobile",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Response (Simple Version)
```json
true
```

## Configuration

### Updating the Latest Version

When you release a new version of your app:

1. **Update the constant in your API file:**
   ```javascript
   const LATEST_VERSION = '1.1.0'; // Change this
   ```

2. **Update the version in your React Native app:**
   ```typescript
   // In constants/Version.ts
   export const APP_VERSION = '1.1.0';
   ```

3. **Redeploy the API endpoint**

### Environment Variables (Optional)

You can use environment variables for configuration:

```javascript
const LATEST_VERSION = process.env.LATEST_VERSION || '1.0.0';
```

## Testing

### Test with curl:
```bash
curl -X POST https://your-project.vercel.app/api/update-check \
  -H "Content-Type: application/json" \
  -d '{"version": "1.0.0", "platform": "mobile"}'
```

### Test with your app:
Use the "Version Check Test" button in the Settings screen (development mode only).

## Error Handling

The API includes comprehensive error handling:
- Invalid requests return 400 status
- Server errors return 500 status
- CORS headers are properly set
- Defaults to `isLatest: true` on errors to avoid blocking users

## Monitoring

The API logs all version checks to the console. You can monitor these in your Vercel dashboard under the Functions tab.

## Security Considerations

- The API is read-only and doesn't store any data
- CORS is enabled for cross-origin requests
- No authentication required (public endpoint)
- Rate limiting is handled by Vercel's built-in protection
