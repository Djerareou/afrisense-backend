// src/testPrisma.js
import { PrismaClient } from '@prisma/client';
import logger from './utils/logger.js';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  logger.info({ users }, 'testPrisma: fetched users');
}

main()
  .catch(e => logger.error({ err: e }, 'testPrisma: error'))
  .finally(async () => await prisma.$disconnect());
