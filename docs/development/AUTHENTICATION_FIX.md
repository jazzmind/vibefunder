# Authentication System Fixes

## JWT Algorithm Issue ✅ FIXED

### Problem
The JWT system was configured to use Ed25519 keys, but the `jose` library doesn't have good support for Ed25519 in JWT operations.

### Solution
Switched to HMAC SHA-256 (HS256) which is:
- Widely supported across all JWT libraries
- Simpler to implement and manage
- Still cryptographically secure for JWT use cases
- Doesn't require separate public/private key pairs

### Changes Made
1. Updated `lib/auth.ts` to use `HS256` instead of `RS256`/Ed25519
2. Simplified key management to use a single shared secret
3. Generated a secure 512-bit (64-byte) JWT secret

### Environment Setup
Add this to your `.env` file:
```
JWT_SECRET=a42eed3be4f1a07df37bd9855b75468461d2e1e8866c9d8778c2a659bb103f9d02321fdf95fb18a878bc3870372899f786dbc03485ad14cd940c455d0fd7d620
```

## Passkey Authentication Issue 🔍 DEBUGGING

### Problem
Users can create passkeys successfully, but authentication fails with "passkey not found" error.

### Root Cause Analysis
The issue appears to be a credential ID encoding mismatch between registration and authentication:

1. **Registration**: Stores credential ID as base64url
2. **Authentication**: Browser might return credential.id in different format

### Debugging Solution Applied
Enhanced the authentication endpoint with multiple fallback strategies:

1. **Direct Match**: Try credential.id as-is
2. **Raw ID Conversion**: Convert credential.rawId (ArrayBuffer) to base64url
3. **Format Conversion**: Convert between base64 and base64url formats
4. **Comprehensive Logging**: Added detailed debug output

### Testing Instructions
1. Start the development server: `npm run dev`
2. Try to authenticate with an existing passkey
3. Check the server console for debug output:
   - Raw credential.id from browser
   - All attempted credential ID formats
   - List of all passkeys in database
   - Whether any format matched

### Potential Fixes Based on Debug Output

**If credential.id is in base64 format:**
```typescript
const credentialId = credential.id.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
```

**If credential.rawId needs to be used:**
```typescript
const credentialId = Buffer.from(credential.rawId).toString('base64url');
```

**If SimpleWebAuthn library has changed:**
- Check if `credential.id` format changed between versions
- Verify WebAuthn specification compliance

### Production Cleanup
Once the issue is identified and fixed:
1. Remove debug console.log statements
2. Remove debug object from error responses
3. Implement proper error handling

## Security Recommendations

### JWT Security
- ✅ Use HS256 with 512-bit secret
- ✅ Set reasonable expiration (7 days)
- ✅ Use httpOnly cookies
- ✅ Validate all JWT claims

### Passkey Security
- ✅ Validate origin and RP ID
- ✅ Use counter to prevent replay attacks
- ✅ Store credential IDs as base64url
- ✅ Validate challenge on every authentication

### Environment Variables
Ensure these are set in production:
```
JWT_SECRET=<your-secure-secret>
EXPECTED_ORIGIN=https://yourdomain.com
RP_ID=yourdomain.com
```

## Testing Checklist

- [ ] JWT creation and verification works
- [ ] Email OTP flow works
- [ ] Passkey registration works
- [ ] Passkey authentication works
- [ ] Session management works
- [ ] Role-based access control works
- [ ] Admin authentication works

## Next Steps

1. **Test JWT Fix**: Verify all authentication flows work with new JWT setup
2. **Debug Passkey Issue**: Use enhanced debugging to identify credential ID mismatch
3. **Fix Passkey Authentication**: Apply appropriate fix based on debug output
4. **Remove Debug Code**: Clean up debug logging once issue is resolved
5. **Security Audit**: Review all authentication endpoints for security issues