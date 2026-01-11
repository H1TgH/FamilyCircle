document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.registration-form');
    
    if (!form) {
        console.error('Форма регистрации не найдена');
        return;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            surname: document.getElementById('firstName').value.trim(),
            name: document.getElementById('lastName').value.trim(),
            patronymic: document.getElementById('patronymic').value.trim() || '',
            phone_number: document.getElementById('phone').value.trim(),
        };
        
        if (!formData.surname || !formData.name || !formData.phone_number) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }

        const phoneRegex = /^[\+]?[78]?\d{10}$/;
        if (!phoneRegex.test(formData.phone_number.replace(/[\s\-\(\)]/g, ''))) {
            alert('Введите корректный номер телефона');
            return;
        }
        
        localStorage.setItem('relativeRegistrationStep1', JSON.stringify(formData));
        
        showStep2();
    });
    
    const savedStep1 = localStorage.getItem('relativeRegistrationStep1');
    if (savedStep1) {
        const data = JSON.parse(savedStep1);
        document.getElementById('firstName').value = data.surname || '';
        document.getElementById('lastName').value = data.name || '';
        document.getElementById('patronymic').value = data.patronymic || '';
        document.getElementById('phone').value = data.phone_number || '';
    }
});

function showStep2() {
    const container = document.querySelector('.container');
    const form = document.querySelector('.registration-form');
    
    if (!form || !container) return;
    
    form.style.display = 'none';
    
    const step2Form = document.createElement('form');
    step2Form.className = 'registration-form';
    step2Form.id = 'step2Form';
    
    step2Form.innerHTML = `
        <h1>Регистрация (шаг 2)</h1>
        
        <div class="input-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
            <div class="error-message" id="emailError"></div>
        </div>
        
        <div class="input-group">
            <label for="login">Логин</label>
            <input type="text" id="login" name="login" required>
            <div class="error-message" id="loginError"></div>
        </div>
        
        <div class="input-group">
            <label for="password">Пароль</label>
            <input type="password" id="password" name="password" required>
            <div class="error-message" id="passwordError"></div>
        </div>
        
        <div class="input-group">
            <label for="confirmPassword">Подтвердите пароль</label>
            <input type="password" id="confirmPassword" name="confirmPassword" required>
            <div class="error-message" id="confirmPasswordError"></div>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
            <button type="button" id="backBtn" style="background: #ccc;">Назад</button>
            <button type="submit">Зарегистрироваться</button>
        </div>
    `;
    
    container.insertBefore(step2Form, form);
    
    step2Form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const login = document.getElementById('login').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        const errors = [];
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            errors.push('Введите корректный email');
        }
        
        if (!login || login.length < 3) {
            errors.push('Логин должен быть не менее 3 символов');
        }
        
        if (!password || password.length < 6) {
            errors.push('Пароль должен быть не менее 6 символов');
        }
        
        if (password !== confirmPassword) {
            errors.push('Пароли не совпадают');
        }
        
        if (errors.length > 0) {
            alert(errors.join('\n'));
            return;
        }
        
        const step1Data = JSON.parse(localStorage.getItem('relativeRegistrationStep1') || '{}');
        
        const registrationData = {
            ...step1Data,
            email: email,
            login: login,
            password: password
        };
        
        const submitBtn = step2Form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Регистрация...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/api/v1/users/register/relative', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registrationData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                
                localStorage.removeItem('relativeRegistrationStep1');
                
                alert('Регистрация успешна! Вы будете перенаправлены...');
                
                setTimeout(() => {
                    window.location.href = 'profile';
                }, 1000);
            } else {
                alert('Ошибка: ' + (data.detail || 'Не удалось зарегистрироваться'));
            }
        } catch (error) {
            console.error('Ошибка сети:', error);
            alert('Ошибка соединения с сервером');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    document.getElementById('backBtn').addEventListener('click', function() {
        step2Form.remove();
        form.style.display = 'block';
    });
}


