const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/profile_pics',
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
  cb(null, allowed.includes(file.mimetype));
};

module.exports = multer({ storage, fileFilter });
