/**
 * SAG (Spontaneous Anonymous Group) ring signatures over secp256k1.
 *
 * A member of a ring (set of public keys) can sign a message such that a
 * verifier learns ONLY that *some* ring member signed — never which one.
 * This is what gives anonymous employee referrals their anonymity.
 *
 * Uses @noble/curves for audited curve arithmetic; we implement only the
 * SAG protocol on top. Randomness is from Node's CSPRNG.
 */
const { secp256k1 } = require('@noble/curves/secp256k1');
const { createHash, scryptSync, randomBytes } = require('crypto');

const N = secp256k1.CURVE.n;                 // curve order
const G = secp256k1.ProjectivePoint.BASE;    // generator

const mod = (a, m = N) => ((a % m) + m) % m;
const bytesToBigInt = (buf) => BigInt('0x' + Buffer.from(buf).toString('hex'));

// A random scalar in [1, N-1].
function randomScalar() {
  let s = mod(bytesToBigInt(randomBytes(32)));
  return s === 0n ? 1n : s;
}

// H(message, point) -> scalar mod N
function hashToScalar(message, pointHex) {
  const digest = createHash('sha256').update(String(message)).update('|').update(pointHex).digest();
  return mod(bytesToBigInt(digest));
}

const pointFromHex = (hex) => secp256k1.ProjectivePoint.fromHex(hex);

/**
 * Deterministically derive a keypair from a password + per-user salt (scrypt).
 * Same (password, salt) always yields the same key — so we never store the key.
 * Returns { priv: bigint, pub: string(compressed hex) }.
 */
function deriveKeypair(password, salt) {
  const seed = scryptSync(String(password), String(salt), 32);
  let priv = mod(bytesToBigInt(seed));
  if (priv === 0n) priv = 1n;
  return { priv, pub: G.multiply(priv).toHex(true) };
}

const publicKeyFromPrivate = (priv) => G.multiply(priv).toHex(true);

/**
 * Sign `message` as ring member `signerIndex`, whose private key is `priv`.
 * ring = array of compressed pubkey hex strings (ring[signerIndex] must be priv's pubkey).
 * Returns { c0: hex, s: hex[] }.
 */
function sign(message, priv, ring, signerIndex) {
  const n = ring.length;
  const P = ring.map(pointFromHex);
  const c = new Array(n);
  const s = new Array(n);

  const alpha = randomScalar();
  let i = (signerIndex + 1) % n;
  c[i] = hashToScalar(message, G.multiply(alpha).toHex(true));

  while (i !== signerIndex) {
    s[i] = randomScalar();
    const L = G.multiply(s[i]).add(P[i].multiply(c[i])); // s_i*G + c_i*P_i
    const next = (i + 1) % n;
    c[next] = hashToScalar(message, L.toHex(true));
    i = next;
  }

  // Close the ring: s_signer = alpha - c_signer * priv  (mod N)
  s[signerIndex] = mod(alpha - mod(c[signerIndex] * priv));

  return { c0: c[0].toString(16), s: s.map((x) => x.toString(16)) };
}

/**
 * Verify a ring signature against `ring`. Returns true iff some ring member signed.
 * Does NOT reveal which member.
 */
function verify(message, signature, ring) {
  try {
    const n = ring.length;
    if (!signature || !Array.isArray(signature.s) || signature.s.length !== n || n === 0) return false;
    const P = ring.map(pointFromHex);
    const s = signature.s.map((x) => mod(BigInt('0x' + x)));
    const c0 = mod(BigInt('0x' + signature.c0));

    let c = c0;
    for (let i = 0; i < n; i++) {
      const L = G.multiply(s[i]).add(P[i].multiply(c)); // s_i*G + c_i*P_i
      c = hashToScalar(message, L.toHex(true));
    }
    return c === c0; // ring closes only if a real member signed
  } catch {
    return false;
  }
}

module.exports = { deriveKeypair, publicKeyFromPrivate, sign, verify };
