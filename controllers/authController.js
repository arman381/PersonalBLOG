// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {  // НЕТ next!
    try {
        const { username, email, password } = req.body;
        
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'Пользователь уже существует' });
        }

        const user = await User.create({ username, email, password });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        
        res.json({
            success: true,
            token,
            user: { id: user._id, username, email }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

const login = async (req, res) => {  // НЕТ next!
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        
        res.json({
            success: true,
            token,
            user: { id: user._id, username: user.username, email }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

module.exports = { register, login };