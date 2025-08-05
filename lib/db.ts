import { PrismaClient } from "@prisma/client";

declare global { var prisma: PrismaClient | undefined; }

// Use TEST_DATABASE_URL in test environment, DATABASE_URL otherwise
const databaseUrl = process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL 
  ? process.env.TEST_DATABASE_URL 
  : process.env.DATABASE_URL;

export const prisma = global.prisma || new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
