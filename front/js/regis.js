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
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateStep2()) {
            saveCurrentStepData();
            
            // Собираем все данные
            const allData = {
                ...formData.step1,
                ...formData.step2
            };
            
            console.log('Данные для отправки:', allData);
            
            // Здесь можно отправить данные на сервер
            // Например, используя fetch:
            /*
            fetch('/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(allData)
            })
            .then(response => response.json())
            .then(data => {
                alert('Регистрация успешна!');
                localStorage.removeItem('registrationFormData'); // Очищаем сохраненные данные
                form.reset();
                // Возвращаемся к первому шагу
                step2.classList.remove('active');
                step1.classList.add('active');
                currentStep = 1;
                updateProgressBar();
            })
            .catch(error => {
                console.error('Ошибка:', error);
                alert('Произошла ошибка при регистрации');
            });
            */
            
            // Временно просто показываем сообщение
            alert('Регистрация успешна! Данные:\n' + JSON.stringify(allData, null, 2));
            localStorage.removeItem('registrationFormData'); // Очищаем сохраненные данные
            form.reset();
            // Возвращаемся к первому шагу
            step2.classList.remove('active');
            step1.classList.add('active');
            currentStep = 1;
            updateProgressBar();
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