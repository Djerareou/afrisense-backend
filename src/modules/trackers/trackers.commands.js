// src/modules/trackers/trackers.commands.js (ESM)
export function buildSetAPNCommand(apn) {
  return `APN,${apn}#`;
}

export function buildAdminNumberCommand(phone) {
  return `ADMIN,${phone}#`;
}

export function buildRebootCommand() {
  return 'RESET#';
}

export function buildPositionIntervalCommand(seconds) {
  return `TIMER,${seconds}#`;
}

