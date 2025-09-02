/**
 * API Test Helpers for Next.js App Router
 * 
 * Provides utilities for testing Next.js App Router API routes
 */

import { NextRequest } from 'next/server';

/**
 * Creates a NextRequest for testing API routes
 * @param url The URL for the request
 * @param options Request options including method, headers, and body
 * @returns NextRequest instance
 */
export function createTestRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body } = options;
  
  // Create init options for Request
  const init: RequestInit = {
    method,
    headers: new Headers(headers)
  };
  
  // Add body if provided
  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    if (typeof body === 'string') {
      init.body = body;
    } else {
      init.body = JSON.stringify(body);
      // Ensure content-type is set for JSON
      if (!headers['content-type'] && !headers['Content-Type']) {
        (init.headers as Headers).set('Content-Type', 'application/json');
      }
    }
  }
  
  // Create and return NextRequest
  return new NextRequest(url, init);
}

/**
 * Creates a mock NextRequest for Stripe webhooks
 * @param event The webhook event data
 * @param signature The Stripe signature header value (pass null to omit)
 * @returns NextRequest instance
 */
export function createWebhookRequest(
  event: any,
  signature: string | null = 'valid_signature'
): NextRequest {
  const headers: Record<string, string> = {
    'content-type': 'application/json'
  };
  
  if (signature !== null) {
    headers['stripe-signature'] = signature;
  }
  
  return createTestRequest('http://localhost:3000/api/payments/stripe/webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify(event)
  });
}

/**
 * Creates a mock NextRequest for authenticated API routes
 * @param url The API route URL
 * @param options Request options
 * @param authToken Optional auth token
 * @returns NextRequest instance
 */
export function createAuthenticatedRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {},
  authToken?: string
): NextRequest {
  const headers = {
    ...options.headers,
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
  };
  
  return createTestRequest(url, {
    ...options,
    headers
  });
}

/**
 * Extracts JSON from a NextResponse
 * @param response The NextResponse to parse
 * @returns Parsed JSON data
 */
export async function parseResponse(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}