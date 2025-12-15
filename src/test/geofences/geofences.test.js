/**
 * TESTS COMPLETS GEOFENCE (dans un seul fichier)
 * - pointInCircle
 * - pointInPolygon
 * - transitions enter/exit
 * - anti-doublon
 * - workflow detectAndPersistGeofenceTransitions
 */

import {
  pointInCircle,
  pointInPolygon
} from "../../modules/geofences/geofences.utils.js";

import {
  detectAndPersistGeofenceTransitions
} from "../../modules/geofences/geofences.events.js";

// Mock du repository
jest.mock("../../modules/geofences/geofences.repository.js", () => ({
  findGeofencesForTracker: jest.fn(),
  lastGeofenceEventForTrackerAndFence: jest.fn(),
  createGeofenceEvent: jest.fn(),
}));

import * as repo from "../../modules/geofences/geofences.repository.js";

/* ------------------------------------------------------------
 * 1) Tests Geometry
 * ------------------------------------------------------------ */

describe("Geometry utils", () => {

  test("pointInCircle: inside/outside", () => {
    const center = [6.5, 3.3];
    expect(pointInCircle(6.5001, 3.3001, center[0], center[1], 200)).toBe(true);
    expect(pointInCircle(7.0, 3.3, center[0], center[1], 200)).toBe(false);
  });

  test("pointInPolygon: inside polygon", () => {
    const poly = [
      [0,0],
      [0,10],
      [10,10],
      [10,0]
    ];
    expect(pointInPolygon(5, 5, poly)).toBe(true);
    expect(pointInPolygon(20, 20, poly)).toBe(false);
  });

});

/* ------------------------------------------------------------
 * 2) Tests geofence transitions
 * ------------------------------------------------------------ */

describe("Geofence transition detection", () => {

  const trackerId = "T1";
  const geofenceId = "G1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("enter event is created when going from outside → inside", async () => {
    repo.findGeofencesForTracker.mockResolvedValue([
      {
        id: geofenceId,
        type: "circle",
        radius: 200,
        center: JSON.stringify([6.5, 3.3]),
        coordinates: null,
        name: "TestFence",
        active: true,
      }
    ]);

    // last event = outside (none or last exit)
    repo.lastGeofenceEventForTrackerAndFence.mockResolvedValue(null);

    repo.createGeofenceEvent.mockResolvedValue({
      id: "E1",
      type: "enter",
      geofenceId,
      trackerId,
    });

    const position = {
      id: "P1",
      trackerId,
      latitude: 6.5001,
      longitude: 3.3001,
      timestamp: new Date(),
    };

    const events = await detectAndPersistGeofenceTransitions(position);
    
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("enter");
    expect(repo.createGeofenceEvent).toHaveBeenCalledTimes(1);
  });

  test("exit event is created when going from inside → outside", async () => {
    repo.findGeofencesForTracker.mockResolvedValue([
      {
        id: geofenceId,
        type: "circle",
        radius: 200,
        center: JSON.stringify([6.5, 3.3]),
        coordinates: null,
        name: "TestFence",
        active: true,
      }
    ]);

    // last event = inside
    repo.lastGeofenceEventForTrackerAndFence.mockResolvedValue({
      type: "enter"
    });

    repo.createGeofenceEvent.mockResolvedValue({
      id: "E2",
      type: "exit",
      geofenceId,
      trackerId,
    });

    const position = {
      id: "P2",
      trackerId,
      latitude: 7.0, // en dehors
      longitude: 3.3,
      timestamp: new Date(),
    };

    const events = await detectAndPersistGeofenceTransitions(position);

    expect(events.length).toBe(1);
    expect(events[0].type).toBe("exit");
  });

  test("NO duplicate enter when already inside", async () => {
    repo.findGeofencesForTracker.mockResolvedValue([
      {
        id: geofenceId,
        type: "circle",
        radius: 200,
        center: JSON.stringify([6.5, 3.3]),
        name: "TestFence",
      }
    ]);

    repo.lastGeofenceEventForTrackerAndFence.mockResolvedValue({
      type: "enter"
    });

    const position = {
      id: "P3",
      trackerId,
      latitude: 6.5001,
      longitude: 3.3001,
      timestamp: new Date(),
    };

    const events = await detectAndPersistGeofenceTransitions(position);

    expect(events.length).toBe(0);
    expect(repo.createGeofenceEvent).not.toHaveBeenCalled();
  });

  test("NO duplicate exit when already outside", async () => {
    repo.findGeofencesForTracker.mockResolvedValue([
      {
        id: geofenceId,
        type: "circle",
        radius: 200,
        center: JSON.stringify([6.5, 3.3]),
      }
    ]);

    repo.lastGeofenceEventForTrackerAndFence.mockResolvedValue({
      type: "exit"
    });

    const position = {
      id: "P4",
      trackerId,
      latitude: 7.0, // toujours dehors
      longitude: 3.3,
      timestamp: new Date(),
    };

    const events = await detectAndPersistGeofenceTransitions(position);

    expect(events.length).toBe(0);
    expect(repo.createGeofenceEvent).not.toHaveBeenCalled();
  });

});
