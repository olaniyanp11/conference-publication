const multer = require('multer');
const path = require('path');

// Storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'cover') {
      cb(null, 'uploads/covers/');
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'pdf') {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Only PDF or DOCX files are allowed for paper uploads'));
  }

  if (file.fieldname === 'cover') {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    return cb(new Error('Only image files are allowed for cover uploads'));
  }

  cb(new Error('Invalid file field'));
};

module.exports = multer({ storage, fileFilter });
