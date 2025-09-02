# Prisma Test Environment Fix

## Problem Summary

Database tests were failing with the error:
```
PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `Node.js`).
```

This occurred because Jest was running with `testEnvironment: 'jsdom'` instead of `testEnvironment: 'node'` for database tests, causing Prisma to load the browser bundle (`index-browser.js`) instead of the Node.js bundle.

## Root Cause

1. **Wrong Jest Environment**: Jest was configured with `testEnvironment: 'jsdom'` globally
2. **Environment Detection**: Prisma client was loading the browser bundle in jsdom environment
3. **Mixed Test Requirements**: Frontend tests need jsdom, database tests need node

## Solution Implementation

### 1. Created Database-Specific Jest Configuration

**File**: `jest.database.config.js`
- Uses `testEnvironment: 'node'` specifically for database tests
- Targets API, security, payments, and integration test directories
- Excludes frontend component tests

### 2. Updated Main Jest Configuration

**File**: `jest.config.js`
- Added projects configuration for separate environments
- Database tests use Node.js environment
- Frontend tests use jsdom environment

### 3. Enhanced Test Helpers

**File**: `__tests__/utils/test-helpers.js`
- Added environment validation in `getPrismaClient()`
- Removed invalid `generator` property from PrismaClient constructor
- Added Node.js environment checks

### 4. Updated Jest Setup

**File**: `jest.setup.js`
- Added explicit Node.js environment detection for Prisma
- Set `PRISMA_CLIENT_ENGINE_TYPE=library` to force Node.js client
- Enhanced global environment setup

### 5. Individual Test File Fixes

**File**: `__tests__/api/campaigns/id/stretch-goals.test.ts`
- Added `@jest-environment node` directive at top of file
- Ensures this specific test always runs in Node.js environment

### 6. Package.json Script Updates

Updated npm scripts to use the database configuration:
```json
{
  "test:api": "jest __tests__/api/ --config=jest.database.config.js",
  "test:payments": "jest __tests__/payments/ --config=jest.database.config.js",
  "test:database": "jest --config=jest.database.config.js"
}
```

## Usage

### Running Database Tests
```bash
# Use the database-specific configuration
npm run test:database

# Or run specific API tests
npm run test:api

# Or run a specific database test file
npm test -- __tests__/api/campaigns/id/stretch-goals.test.ts --config=jest.database.config.js
```

### Running Frontend Tests
```bash
# Uses the default Jest configuration with jsdom
npm test -- __tests__/components/
```

## Key Technical Details

### Environment Detection
- Database tests require Node.js environment to access native database drivers
- Frontend tests require jsdom environment to simulate browser DOM
- Prisma client automatically selects the correct bundle based on environment

### Configuration Separation
- `jest.config.js`: Default configuration with projects for both environments
- `jest.database.config.js`: Specialized configuration for database tests only
- Both configurations share common settings but differ in `testEnvironment`

### Global Setup
- `globalSetup` ensures database is ready before tests
- `globalTeardown` cleans up connections after tests
- Connection pooling prevents database connection limits

## Test Results

All 17 tests in the stretch goals test suite now pass:
```
Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
```

## Prevention

To prevent this issue in the future:

1. **Always use Node.js environment for database tests**:
   ```javascript
   /**
    * @jest-environment node
    */
   ```

2. **Use the database configuration for API tests**:
   ```bash
   jest __tests__/api/ --config=jest.database.config.js
   ```

3. **Verify Prisma client initialization**:
   ```javascript
   // Ensure Node.js environment
   const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
   if (!isNode) {
     throw new Error('Prisma client requires Node.js environment');
   }
   ```

## Related Files Modified

- `/jest.config.js` - Updated for project-based configuration
- `/jest.database.config.js` - New database-specific configuration
- `/jest.setup.js` - Enhanced environment detection
- `/__tests__/utils/test-helpers.js` - Improved Prisma client initialization
- `/__tests__/api/campaigns/id/stretch-goals.test.ts` - Added environment directive
- `/package.json` - Updated test scripts
- `/docs/prisma-test-environment-fix.md` - This documentation

## Verification Commands

```bash
# Test the specific problematic file
npm test -- __tests__/api/campaigns/id/stretch-goals.test.ts --config=jest.database.config.js

# Test all API endpoints
npm run test:api

# Test with verbose output
npm run test:database -- --verbose
```

All tests should now pass without the "unable to run in this browser environment" error.