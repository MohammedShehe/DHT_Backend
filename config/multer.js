const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/profile_pics',
  filename: (req, file, cb) => {
    const sanitizedFileName = `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`.replace(/\s+/g, '_');
    cb(null, sanitizedFileName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, JPG, WEBP are allowed'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;