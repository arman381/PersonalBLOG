// ============ GLOBAL VARIABLES ============
let currentPostId = null;

// ============ AUTH CHECK ============
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const navProfile = document.getElementById('nav-profile');
    const navLogout = document.getElementById('nav-logout');
    const authPostBox = document.getElementById('auth-post-box');
    
    if (token && user) {
        if (navLogin) navLogin.style.display = 'none';
        if (navRegister) navRegister.style.display = 'none';
        if (navProfile) navProfile.style.display = 'block';
        if (navLogout) navLogout.style.display = 'block';
        if (authPostBox) authPostBox.style.display = 'block';
        
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const userBadge = document.getElementById('user-badge');
        
        if (userAvatar) {
            userAvatar.src = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;
        }
        if (userName) userName.textContent = user.username;
        if (userBadge) {
            userBadge.textContent = user.role === 'admin' ? 'Admin' : 'Member';
            userBadge.style.display = 'inline-block';
        }
    } else {
        if (navLogin) navLogin.style.display = 'block';
        if (navRegister) navRegister.style.display = 'block';
        if (navProfile) navProfile.style.display = 'none';
        if (navLogout) navLogout.style.display = 'none';
        if (authPostBox) authPostBox.style.display = 'none';
    }
}

// ============ LOGOUT ============
document.addEventListener('click', function(e) {
    if (e.target.closest('#logout-btn')) {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
});

// ============ CREATE POST HTML ============
function createPostHTML(post) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const isAuthor = user && post.author?._id === user.id;
    const isAdmin = user && user.role === 'admin';
    const canDelete = isAuthor || isAdmin;
    
    const username = post.author?.username || 'Anonymous';
    const avatar = post.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    const date = new Date(post.createdAt).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const isLiked = post.isLiked || false;
    const likeFill = isLiked ? "'FILL' 1" : "'FILL' 0";
    const likeColor = isLiked ? '#8FB5B5' : '';
    
    return `
    <article class="post" data-post-id="${post._id}">
        <div class="post-avatar-container">
            <img src="${avatar}" class="post-avatar" alt="${username}"
                 onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${username}'">
            <div class="avatar-thread"></div>
        </div>
        <div class="post-main">
            <div class="post-header">
                <div class="post-author-info">
                    <span class="post-username">${username}</span>
                    ${post.author?.role === 'admin' ? '<span class="role-indicator">Admin</span>' : ''}
                    <span class="post-time">${date}</span>
                </div>
                ${canDelete ? `
                    <button class="post-delete-btn" onclick="deletePost('${post._id}')">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                ` : ''}
            </div>
            
            <div class="post-body">
                ${post.title ? `<h3 class="post-title">${post.title}</h3>` : ''}
                <p class="post-content">${post.content}</p>
            </div>
            
            <div class="post-stats">
                <span class="stat-item">
                    <span class="material-symbols-outlined">favorite</span>
                    <span class="stat-count like-count">${post.likeCount || 0}</span>
                </span>
                <span class="stat-item">
                    <span class="material-symbols-outlined">chat_bubble</span>
                    <span class="stat-count">${post.commentCount || 0}</span>
                </span>
            </div>
            
            <div class="post-actions">
                <button class="post-action-btn ${isLiked ? 'active' : ''}" onclick="likePost('${post._id}', this)">
                    <span class="material-symbols-outlined" style="font-variation-settings: ${likeFill}; color: ${likeColor};">favorite</span>
                    <span>Like</span>
                    <span class="action-count">${post.likeCount || 0}</span>
                </button>
                
                <button class="post-action-btn" onclick="openComments('${post._id}')">
                    <span class="material-symbols-outlined">chat_bubble</span>
                    <span>Comment</span>
                    <span class="action-count">${post.commentCount || 0}</span>
                </button>
            </div>
        </div>
    </article>
    `;
}

// ============ FETCH POSTS ============
async function fetchPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading posts...</p></div>';

    try {
        const response = await fetch('/api/posts');
        const data = await response.json();

        if (data.success && data.posts?.length > 0) {
            container.innerHTML = data.posts.map(post => createPostHTML(post)).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">post_add</span>
                    <h3>No posts yet</h3>
                    <p>Be the first to share something!</p>
                </div>
            `;
        }
    } catch (err) {
        console.error('Error loading posts:', err);
        container.innerHTML = '<div class="empty-state"><p>Failed to load posts</p></div>';
    }
}

// ============ LIKES ============
async function likePost(postId, button) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to like posts');
        window.location.href = '/login';
        return;
    }

    try {
        const response = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            const likeIcon = button.querySelector('.material-symbols-outlined');
            const actionCount = button.querySelector('.action-count');
            const statCount = document.querySelector(`[data-post-id="${postId}"] .stat-item:first-child .stat-count`);
            
            if (data.isLiked) {
                likeIcon.style.color = '#8FB5B5';
                likeIcon.style.fontVariationSettings = "'FILL' 1";
                button.classList.add('active');
            } else {
                likeIcon.style.color = '';
                likeIcon.style.fontVariationSettings = "'FILL' 0";
                button.classList.remove('active');
            }
            
            if (actionCount) actionCount.textContent = data.likeCount;
            if (statCount) statCount.textContent = data.likeCount;
        }
    } catch (err) {
        console.error('Like error:', err);
    }
}

// ============ COMMENTS - FULLY FIXED ============
async function openComments(postId) {
    currentPostId = postId;
    const modal = document.getElementById('comment-modal');
    const commentsContainer = document.getElementById('comments-container');
    
    if (!modal || !commentsContainer) return;
    
    modal.style.display = 'block';
    commentsContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading comments...</p></div>';
    
    try {
        const response = await fetch(`/api/posts/${postId}`);
        const data = await response.json();
        
        if (data.success) {
            displayComments(data.post.comments || []);
        } else {
            commentsContainer.innerHTML = '<div class="empty-state">Failed to load comments</div>';
        }
    } catch (err) {
        console.error('Error loading comments:', err);
        commentsContainer.innerHTML = '<div class="empty-state">Error loading comments</div>';
    }
}

function displayComments(comments) {
    const container = document.getElementById('comments-container');
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!comments || comments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">chat</span>
                <p>No comments yet</p>
                <small>Be the first to comment!</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = comments.map(comment => {
        const date = new Date(comment.createdAt).toLocaleString('en-US', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const isLiked = comment.isLiked || false;
        const likeFill = isLiked ? "'FILL' 1" : "'FILL' 0";
        const likeColor = isLiked ? '#8FB5B5' : '';
        
        return `
            <div class="comment-item">
                <img src="${comment.author?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=comment'}" 
                     class="comment-avatar" 
                     alt="${comment.author?.username || 'Anonymous'}"
                     onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=comment'">
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${comment.author?.username || 'Anonymous'}</span>
                        ${comment.author?.role === 'admin' ? '<span class="role-indicator">Admin</span>' : ''}
                        <span class="comment-time">${date}</span>
                    </div>
                    <p class="comment-text">${comment.content}</p>
                    <div class="comment-footer">
                        <button class="comment-like-btn ${isLiked ? 'active' : ''}" 
                                onclick="likeComment('${currentPostId}', '${comment._id}', this)">
                            <span class="material-symbols-outlined" style="font-variation-settings: ${likeFill}; color: ${likeColor};">favorite</span>
                            <span class="like-count">${comment.likes?.length || 0}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============ POST COMMENT ============
async function postComment() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to comment');
        window.location.href = '/login';
        return;
    }
    
    const commentText = document.getElementById('comment-text').value.trim();
    if (!commentText) {
        alert('Please write a comment');
        return;
    }
    
    try {
        const response = await fetch(`/api/posts/${currentPostId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content: commentText })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('comment-text').value = '';
            displayComments(data.comments);
            
            // Update comment count in the post
            const postElement = document.querySelector(`[data-post-id="${currentPostId}"]`);
            if (postElement) {
                const commentStat = postElement.querySelector('.stat-item:nth-child(2) .stat-count');
                const actionCount = postElement.querySelector('.post-action-btn:last-child .action-count');
                const count = data.comments.length;
                if (commentStat) commentStat.textContent = count;
                if (actionCount) actionCount.textContent = count;
            }
        }
    } catch (err) {
        console.error('Error posting comment:', err);
        alert('Error posting comment');
    }
}

// ============ LIKE COMMENT ============
async function likeComment(postId, commentId, button) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to like comments');
        return;
    }
    
    try {
        const response = await fetch(`/api/posts/${postId}/comments/${commentId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const icon = button.querySelector('.material-symbols-outlined');
            const count = button.querySelector('.like-count');
            
            if (data.isLiked) {
                icon.style.color = '#8FB5B5';
                icon.style.fontVariationSettings = "'FILL' 1";
                button.classList.add('active');
            } else {
                icon.style.color = '';
                icon.style.fontVariationSettings = "'FILL' 0";
                button.classList.remove('active');
            }
            
            if (count) count.textContent = data.likeCount;
        }
    } catch (err) {
        console.error('Error liking comment:', err);
    }
}

// ============ DELETE POST ============
async function deletePost(postId) {
    if (!confirm('Delete this post?')) return;
    
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Post deleted');
            fetchPosts();
        }
    } catch (err) {
        console.error('Delete error:', err);
    }
}

// ============ MODAL CLOSE ============
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('close-modal') || e.target.classList.contains('modal')) {
        const modal = document.getElementById('comment-modal');
        if (modal) {
            modal.style.display = 'none';
            const commentInput = document.getElementById('comment-text');
            if (commentInput) commentInput.value = '';
        }
    }
});

// ============ SUBMIT COMMENT ============
document.addEventListener('DOMContentLoaded', function() {
    const submitBtn = document.getElementById('submit-comment');
    if (submitBtn) {
        submitBtn.addEventListener('click', postComment);
    }
    
    const commentInput = document.getElementById('comment-text');
    if (commentInput) {
        commentInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                postComment();
            }
        });
    }
});

// ============ CREATE POST ============
document.addEventListener('submit', async function(e) {
    if (e.target.id === 'new-post-form') {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login to post');
            window.location.href = '/login';
            return;
        }
        
        const formData = {
            title: e.target.title.value,
            content: e.target.content.value
        };
        
        if (!formData.content) {
            alert('Please write something');
            return;
        }
        
        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                e.target.reset();
                fetchPosts();
            }
        } catch (err) {
            console.error('Error creating post:', err);
            alert('Server error');
        }
    }
});

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    fetchPosts();
});