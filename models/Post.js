const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'Comment content is required'],
        maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        minlength: [5, 'Title must be at least 5 characters long'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    content: {
        type: String,
        required: [true, 'Content is required'],
        maxlength: [5000, 'Content cannot exceed 5000 characters']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    likeCount: {
        type: Number,
        default: 0
    },
    comments: [commentSchema],
    commentCount: {
        type: Number,
        default: 0
    },
    reposts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    repostCount: {
        type: Number,
        default: 0
    },
    isRepost: {
        type: Boolean,
        default: false
    },
    originalPost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    breadType: {
        type: String,
        enum: ['sourdough', 'baguette', 'croissant', 'brioche', 'ciabatta', 'rye', 'other'],
        default: 'other'
    },
    imageUrl: {
        type: String,
        default: ''
    },
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Индексы для быстрого поиска
postSchema.index({ tags: 1 });
postSchema.index({ breadType: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });

// УБИРАЕМ next() ИЗ ЭТОЙ ФУНКЦИИ!
postSchema.pre('save', function() {
    this.updatedAt = Date.now();
    if (this.comments) {
        this.commentCount = this.comments.length;
    }
    this.likeCount = this.likes.length;
    this.repostCount = this.reposts.length;
});

// УБИРАЕМ next() ИЗ ЭТОЙ ФУНКЦИИ!
postSchema.pre('findOneAndUpdate', function() {
    this._update.updatedAt = Date.now();
});

postSchema.methods.toggleLike = function(userId) {
    const index = this.likes.indexOf(userId);
    if (index === -1) {
        this.likes.push(userId);
    } else {
        this.likes.splice(index, 1);
    }
    this.likeCount = this.likes.length;
    return this.save();
};

postSchema.methods.addComment = function(userId, content) {
    this.comments.push({
        author: userId,
        content
    });
    this.commentCount = this.comments.length;
    return this.save();
};

postSchema.methods.repost = function(userId) {
    this.reposts.push(userId);
    this.repostCount = this.reposts.length;
    return this.save();
};

module.exports = mongoose.model('Post', postSchema);