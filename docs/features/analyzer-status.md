# Analyzer Status and Connectivity Testing

The analyzer status feature provides real-time monitoring and diagnostics for the analyzer service connection.

## Endpoints

### GET /api/analyzer/status

Quick status check that returns configuration information without testing connectivity.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-09-08T14:19:20.068Z",
  "baseUrl": "https://interior-tally-sonnenreich-4b8d7c59.koyeb.app",
  "hasCredentials": true,
  "message": "Analyzer configured"
}
```

### POST /api/analyzer/status

Comprehensive connectivity test that:
- Clears cached tokens
- Tests environment configuration
- Attempts token authentication
- Tests API endpoint accessibility
- Retrieves service capabilities

**Success Response:**
```json
{
  "success": true,
  "timestamp": "2025-09-08T14:19:20.068Z",
  "baseUrl": "https://interior-tally-sonnenreich-4b8d7c59.koyeb.app",
  "tokenStatus": "obtained",
  "capabilitiesStatus": "success",
  "capabilities": { ... },
  "diagnostics": {
    "environmentCheck": "passed",
    "authenticationCheck": "passed",
    "apiConnectivityCheck": "passed"
  }
}
```

**Failure Response:**
```json
{
  "success": false,
  "timestamp": "2025-09-08T14:19:20.385Z",
  "error": "Debug test failed",
  "details": "fetch failed",
  "diagnostics": {
    "environmentCheck": "unknown",
    "authenticationCheck": "failed",
    "apiConnectivityCheck": "failed"
  }
}
```

## Usage

### Quick Configuration Check
```bash
curl -X GET "http://localhost:3900/api/analyzer/status"
```

### Full Connectivity Test
```bash
curl -X POST "http://localhost:3900/api/analyzer/status"
```

## Troubleshooting

### Common Issues

1. **Missing Credentials** (GET shows `hasCredentials: false`)
   - Set `ANALYZER_CLIENT_ID` and `ANALYZER_CLIENT_SECRET` in your `.env` file

2. **Fetch Failed** (POST shows `fetch failed`)
   - Analyzer service may be down or unreachable
   - Check network connectivity to the analyzer base URL
   - Verify SSL/TLS configuration

3. **Token Authentication Failed**
   - Credentials may be outdated or incorrect
   - Generate new credentials using the analyzer service
   - Ensure analyzer service has matching OAuth configuration

4. **API Connectivity Failed**
   - Token obtained but API endpoints not accessible
   - May indicate partial service outage
   - Check analyzer service logs

## Implementation Details

The status endpoint:
- Uses the `clearCachedToken()` function to force token refresh
- Tests the OAuth2 client credentials flow
- Validates API endpoint accessibility
- Provides detailed diagnostic information for troubleshooting
- Is safe to call repeatedly for monitoring purposes

