const { generateHiringHash } = require('../blockchain/hashService');
const { storeOnChain, verifyOnChain } = require('../blockchain/contractService');
const Application = require('../models/Application');
const pool = require('../config/db');

async function storeHiringRecord(req, res, next) {
  try {
    const { application_id } = req.body;
    const app = await Application.findById(application_id);
    if (!app || app.status !== 'hired') {
      return res.status(400).json({ error: 'Application must be in hired status.' });
    }

    const hash = generateHiringHash(app);
    const txHash = await storeOnChain(hash);

    await pool.query(
      `INSERT INTO blockchain_records (application_id, hash_value, tx_hash)
       VALUES ($1,$2,$3) ON CONFLICT (application_id) DO UPDATE SET hash_value=$2, tx_hash=$3`,
      [application_id, hash, txHash]
    );

    res.json({ hash, tx_hash: txHash });
  } catch (err) { next(err); }
}

async function verifyHiringRecord(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM blockchain_records WHERE application_id=$1',
      [req.params.applicationId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No blockchain record found.' });

    const record = rows[0];
    const isValid = await verifyOnChain(record.hash_value);
    res.json({ valid: isValid, record });
  } catch (err) { next(err); }
}

module.exports = { storeHiringRecord, verifyHiringRecord };
