window.authHeader = null;

function getAuthHeader() {
    const token = localStorage.getItem('access_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('modal.js загружен');
    
    const showFormBtn = document.getElementById('showFormBtn');
    const formContainer = document.getElementById('relativeFormContainer');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const relativeForm = document.getElementById('relativeForm');
    const relativesList = document.getElementById('relativesList');

    if (!showFormBtn || !formContainer || !cancelFormBtn || !relativeForm) {
        console.error('Не найдены необходимые элементы');
        return;
    }

    function showForm() {
        console.log('Показываем форму');
        formContainer.style.display = 'block';
        showFormBtn.style.display = 'none';
        document.getElementById('fullName').focus();
    }

    function hideForm() {
        console.log('Скрываем форму');
        formContainer.style.display = 'none';
        showFormBtn.style.display = 'block';
        relativeForm.reset();
        
        const saveBtn = relativeForm.querySelector('.save-btn');
        saveBtn.textContent = 'Сохранить';
        delete saveBtn.dataset.editId;
        delete saveBtn.dataset.cardElement;
    }

    function addRelativeToList(relativeData) {
        if (!relativesList) {
            console.warn('Элемент relativesList не найден');
            return;
        }

        function convertDateToDisplayFormat(dateString) {
            if (dateString && dateString.includes('-')) {
                const parts = dateString.split('-');
                if (parts.length === 3) {
                    return `${parts[2]}.${parts[1]}.${parts[0]}`;
                }
            }
            return dateString || 'не указана';
        }

        const displayData = {
            id: relativeData.id,
            fullName: relativeData.full_name || relativeData.fullName || 'Не указано',
            birthYear: convertDateToDisplayFormat(relativeData.birthday || relativeData.birthYear),
            healthStatus: relativeData.health_status || relativeData.healthStatus || 'Не указано',
            physicalLimitations: relativeData.physical_limitations || relativeData.physicalLimitations || 'нет',
            diseases: relativeData.disease || relativeData.diseases || 'Не указано',
            address: relativeData.address || 'Не указан',
            features: relativeData.features || 'Не указано',
            hobbies: relativeData.hobbies || 'Не указано',
            comment: relativeData.comments || relativeData.comment || ''
        };

        // Скрываем состояние "пустой список"
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        const relativeCard = document.createElement('div');
        relativeCard.className = 'relative-card';
        relativeCard.dataset.id = displayData.id;
        
        relativeCard.innerHTML = `
            <div class="relative-card-content">
                <div class="avatar_photo small">
                    <img class="avatar" src="./img/default-elder.png" alt="${displayData.fullName}">
                </div>
                <div class="relative-info">
                    <h3 class="relative-name">${escapeHtml(displayData.fullName)}</h3>
                    <div class="relative-details">
                        <div class="detail-item">
                            <span class="detail-label">Дата рождения:</span>
                            <span class="detail-value">${escapeHtml(displayData.birthYear)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Состояние здоровья:</span>
                            <span class="detail-value">${escapeHtml(displayData.healthStatus)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Физические ограничения:</span>
                            <span class="detail-value">${escapeHtml(displayData.physicalLimitations)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Заболевания:</span>
                            <span class="detail-value">${escapeHtml(displayData.diseases)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Адрес:</span>
                            <span class="detail-value">${escapeHtml(displayData.address)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Особенности:</span>
                            <span class="detail-value">${escapeHtml(displayData.features)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Увлечения:</span>
                            <span class="detail-value">${escapeHtml(displayData.hobbies)}</span>
                        </div>
                        ${displayData.comment ? `
                        <div class="detail-item full-width">
                            <span class="detail-label">Комментарий:</span>
                            <span class="detail-value">${escapeHtml(displayData.comment)}</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="relative-actions">
                        <button class="edit-btn" data-id="${displayData.id}">Редактировать</button>
                        <button class="delete-btn" data-id="${displayData.id}">Удалить</button>
                    </div>
                </div>
            </div>
        `;
        
        relativesList.appendChild(relativeCard);
        addCardEventListeners(relativeCard);
        
        // Показываем состояние "пустой список" если карточек нет
        updateEmptyListState();
    }

    function addCardEventListeners(card) {
        const editBtn = card.querySelector('.edit-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', function() {
                const relativeId = this.getAttribute('data-id');
                editRelative(relativeId, card);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                const relativeId = this.getAttribute('data-id');
                deleteRelative(relativeId, card);
            });
        }
    }

    async function editRelative(relativeId, cardElement) {
        try {
            const response = await fetch(`/api/v1/elders/${relativeId}`, {
                headers: getAuthHeader()
            });
            
            if (!response.ok) {
                throw new Error('Не удалось получить данные родственника');
            }
            
            const relativeData = await response.json();
            
            function convertDateToDisplayFormat(dateString) {
                if (dateString.includes('-')) {
                    const parts = dateString.split('-');
                    if (parts.length === 3) {
                        return `${parts[2]}.${parts[1]}.${parts[0]}`;
                    }
                }
                return dateString;
            }
            
            document.getElementById('fullName').value = relativeData.full_name || '';
            document.getElementById('birthYear').value = convertDateToDisplayFormat(relativeData.birthday) || '';
            document.getElementById('healthStatus').value = relativeData.health_status || '';
            document.getElementById('physicalLimitations').value = relativeData.physical_limitations || '';
            document.getElementById('diseases').value = relativeData.disease || '';
            document.getElementById('address').value = relativeData.address || '';
            document.getElementById('features').value = relativeData.features || '';
            document.getElementById('hobbies').value = relativeData.hobbies || '';
            document.getElementById('comment').value = relativeData.comments || '';
            
            const saveBtn = relativeForm.querySelector('.save-btn');
            saveBtn.textContent = 'Обновить';
            saveBtn.dataset.editId = relativeId;
            saveBtn.dataset.cardElement = cardElement;
            
            showForm();
            
        } catch (error) {
            console.error('Ошибка при редактировании:', error);
            showNotification('Ошибка при загрузке данных: ' + error.message, 'error');
        }
    }

    function updateEmptyListState() {
        const relativesList = document.getElementById('relativesList');
        const emptyState = document.getElementById('emptyState');
        
        if (!relativesList || !emptyState) return;
        
        const hasCards = relativesList.querySelectorAll('.relative-card').length > 0;
        
        if (hasCards) {
            emptyState.style.display = 'none';
        } else {
            emptyState.style.display = 'block';
        }
    }

    async function deleteRelative(relativeId, cardElement) {
        if (!confirm('Вы уверены, что хотите удалить этого родственника?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/v1/elders/${relativeId}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });
            
            if (response.ok) {
                cardElement.remove();
                showNotification('Родственник успешно удален!', 'success');
                updateEmptyListMessage();
            } else {
                throw new Error('Не удалось удалить родственника');
            }
        } catch (error) {
            console.error('Ошибка при удалении:', error);
            showNotification('Ошибка при удалении: ' + error.message, 'error');
        }
    }

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function validateForm(formData) {
        const errors = [];
        
        if (!formData.fullName.trim()) {
            errors.push('ФИО обязательно для заполнения');
        }
        
        if (!formData.birthYear.trim()) {
            errors.push('Год рождения обязателен для заполнения');
        }
        
        if (!formData.healthStatus.trim()) {
            errors.push('Состояние здоровья обязательно для заполнения');
        }
        
        if (!formData.diseases.trim()) {
            errors.push('Заболевания обязательны для заполнения');
        }
        
        if (!formData.address.trim()) {
            errors.push('Адрес проживания обязателен для заполнения');
        }
        
        if (!formData.features.trim()) {
            errors.push('Особенности обязательны для заполнения');
        }
        
        if (!formData.hobbies.trim()) {
            errors.push('Увлечения обязательны для заполнения');
        }
        
        return errors;
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showFormBtn.addEventListener('click', showForm);

    cancelFormBtn.addEventListener('click', hideForm);

    relativeForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const formData = {
            fullName: document.getElementById('fullName').value.trim(),
            birthYear: document.getElementById('birthYear').value.trim(),
            healthStatus: document.getElementById('healthStatus').value.trim(),
            physicalLimitations: document.getElementById('physicalLimitations').value.trim(),
            diseases: document.getElementById('diseases').value.trim(),
            address: document.getElementById('address').value.trim(),
            features: document.getElementById('features').value.trim(),
            hobbies: document.getElementById('hobbies').value.trim(),
            comment: document.getElementById('comment').value.trim()
        };
        
        function convertDateToApiFormat(dateString) {
            if (dateString.includes('.')) {
                const parts = dateString.split('.');
                if (parts.length === 3) {
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2];
                    return `${year}-${month}-${day}`;
                }
            }
            return dateString;
        }
        
        const apiFormData = {
            full_name: formData.fullName,
            birthday: convertDateToApiFormat(formData.birthYear),
            health_status: formData.healthStatus,
            physical_limitations: formData.physicalLimitations,
            disease: formData.diseases,
            address: formData.address,
            features: formData.features,
            hobbies: formData.hobbies,
            comments: formData.comment
        };
        
        const errors = validateForm(formData);
        if (errors.length > 0) {
            alert('Пожалуйста, заполните все обязательные поля:\n' + errors.join('\n'));
            return;
        }
        
        const saveBtn = relativeForm.querySelector('.save-btn');
        const originalText = saveBtn.textContent;
        const isEditMode = saveBtn.dataset.editId;
        
        saveBtn.textContent = isEditMode ? 'Обновление...' : 'Сохранение...';
        saveBtn.disabled = true;
        
        try {
            let url = '/api/v1/elders';
            let method = 'POST';
            
            if (isEditMode) {
                url = `/api/v1/elders/${saveBtn.dataset.editId}`;
                method = 'PATCH';
            }
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify(apiFormData)
            });
            
            if (response.ok) {
                const result = await response.json();
                showNotification(isEditMode ? 'Родственник успешно обновлен!' : 'Родственник успешно добавлен!', 'success');
                await loadExistingRelatives();
                hideForm();
                
            } else if (response.status === 401) {
                showNotification('Сессия истекла. Пожалуйста, войдите заново.', 'error');
                setTimeout(() => {
                    window.location.href = '/input';
                }, 2000);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
            
        } catch (error) {
            console.error('Ошибка при работе с родственником:', error);
            showNotification('Ошибка: ' + error.message, 'error');
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && formContainer.style.display === 'block') {
            const cancelBtn = document.getElementById('cancelFormBtn');
            cancelBtn.click();
        }
    });

    async function loadExistingRelatives() {
        try {
            console.log('Загружаем родственников...');
            const response = await fetch('/api/v1/elders/me', {
                headers: getAuthHeader()
            });
            
            if (response.ok) {
                const relatives = await response.json();
                
                if (relativesList) {
                    // Удаляем только карточки, оставляя empty-state
                    const cards = relativesList.querySelectorAll('.relative-card');
                    cards.forEach(card => card.remove());
                }
                
                if (Array.isArray(relatives) && relatives.length > 0) {
                    relatives.forEach(relative => {
                        addRelativeToList(relative);
                    });
                } else {
                    updateEmptyListState();
                }
                
            } else if (response.status === 401) {
                console.warn('Не авторизован для загрузки родственников');
            }
        } catch (error) {
            console.warn('Не удалось загрузить список родственников:', error);
            updateEmptyListState();
        }
    }

    function updateEmptyListMessage() {
        if (!relativesList) return;
        
        const emptyMessage = document.getElementById('emptyRelativesMessage');
        
        if (relativesList.children.length === 0) {
            if (!emptyMessage) {
                const message = document.createElement('p');
                message.id = 'emptyRelativesMessage';
                message.textContent = 'У вас пока нет добавленных пожилых родственников. Добавьте первого!';
                message.style.textAlign = 'center';
                message.style.color = '#666';
                message.style.padding = '20px';
                relativesList.appendChild(message);
            }
        } else {
            if (emptyMessage) {
                emptyMessage.remove();
            }
        }
    }

    console.log('Инициализация завершена');
    
    if (window.location.pathname.includes('profile')) {
        console.log('Страница профиля, загружаем родственников...');
        setTimeout(() => {
            loadExistingRelatives();
        }, 500);
    }

    document.addEventListener("click", function (e) {
        const menuBtn = e.target.closest(".post-menu-btn");
        const allMenus = document.querySelectorAll(".post-menu");

        if (!menuBtn) {
            allMenus.forEach(menu => menu.style.display = "none");
            return;
        }

        const currentMenu = menuBtn.parentElement.querySelector(".post-menu");
        const isOpened = currentMenu.style.display === "block";

        allMenus.forEach(menu => menu.style.display = "none");

        if (!isOpened) {
            currentMenu.style.display = "block";
        }
    });

    const modal = document.getElementById("createPostModal");
    const openBtn = document.querySelector(".create-post-btn");
    const closeBtn = document.getElementById("closeModal");
    const modalContent = document.querySelector("#createPostModal .modal-content");

    if (modal && openBtn && closeBtn && modalContent) {
        if (openBtn) {
            openBtn.addEventListener("click", () => {
                modal.style.display = "flex";
            });
        }

        closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });

        modal.addEventListener("click", (event) => {
            if (!modalContent.contains(event.target)) {
                modal.style.display = "none";
            }
        });
    }
});