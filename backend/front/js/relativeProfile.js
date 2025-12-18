document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
    loadElders();

    setupFormHandlers();
    setupAvatarUpload();
});

function setupFormHandlers() {
    const relativeForm = document.getElementById('relativeForm');
    if (!relativeForm) return;
    
    const newForm = relativeForm.cloneNode(true);
    relativeForm.parentNode.replaceChild(newForm, relativeForm);
    
    const freshForm = document.getElementById('relativeForm');
    
    freshForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        if (this.classList.contains('submitting')) return;
        this.classList.add('submitting');
        
        const formData = {
            fullName: document.getElementById('fullName').value,
            birthYear: document.getElementById('birthYear').value,
            healthStatus: document.getElementById('healthStatus').value,
            physicalLimitations: document.getElementById('physicalLimitations').value,
            diseases: document.getElementById('diseases').value,
            address: document.getElementById('address').value,
            features: document.getElementById('features').value,
            hobbies: document.getElementById('hobbies').value,
            comment: document.getElementById('comment').value
        };
        
        const errors = validateForm(formData);
        if (errors.length > 0) {
            alert('Пожалуйста, заполните все обязательные поля:\n' + errors.join('\n'));
            this.classList.remove('submitting');
            return;
        }
        
        const saveBtn = freshForm.querySelector('.save-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Сохранение...';
        saveBtn.disabled = true;
        
        try {
            const success = await handleFormSubmit(formData);
            
            if (success) {
                hideForm();
                freshForm.reset();
                delete freshForm.dataset.editId;
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Ошибка: ' + error.message, 'error');
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            this.classList.remove('submitting');
        }
    });
    
    const showFormBtn = document.getElementById('showFormBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    
    if (showFormBtn) {
        showFormBtn.addEventListener('click', showForm);
    }
    
    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', hideForm);
    }
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

function showForm() {
    const formContainer = document.getElementById('relativeFormContainer');
    const showFormBtn = document.getElementById('showFormBtn');
    if (formContainer && showFormBtn) {
        formContainer.style.display = 'block';
        showFormBtn.style.display = 'none';
        const fullNameInput = document.getElementById('fullName');
        if (fullNameInput) fullNameInput.focus();
    }
}

function hideForm() {
    const formContainer = document.getElementById('relativeFormContainer');
    const showFormBtn = document.getElementById('showFormBtn');
    if (formContainer && showFormBtn) {
        formContainer.style.display = 'none';
        showFormBtn.style.display = 'block';
        const relativeForm = document.getElementById('relativeForm');
        if (relativeForm) {
            relativeForm.reset();
            delete relativeForm.dataset.editId;
        }
    }
}

async function loadUserProfile() {
    try {
        const response = await fetchWithAuth('/api/v1/users/me');
        if (response.ok) {
            const user = await response.json();
            updateProfileUI(user);
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
}

async function loadElders() {
    try {
        const response = await fetchWithAuth('/api/v1/elders/me');
        if (response.ok) {
            const elders = await response.json();
            displayElders(elders);
        }
    } catch (error) {
        console.error('Ошибка загрузки пожилых:', error);
    }
}

function updateProfileUI(user) {
    const nameElement = document.querySelector('.profile-section .name');
    if (nameElement && user.surname && user.name && user.patronymic) {
        nameElement.textContent = `${user.surname} ${user.name} ${user.patronymic}`;
    }
    
    const avatarImg = document.querySelector('.profile-section .avatar');
    if (avatarImg && user.avatar_presigned_url) {
        avatarImg.src = user.avatar_presigned_url;
        avatarImg.onerror = function() {
            this.src = '/img/avatar-placeholder.png';
        };
    }
}

async function updateUserAvatar(file) {
    if (!file) return false;
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
        const response = await fetchWithAuth('/api/v1/users/me', {
            method: 'PATCH',
            body: formData
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            showNotification('Аватар обновлен!', 'success');
            
            const avatarImg = document.querySelector('.profile-section .avatar');
            if (avatarImg && updatedUser.avatar_presigned_url) {
                avatarImg.src = updatedUser.avatar_presigned_url + '?t=' + Date.now();
            }
            
            return true;
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Ошибка обновления аватара', 'error');
            return false;
        }
    } catch (error) {
        console.error('Ошибка загрузки аватара:', error);
        showNotification('Ошибка соединения', 'error');
        return false;
    }
}

function setupAvatarUpload() {
    const avatarInput = document.getElementById('avatar-upload');
    const avatarLabel = document.querySelector('.profile-section label[for="avatar-upload"]');
    
    if (!avatarInput || !avatarLabel) return;
    
    avatarInput.addEventListener('change', async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showNotification('Пожалуйста, выберите изображение', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Размер файла не должен превышать 5MB', 'error');
            return;
        }
        
        const success = await updateUserAvatar(file);
        if (success) {
            avatarInput.value = '';
        }
    });
    
    avatarLabel.addEventListener('click', function(event) {
        event.preventDefault();
        avatarInput.click();
    });
}

function displayElders(elders) {
    const relativesList = document.getElementById('relativesList');
    if (!relativesList) return;

    relativesList.innerHTML = '';

    if (!elders || elders.length === 0) {
        relativesList.innerHTML = '<p class="no-relatives">Нет добавленных пожилых</p>';
        return;
    }

    elders.forEach(elder => {
        const elderCard = createElderCard(elder);
        relativesList.appendChild(elderCard);
    });
}

function createElderCard(elder) {
    const card = document.createElement('div');
    card.className = 'form-container elder-card';
    card.dataset.id = elder.id;

    const birthday = elder.birthday ? new Date(elder.birthday).toLocaleDateString('ru-RU') : 'не указано';
    
    card.innerHTML = `
        <div class="relative-card-content">
            <div class="avatar_photo">
                <label for="elder-avatar-${elder.id}">
                    <img class="avatar" src="${elder.avatar_url || '/img/profile.png'}" alt="${elder.full_name}">
                </label>
            </div>
            <div class="form-fields-wrapper">
                <div class="form-group">
                    <label>ФИО:</label>
                    <div class="field-value">${escapeHtml(elder.full_name)}</div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Дата рождения:</label>
                        <div class="field-value">${birthday}</div>
                    </div>
                    <div class="form-group">
                        <label>Состояние здоровья:</label>
                        <div class="field-value">${escapeHtml(elder.health_status)}</div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Физические ограничения:</label>
                        <div class="field-value">${elder.physical_limitations ? escapeHtml(elder.physical_limitations) : 'нет'}</div>
                    </div>
                    <div class="form-group">
                        <label>Заболевания:</label>
                        <div class="field-value">${escapeHtml(elder.disease)}</div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Адрес проживания:</label>
                    <div class="field-value">${escapeHtml(elder.address)}</div>
                </div>

                <div class="form-group">
                    <label>Особенности:</label>
                    <div class="field-value">${escapeHtml(elder.features)}</div>
                </div>

                <div class="form-group">
                    <label>Увлечения:</label>
                    <div class="field-value">${escapeHtml(elder.hobbies)}</div>
                </div>

                ${elder.comments ? `
                    <div class="form-group">
                        <label>Комментарий:</label>
                        <div class="field-value">${escapeHtml(elder.comments)}</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    return card;
}

async function submitElderForm(formData) {
    try {
        const response = await fetchWithAuth('/api/v1/elders', {
            method: 'POST',
            body: JSON.stringify({
                full_name: formData.fullName,
                birthday: formatDate(formData.birthYear),
                health_status: formData.healthStatus,
                physical_limitations: formData.physicalLimitations || null,
                disease: formData.diseases,
                address: formData.address,
                features: formData.features,
                hobbies: formData.hobbies,
                comments: formData.comment || null,
                avatar_url: null
            })
        });

        if (response.ok) {
            const elder = await response.json();
            showNotification('Пожилой успешно добавлен!', 'success');
            addElderToList(elder);
            return true;
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Ошибка добавления', 'error');
            return false;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения', 'error');
        return false;
    }
}

async function updateElder(elderId, formData) {
    try {
        const response = await fetchWithAuth(`/api/v1/elders/${elderId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                full_name: formData.fullName,
                birthday: formatDate(formData.birthYear),
                health_status: formData.healthStatus,
                physical_limitations: formData.physicalLimitations || null,
                disease: formData.diseases,
                address: formData.address,
                features: formData.features,
                hobbies: formData.hobbies,
                comments: formData.comment || null
            })
        });

        if (response.ok) {
            const elder = await response.json();
            showNotification('Данные обновлены!', 'success');
            updateElderCard(elderId, elder);
            return true;
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Ошибка обновления', 'error');
            return false;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения', 'error');
        return false;
    }
}

async function deleteElder(elderId) {
    if (!confirm('Вы уверены, что хотите удалить?')) return;

    try {
        const response = await fetchWithAuth(`/api/v1/elders/${elderId}`, {
            method: 'DELETE'
        });

        if (response.status === 204) {
            showNotification('Пожилой удален', 'success');
            removeElderCard(elderId);
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Ошибка удаления', 'error');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка соединения', 'error');
    }
}

function addElderToList(elder) {
    const relativesList = document.getElementById('relativesList');
    if (!relativesList) return;

    const noRelativesMsg = relativesList.querySelector('.no-relatives');
    if (noRelativesMsg) {
        noRelativesMsg.remove();
    }

    const elderCard = createElderCard(elder);
    relativesList.insertBefore(elderCard, relativesList.firstChild);
    
    attachElderCardEvents(elderCard);
}

function updateElderCard(elderId, elderData) {
    const card = document.querySelector(`.elder-card[data-id="${elderId}"]`);
    if (card) {
        const newCard = createElderCard(elderData);
        card.parentNode.replaceChild(newCard, card);
        attachElderCardEvents(newCard);
    }
}

function removeElderCard(elderId) {
    const card = document.querySelector(`.elder-card[data-id="${elderId}"]`);
    if (card) {
        card.remove();
    }
    
    const relativesList = document.getElementById('relativesList');
    if (relativesList && relativesList.children.length === 0) {
        relativesList.innerHTML = '<p class="no-relatives">Нет добавленных пожилых</p>';
    }
}

function attachElderCardEvents(card) {
    const editBtn = card.querySelector('.edit-elder-btn');
    const deleteBtn = card.querySelector('.delete-elder-btn');
    
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            const elderId = this.dataset.id;
            openEditModal(elderId);
        });
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            const elderId = this.dataset.id;
            deleteElder(elderId);
        });
    }
}

function formatDate(dateStr) {
    if (!dateStr) return null;
    
    const cleanStr = dateStr.trim();
    const parts = cleanStr.split('.');
    
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        
        return `${year}-${month}-${day}`;
    } else if (cleanStr.includes('-')) {
        return cleanStr;
    }
    
    const date = new Date(cleanStr);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    
    return null;
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

async function openEditModal(elderId) {
    try {
        const response = await fetchWithAuth(`/api/v1/elders/${elderId}`);
        if (response.ok) {
            const elder = await response.json();
            populateEditForm(elder);
            showForm();
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

function populateEditForm(elder) {
    const form = document.getElementById('relativeForm');
    if (!form) return;

    const birthday = elder.birthday ? new Date(elder.birthday).toLocaleDateString('ru-RU') : '';
    
    form.dataset.editId = elder.id;
    document.getElementById('fullName').value = elder.full_name || '';
    document.getElementById('birthYear').value = birthday;
    document.getElementById('healthStatus').value = elder.health_status || '';
    document.getElementById('physicalLimitations').value = elder.physical_limitations || '';
    document.getElementById('diseases').value = elder.disease || '';
    document.getElementById('address').value = elder.address || '';
    document.getElementById('features').value = elder.features || '';
    document.getElementById('hobbies').value = elder.hobbies || '';
    document.getElementById('comment').value = elder.comments || '';
}

async function handleFormSubmit(formData) {
    const isEdit = document.getElementById('relativeForm').dataset.editId;
    
    if (isEdit) {
        return await updateElder(isEdit, formData);
    } else {
        return await submitElderForm(formData);
    }
}