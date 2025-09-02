import { PrismaClient } from "@prisma/client";

declare global { var prisma: PrismaClient | undefined; }

// Function to get the correct database URL, resolved at runtime
function getDatabaseUrl(): string {
  // In test environment, prioritize TEST_DATABASE_URL
  if (process.env.NODE_ENV === 'test') {
    return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';
  }
  return process.env.DATABASE_URL || '';
}

// Lazy initialization function for Prisma client
function createPrismaClient(): PrismaClient {
  const databaseUrl = getDatabaseUrl();
  
  if (!databaseUrl) {
    throw new Error(`Database URL not configured. Please set ${
      process.env.NODE_ENV === 'test' ? 'TEST_DATABASE_URL or DATABASE_URL' : 'DATABASE_URL'
    }`);
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    log: process.env.NODE_ENV === 'test' ? ['error'] : ['query', 'info', 'warn', 'error']
  });
}

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
