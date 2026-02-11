const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user) {
    window.location.href = '/login';
}

// ============ LOAD PROFILE ============
async function loadProfile() {
    const container = document.getElementById('profile-container');
    
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const user = data.user;
            
            const joinDate = user.createdAt ? new Date(user.createdAt) : new Date();
            const formattedDate = joinDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short' 
            });
            
            container.innerHTML = `
                <div class="profile-card">
                    <div class="profile-header">
                        <div class="profile-avatar-container">
                            <img src="${user.avatar}" class="profile-avatar" alt="${user.username}" 
                                 onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}'">
                        </div>
                        <div class="profile-info">
                            <div class="profile-name-section">
                                <h1>${user.username}</h1>
                                ${user.role === 'admin' ? '<span class="role-badge admin">Admin</span>' : ''}
                            </div>
                            <p class="profile-bio">${user.bio || 'No bio yet'}</p>
                            <div class="profile-meta">
                                <div class="profile-stat">
                                    <span class="stat-value" id="post-count">0</span>
                                    <span class="stat-label">posts</span>
                                </div>
                                <div class="profile-stat">
                                    <span class="stat-value">${formattedDate}</span>
                                    <span class="stat-label">joined</span>
                                </div>
                            </div>
                            <button class="edit-profile-btn" onclick="openEditProfile()">
                                <span class="material-symbols-outlined">edit</span>
                                Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            loadUserPosts(user.id);
        }
    } catch (err) {
        console.error('Error loading profile:', err);
        container.innerHTML = '<div class="empty-state"><p>Failed to load profile</p></div>';
    }
}

// ============ LOAD USER POSTS ============
async function loadUserPosts(userId) {
    const container = document.getElementById('user-posts-container');
    
    try {
        const response = await fetch('/api/posts');
        const data = await response.json();
        
        if (data.success) {
            const userPosts = data.posts.filter(post => post.author?._id === userId);
            const postCount = document.getElementById('post-count');
            if (postCount) postCount.textContent = userPosts.length;
            
            if (userPosts.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="material-symbols-outlined">edit_note</span>
                        <p>No posts yet</p>
                        <a href="/" class="btn-primary" style="margin-top: 16px; display: inline-block;">Create your first post</a>
                    </div>
                `;
            } else {
                container.innerHTML = userPosts.map(post => createPostHTML(post)).join('');
            }
        }
    } catch (err) {
        console.error('Error loading user posts:', err);
        container.innerHTML = '<div class="empty-state"><p>Failed to load posts</p></div>';
    }
}

// ============ CREATE POST HTML - FIXED ============
function createPostHTML(post) {
    const date = new Date(post.createdAt).toLocaleString('en-US', {
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    });
    
    const isLiked = post.isLiked || false;
    const likeFill = isLiked ? "'FILL' 1" : "'FILL' 0";
    const likeColor = isLiked ? '#77A8A8' : '';
    
    return `
    <article class="post" data-post-id="${post._id}">
        <div class="post-avatar-container">
            <img src="${post.author?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + post.author?.username}" 
                 class="post-avatar" 
                 alt="${post.author?.username || 'Anonymous'}"
                 onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author?.username || 'user'}'">
            <div class="avatar-thread"></div>
        </div>
        <div class="post-main">
            <div class="post-header">
                <div class="post-author-info">
                    <span class="post-username">${post.author?.username || 'Anonymous'}</span>
                    <span class="post-time">${date}</span>
                </div>
                <button class="post-delete-btn" onclick="deletePost('${post._id}')">
                    <span class="material-symbols-outlined">delete</span>
                </button>
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

// ============ LIKE POST ============
async function likePost(postId, button) {
    try {
        const response = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const likeIcon = button.querySelector('.material-symbols-outlined');
            const actionCount = button.querySelector('.action-count');
            const statCount = document.querySelector(`[data-post-id="${postId}"] .stat-item:first-child .stat-count`);
            
            if (data.isLiked) {
                likeIcon.style.color = '#77A8A8';
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

// ============ DELETE POST ============
async function deletePost(postId) {
    if (!confirm('Delete this post?')) return;
    
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Post deleted');
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            loadUserPosts(user.id);
        }
    } catch (err) {
        console.error('Delete error:', err);
    }
}

// ============ OPEN COMMENTS ============
function openComments(postId) {
    window.location.href = `/?post=${postId}#comments`;
}

// ============ EDIT PROFILE ============
function openEditProfile() {
    const modal = document.getElementById('edit-profile-modal');
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (currentUser) {
        document.getElementById('avatar-url').value = currentUser.avatar || '';
        document.getElementById('bio').value = currentUser.bio || '';
        document.getElementById('bio-counter').textContent = `${currentUser.bio?.length || 0}/160`;
    }
    
    modal.style.display = 'block';
}

// ============ REMOVE AVATAR ============
document.addEventListener('click', function(e) {
    if (e.target.id === 'remove-avatar-btn') {
        document.getElementById('avatar-url').value = '';
    }
});

// ============ EDIT PROFILE SUBMIT ============
document.addEventListener('submit', async function(e) {
    if (e.target.id === 'edit-profile-form') {
        e.preventDefault();
        
        let avatarUrl = document.getElementById('avatar-url').value.trim();
        const bio = document.getElementById('bio').value.trim();
        
        if (!avatarUrl) {
            const username = JSON.parse(localStorage.getItem('user') || 'null')?.username || 'user';
            avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
        }
        
        try {
            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ avatar: avatarUrl, bio })
            });
            
            const data = await response.json();
            
            if (data.success) {
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                user.avatar = data.user.avatar;
                user.bio = data.user.bio;
                localStorage.setItem('user', JSON.stringify(user));
                
                alert('Profile updated successfully!');
                document.getElementById('edit-profile-modal').style.display = 'none';
                loadProfile();
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            alert('Failed to update profile');
        }
    }
});

// ============ CANCEL EDIT ============
document.addEventListener('click', function(e) {
    if (e.target.id === 'cancel-edit-btn') {
        document.getElementById('edit-profile-modal').style.display = 'none';
    }
});

// ============ BIO COUNTER ============
document.addEventListener('input', function(e) {
    if (e.target.id === 'bio') {
        const counter = document.getElementById('bio-counter');
        if (counter) {
            counter.textContent = `${e.target.value.length}/160`;
        }
    }
});

// ============ LOGOUT ============
document.addEventListener('click', function(e) {
    if (e.target.closest('#logout-btn')) {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
});

// ============ MODAL CLOSE ============
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('close-modal') || e.target.classList.contains('modal')) {
        e.target.closest('.modal').style.display = 'none';
    }
});

// ============ INIT ============
document.addEventListener('DOMContentLoaded', loadProfile);