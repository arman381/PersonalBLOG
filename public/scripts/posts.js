// Загрузка всех постов на главной странице
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('posts-container');
  if (!container) return; // если страницы нет — ничего не делаем

  try {
    const response = await fetch('/api/posts');
    const data = await response.json();

    if (!response.ok || !data.success) {
      container.innerHTML = '<p style="color:red;">Ошибка загрузки постов</p>';
      return;
    }

    if (data.posts.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#666;">Пока нет постов. Будьте первым!</p>';
      return;
    }

    container.innerHTML = data.posts.map(post => `
      <div class="post-card" style="border:1px solid #ddd; padding:20px; margin:15px 0; border-radius:8px; background:#fff;">
        <h2 style="margin-top:0;">${post.title}</h2>
        <p>${post.content}</p>
        <small style="color:#666;">
          Автор: <strong>${post.author?.username || 'Аноним'}</strong> • 
          ${new Date(post.createdAt).toLocaleString('ru-RU')}
        </small>
      </div>
    `).join('');
  } catch (err) {
    console.error('Ошибка загрузки постов:', err);
    container.innerHTML = '<p style="color:red;">Не удалось загрузить посты</p>';
  }
});