/**
 * Web API Polyfills for Jest Test Environment
 * 
 * This file provides polyfills for Web APIs that are not available
 * in the Node.js test environment but are required by Next.js API routes
 * and modern web development.
 */

// Polyfill fetch and related APIs using undici
const { 
  Request, 
  Response, 
  Headers, 
  FormData,
  fetch
} = require('undici');

// Only polyfill if not already defined
if (typeof global.fetch === 'undefined') {
  global.fetch = fetch;
}

if (typeof global.Request === 'undefined') {
  global.Request = Request;
}

if (typeof global.Response === 'undefined') {
  global.Response = Response;
}

if (typeof global.Headers === 'undefined') {
  global.Headers = Headers;
}

if (typeof global.FormData === 'undefined') {
  global.FormData = FormData;
}

// Polyfill TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Polyfill Web Crypto API
const { webcrypto } = require('crypto');

if (typeof global.crypto === 'undefined') {
  global.crypto = webcrypto;
}

// Polyfill URL and URLSearchParams (usually available but just in case)
const { URL, URLSearchParams } = require('url');

if (typeof global.URL === 'undefined') {
  global.URL = URL;
}

if (typeof global.URLSearchParams === 'undefined') {
  global.URLSearchParams = URLSearchParams;
}

// Mock ReadableStream if not available
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = class ReadableStream {
    constructor(source = {}) {
      this.source = source;
      this.locked = false;
    }
    
    getReader() {
      return {
        read: async () => ({ done: true, value: undefined }),
        releaseLock: () => { this.locked = false; }
      };
    }
  };
}

// Mock WritableStream if not available
if (typeof global.WritableStream === 'undefined') {
  global.WritableStream = class WritableStream {
    constructor(sink = {}) {
      this.sink = sink;
      this.locked = false;
    }
    
    getWriter() {
      return {
        write: async (chunk) => undefined,
        close: async () => undefined,
        releaseLock: () => { this.locked = false; }
      };
    }
  };
}

// Mock TransformStream if not available
if (typeof global.TransformStream === 'undefined') {
  global.TransformStream = class TransformStream {
    constructor(transformer = {}) {
      this.transformer = transformer;
      this.readable = new global.ReadableStream();
      this.writable = new global.WritableStream();
    }
  };
}

// Mock Blob API if not available (Node.js 18+ usually has this)
if (typeof global.Blob === 'undefined') {
  const { Blob } = require('buffer');
  global.Blob = Blob;
}

// Mock File API if not available
if (typeof global.File === 'undefined') {
  global.File = class File extends global.Blob {
    constructor(fileBits, fileName, options = {}) {
      super(fileBits, options);
      this.name = fileName;
      this.lastModified = options.lastModified || Date.now();
      this.type = options.type || '';
    }
  };
}

// Mock performance.now if not available
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {}
  };
} else if (typeof global.performance.now === 'undefined') {
  global.performance.now = () => Date.now();
}

// Mock AbortController and AbortSignal
if (typeof global.AbortController === 'undefined') {
  global.AbortController = class AbortController {
    constructor() {
      this.signal = new global.AbortSignal();
    }
    
    abort(reason) {
      this.signal.aborted = true;
      this.signal.reason = reason;
      if (this.signal.onabort) {
        this.signal.onabort({ type: 'abort' });
      }
    }
  };
}

if (typeof global.AbortSignal === 'undefined') {
  global.AbortSignal = class AbortSignal {
    constructor() {
      this.aborted = false;
      this.reason = undefined;
      this.onabort = null;
    }
    
    static abort(reason) {
      const signal = new global.AbortSignal();
      signal.aborted = true;
      signal.reason = reason;
      return signal;
    }
    
    static timeout(delay) {
      const controller = new global.AbortController();
      setTimeout(() => controller.abort(new Error('TimeoutError')), delay);
      return controller.signal;
    }
    
    addEventListener(type, listener) {
      if (type === 'abort') {
        this.onabort = listener;
      }
    }
    
    removeEventListener(type, listener) {
      if (type === 'abort' && this.onabort === listener) {
        this.onabort = null;
      }
    }
    
    throwIfAborted() {
      if (this.aborted) {
        throw this.reason || new Error('AbortError');
      }
    }
  };
}

console.log('✅ Web API polyfills loaded for test environment');