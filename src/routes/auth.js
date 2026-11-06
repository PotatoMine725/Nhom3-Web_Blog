const express = require('express');
const auth = require('../controllers/authController');
const { requireLogin, redirectIfLoggedIn } = require('../middlewares/auth');

const router = express.Router();

router.get('/register', redirectIfLoggedIn, auth.showRegister);
router.post('/register', redirectIfLoggedIn, auth.register);
router.get('/login', redirectIfLoggedIn, auth.showLogin);
router.post('/login', redirectIfLoggedIn, auth.login);
router.post('/logout', requireLogin, auth.logout);

module.exports = router;
