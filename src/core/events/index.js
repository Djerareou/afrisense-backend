import EventEmitter from 'events';

const bus = new EventEmitter();

// small helper to emit and listen
export function emit(eventName, payload = {}) {
  bus.emit(eventName, payload);
}

export function on(eventName, handler) {
  bus.on(eventName, handler);
}

export default { emit, on };
