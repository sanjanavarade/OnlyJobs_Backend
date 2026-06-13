/**
 * Anchors a referral proof on-chain.
 *
 * If the blockchain env vars are configured, it writes the hash to the real
 * contract via the existing ethers contractService. Otherwise it falls back to
 * a SIMULATED anchor (a deterministic stand-in tx id) so the full store/verify
 * flow works offline with zero setup. Flip to a real chain later by setting
 * BLOCKCHAIN_RPC_URL / CONTRACT_ADDRESS / DEPLOYER_PRIVATE_KEY.
 */
const { createHash } = require('crypto');
const { storeOnChain, verifyOnChain } = require('./contractService');
const logger = require('../utils/logger');

// Treat the chain as configured ONLY if the env vars are real, well-formed
// values — not placeholders like "0xYourDeployerPrivateKey". Otherwise fall
// back to the simulated anchor so the feature works out of the box.
const isHttpUrl = (v) => typeof v === 'string' && /^https?:\/\/.+/.test(v);
const isAddress = (v) => typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v);
const isPrivKey = (v) => typeof v === 'string' && /^0x[0-9a-fA-F]{64}$/.test(v);

const chainConfigured = () =>
  isHttpUrl(process.env.BLOCKCHAIN_RPC_URL) &&
  isAddress(process.env.CONTRACT_ADDRESS) &&
  isPrivKey(process.env.DEPLOYER_PRIVATE_KEY);

function hashReferral(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function simulatedTx(hash) {
  return 'sim_' + createHash('sha256').update('tx|' + hash).digest('hex').slice(0, 48);
}

async function anchorReferral(payload) {
  const blockchain_hash = hashReferral(payload);
  if (chainConfigured()) {
    try {
      const blockchain_tx = await storeOnChain(blockchain_hash);
      return { blockchain_hash, blockchain_tx, simulated: false };
    } catch (err) {
      // Real chain configured but unreachable/misconfigured — don't fail the
      // referral; fall back to the simulated anchor.
      logger.warn(`On-chain anchor failed, using simulated anchor: ${err.message}`);
    }
  }
  return { blockchain_hash, blockchain_tx: simulatedTx(blockchain_hash), simulated: true };
}

async function verifyAnchor(hash) {
  if (chainConfigured()) {
    try { return await verifyOnChain(hash); } catch { return false; }
  }
  return typeof hash === 'string' && hash.length === 64; // simulated: well-formed hash = anchored
}

module.exports = { hashReferral, anchorReferral, verifyAnchor, chainConfigured };
