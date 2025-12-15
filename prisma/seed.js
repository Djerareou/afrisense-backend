import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    { key: 'TRIAL', name: 'Trial', pricePerDay: 0, freeTrialDays: 3 },
    { key: 'STARTER', name: 'Starter', pricePerDay: 200, freeTrialDays: 3 },
    { key: 'PRO', name: 'Pro', pricePerDay: 350, freeTrialDays: 3 },
    { key: 'PREMIUM', name: 'Premium', pricePerDay: 500, freeTrialDays: 3 }
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { key: p.key },
      update: { pricePerDay: p.pricePerDay, freeTrialDays: p.freeTrialDays, name: p.name },
      create: p
    });
  }

  console.log('Seed complete: plans upserted');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
