const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const AccountController = require('../controllers/accountController');

router.post('/logout', auth, AccountController.logout);

// 🔥 Account deletion with email confirmation
router.post('/delete/request', auth, AccountController.requestDelete);
router.post('/delete/confirm', auth, AccountController.confirmDelete);

module.exports = router;
