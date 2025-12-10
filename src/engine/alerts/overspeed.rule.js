export default {
  id: 'overspeed',
  description: 'Trigger when position.speed exceeds user-defined threshold or default overspeed threshold',
  check: async ({ tracker, position, preferences }) => {
    const speed = position.speed || 0;
    const threshold = preferences?.thresholds?.overspeed ?? 100; // km/h by default
    if (speed > threshold) {
      return { triggered: true, meta: { speed, threshold } };
    }
    return { triggered: false };
  }
};
