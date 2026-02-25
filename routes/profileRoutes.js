const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const upload = require('../config/multer');
const ProfileController = require('../controllers/profileController');

router.get('/', auth, ProfileController.getProfile);
router.put('/name', auth, ProfileController.updateName);
router.post('/email/request', auth, ProfileController.requestEmailChange);
router.post('/email/confirm', auth, ProfileController.confirmEmailChange);
router.post('/profile-pic', auth, upload.single('image'), ProfileController.uploadProfilePic);
router.put('/password', auth, ProfileController.changePassword);
router.get('/has-password', auth, ProfileController.hasPassword);
router.post('/setup-password', auth, ProfileController.setupPassword);

module.exports = router;