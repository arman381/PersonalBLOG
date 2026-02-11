// routes/posts.js
const express = require('express');
const router = express.Router();
const {
    createPost,
    getAllPosts,
    getPostById,
    updatePost,
    deletePost,
} = require('../controllers/postController');
const authMiddleware = require('../middleware/authMiddleware');
// const { requireRole } = require('../middleware/role'); // ВРЕМЕННО ЗАКОММЕНТИРУЙТЕ ЭТУ СТРОКУ

// Публичные маршруты
router.get('/', getAllPosts);

// Защищенные маршруты - только authMiddleware, БЕЗ requireRole
router.post('/', authMiddleware, createPost);
router.get('/:id', authMiddleware, getPostById);
router.put('/:id', authMiddleware, updatePost);
router.delete('/:id', authMiddleware, deletePost);

module.exports = router;