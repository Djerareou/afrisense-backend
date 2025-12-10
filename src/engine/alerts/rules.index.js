import overspeed from './overspeed.rule.js';
import geofenceEntry from './geofence-entry.rule.js';
import geofenceExit from './geofence-exit.rule.js';
import lowBattery from './low-battery.rule.js';
import offline from './offline.rule.js';
import noMovement from './no-movement.rule.js';

export const RULES = [
  overspeed,
  lowBattery,
  geofenceEntry,
  geofenceExit,
  offline,
  noMovement,
];

export default RULES;
