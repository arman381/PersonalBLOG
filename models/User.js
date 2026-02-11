const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email format'],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false,
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },
    avatar: {
        type: String,
        default: function() {
            return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
        }
    },
    bio: {
        type: String,
        maxlength: [160, 'Bio cannot exceed 160 characters'],
        default: '🍞 Bread lover'
    },
    favoriteBread: {
        type: String,
        default: 'Sourdough'
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Виртуальное поле для количества постов
userSchema.virtual('postCount', {
    ref: 'Post',
    localField: '_id',
    foreignField: 'author',
    count: true
});

// УБИРАЕМ next() ИЗ ЭТОЙ ФУНКЦИИ!
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isAdmin = function() {
    return this.role === 'admin';
};

userSchema.methods.isModerator = function() {
    return this.role === 'moderator' || this.role === 'admin';
};

module.exports = mongoose.model('User', userSchema);