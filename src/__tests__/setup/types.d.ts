// Global type definitions for VibeFunder tests

import { PrismaClient } from '@prisma/client';

declare global {
  var testPrisma: PrismaClient;
  
  namespace jest {
    interface Matchers<R> {
      toBeValidUrl(): R;
      toHaveValidImageFormat(): R;
    }
  }
}

export {};