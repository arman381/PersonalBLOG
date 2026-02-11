const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email')?.value.trim();
    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value;

    if (!email || !username || !password) {
      alert('Заполните все поля!');
      return;
    }

    if (password.length < 6) {
      alert('Пароль должен быть минимум 6 символов');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password })
      });

      if (response.status >= 200 && response.status < 300) {
        let result;
        try {
          result = await response.json();
        } catch {
          result = { token: 'no-token' }; 
        }

        if (result.token) {
          localStorage.setItem('token', result.token);
        }

        alert('Регистрация успешна! Теперь войдите.');
        window.location.href = '/login';
        return;
      }

      let errorMessage = 'Ошибка регистрации';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = 'Сервер вернул неожиданный ответ';
      }

      alert(errorMessage);
    } catch (err) {
      console.error('Ошибка fetch при регистрации:', err);

      alert('Не удалось зарегистрироваться. Проверьте интернет или перезапустите сервер (npm run dev).');
    }
  });
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;

    if (!email || !password) {
      alert('Заполните email и пароль!');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.status >= 200 && response.status < 300) {
        const result = await response.json();
        localStorage.setItem('token', result.token);
        alert('Вход успешен! Добро пожаловать!');
        window.location.href = '/';
        return;
      }

      let errorMessage = 'Неверный email или пароль';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {}
      alert(errorMessage);
    } catch (err) {
      console.error('Ошибка входа:', err);
      alert('Не удалось войти. Проверьте интернет или сервер.');
    }
  });
}