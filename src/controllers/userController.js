const pool = require('../config/db');
const crypto = require('crypto');
const fsp = require('fs/promises');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

// File-type signatures. The client-supplied MIME type is spoofable, so we
// verify the real first bytes before trusting/serving an uploaded file.
const MAGIC = {
  'application/pdf': [Buffer.from('%PDF')],
  'application/msword': [Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [Buffer.from([0x50, 0x4B, 0x03, 0x04])],
};

function contentMatchesType(buf, mimetype) {
  const sigs = MAGIC[mimetype] || [];
  return sigs.some((sig) => buf.length >= sig.length && buf.subarray(0, sig.length).equals(sig));
}

// Deterministic "ATS" score in [75, 85] derived from the file's SHA-256 — the
// same document always yields the same score. MVP placeholder, not a real eval.
function scoreFromBuffer(buf) {
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  return 75 + (parseInt(hash.slice(0, 8), 16) % 11);
}

// Fallback only: deterministic score in [75, 95] from resume bytes + JD, used
// when the resume text can't be extracted (e.g. a scanned/image-only PDF).
function matchScoreFor(buf, jobDescription) {
  const hash = crypto.createHash('sha256')
    .update(buf).update('::').update(jobDescription)
    .digest('hex');
  return 75 + (parseInt(hash.slice(0, 8), 16) % 21);
}

// Pull plain text out of the stored resume so we can compare it to a JD.
async function extractResumeText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === '.pdf') {
      const data = await pdf(await fsp.readFile(filePath));
      return data.text || '';
    }
    if (ext === '.docx' || ext === '.doc') {
      const { value } = await mammoth.extractRawText({ path: filePath });
      return value || '';
    }
  } catch {
    return '';
  }
  return '';
}

// Generic words that carry no signal about role relevance.
const STOPWORDS = new Set([
  'the','and','for','with','you','your','our','are','will','this','that','from','have','has',
  'was','were','not','but','they','their','them','its','a','an','to','of','in','on','as','is',
  'be','or','we','at','by','it','if','so','do','does','who','what','which','all','can','could',
  'would','should','may','might','must','about','into','work','working','works','role','job','jobs',
  'team','teams','year','years','experience','strong','good','great','excellent','ability','able',
  'including','include','etc','using','use','used','within','across','help','plus','per','via','also',
  'new','well','look','looking','seek','seeking','candidate','candidates','responsibilities','requirements',
  'preferred','required','qualifications','skill','skills','knowledge','company','position','opportunity',
  'join','environment','based','time','full','part','years','months','day','days',
]);

// Crude stemmer: fold common morphological variants so "developer",
// "developing", "development" all collapse to one root. The JD and the résumé
// are stemmed identically, so variants align and real overlap is captured.
// Tokens containing non-letters (node.js, c++, c#, .net) are left intact.
const SUFFIXES = ['izations', 'ization', 'ations', 'ation', 'ities', 'ments', 'ment', 'ings', 'ing', 'ions', 'ion', 'ers', 'er', 'ed', 'ies', 'es'];
function stem(w) {
  if (!/^[a-z]+$/.test(w)) return w;
  for (const suf of SUFFIXES) {
    if (w.length - suf.length >= 3 && w.endsWith(suf)) {
      return suf === 'ies' ? w.slice(0, -3) + 'y' : w.slice(0, -suf.length);
    }
  }
  // Plural "s", but keep "ss" words (class, process) and a 3+ char base.
  if (w.length >= 4 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function keywordSet(text) {
  const out = new Set();
  for (const tok of String(text).toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').split(' ')) {
    const w = tok.replace(/^\.+|\.+$/g, '');
    if (w.length >= 3 && !STOPWORDS.has(w)) out.add(stem(w));
  }
  return out;
}

// Relevance = the share of the JD's meaningful keywords (stemmed) that the
// résumé also mentions. Real JDs carry many keywords, so even a strong résumé
// rarely covers half of them — the curve is calibrated to that reality so the
// score tracks how relevant the résumé actually is:
//   ~0%  coverage → ~15  (irrelevant)
//   ~10% coverage → ~50  (loosely related)
//   ~25% coverage → ~75  (solid match)
//   ~40% coverage → ~90  (strong match)
//   ≥55% coverage → 97   (ceiling)
function relevanceScore(resumeText, jdText) {
  const jd = keywordSet(jdText);
  const resume = keywordSet(resumeText);
  if (jd.size === 0 || resume.size === 0) return null;
  let hits = 0;
  for (const w of jd) if (resume.has(w)) hits++;
  const coverage = hits / jd.size;                                         // 0..1
  let score;
  if (coverage <= 0.10)      score = 15 + (coverage / 0.10) * 35;          // 15 → 50
  else if (coverage <= 0.25) score = 50 + ((coverage - 0.10) / 0.15) * 25; // 50 → 75
  else if (coverage <= 0.40) score = 75 + ((coverage - 0.25) / 0.15) * 15; // 75 → 90
  else if (coverage <= 0.55) score = 90 + ((coverage - 0.40) / 0.15) * 7;  // 90 → 97
  else                       score = 97;                                   // ceiling
  return Math.round(score);
}

async function scoreFromResumeUrl(resumeUrl) {
  if (!resumeUrl) return null;
  try {
    const file = path.join(UPLOAD_DIR, path.basename(resumeUrl)); // basename → contain to UPLOAD_DIR
    if (!file.startsWith(UPLOAD_DIR + path.sep)) return null;
    return scoreFromBuffer(await fsp.readFile(file));
  } catch {
    return null;
  }
}

async function getProfile(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id, u.name, u.email, u.role, u.created_at,
              js.phone, js.skills, js.education, js.resume_url
       FROM users u LEFT JOIN job_seekers js ON js.user_id = u.user_id
       WHERE u.user_id = $1`,
      [req.user.user_id]
    );
    const profile = rows[0];
    if (profile) profile.resume_score = await scoreFromResumeUrl(profile.resume_url);
    res.json(profile);
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const { name, phone, skills, education } = req.body;
    if (name) {
      await pool.query('UPDATE users SET name=$1 WHERE user_id=$2', [name, req.user.user_id]);
    }
    if (req.user.role === 'job_seeker') {
      await pool.query(
        `UPDATE job_seekers SET phone=$1, skills=$2, education=$3 WHERE user_id=$4`,
        [phone, skills, education, req.user.user_id]
      );
    }
    res.json({ message: 'Profile updated.' });
  } catch (err) { next(err); }
}

async function uploadResume(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    // Verify the real file content matches the claimed type; reject + delete otherwise.
    const buf = await fsp.readFile(req.file.path);
    if (!contentMatchesType(buf, req.file.mimetype)) {
      await fsp.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Invalid file content.' });
    }

    const resumeUrl = `/uploads/${req.file.filename}`;
    const resumeScore = scoreFromBuffer(buf);
    await pool.query('UPDATE job_seekers SET resume_url=$1 WHERE user_id=$2', [resumeUrl, req.user.user_id]);
    res.json({ resume_url: resumeUrl, resume_score: resumeScore });
  } catch (err) { next(err); }
}

// Compares the user's stored resume against a job description and returns a
// deterministic match score. No AI/text-extraction — see matchScoreFor.
async function matchResume(req, res, next) {
  try {
    const jobDescription = req.body?.jobDescription;
    if (typeof jobDescription !== 'string' || !jobDescription.trim()) {
      return res.status(400).json({ error: 'Job description is required.' });
    }
    if (jobDescription.length > 20000) {
      return res.status(400).json({ error: 'Job description is too long.' });
    }

    const { rows } = await pool.query('SELECT resume_url FROM job_seekers WHERE user_id=$1', [req.user.user_id]);
    const resumeUrl = rows[0]?.resume_url;
    if (!resumeUrl) return res.status(400).json({ error: 'Upload a resume first.' });

    const file = path.join(UPLOAD_DIR, path.basename(resumeUrl));
    if (!file.startsWith(UPLOAD_DIR + path.sep)) return res.status(400).json({ error: 'Resume not found.' });

    let buf;
    try {
      buf = await fsp.readFile(file);
    } catch {
      return res.status(400).json({ error: 'Resume file missing — please re-upload.' });
    }

    // Compare actual resume text against the JD; fall back to the hash score
    // only if the resume yielded no extractable text.
    const resumeText = await extractResumeText(file);
    const relevance = resumeText.trim().length >= 30 ? relevanceScore(resumeText, jobDescription) : null;
    const matchPercentage = relevance ?? matchScoreFor(buf, jobDescription);

    res.json({ matchPercentage });
  } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile, uploadResume, matchResume };
