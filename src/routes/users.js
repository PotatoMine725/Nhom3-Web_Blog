const express = require('express');
const users = require('../controllers/userController');
const { requireLogin } = require('../middlewares/auth');

const router = express.Router();

router.get('/profile', requireLogin, users.showProfile);
router.post('/profile', requireLogin, users.updateProfile);

module.exports = router;
