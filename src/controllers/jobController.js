const Job = require('../models/Job');
const pool = require('../config/db');

const JOB_TYPES = ['full_time', 'part_time', 'contract', 'internship'];

function cleanSkills(skills) {
  if (!Array.isArray(skills)) return [];
  return skills
    .filter((s) => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 40)
    .slice(0, 20);
}

async function listJobs(req, res, next) {
  try {
    const str = (v) => (typeof v === 'string' ? v.trim().slice(0, 80) : '');
    const search = str(req.query.search);
    const location = str(req.query.location);
    const jobType = JOB_TYPES.includes(req.query.job_type) ? req.query.job_type : undefined;

    const jobs = await Job.findAll(true, {
      search: search || undefined,
      location: location || undefined,
      jobType,
    });
    res.json(jobs);
  } catch (err) { next(err); }
}

async function getJob(req, res, next) {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    res.json(job);
  } catch (err) { next(err); }
}

async function createJob(req, res, next) {
  try {
    const { title, description, salary, location, job_type, skills } = req.body;

    if (typeof title !== 'string' || !title.trim() || title.length > 200) {
      return res.status(400).json({ error: 'A valid title is required.' });
    }
    if (typeof description !== 'string' || !description.trim() || description.length > 5000) {
      return res.status(400).json({ error: 'A valid description is required.' });
    }
    if (salary != null && (typeof salary !== 'string' || salary.length > 100)) {
      return res.status(400).json({ error: 'Invalid salary.' });
    }
    if (location != null && (typeof location !== 'string' || location.length > 200)) {
      return res.status(400).json({ error: 'Invalid location.' });
    }
    const type = JOB_TYPES.includes(job_type) ? job_type : 'full_time';

    // company_id is taken from the recruiter's OWN profile — never trusted from
    // the request body, so a recruiter can't post jobs under another company.
    const { rows } = await pool.query('SELECT company_id FROM recruiters WHERE user_id=$1', [req.user.user_id]);
    const companyId = rows[0]?.company_id;
    if (!companyId) {
      return res.status(400).json({ error: 'Create your company profile before posting a job.' });
    }

    const job = await Job.create({
      company_id: companyId,
      posted_by: req.user.user_id,
      title: title.trim(),
      description: description.trim(),
      salary: salary?.trim() || null,
      location: location?.trim() || null,
      job_type: type,
      skills: cleanSkills(skills),
    });
    res.status(201).json(job);
  } catch (err) { next(err); }
}

async function deleteJob(req, res, next) {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.posted_by !== req.user.user_id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    await Job.delete(req.params.id);
    res.json({ message: 'Job deleted.' });
  } catch (err) { next(err); }
}

module.exports = { listJobs, getJob, createJob, deleteJob };
