// routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
// const { requireRole } = require('../middleware/role'); // ЗАКОММЕНТИРУЙТЕ, ЕСЛИ ЕСТЬ

router.post('/register', register);
router.post('/login', login);

module.exports = router;