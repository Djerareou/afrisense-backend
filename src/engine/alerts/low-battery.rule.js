export default {
  id: 'low-battery',
  description: 'Trigger when tracker battery level is below user threshold',
  check: async ({ tracker, position, preferences }) => {
    const battery = position?.batteryLevel ?? tracker?.batteryLevel ?? null;
    const threshold = preferences?.thresholds?.battery_low ?? 15; // percent
    if (battery !== null && battery !== undefined && battery < threshold) {
      return { triggered: true, meta: { battery, threshold } };
    }
    return { triggered: false };
  }
};
