const { createHash } = require('crypto');

function generateHiringHash(application) {
  const data = `${application.application_id}${application.job_id}${application.seeker_id}${application.updated_at}`;
  return createHash('sha256').update(data).digest('hex');
}

module.exports = { generateHiringHash };
