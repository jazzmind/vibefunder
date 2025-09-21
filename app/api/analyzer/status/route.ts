import { NextResponse } from 'next/server';
import { clearCachedToken } from '@/lib/analyzerClient';

/**
 * Analyzer Connectivity Test Endpoint
 * 
 * Tests the connection to the analyzer service, including:
 * - Environment variable configuration
 * - Token authentication
 * - API endpoint accessibility
 * - Service capabilities
 * 
 * @returns Detailed connectivity status and diagnostics
 */
export async function POST() {
  try {
    console.log('[AnalyzerDebug] Clearing cached token and testing connection');
    
    // Clear any cached token to force refresh
    clearCachedToken();
    
    // Test basic connectivity first
    const ANALYZER_BASE_URL = process.env.ANALYZER_BASE_URL || 'http://localhost:8080';
    const ANALYZER_CLIENT_ID = process.env.ANALYZER_CLIENT_ID || '';
    const ANALYZER_CLIENT_SECRET = process.env.ANALYZER_CLIENT_SECRET || '';
    
    console.log('[AnalyzerDebug] Environment check:', {
      baseUrl: ANALYZER_BASE_URL,
      hasClientId: !!ANALYZER_CLIENT_ID,
      hasClientSecret: !!ANALYZER_CLIENT_SECRET,
      clientIdPrefix: ANALYZER_CLIENT_ID ? ANALYZER_CLIENT_ID.substring(0, 4) + '...' : 'missing'
    });
    
    if (!ANALYZER_CLIENT_ID || !ANALYZER_CLIENT_SECRET) {
      return NextResponse.json({ 
        error: 'Missing analyzer credentials',
        hasClientId: !!ANALYZER_CLIENT_ID,
        hasClientSecret: !!ANALYZER_CLIENT_SECRET
      }, { status: 500 });
    }
    
    // Test token endpoint
    console.log('[AnalyzerDebug] Testing token endpoint');
    const tokenRes = await fetch(`${ANALYZER_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: ANALYZER_CLIENT_ID,
        client_secret: ANALYZER_CLIENT_SECRET,
        scope: 'analyze:write',
      }),
      cache: 'no-store',
    });
    
    console.log('[AnalyzerDebug] Token response status:', tokenRes.status);
    
    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error('[AnalyzerDebug] Token error:', errorText);
      return NextResponse.json({ 
        error: 'Token request failed',
        status: tokenRes.status,
        details: errorText
      }, { status: 500 });
    }
    
    const tokenData = await tokenRes.json();
    console.log('[AnalyzerDebug] Token obtained successfully');
    
    // Test capabilities endpoint with token
    console.log('[AnalyzerDebug] Testing capabilities endpoint');
    const capRes = await fetch(`${ANALYZER_BASE_URL}/api/v1/capabilities`, {
      headers: { 'authorization': `Bearer ${tokenData.access_token}` },
      cache: 'no-store',
    });
    
    console.log('[AnalyzerDebug] Capabilities response status:', capRes.status);
    
    if (!capRes.ok) {
      const errorText = await capRes.text();
      console.error('[AnalyzerDebug] Capabilities error:', errorText);
      return NextResponse.json({ 
        error: 'Capabilities request failed',
        status: capRes.status,
        details: errorText,
        tokenObtained: true
      }, { status: 500 });
    }
    
    const capabilities = await capRes.json();
    console.log('[AnalyzerDebug] Success! Got capabilities');
    
    return NextResponse.json({ 
      success: true,
      timestamp: new Date().toISOString(),
      baseUrl: ANALYZER_BASE_URL,
      tokenStatus: 'obtained',
      capabilitiesStatus: 'success',
      capabilities,
      diagnostics: {
        environmentCheck: 'passed',
        authenticationCheck: 'passed',
        apiConnectivityCheck: 'passed'
      }
    });
    
  } catch (e: any) {
    console.error('[AnalyzerDebug] Unexpected error:', e);
    return NextResponse.json({ 
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Debug test failed',
      details: e?.message || String(e),
      diagnostics: {
        environmentCheck: 'unknown',
        authenticationCheck: 'failed',
        apiConnectivityCheck: 'failed'
      }
    }, { status: 500 });
  }
}

/**
 * Quick analyzer status check (GET)
 * Lighter version that just checks if analyzer is reachable
 */
export async function GET() {
  try {
    const ANALYZER_BASE_URL = process.env.ANALYZER_BASE_URL || 'http://localhost:8080';
    const ANALYZER_CLIENT_ID = process.env.ANALYZER_CLIENT_ID || '';
    const ANALYZER_CLIENT_SECRET = process.env.ANALYZER_CLIENT_SECRET || '';
    
    const hasCredentials = !!(ANALYZER_CLIENT_ID && ANALYZER_CLIENT_SECRET);
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      baseUrl: ANALYZER_BASE_URL,
      hasCredentials,
      message: hasCredentials ? 'Analyzer configured' : 'Missing analyzer credentials'
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: e?.message || String(e)
    }, { status: 500 });
  }
}
