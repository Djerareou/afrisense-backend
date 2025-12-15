import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    { name: 'TRIAL', dailyPrice: 0, trialDays: 3 },
    { name: 'STARTER', dailyPrice: 200, trialDays: 3 },
    { name: 'PRO', dailyPrice: 350, trialDays: 3 },
    { name: 'PREMIUM', dailyPrice: 500, trialDays: 3 }
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { name: p.name },
      update: { dailyPrice: p.dailyPrice, trialDays: p.trialDays },
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
