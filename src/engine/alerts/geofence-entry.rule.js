export default {
  id: 'geofence-entry',
  description: 'Trigger when a geofence enter event occurs for a tracker',
  check: async ({ tracker, position, preferences, event }) => {
    // event expected to contain { type: 'enter' | 'exit', geofenceId }
    if (!event) return { triggered: false };
    if (event.type === 'enter') {
      return { triggered: true, meta: { geofenceId: event.geofenceId } };
    }
    return { triggered: false };
  }
};
