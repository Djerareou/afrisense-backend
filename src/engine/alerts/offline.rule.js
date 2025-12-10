import { prisma } from '../../config/prismaClient.js';

export default {
  id: 'offline',
  description: 'Detect trackers that have not communicated within threshold minutes',
  check: async ({ tracker, position, preferences }) => {
    // This rule is primarily used by scheduled checks; for position-based checks, skip
    return { triggered: false };
  },
  // helper used by scheduled runner
  scheduledCheck: async ({ thresholdMinutes = 10 }) => {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - thresholdMinutes);
    const trackers = await prisma.tracker.findMany({ where: { lastCommunication: { lt: cutoff } } });
    return trackers.map(t => ({ tracker: t }));
  }
};
