import type { PrismaClient as PrismaClientType } from '@prisma/client';
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType };
export const prisma = new Proxy({}, { get(_target, prop) { if (!globalForPrisma.prisma) { const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client'); globalForPrisma.prisma = new PrismaClient(); } return (globalForPrisma.prisma as any)[prop]; } }) as PrismaClientType;
