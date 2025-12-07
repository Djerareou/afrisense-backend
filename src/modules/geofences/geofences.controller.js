import * as service from './geofences.service.js';

export async function createController(req, res) {
  try {
    const gf = await service.createGeofence(req.body);
    res.status(201).json({ success: true, data: gf });
  } catch (err) { res.status(400).json({ success:false, error: err.message }); }
}

export async function listController(req, res) {
  try {
    const filter = {
      type: req.query.type,
      trackerId: req.query.trackerId,
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined
    };
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    const items = await service.listGeofences(filter, { skip: offset, take: limit });
    res.json({ success:true, data: items });
  } catch(err){ res.status(500).json({ success:false, error: err.message }); }
}

export async function getController(req,res){
  try{ const gf = await service.getGeofence(req.params.id); res.json({success:true,data:gf}); }
  catch(err){ res.status(404).json({success:false,error:err.message}); }
}

export async function updateController(req,res){
  try{ const gf = await service.updateGeofence(req.params.id, req.body); res.json({success:true,data:gf}); }
  catch(err){ res.status(400).json({success:false,error:err.message}); }
}

export async function deleteController(req,res){
  try{ const gf = await service.deleteGeofence(req.params.id); res.json({success:true,data:null}); }
  catch(err){ res.status(400).json({success:false,error:err.message}); }
}

export async function assignController(req,res){
  try{ const { trackerId } = req.body; const result = await service.assignTracker(req.params.id, trackerId); res.json({success:true,data:result}); }
  catch(err){ res.status(400).json({success:false,error:err.message}); }
}

export async function unassignController(req,res){
  try{ const { trackerId } = req.body; const result = await service.unassignTracker(req.params.id, trackerId); res.json({success:true,data:result}); }
  catch(err){ res.status(400).json({success:false,error:err.message}); }
}
