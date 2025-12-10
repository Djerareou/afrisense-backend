export default {
  id: 'geofence-exit',
  description: 'Trigger when a geofence exit event occurs for a tracker',
  check: async ({ tracker, position, preferences, event }) => {
    if (!event) return { triggered: false };
    if (event.type === 'exit') {
      return { triggered: true, meta: { geofenceId: event.geofenceId } };
    }
    return { triggered: false };
  }
};
