document.addEventListener('DOMContentLoaded', function() {
    // Элементы формы
    const form = document.getElementById('multiStepForm');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const submitBtn = document.getElementById('submitBtn');
    const progressSteps = document.querySelectorAll('.progress-step');
    
    let currentStep = 1;
    const totalSteps = 2;
    
    // Объект для хранения данных формы
    const formData = {
        step1: {},
        step2: {}
    };

    // Сохраняем данные в localStorage при каждом изменении
    function saveFormData() {
        localStorage.setItem('registrationFormData', JSON.stringify(formData));
    }

    // Загружаем данные из localStorage при загрузке страницы
    function loadFormData() {
        const savedData = localStorage.getItem('registrationFormData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            // Заполняем поля шага 1
            if (parsedData.step1) {
                for (const [key, value] of Object.entries(parsedData.step1)) {
                    const input = document.querySelector(`[name="${key}"]`);
                    if (input) input.value = value;
                }
            }
            
            // Заполняем поля шага 2
            if (parsedData.step2) {
                for (const [key, value] of Object.entries(parsedData.step2)) {
                    const input = document.querySelector(`[name="${key}"]`);
                    if (input) input.value = value;
                }
            }
        }
    }

    // Валидация шага 1
    function validateStep1() {
        let isValid = true;
        
        // Очищаем предыдущие ошибки
        document.querySelectorAll('#step1 .error-message').forEach(el => {
            el.classList.remove('show');
            el.textContent = '';
        });

        // Проверка фамилии
        const firstName = document.getElementById('firstName').value.trim();
        if (!firstName) {
            document.getElementById('firstNameError').textContent = 'Введите фамилию';
            document.getElementById('firstNameError').classList.add('show');
            isValid = false;
        }

        // Проверка имени
        const lastName = document.getElementById('lastName').value.trim();
        if (!lastName) {
            document.getElementById('lastNameError').textContent = 'Введите имя';
            document.getElementById('lastNameError').classList.add('show');
            isValid = false;
        }

        // Проверка даты рождения
        const birthdate = document.getElementById('birthdate').value;
        if (!birthdate) {
            document.getElementById('birthdateError').textContent = 'Введите дату рождения';
            document.getElementById('birthdateError').classList.add('show');
            isValid = false;
        } else {
            const birthDate = new Date(birthdate);
            const today = new Date();
            if (birthDate > today) {
                document.getElementById('birthdateError').textContent = 'Дата рождения не может быть в будущем';
                document.getElementById('birthdateError').classList.add('show');
                isValid = false;
            }
        }

        // Проверка телефона
        const phone = document.getElementById('phone').value.trim();
        const phoneRegex = /^[\+]?[78]?\d{10}$/;
        if (!phone) {
            document.getElementById('phoneError').textContent = 'Введите телефон';
            document.getElementById('phoneError').classList.add('show');
            isValid = false;
        } else if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
            document.getElementById('phoneError').textContent = 'Введите корректный номер телефона';
            document.getElementById('phoneError').classList.add('show');
            isValid = false;
        }

        return isValid;
    }

    // Валидация шага 2
    function validateStep2() {
        let isValid = true;
        
        // Очищаем предыдущие ошибки
        document.querySelectorAll('#step2 .error-message').forEach(el => {
            el.classList.remove('show');
            el.textContent = '';
        });

        // Проверка email
        const email = document.getElementById('email').value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            document.getElementById('emailError').textContent = 'Введите email';
            document.getElementById('emailError').classList.add('show');
            isValid = false;
        } else if (!emailRegex.test(email)) {
            document.getElementById('emailError').textContent = 'Введите корректный email';
            document.getElementById('emailError').classList.add('show');
            isValid = false;
        }

        // Проверка логина
        const login = document.getElementById('login').value.trim();
        if (!login) {
            document.getElementById('loginError').textContent = 'Введите логин';
            document.getElementById('loginError').classList.add('show');
            isValid = false;
        } else if (login.length < 3) {
            document.getElementById('loginError').textContent = 'Логин должен быть не менее 3 символов';
            document.getElementById('loginError').classList.add('show');
            isValid = false;
        }

        // Проверка пароля
        const password = document.getElementById('password').value;
        if (!password) {
            document.getElementById('passwordError').textContent = 'Введите пароль';
            document.getElementById('passwordError').classList.add('show');
            isValid = false;
        } else if (password.length < 6) {
            document.getElementById('passwordError').textContent = 'Пароль должен быть не менее 6 символов';
            document.getElementById('passwordError').classList.add('show');
            isValid = false;
        }

        // Проверка подтверждения пароля
        const confirmPassword = document.getElementById('confirmPassword').value;
        if (!confirmPassword) {
            document.getElementById('confirmPasswordError').textContent = 'Подтвердите пароль';
            document.getElementById('confirmPasswordError').classList.add('show');
            isValid = false;
        } else if (password !== confirmPassword) {
            document.getElementById('confirmPasswordError').textContent = 'Пароли не совпадают';
            document.getElementById('confirmPasswordError').classList.add('show');
            isValid = false;
        }

        return isValid;
    }

    // Сохраняем данные текущего шага
    function saveCurrentStepData() {
        const currentStepElement = document.getElementById(`step${currentStep}`);
        const inputs = currentStepElement.querySelectorAll('input');
        
        formData[`step${currentStep}`] = {};
        
        inputs.forEach(input => {
            if (input.name) {
                formData[`step${currentStep}`][input.name] = input.value;
            }
        });
        
        saveFormData();
    }

    // Обновляем прогресс-бар
    function updateProgressBar() {
        progressSteps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            
            if (index + 1 < currentStep) {
                step.classList.add('completed');
            } else if (index + 1 === currentStep) {
                step.classList.add('active');
            }
        });
    }

    // Переход к следующему шагу
    nextBtn.addEventListener('click', function() {
        if (validateStep1()) {
            saveCurrentStepData();
            
            // Скрываем текущий шаг, показываем следующий
            step1.classList.remove('active');
            step2.classList.add('active');
            
            currentStep = 2;
            updateProgressBar();
        }
    });

    // Возврат к предыдущему шагу
    backBtn.addEventListener('click', function() {
        saveCurrentStepData();
        
        // Скрываем текущий шаг, показываем предыдущий
        step2.classList.remove('active');
        step1.classList.add('active');
        
        currentStep = 1;
        updateProgressBar();
    });

    // Обработка отправки формы
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (validateStep2()) {
            saveCurrentStepData();
            
            // Собираем все данные
            const allData = {
                ...formData.step1,
                ...formData.step2
            };
            
            console.log('Данные для отправки:', allData);
            
            const result = await registerVolunteer(allData);
            
            if (result.success) {
                showRegistrationSuccess('Регистрация успешна! Вы будете перенаправлены...');
                
                localStorage.setItem('access_token', result.data.access_token);
                localStorage.setItem('refresh_token', result.data.refresh_token);
                
                localStorage.removeItem('registrationFormData');
                form.reset();
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
                
            } else {
                showRegistrationError(result.error);
            }
        }
    });

    // Автосохранение при вводе
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', function() {
            saveCurrentStepData();
        });
    });

    // Загружаем сохраненные данные при загрузке страницы
    loadFormData();
    
    // Автосохранение при закрытии/обновлении страницы
    window.addEventListener('beforeunload', function() {
        saveCurrentStepData();
    });
});

async function registerVolunteer(formData) {
    const registrationData = {
        surname: formData.firstName,
        name: formData.lastName,
        patronymic: formData.patronymic || null,
        birthday: formData.birthdate,
        phone_number: formData.phone,
        email: formData.email,
        login: formData.login,
        password: formData.password
    };
    
    try {
        const response = await fetch('/api/v1/users/register/volunteer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(registrationData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return {
                success: true,
                data: data
            };
        } else {
            return {
                success: false,
                error: data.detail || 'Ошибка регистрации'
            };
        }
    } catch (error) {
        console.error('Ошибка сети:', error);
        return {
            success: false,
            error: 'Ошибка соединения с сервером'
        };
    }
}

function showRegistrationError(message) {
    const errorDiv = document.getElementById('registrationError');
    if (!errorDiv) {
        const form = document.getElementById('multiStepForm');
        const errorElement = document.createElement('div');
        errorElement.id = 'registrationError';
        errorElement.style.cssText = 'color: red; text-align: center; margin-top: 15px; padding: 10px; background: #ffe6e6; border-radius: 5px;';
        form.appendChild(errorElement);
    }
    
    const errorElement = document.getElementById('registrationError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function showRegistrationSuccess(message) {
    const successDiv = document.getElementById('registrationSuccess');
    if (!successDiv) {
        const form = document.getElementById('multiStepForm');
        const successElement = document.createElement('div');
        successElement.id = 'registrationSuccess';
        successElement.style.cssText = 'color: green; text-align: center; margin-top: 15px; padding: 10px; background: #e6ffe6; border-radius: 5px;';
        form.appendChild(successElement);
    }
    
    const successElement = document.getElementById('registrationSuccess');
    successElement.textContent = message;
    successElement.style.display = 'block';
}