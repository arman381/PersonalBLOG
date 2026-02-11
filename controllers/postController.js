const Post = require('../models/Post');

const createPost = async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({ 
                success: false, 
                message: 'Заголовок и содержание обязательны' 
            });
        }

        const post = await Post.create({
            title,
            content,
            author: req.user.id
        });

        const populatedPost = await Post.findById(post._id).populate('author', 'username');

        res.status(201).json({
            success: true,
            post: populatedPost
        });
    } catch (err) {
        console.error('Create post error:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message || 'Ошибка сервера' 
        });
    }
};

const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('author', 'username');

        res.json({
            success: true,
            count: posts.length,
            posts
        });
    } catch (err) {
        console.error('Get posts error:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message || 'Ошибка сервера' 
        });
    }
};

const getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).populate('author', 'username');

        if (!post) {
            return res.status(404).json({ 
                success: false, 
                message: 'Пост не найден' 
            });
        }

        res.json({
            success: true,
            post
        });
    } catch (err) {
        console.error('Get post error:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message || 'Ошибка сервера' 
        });
    }
};

const updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ 
                success: false, 
                message: 'Пост не найден' 
            });
        }

        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false, 
                message: 'Вы можете редактировать только свои посты' 
            });
        }

        const updatedPost = await Post.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: Date.now() },
            { new: true, runValidators: true }
        ).populate('author', 'username');

        res.json({
            success: true,
            post: updatedPost
        });
    } catch (err) {
        console.error('Update post error:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message || 'Ошибка сервера' 
        });
    }
};

const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ 
                success: false, 
                message: 'Пост не найден' 
            });
        }

        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ 
                success: false, 
                message: 'Вы можете удалять только свои посты' 
            });
        }

        await post.deleteOne();

        res.json({
            success: true,
            message: 'Пост успешно удален'
        });
    } catch (err) {
        console.error('Delete post error:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message || 'Ошибка сервера' 
        });
    }
};

module.exports = {
    createPost,
    getAllPosts,
    getPostById,
    updatePost,
    deletePost
};