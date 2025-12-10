import { prisma } from '../../config/prismaClient.js';

export default {
  id: 'no-movement',
  description: 'Trigger when a tracker shows no movement for configured minutes',
  check: async ({ tracker, position, preferences }) => {
    // position-based quick check: if position.speed is zero and user set threshold to short, defer to scheduled
    return { triggered: false };
  },
  // scheduled helper that returns trackers that didn't move for threshold minutes
  scheduledCheck: async ({ thresholdMinutes = 15 }) => {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - thresholdMinutes);
    // Find trackers whose last position before cutoff has speed <= small and no newer positions
    const results = await prisma.$queryRaw`
      SELECT t.id, t."lastCommunication" FROM "Tracker" t
      LEFT JOIN "Position" p ON p."trackerId" = t.id AND p."timestamp" > ${cutoff}
      WHERE p.id IS NULL
      LIMIT 1000
    `;
    return results.map(r => ({ tracker: { id: r.id } }));
  }
};
