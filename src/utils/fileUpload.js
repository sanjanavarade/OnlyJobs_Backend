const multer = require('multer');
const path = require('path');
const { randomBytes } = require('crypto');

// Map each accepted MIME type to the extension WE will save it as. The saved
// name never reuses the client's original extension, so a spoofed upload can't
// land an executable/renderable extension (e.g. .html, .svg) in /uploads.
const EXT_BY_MIME = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};
const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx']);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    const ext = EXT_BY_MIME[file.mimetype] || '';
    cb(null, `${randomBytes(16).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_BY_MIME[file.mimetype] || !ALLOWED_EXT.has(ext)) {
      return cb(new Error('Only PDF and DOCX files are allowed.'), false);
    }
    cb(null, true);
  },
});

module.exports = upload;
