const Job = require('../models/Job');

async function listJobs(req, res, next) {
  try {
    const jobs = await Job.findAll(true);
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
    const { company_id, title, description, salary, location, job_type, skills } = req.body;
    if (!title || !description || !company_id) {
      return res.status(400).json({ error: 'title, description and company_id are required.' });
    }
    const job = await Job.create({ company_id, posted_by: req.user.user_id, title, description, salary, location, job_type, skills });
    res.status(201).json(job);
  } catch (err) { next(err); }
}

async function deleteJob(req, res, next) {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (req.user.role === 'recruiter' && job.posted_by !== req.user.user_id) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    await Job.delete(req.params.id);
    res.json({ message: 'Job deleted.' });
  } catch (err) { next(err); }
}

module.exports = { listJobs, getJob, createJob, deleteJob };
