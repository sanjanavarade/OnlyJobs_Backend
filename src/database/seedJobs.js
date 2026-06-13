require('dotenv').config();
const pool = require('../config/db');

const RECRUITER_ID = '59b469f7-61ac-4931-b5e0-0527d74b3e64';

const jobsData = [
  {
    title: "Senior Full-Stack Developer",
    description: "Looking for an experienced full-stack developer with expertise in Node.js and React. Must have 5+ years of experience.",
    salary: "$120,000 - $160,000",
    location: "San Francisco, CA",
    job_type: "full_time",
    skills: ["Node.js", "React", "PostgreSQL", "Docker", "AWS"]
  },
  {
    title: "Product Manager",
    description: "Seeking a strategic product manager to drive product vision and roadmap. Experience with B2B SaaS is a plus.",
    salary: "$100,000 - $140,000",
    location: "New York, NY",
    job_type: "full_time",
    skills: ["Product Strategy", "Agile", "Analytics", "User Research", "Leadership"]
  },
  {
    title: "UI/UX Designer",
    description: "Creative designer needed to create beautiful and intuitive user interfaces. Experience with Figma and design systems required.",
    salary: "$90,000 - $130,000",
    location: "Remote",
    job_type: "full_time",
    skills: ["Figma", "UI Design", "UX Research", "Prototyping", "CSS"]
  },
  {
    title: "Backend Engineer - Python",
    description: "Python backend specialist wanted to build scalable microservices. Experience with FastAPI and PostgreSQL essential.",
    salary: "$110,000 - $150,000",
    location: "Austin, TX",
    job_type: "full_time",
    skills: ["Python", "FastAPI", "PostgreSQL", "Redis", "Kubernetes"]
  },
  {
    title: "DevOps Engineer",
    description: "Infrastructure automation expert needed. CI/CD pipeline expertise and cloud platform experience required.",
    salary: "$115,000 - $155,000",
    location: "Seattle, WA",
    job_type: "full_time",
    skills: ["Kubernetes", "Docker", "Jenkins", "AWS", "Terraform"]
  },
  {
    title: "Data Scientist",
    description: "Build machine learning models to drive business insights. Python and SQL expertise needed.",
    salary: "$105,000 - $145,000",
    location: "Boston, MA",
    job_type: "full_time",
    skills: ["Python", "Machine Learning", "SQL", "TensorFlow", "Tableau"]
  },
  {
    title: "Frontend Developer Intern",
    description: "Internship opportunity for eager React developers. Great for building portfolio and gaining experience.",
    salary: "$25/hour - $30/hour",
    location: "San Diego, CA",
    job_type: "internship",
    skills: ["React", "JavaScript", "CSS", "Git", "REST APIs"]
  },
  {
    title: "QA Engineer",
    description: "Quality assurance specialist for comprehensive testing. Selenium and automated testing experience required.",
    salary: "$85,000 - $120,000",
    location: "Chicago, IL",
    job_type: "full_time",
    skills: ["Selenium", "QA Automation", "Test Planning", "JIRA", "Python"]
  },
  {
    title: "Technical Writer",
    description: "Documentation specialist needed for API and software documentation. Strong writing skills essential.",
    salary: "$70,000 - $100,000",
    location: "Remote",
    job_type: "full_time",
    skills: ["Technical Writing", "API Documentation", "Markdown", "Confluence", "UX Writing"]
  },
  {
    title: "Blockchain Developer Contract",
    description: "3-month contract to develop smart contracts and decentralized applications. Solidity expertise required.",
    salary: "$150/hour - $200/hour",
    location: "Remote",
    job_type: "contract",
    skills: ["Solidity", "Web3", "Smart Contracts", "Ethereum", "JavaScript"]
  }
];

async function seedJobs() {
  const client = await pool.connect();
  try {
    console.log('Starting job seeding...');
    
    // Get a company_id from the database (you can modify this to create a specific company if needed)
    const companyResult = await client.query('SELECT company_id FROM companies LIMIT 1');
    
    if (!companyResult.rows.length) {
      console.log('No companies found. Creating a default company...');
      const newCompanyResult = await client.query(
        `INSERT INTO companies (company_name, website, description, verified)
         VALUES ($1, $2, $3, $4) RETURNING company_id`,
        ['Tech Solutions Inc', 'https://techsolutions.com', 'A leading tech company', true]
      );
      var company_id = newCompanyResult.rows[0].company_id;
    } else {
      var company_id = companyResult.rows[0].company_id;
    }
    
    console.log(`Using company_id: ${company_id}`);
    console.log(`Inserting ${jobsData.length} jobs for recruiter: ${RECRUITER_ID}`);
    
    // Insert jobs
    let insertedCount = 0;
    for (const job of jobsData) {
      try {
        await client.query(
          `INSERT INTO jobs (company_id, posted_by, title, description, salary, location, job_type, skills, approved)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
          [
            company_id,
            RECRUITER_ID,
            job.title,
            job.description,
            job.salary,
            job.location,
            job.job_type,
            job.skills
          ]
        );
        insertedCount++;
        console.log(`✓ Inserted: ${job.title}`);
      } catch (err) {
        console.error(`✗ Failed to insert ${job.title}:`, err.message);
      }
    }
    
    console.log(`\n✓ Successfully inserted ${insertedCount}/${jobsData.length} jobs`);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedJobs();
