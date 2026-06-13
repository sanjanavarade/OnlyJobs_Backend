const pool = require('../config/db');
const { deriveKeypair, sign, verify } = require('../crypto/ringSignature');
const { anchorReferral, verifyAnchor } = require('../blockchain/referralChain');

const isEmail = (s) =>
  typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// Canonical message that gets signed/verified — fixed key order so sign & verify match.
function referralMessage({ job_id, candidate_name, candidate_email, company_id }) {
  return JSON.stringify({ job_id, candidate_name, candidate_email, company_id });
}

/**
 * Submit an anonymous referral. The employee's key is derived from their
 * password (never stored), used to ring-sign over the company's enrolled keys,
 * then discarded. We persist only the ring signature + anchor — never who signed.
 */
async function submitReferral(req, res, next) {
  try {
    const { job_id, candidate_name, candidate_email, password } = req.body;

    if (!job_id) return res.status(400).json({ error: 'job_id is required.' });
    if (typeof candidate_name !== 'string' || !candidate_name.trim() || candidate_name.length > 120) {
      return res.status(400).json({ error: 'A valid candidate name is required.' });
    }
    if (!isEmail(candidate_email)) {
      return res.status(400).json({ error: 'A valid candidate email is required.' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Your account password is required to sign the referral.' });
    }

    // The referral is for a specific job → that job's company is the ring's company.
    const { rows: jobRows } = await pool.query('SELECT company_id FROM jobs WHERE job_id=$1', [job_id]);
    if (!jobRows.length) return res.status(404).json({ error: 'Job not found.' });
    const company_id = jobRows[0].company_id;

    // Derive this employee's key from their password and (auto-)enroll the public key.
    const { priv, pub } = deriveKeypair(password, req.user.user_id);
    await pool.query(
      `INSERT INTO employee_keys (company_id, user_id, public_key)
       VALUES ($1,$2,$3)
       ON CONFLICT (company_id, user_id) DO UPDATE SET public_key = EXCLUDED.public_key`,
      [company_id, req.user.user_id, pub]
    );

    // Build the ring = all enrolled employee public keys for this company.
    const { rows: keyRows } = await pool.query(
      'SELECT public_key FROM employee_keys WHERE company_id=$1 ORDER BY created_at, key_id',
      [company_id]
    );
    const ring = keyRows.map((r) => r.public_key);
    const signerIndex = ring.indexOf(pub);
    if (signerIndex === -1) return res.status(500).json({ error: 'Key enrollment failed.' });

    const cName = candidate_name.trim();
    const message = referralMessage({ job_id, candidate_name: cName, candidate_email, company_id });
    const signature = sign(message, priv, ring, signerIndex);
    if (!verify(message, signature, ring)) {
      return res.status(500).json({ error: 'Signature verification failed.' });
    }

    // Store the ring WITH the signature so verification uses the exact ring used at signing.
    const sigBlob = JSON.stringify({ ...signature, ring });
    const { blockchain_hash, blockchain_tx, simulated } = await anchorReferral({ message, signature: sigBlob });

    const { rows } = await pool.query(
      `INSERT INTO anonymous_referrals
         (job_id, candidate_email, candidate_name, company_id, ring_signature, blockchain_hash, blockchain_tx, verification_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'verified')
       RETURNING referral_id, created_at`,
      [job_id, candidate_email, cName, company_id, sigBlob, blockchain_hash, blockchain_tx]
    );

    res.status(201).json({
      referral_id: rows[0].referral_id,
      blockchain_tx,
      ring_size: ring.length,
      anonymous: ring.length >= 2, // a ring of 1 provides no anonymity
      simulated,
    });
  } catch (err) { next(err); }
}

// Company view: anonymous referrals for the jobs this recruiter posted. No signer identity.
async function listReferrals(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT r.referral_id, r.candidate_name, r.candidate_email, r.verification_status,
              r.blockchain_hash, r.blockchain_tx, r.created_at, j.title
       FROM anonymous_referrals r
       JOIN jobs j ON j.job_id = r.job_id
       WHERE j.posted_by = $1
       ORDER BY r.created_at DESC`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

// Re-verify a referral's ring signature + on-chain anchor.
async function verifyReferral(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT r.* FROM anonymous_referrals r
       JOIN jobs j ON j.job_id = r.job_id
       WHERE r.referral_id = $1 AND j.posted_by = $2`,
      [req.params.id, req.user.user_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Referral not found.' });
    const r = rows[0];

    let sig;
    try { sig = JSON.parse(r.ring_signature); } catch { sig = null; }
    const ring = Array.isArray(sig?.ring) ? sig.ring : [];

    const message = referralMessage({
      job_id: r.job_id, candidate_name: r.candidate_name, candidate_email: r.candidate_email, company_id: r.company_id,
    });
    const sigValid = sig ? verify(message, sig, ring) : false;

    // Authenticity: every ring member is a currently-enrolled employee of this company.
    const { rows: keyRows } = await pool.query(
      'SELECT public_key FROM employee_keys WHERE company_id=$1', [r.company_id]
    );
    const companyKeys = new Set(keyRows.map((k) => k.public_key));
    const ringIsCompany = ring.length > 0 && ring.every((pk) => companyKeys.has(pk));

    const anchored = await verifyAnchor(r.blockchain_hash);

    res.json({
      valid_employee_signature: sigValid && ringIsCompany,
      anchored,
      ring_size: ring.length,
    });
  } catch (err) { next(err); }
}

module.exports = { submitReferral, listReferrals, verifyReferral };
