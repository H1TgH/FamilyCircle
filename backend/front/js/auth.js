window.authHeader = null;

function isAuthenticated() {
    return !!localStorage.getItem('access_token');
}

function getTokenPayload() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

function isRelative() {
    const payload = getTokenPayload();
    return payload?.role === 'relative';
}

function isVolunteer() {
    const payload = getTokenPayload();
    return payload?.role === 'volunteer';
}

function getUserRole() {
    return getTokenPayload()?.role ?? null;
}

function showLoggedInSection() {
    const loginSection = document.getElementById('loginSection');
    const loggedInSection = document.getElementById('loggedInSection');
    if (loginSection && loggedInSection) {
        loginSection.style.display = 'none';
        loggedInSection.style.display = 'block';
    }
}

function showLoginSection() {
    const loginSection = document.getElementById('loginSection');
    const loggedInSection = document.getElementById('loggedInSection');
    if (loginSection && loggedInSection) {
        loginSection.style.display = 'block';
        loggedInSection.style.display = 'none';
    }
}

function setupLoginForm() {
    const loginBtn = document.getElementById('loginBtn');
    const loginForm = document.getElementById('loginForm');

    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            loginBtn?.click();
        });
    }
}

function setupLoggedInButtons() {
    const accountBtn = document.getElementById('accountBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (accountBtn) {
        accountBtn.addEventListener('click', () => {
            if (isRelative()) window.location.href = '/relative_profile';
            else if (isVolunteer()) window.location.href = '/volunteer_profile';
            else window.location.href = '/profile';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Вы действительно хотите выйти?')) logout();
        });
    }
}

async function handleLogin() {
    const loginInput = document.getElementById('login');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');

    if (!loginInput || !passwordInput) {
        showError('Ошибка загрузки формы');
        return;
    }

    const formData = {
        login_or_email: loginInput.value.trim(),
        password: passwordInput.value
    };

    if (!formData.login_or_email || !formData.password) {
        showError('Пожалуйста, заполните все поля');
        return;
    }

    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Вход...';
    loginBtn.disabled = true;

    try {
        const response = await fetch('/api/v1/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            window.location.href = '/';
        } else {
            showError(data.detail || 'Ошибка при входе');
        }
    } catch {
        showError('Ошибка соединения с сервером');
    } finally {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
    }
}

function showError(message) {
    const error = document.getElementById('errorMessage');
    if (!error) return alert(message);
    error.textContent = message;
    error.style.display = 'block';
    setTimeout(() => error.style.display = 'none', 5000);
}

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('access_token');
    options.headers = options.headers || {};

    if (token) options.headers.Authorization = `Bearer ${token}`;
    if (!options.headers['Content-Type'] && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
    }

    let response = await fetch(url, options);

    if (response.status === 401 && await refreshAccessToken()) {
        options.headers.Authorization = `Bearer ${localStorage.getItem('access_token')}`;
        response = await fetch(url, options);
    }

    if (response.status === 401) {
        clearAuthData();
        throw new Error('Unauthorized');
    }

    return response;
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
        const response = await fetch('/api/v1/users/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (!response.ok) return false;

        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        return true;
    } catch {
        return false;
    }
}

function logout() {
    const refreshToken = localStorage.getItem('refresh_token');

    if (refreshToken) {
        fetch('/api/v1/users/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        }).finally(clearAuthData);
    } else {
        clearAuthData();
    }
}

function clearAuthData() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/';
}

function updateNavigation() {
    const role = getUserRole();
    document.querySelectorAll('.nav-var-item').forEach(item => {
        const span = item.querySelector('span');
        const img = item.querySelector('img');
        if (!span || !img) return;

        if (role === 'volunteer') {
            span.textContent = 'Рейтинг';
            item.href = 'rating';
        } else if (role === 'relative') {
            span.textContent = 'Поблагодарить';
            item.href = 'thanks';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (isAuthenticated()) {
        showLoggedInSection();
        setupLoggedInButtons();
        updateNavigation();
    } else {
        showLoginSection();
        setupLoginForm();
    }
});
