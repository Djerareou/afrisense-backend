// Unit tests for trackers controller
import { jest } from '@jest/globals';

// Mock the service used by controller
jest.mock('../../modules/trackers/trackers.service.js', () => ({
  registerTracker: jest.fn().mockResolvedValue({ id: 't1', imei: '123456', label: 'T' }),
  getAllTrackers: jest.fn().mockResolvedValue([{ id: 't1' }]),
  getTracker: jest.fn().mockResolvedValue({ id: 't1' }),
  modifyTracker: jest.fn().mockResolvedValue({ id: 't1', label: 'updated' }),
  removeTracker: jest.fn().mockResolvedValue(true),
}));

describe('trackers.controller (unit)', () => {
  let controller;

  beforeAll(async () => {
    controller = await import('../../modules/trackers/trackers.controller.js');
  });

  function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  test('create returns 201 and tracker', async () => {
    const req = { body: { imei: '1234567890' } };
    const res = mockRes();
    await controller.create(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();
  });

  test('list returns trackers', async () => {
    const req = {};
    const res = mockRes();
    await controller.list(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  test('getOne returns tracker', async () => {
    const req = { params: { id: 't1' } };
    const res = mockRes();
    await controller.getOne(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  test('update returns updated tracker', async () => {
    const req = { params: { id: 't1' }, body: { label: 'updated' } };
    const res = mockRes();
    await controller.update(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  test('remove returns deletion message', async () => {
    const req = { params: { id: 't1' } };
    const res = mockRes();
    await controller.remove(req, res);
    expect(res.json).toHaveBeenCalled();
  });
});
