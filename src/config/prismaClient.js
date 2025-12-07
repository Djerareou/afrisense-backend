/**
 * Prisma Client Configuration
 * Permet d'exporter un client Prisma unique pour tout le projet
 */

import { PrismaClient } from '@prisma/client';

// Central Prisma client used across the project. Keep both named and default exports
// to be compatible with existing import styles in the codebase and tests.
const prisma = new PrismaClient();

export { prisma };
export default prisma;
