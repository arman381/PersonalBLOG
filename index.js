require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');
const User = require('./models/User');
const Post = require('./models/Post');
const jwt = require('jsonwebtoken');

connectDB();

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// ============ ФУНКЦИИ ПОМОЩНИКИ ============
const verifyToken = (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('Нет токена');
    
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        console.error('Token error:', err.message);
        if (err.message === 'invalid signature') {
            throw new Error('Сессия устарела. Пожалуйста, войдите заново.');
        }
        throw new Error('Неверный токен');
    }
};

const checkAdmin = async (userId) => {
    const user = await User.findById(userId);
    return user && (user.role === 'admin' || user.role === 'moderator');
};

// ============ ОБНОВЛЕНИЕ СТАРЫХ ПОЛЬЗОВАТЕЛЕЙ ============
const updateOldUsers = async () => {
    try {
        console.log('🔄 Проверка старых пользователей...');
        
        const usersToUpdate = await User.find({
            $or: [
                { role: { $exists: false } },
                { avatar: { $exists: false } },
                { bio: { $exists: false } },
                { favoriteBread: { $exists: false } }
            ]
        });
        
        let updatedCount = 0;
        
        for (const user of usersToUpdate) {
            user.role = user.role || 'user';
            user.avatar = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
            user.bio = user.bio || '🍞 Bread lover';
            user.favoriteBread = user.favoriteBread || 'Sourdough';
            user.lastActive = user.lastActive || Date.now();
            
            await user.save();
            updatedCount++;
            console.log(`✅ Обновлен пользователь: ${user.username}`);
        }
        
        if (updatedCount > 0) {
            console.log(`🎉 Обновлено ${updatedCount} старых пользователей`);
        } else {
            console.log('✨ Все пользователи уже обновлены');
        }
    } catch (err) {
        console.log('⚠️ Ошибка обновления пользователей:', err.message);
    }
};

// ============ СОЗДАНИЕ АДМИНА ============
const createAdmin = async () => {
    try {
        const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
        
        if (!adminExists) {
            await User.create({
                username: process.env.ADMIN_USERNAME,
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD,
                role: 'admin',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin&backgroundColor=ffdfbf',
                bio: '🍞 Главный пекарь Bhreads',
                favoriteBread: 'Sourdough'
            });
            console.log('✅ Админ создан!');
            console.log('📧 Email:', process.env.ADMIN_EMAIL);
            console.log('🔑 Пароль:', process.env.ADMIN_PASSWORD);
        } else {
            // Обновляем роль до админа если еще не админ
            if (adminExists.role !== 'admin') {
                adminExists.role = 'admin';
                await adminExists.save();
                console.log('👑 Пользователь обновлен до админа:', adminExists.email);
            } else {
                console.log('👑 Админ уже существует:', adminExists.email);
            }
        }
    } catch (err) {
        console.log('⚠️ Ошибка создания админа:', err.message);
    }
};

// ============ ИНИЦИАЛИЗАЦИЯ ============
const initializeApp = async () => {
    await updateOldUsers();
    await createAdmin();
    console.log('🚀 Bhreads готов к работе!');
};

initializeApp();

// ============ AUTH ROUTES ============
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        const exists = await User.findOne({ $or: [{ email }, { username }] });
        if (exists) {
            return res.status(400).json({ 
                success: false,
                message: 'Пользователь с таким email или username уже существует' 
            });
        }

        const user = new User({ 
            username, 
            email, 
            password,
            role: 'user',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
            bio: '🍞 Bread lover',
            favoriteBread: 'Sourdough'
        });
        
        await user.save();
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        
        res.json({ 
            success: true, 
            token, 
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                bio: user.bio,
                favoriteBread: user.favoriteBread
            }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Неверный email или пароль' 
            });
        }

        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Неверный email или пароль' 
            });
        }

        // Обновляем поля если их нет
        if (!user.role) user.role = 'user';
        if (!user.avatar) {
            user.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
        }
        if (!user.bio) user.bio = '🍞 Bread lover';
        if (!user.favoriteBread) user.favoriteBread = 'Sourdough';
        
        user.lastActive = Date.now();
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        
        res.json({ 
            success: true, 
            token, 
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                bio: user.bio,
                favoriteBread: user.favoriteBread
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
});

app.get('/api/auth/me', async (req, res) => {
    try {
        const decoded = verifyToken(req);
        const user = await User.findById(decoded.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'Пользователь не найден' 
            });
        }
        
        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                bio: user.bio,
                favoriteBread: user.favoriteBread
            }
        });
    } catch (err) {
        res.status(401).json({ 
            success: false,
            message: err.message 
        });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Выход выполнен' 
    });
});

app.get('/api/auth/role', async (req, res) => {
    try {
        const decoded = verifyToken(req);
        const user = await User.findById(decoded.id);
        
        res.json({
            success: true,
            role: user.role,
            isAdmin: user.role === 'admin',
            isModerator: user.role === 'moderator' || user.role === 'admin'
        });
    } catch (err) {
        res.status(401).json({ 
            success: false,
            message: err.message 
        });
    }
});

// ============ POST ROUTES ============
app.get('/api/posts', async (req, res) => {
    try {
        const { page = 1, limit = 10, breadType, tag } = req.query;
        const query = {};
        
        if (breadType) query.breadType = breadType;
        if (tag) query.tags = tag;

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('author', 'username avatar role')
            .populate('comments.author', 'username avatar')
            .populate('originalPost', 'title content author')
            .lean();

        const total = await Post.countDocuments(query);

        // Добавляем информацию о том, лайкнул ли текущий пользователь
        try {
            const decoded = verifyToken(req);
            const userId = decoded.id;
            
            posts.forEach(post => {
                post.isLiked = post.likes?.some(id => id?.toString() === userId) || false;
                post.isReposted = post.reposts?.some(id => id?.toString() === userId) || false;
                post.likeCount = post.likes?.length || 0;
                post.commentCount = post.comments?.length || 0;
                post.repostCount = post.reposts?.length || 0;
                
                post.comments?.forEach(comment => {
                    comment.isLiked = comment.likes?.some(id => id?.toString() === userId) || false;
                });
            });
        } catch (err) {
            // Пользователь не авторизован
            posts.forEach(post => {
                post.isLiked = false;
                post.isReposted = false;
                post.likeCount = post.likes?.length || 0;
                post.commentCount = post.comments?.length || 0;
                post.repostCount = post.reposts?.length || 0;
            });
        }

        res.json({
            success: true,
            posts,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (err) {
        console.error('Get posts error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
});

app.post('/api/posts', async (req, res) => {
    try {
        const decoded = verifyToken(req);
        const { title, content, breadType, imageUrl, tags } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ 
                success: false,
                message: 'Заголовок и контент обязательны' 
            });
        }

        const post = new Post({
            title,
            content,
            author: decoded.id,
            breadType: breadType || 'other',
            imageUrl: imageUrl || '',
            tags: tags || []
        });
        
        await post.save();
        
        const populatedPost = await Post.findById(post._id)
            .populate('author', 'username avatar role');
        
        res.status(201).json({ 
            success: true, 
            post: populatedPost 
        });
    } catch (err) {
        console.error('Create post error:', err);
        res.status(401).json({ 
            success: false,
            message: err.message 
        });
    }
});

// ============ ЛАЙКИ ============
app.post('/api/posts/:id/like', async (req, res) => {
    try {
        const decoded = verifyToken(req);
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ 
                success: false,
                message: 'Пост не найден' 
            });
        }

        const userId = decoded.id;
        const likeIndex = post.likes.findIndex(id => id?.toString() === userId);
        
        if (likeIndex === -1) {
            post.likes.push(userId);
        } else {
            post.likes.splice(likeIndex, 1);
        }
        
        post.likeCount = post.likes.length;
        await post.save();
        
        res.json({ 
            success: true, 
            likeCount: post.likeCount,
            isLiked: likeIndex === -1
        });
    } catch (err) {
        console.error('Like error:', err);
        res.status(401).json({ 
            success: false,
            message: err.message 
        });
    }
});

// ============ КОММЕНТАРИИ ============
app.post('/api/posts/:id/comments', async (req, res) => {
    try {
        const decoded = verifyToken(req);
        const { content } = req.body;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Комментарий не может быть пустым' 
            });
        }

        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ 
                success: false,
                message: 'Пост не найден' 
            });
        }

        post.comments.push({
            author: decoded.id,
            content: content.trim(),
            likes: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        
        post.commentCount = post.comments.length;
        await post.save();
        
        const updatedPost = await Post.findById(req.params.id)
            .populate('comments.author', 'username avatar role');
        
        res.json({ 
            success: true, 
            comments: updatedPost.comments 
        });
    } catch (err) {
        console.error('Comment error:', err);
        res.status(401).json({ 
            success: false,
            message: err.message 
        });
    }
});

// ============ ЛАЙКИ КОММЕНТАРИЕВ ============
app.post('/api/posts/:postId/comments/:commentId/like', async (req, res) => {
    try {
        const decoded = verifyToken(req);
        const post = await Post.findById(req.params.postId);
        
        if (!post) {
            return res.status(404).json({ 
                success: false,
                message: 'Пост не найден' 
            });
        }

        const comment = post.comments.id(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ 
                success: false,
                message: 'Комментарий не найден' 
            });
        }

        const userId = decoded.id;
        const likeIndex = comment.likes.findIndex(id => id?.toString() === userId);
        
        if (likeIndex === -1) {
            comment.likes.push(userId);
        } else {
            comment.likes.splice(likeIndex, 1);
        }
        
        await post.save();
        
        res.json({ 
            success: true, 
            likeCount: comment.likes.length,
            isLiked: likeIndex === -1
        });
    } catch (err) {
        console.error('Comment like error:', err);
        res.status(401).json({ 
            success: false,
            message: err.message 
        });
    }
});

// ============ РЕПОСТЫ ============
app.post('/api/posts/:id/repost', async (req, res) => {
    try {
        const decoded = verifyToken(req);
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ 
                success: false,
                message: 'Пост не найден' 
            });
        }

        // Проверяем, репостил ли уже
        if (post.reposts.some(id => id?.toString() === decoded.id)) {
            return res.status(400).json({ 
                success: false,
                message: 'Вы уже репостнули этот пост' 
            });
        }

        // Создаем репост
        const repost = new Post({
            title: `Репост: ${post.title}`,
            content: post.content,
            author: decoded.id,
            isRepost: true,
            originalPost: post._id,
            breadType: post.breadType,
            imageUrl: post.imageUrl,
            tags: post.tags
        });
        
        await repost.save();
        
        // Добавляем репост в оригинальный пост
        post.reposts.push(decoded.id);
        post.repostCount = post.reposts.length;
        await post.save();
        
        const populatedRepost = await Post.findById(repost._id)
            .populate('author', 'username avatar role');
        
        res.json({ 
            success: true, 
            repost: populatedRepost 
        });
    } catch (err) {
        console.error('Repost error:', err);
        res.status(401).json({ 
            success: false,
            message: err.message 
        });
    }
});

// ============ УДАЛЕНИЕ ПОСТОВ ============
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const decoded = verifyToken(req);
        const post = await Post.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ 
                success: false,
                message: 'Пост не найден' 
            });
        }

        const isAdmin = await checkAdmin(decoded.id);
        
        if (!isAdmin && post.author.toString() !== decoded.id) {
            return res.status(403).json({ 
                success: false,
                message: 'Нет прав для удаления этого поста' 
            });
        }

        await post.deleteOne();
        
        res.json({ 
            success: true, 
            message: 'Пост удален' 
        });
    } catch (err) {
        res.status(401).json({ 
            success: false,
            message: err.message 
        });
    }
});

// ============ ОБНОВЛЕНИЕ ПРОФИЛЯ ============
app.put('/api/users/profile', async (req, res) => {
    try {
        const decoded = verifyToken(req);
        const { avatar, bio, favoriteBread } = req.body;
        
        const user = await User.findById(decoded.id);
        
        if (avatar) user.avatar = avatar;
        if (bio) user.bio = bio;
        if (favoriteBread) user.favoriteBread = favoriteBread;
        
        await user.save();
        
        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar,
                bio: user.bio,
                favoriteBread: user.favoriteBread,
                role: user.role
            }
        });
    } catch (err) {
        res.status(401).json({ 
            success: false,
            message: err.message 
        });
    }
});

// ============ ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЯ ПО ID ============
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'Пользователь не найден' 
            });
        }

        const postCount = await Post.countDocuments({ author: user._id });
        
        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar,
                bio: user.bio,
                favoriteBread: user.favoriteBread,
                role: user.role,
                createdAt: user.createdAt,
                postCount
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
});

// ============ ВРЕМЕННЫЙ МАРШРУТ ДЛЯ СДЕЛАТЬ АДМИНОМ ============
app.post('/api/auth/make-admin', async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'Пользователь не найден' 
            });
        }
        
        user.role = 'admin';
        await user.save();
        
        res.json({ 
            success: true, 
            message: `Пользователь ${user.username} теперь админ!`,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
});

// ============ HTML PAGES ============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/profile/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// ============ ЗАПУСК ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🍞 Bhreads server running on http://localhost:${PORT}`);
    console.log(`🥖 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`👑 Админ: admin@bhrefds.com / Admin123!`);
});

module.exports = app;