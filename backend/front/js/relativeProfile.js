let isLoadingElders = false;
let eldersList = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) return;

    const isProfilePage = window.location.pathname.includes('profile');
    if (!isProfilePage) return;

    initializePage();
    setupAvatarUpload();
});

function initializePage() {
    if (!isAuthenticated()) {
        return;
    }

    const isProfilePage = window.location.pathname.includes('profile');
    if (!isProfilePage) return;
    
    loadUserProfile();
    setupEditButton();
    
    const userRole = getUserRole();
    if (userRole === 'relative') {
        loadElders();
        setupElderForm();
        setupEventListeners();
    }
}

function setupEditButton() {
    const profileSection = document.querySelector('.profile-section');
    if (!profileSection) return;
    
    if (profileSection.querySelector('.edit-profile-btn')) return;
    
    const editButton = document.createElement('button');
    editButton.className = 'edit-profile-btn';
    editButton.innerHTML = '<img src="./img/edit.svg" alt="Редактировать" style="width:20px;height:20px;">';
    editButton.style.cssText = `
        position: absolute;
        background: #FFFFFF;
        right: 30px;
        border: none;
        bottom: 20px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10;
    `;
    
    editButton.addEventListener('click', showEditProfileForm);
    profileSection.style.position = 'relative';
    profileSection.appendChild(editButton);
}

function showEditProfileForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 30px; border-radius: 10px; width: 400px; max-width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="margin-top: 0; margin-bottom: 20px; color: #985D3C;">Редактировать профиль</h3>
            <form id="editProfileForm">
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Фамилия:</label>
                    <input type="text" id="edit-surname" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Имя:</label>
                    <input type="text" id="edit-name" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Отчество:</label>
                    <input type="text" id="edit-patronymic" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Телефон:</label>
                    <input type="tel" id="edit-phone" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <!-- Убрано поле email -->
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Дата рождения:</label>
                    <input type="date" id="edit-birthday" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Город:</label>
                    <input type="text" id="edit-city" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">Адрес:</label>
                    <input type="text" id="edit-address" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 5px; color: #5A3C1E; font-weight: 500;">О себе:</label>
                    <textarea id="edit-about" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" class="cancel-btn" id="cancelEditBtn" style="padding: 10px 20px; background: #FFF7E6; color: #985D3C; border: 1px solid #AF6425; border-radius: 5px; cursor: pointer; font-weight: 500;">Отмена</button>
                    <button type="submit" class="save-btn" style="padding: 10px 20px; background: #985D3C; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 500;">Сохранить</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    fetchUserDataForEdit();
    
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateUserProfile();
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function fetchUserDataForEdit() {
    try {
        const response = await fetchWithAuth('/api/v1/users/me');
        if (response.ok) {
            const user = await response.json();
            
            document.getElementById('edit-surname').value = user.surname || '';
            document.getElementById('edit-name').value = user.name || '';
            document.getElementById('edit-patronymic').value = user.patronymic || '';
            document.getElementById('edit-phone').value = user.phone_number || '';
            document.getElementById('edit-city').value = user.city || '';
            document.getElementById('edit-address').value = user.address || '';
            document.getElementById('edit-about').value = user.about || '';
            
            if (user.birthday) {
                const date = new Date(user.birthday);
                const formattedDate = date.toISOString().split('T')[0];
                document.getElementById('edit-birthday').value = formattedDate;
            }
        }
    } catch (error) {
        showNotification('Ошибка загрузки данных', 'error');
    }
}

async function updateUserProfile() {
    const formData = new FormData();
    
    const data = {
        surname: document.getElementById('edit-surname').value.trim(),
        name: document.getElementById('edit-name').value.trim(),
        patronymic: document.getElementById('edit-patronymic').value.trim(),
        phone_number: document.getElementById('edit-phone').value.trim(),
        city: document.getElementById('edit-city').value.trim(),
        address: document.getElementById('edit-address').value.trim(),
        about: document.getElementById('edit-about').value.trim(),
    };
    
    for (const [key, value] of Object.entries(data)) {
        if (value && value.trim() !== '') {
            formData.append(key, value);
        }
    }
    
    const birthday = document.getElementById('edit-birthday').value;
    if (birthday && birthday.trim() !== '') {
        formData.append('birthday', birthday);
    }
    
    try {
        const response = await fetchWithAuth('/api/v1/users/me', {
            method: 'PATCH',
            body: formData
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            updateProfileUI(updatedUser);
            showNotification('Профиль обновлен!', 'success');
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Ошибка обновления профиля', 'error');
        }
    } catch (error) {
        showNotification('Ошибка соединения', 'error');
    }
}

async function loadUserProfile() {
    const response = await fetchWithAuth('/api/v1/users/me');
    if (response.ok) {
        const user = await response.json();
        updateProfileUI(user);
        
        const userRole = getUserRole();
        if (userRole === 'volunteer') {
            await loadThanksCount(user.id);
        }
    }
}

async function loadThanksCount(userId) {
    const response = await fetchWithAuth(`/api/v1/thanks/user/${userId}/count`);
    if (response.ok) {
        const thanksData = await response.json();
        displayThanksCount(thanksData.thanks_count);
    }
}

function displayThanksCount(count) {
    const profileSection = document.querySelector('.profile-section');
    if (!profileSection) return;
    
    let thanksCounter = profileSection.querySelector('.thanks-counter');
    
    if (!thanksCounter) {
        thanksCounter = document.createElement('div');
        thanksCounter.className = 'thanks-counter';
        thanksCounter.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: #FFE5B4;
            border: 2px solid #AF6425;
            border-radius: 10px;
            padding: 8px 16px;
            font-weight: bold;
            color: #5A3C1E;
            font-size: 16px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        `;
        
        const infoElement = profileSection.querySelector('.info');
        if (infoElement) {
            infoElement.style.position = 'relative';
            infoElement.appendChild(thanksCounter);
        }
    }
    
    thanksCounter.textContent = `Помог ${count} ${getThanksWordForm(count)}`;
}

function getThanksWordForm(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'раз';
    } else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
        return 'раза';
    } else {
        return 'раз';
    }
}

function formatPhoneNumber(phone) {
    if (!phone) return 'Не указан';
    
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11 && cleaned.startsWith('7') || cleaned.startsWith('8')) {
        const countryCode = cleaned.startsWith('7') ? '+7' : '8';
        const rest = cleaned.slice(1);
        
        if (rest.length === 10) {
            return `${countryCode} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 8)} ${rest.slice(8)}`;
        }
    }
    
    return phone;
}

function updateProfileUI(user) {
    const nameElement = document.querySelector('.profile-section .name');
    if (nameElement) {
        const fullName = [user.surname, user.name, user.patronymic]
            .filter(Boolean)
            .join(' ');
        nameElement.textContent = fullName;
    }
    
    const avatarImg = document.querySelector('.profile-section .avatar');
    if (avatarImg && user.avatar_presigned_url) {
        avatarImg.src = user.avatar_presigned_url;
        avatarImg.onerror = function() {
            this.src = './img/profile.png';
        };
    }

    const contactsElement = document.getElementById('userContacts');
    if (contactsElement) {
        let contactsHTML = '';
        
        if (user.phone_number) {
            const formattedPhone = formatPhoneNumber(user.phone_number);
            contactsHTML += `Контактные данные: ${formattedPhone}`;
        }
        
        if (!contactsHTML) {
            contactsHTML = 'Контактные данные не указаны';
        }
        
        contactsElement.innerHTML = contactsHTML;
    }

    const aboutElement = document.getElementById('userAbout');
    if (aboutElement) {
        let aboutHTML = '';
        
        if (user.city) {
            if (aboutHTML) aboutHTML += '<br><br>';
            aboutHTML += `Город: ${user.city}`;
        }
        
        if (user.about) {
            if (aboutHTML) aboutHTML += '<br><br>';
            aboutHTML += `О себе: ${user.about}`;
        }
        
        if (!aboutHTML) {
            aboutHTML += `О себе:`;
        }
        
        aboutElement.innerHTML = aboutHTML;
    }
    
    addLogoutButton();
}

function addLogoutButton() {
    const infoElement = document.querySelector('.profile-section .info');
    if (!infoElement) return;
    
    if (infoElement.querySelector('.logout-profile-btn')) return;
    
    const logoutButton = document.createElement('button');
    logoutButton.className = 'logout-profile-btn';
    logoutButton.innerHTML = `
        <i class="fas fa-sign-out-alt"></i> Выйти
    `;
    logoutButton.style.cssText = `
        margin-top: 20px;
        padding: 10px 20px;
        color: #000000ff;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-family: "Montserrat", sans-serif;
        font-weight: 600;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
    `;
    
    logoutButton.addEventListener('click', function() {
        if (confirm('Вы действительно хотите выйти?')) {
            logout();
        }
    });
    
    infoElement.appendChild(logoutButton);
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
        showNotification('Ошибка соединения', 'error');
        return false;
    }
}

function setupElderForm() {
    const showFormBtn = document.getElementById('showFormBtn');
    const formContainer = document.getElementById('relativeFormContainer');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const elderForm = document.getElementById('relativeForm');
    eldersList = document.getElementById('relativesList');

    if (!showFormBtn || !formContainer || !cancelFormBtn || !elderForm) {
        return;
    }

    elderForm.addEventListener('submit', handleElderFormSubmit);
    showFormBtn.addEventListener('click', showElderForm);
    cancelFormBtn.addEventListener('click', hideElderForm);
    
    const avatarInput = document.getElementById('elder-avatar-upload');
    const avatarPreview = document.getElementById('elderAvatarPreview');
    
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    avatarPreview.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function setupEventListeners() {
    document.addEventListener('keydown', function(event) {
        const formContainer = document.getElementById('relativeFormContainer');
        if (event.key === 'Escape' && formContainer && formContainer.style.display === 'block') {
            hideElderForm();
        }
    });
}

function showElderForm() {
    const formContainer = document.getElementById('relativeFormContainer');
    const showFormBtn = document.getElementById('showFormBtn');
    if (formContainer && showFormBtn) {
        formContainer.style.display = 'block';
        showFormBtn.style.display = 'none';
        document.getElementById('fullName').focus();
    }
}

function hideElderForm() {
    const formContainer = document.getElementById('relativeFormContainer');
    const showFormBtn = document.getElementById('showFormBtn');
    if (formContainer && showFormBtn) {
        formContainer.style.display = 'none';
        showFormBtn.style.display = 'block';
        
        const elderForm = document.getElementById('relativeForm');
        if (elderForm) {
            elderForm.reset();
            delete elderForm.dataset.editId;
        }
    }
}

function validateElderForm(formData) {
    const errors = [];
    
    if (!formData.fullName.trim()) errors.push('ФИО обязательно для заполнения');
    if (!formData.birthYear.trim()) errors.push('Дата рождения обязательна для заполнения');
    if (!formData.healthStatus.trim()) errors.push('Состояние здоровья обязательно для заполнения');
    if (!formData.diseases.trim()) errors.push('Заболевания обязательны для заполнения');
    if (!formData.address.trim()) errors.push('Адрес проживания обязателен для заполнения');
    if (!formData.features.trim()) errors.push('Особенности обязательны для заполнения');
    if (!formData.hobbies.trim()) errors.push('Увлечения обязательны для заполнения');
    
    return errors;
}

async function handleElderFormSubmit(event) {
    event.preventDefault();
    
    const elderForm = event.target;
    
    if (elderForm.classList.contains('submitting')) return;
    elderForm.classList.add('submitting');
    
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
    
    const errors = validateElderForm(formData);
    if (errors.length > 0) {
        showNotification('Пожалуйста, заполните все обязательные поля:\n' + errors.join('\n'), 'error');
        elderForm.classList.remove('submitting');
        return;
    }
    
    const saveBtn = elderForm.querySelector('.save-btn');
    const originalText = saveBtn.textContent;
    const isEditMode = elderForm.dataset.editId;
    
    const avatarInput = document.getElementById('elder-avatar-upload');
    const avatarFile = avatarInput && avatarInput.files.length > 0 ? avatarInput.files[0] : null;
    
    saveBtn.textContent = isEditMode ? 'Обновление...' : 'Сохранение...';
    saveBtn.disabled = true;
    
    try {
        const success = isEditMode 
            ? await updateElder(elderForm.dataset.editId, formData, avatarFile)
            : await createElder(formData, avatarFile);
        
        if (success) {
            await loadElders();
            hideElderForm();
        }
    } catch (error) {
        showNotification('Ошибка: ' + error.message, 'error');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        elderForm.classList.remove('submitting');
    }
}

async function loadElders() {
    if (isLoadingElders) {
        return;
    }
    
    isLoadingElders = true;
    
    try {
        const response = await fetchWithAuth('/api/v1/elders/me');
        
        if (response.ok) {
            const elders = await response.json();
            
            if (eldersList) {
                const cards = eldersList.querySelectorAll('.elder-card');
                cards.forEach(card => card.remove());
            }
            
            if (Array.isArray(elders) && elders.length > 0) {
                const uniqueElders = elders.filter((elder, index, self) =>
                    index === self.findIndex(e => e.id === elder.id)
                );
                
                uniqueElders.forEach(elder => {
                    addElderToList(elder);
                });
            } else {
                updateEmptyListState();
            }
            
        } else if (response.status === 401) {
            showNotification('Сессия истекла. Пожалуйста, войдите заново.', 'error');
        }
    } catch (error) {
        showNotification('Ошибка загрузки данных. Попробуйте обновить страницу.', 'error');
        updateEmptyListState();
    } finally {
        isLoadingElders = false;
    }
}

function addElderToList(elderData) {
    if (!eldersList) {
        return;
    }

    const existingCard = eldersList.querySelector(`.elder-card[data-id="${elderData.id}"]`);
    if (existingCard) {
        return;
    }

    const displayData = {
        id: elderData.id,
        fullName: elderData.full_name || elderData.fullName || 'Не указано',
        birthYear: convertDateToDisplayFormat(elderData.birthday || elderData.birthYear),
        healthStatus: elderData.health_status || elderData.healthStatus || 'Не указано',
        physicalLimitations: elderData.physical_limitations || elderData.physicalLimitations || 'нет',
        diseases: elderData.disease || elderData.diseases || 'Не указано',
        address: elderData.address || 'Не указан',
        features: elderData.features || 'Не указано',
        hobbies: elderData.hobbies || 'Не указано',
        comment: elderData.comments || elderData.comment || '',
        avatarUrl: elderData.avatar_presigned_url || null
    };

    const elderCard = document.createElement('div');
    elderCard.className = 'elder-card';
    elderCard.dataset.id = displayData.id;
    
    const avatarHtml = displayData.avatarUrl 
        ? `<img class="elder-avatar" src="${escapeHtml(displayData.avatarUrl)}" alt="Аватар" onerror="this.src='./img/profile.png'">`
        : `<img class="elder-avatar" src="./img/profile.png" alt="Аватар">`;
    
    elderCard.innerHTML = `
        <div class="elder-card-content">
            <div class="elder-header">
                <div class="elder-header-left">
                    ${avatarHtml}
                    <h3 class="elder-name">${escapeHtml(displayData.fullName)}</h3>
                </div>
                <div class="elder-actions">
                    <button class="edit-btn" data-id="${displayData.id}">
                        <img class="elder-card-edit" src="./img/edit.svg" alt="Редактировать" id="edit-avatar-preview">
                    </button>
                    <button class="delete-btn" data-id="${displayData.id}">
                        <img class="elder-card-delete" src="./img/trash.svg" alt="Удалить" id="edit-avatar-preview">
                    </button>
                </div>
            </div>
            
            <div class="elder-info-grid">
                <div class="info-row">
                    <span class="info-label">Дата рождения:</span>
                    <span class="info-value">${escapeHtml(displayData.birthYear)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Состояние здоровья:</span>
                    <span class="info-value">${escapeHtml(displayData.healthStatus)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Физические ограничения:</span>
                    <span class="info-value">${escapeHtml(displayData.physicalLimitations)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Заболевания:</span>
                    <span class="info-value">${escapeHtml(displayData.diseases)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Адрес проживания:</span>
                    <span class="info-value">${escapeHtml(displayData.address)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Особенности:</span>
                    <span class="info-value">${escapeHtml(displayData.features)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Увлечения:</span>
                    <span class="info-value">${escapeHtml(displayData.hobbies)}</span>
                </div>
            </div>
            
            ${displayData.comment ? `
            <div class="elder-comment">
                <span class="comment-label">Комментарий:</span>
                <span class="comment-text">${escapeHtml(displayData.comment)}</span>
            </div>
            ` : ''}
        </div>
    `;
    
    eldersList.appendChild(elderCard);
    attachElderCardEvents(elderCard);
    updateEmptyListState();
}

function attachElderCardEvents(card) {
    const editBtn = card.querySelector('.edit-btn');
    const deleteBtn = card.querySelector('.delete-btn');
    
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            const elderId = this.getAttribute('data-id');
            editElder(elderId);
        });
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            const elderId = this.getAttribute('data-id');
            deleteElder(elderId);
        });
    }
}

function updateEmptyListState() {
    const emptyState = document.getElementById('emptyState');
    if (!eldersList || !emptyState) return;
    
    const hasCards = eldersList.querySelectorAll('.elder-card').length > 0;
    emptyState.style.display = hasCards ? 'none' : 'block';
}

async function editElder(elderId) {
    try {
        const allForms = document.querySelectorAll('.editing-form');
        allForms.forEach(form => {
            const cardId = form.dataset.elderId;
            if (cardId) {
                const card = document.querySelector(`.elder-card[data-id="${cardId}"]`);
                if (card && !card.classList.contains('editing')) {
                    card.style.display = '';
                }
            }
            form.remove();
        });
        
        const elderCard = document.querySelector(`.elder-card[data-id="${elderId}"]`);
        if (!elderCard) {
            throw new Error('Карточка не найдена');
        }
        
        const response = await fetchWithAuth(`/api/v1/elders/${elderId}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить данные');
        }
        const elderData = await response.json();
        
        const currentData = {
            fullName: elderData.full_name || 'Не указано',
            birthYear: convertDateToDisplayFormat(elderData.birthday),
            healthStatus: elderData.health_status || 'Не указано',
            physicalLimitations: elderData.physical_limitations || 'нет',
            diseases: elderData.disease || 'Не указано',
            address: elderData.address || 'Не указан',
            features: elderData.features || 'Не указано',
            hobbies: elderData.hobbies || 'Не указано',
            comment: elderData.comments || '',
            avatarUrl: elderData.avatar_presigned_url || null
        };
        
        elderCard.classList.add('editing');
        
        const avatarHtml = currentData.avatarUrl 
            ? `<img class="elder-avatar-edit" src="${escapeHtml(currentData.avatarUrl)}" alt="Аватар" id="edit-avatar-preview" onerror="this.src='./img/profile.png'">`
            : `<img class="elder-avatar-edit" src="./img/profile.png" alt="Аватар" id="edit-avatar-preview">`;
        
        elderCard.innerHTML = `
            <div class="elder-card-content">
                <form class="relative-form editing-form-inline" data-elder-id="${elderId}">
                    <div class="relative-card-content">
                        <div class="avatar_photo small">
                            <label for="edit-elder-avatar-upload">
                                ${avatarHtml}
                            </label>
                            <input id="edit-elder-avatar-upload" type="file" accept="image/*" class="avatar-input" />
                        </div>
                        <div class="form-fields-wrapper">
                            <div class="form-group">
                                <label for="edit-fullName">ФИО:*</label>
                                <input type="text" id="edit-fullName" value="${escapeHtml(currentData.fullName)}" required placeholder="Введите ФИО">
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="edit-birthYear">Дата рождения:*</label>
                                    <input type="text" id="edit-birthYear" value="${escapeHtml(currentData.birthYear)}" required placeholder="16.11.1960">
                                </div>

                                <div class="form-group">
                                    <label for="edit-healthStatus">Состояние здоровья:*</label>
                                    <input type="text" id="edit-healthStatus" value="${escapeHtml(currentData.healthStatus)}" required
                                        placeholder="Например: хорошее">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="edit-physicalLimitations">Физические ограничения:</label>
                                    <input type="text" id="edit-physicalLimitations" value="${escapeHtml(currentData.physicalLimitations)}"
                                        placeholder="Например: нет">
                                </div>

                                <div class="form-group">
                                    <label for="edit-diseases">Заболевания:*</label>
                                    <input type="text" id="edit-diseases" value="${escapeHtml(currentData.diseases)}" required
                                        placeholder="Например: здоровая">
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="edit-address">Адрес проживания:*</label>
                                <input type="text" id="edit-address" value="${escapeHtml(currentData.address)}" required
                                    placeholder="г. Екатеринбург, ул.Бебеля 170, кв 30">
                            </div>

                            <div class="form-group">
                                <label for="edit-features">Особенности:*</label>
                                <input type="text" id="edit-features" value="${escapeHtml(currentData.features)}" required placeholder="-">
                            </div>

                            <div class="form-group">
                                <label for="edit-hobbies">Увлечения:*</label>
                                <input type="text" id="edit-hobbies" value="${escapeHtml(currentData.hobbies)}" required placeholder="вязание">
                            </div>

                            <div class="form-group">
                                <label for="edit-comment">Комментарий:</label>
                                <textarea id="edit-comment" rows="2"
                                    placeholder="Дополнительная информация">${escapeHtml(currentData.comment)}</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="cancel-btn cancel-edit-btn">Отмена</button>
                        <button type="submit" class="save-btn">Сохранить изменения</button>
                    </div>
                </form>
            </div>
        `;
        
        const form = elderCard.querySelector('.relative-form');
        const cancelBtn = elderCard.querySelector('.cancel-edit-btn');
        const avatarInput = elderCard.querySelector('#edit-elder-avatar-upload');
        const avatarPreview = elderCard.querySelector('#edit-avatar-preview');
        
        if (avatarInput && avatarPreview) {
            avatarInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        avatarPreview.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleEditSubmit(elderId);
        });
        
        cancelBtn.addEventListener('click', async function() {
            elderCard.classList.remove('editing');
            await loadElders();
        });
        
    } catch (error) {
        showNotification('Ошибка при загрузке данных: ' + error.message, 'error');
    }
}

async function handleEditSubmit(elderId) {
    const formData = {
        fullName: document.getElementById('edit-fullName').value.trim(),
        birthYear: document.getElementById('edit-birthYear').value.trim(),
        healthStatus: document.getElementById('edit-healthStatus').value.trim(),
        physicalLimitations: document.getElementById('edit-physicalLimitations').value.trim(),
        diseases: document.getElementById('edit-diseases').value.trim(),
        address: document.getElementById('edit-address').value.trim(),
        features: document.getElementById('edit-features').value.trim(),
        hobbies: document.getElementById('edit-hobbies').value.trim(),
        comment: document.getElementById('edit-comment').value.trim()
    };
    
    const errors = validateElderForm(formData);
    if (errors.length > 0) {
        showNotification('Пожалуйста, заполните все обязательные поля:\n' + errors.join('\n'), 'error');
        return;
    }
    
    const avatarInput = document.getElementById('edit-elder-avatar-upload');
    const avatarFile = avatarInput && avatarInput.files.length > 0 ? avatarInput.files[0] : null;
    
    try {
        const success = await updateElder(elderId, formData, avatarFile);
        if (success) {
            await loadElders();
        }
    } catch (error) {
        showNotification('Ошибка при обновлении данных: ' + error.message, 'error');
        const elderCard = document.querySelector(`.elder-card[data-id="${elderId}"]`);
        if (elderCard) {
            elderCard.classList.remove('editing');
            await loadElders();
        }
    }
}

async function createElder(formData, avatarFile) {
    const formDataToSend = new FormData();
    
    formDataToSend.append('full_name', formData.fullName);
    formDataToSend.append('birthday', convertDateToApiFormat(formData.birthYear));
    formDataToSend.append('health_status', formData.healthStatus);
    formDataToSend.append('physical_limitations', formData.physicalLimitations);
    formDataToSend.append('disease', formData.diseases);
    formDataToSend.append('address', formData.address);
    formDataToSend.append('features', formData.features);
    formDataToSend.append('hobbies', formData.hobbies);
    formDataToSend.append('comments', formData.comment);
    
    if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
    }
    
    try {
        const response = await fetchWithAuth('/api/v1/elders', {
            method: 'POST',
            body: formDataToSend
        });
        
        if (response.ok) {
            showNotification('Пожилой успешно добавлен!', 'success');
            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        throw error;
    }
}

async function updateElder(elderId, formData, avatarFile) {
    const formDataToSend = new FormData();
    
    formDataToSend.append('full_name', formData.fullName);
    formDataToSend.append('birthday', convertDateToApiFormat(formData.birthYear));
    formDataToSend.append('health_status', formData.healthStatus);
    formDataToSend.append('physical_limitations', formData.physicalLimitations);
    formDataToSend.append('disease', formData.diseases);
    formDataToSend.append('address', formData.address);
    formDataToSend.append('features', formData.features);
    formDataToSend.append('hobbies', formData.hobbies);
    formDataToSend.append('comments', formData.comment);
    
    if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
    }
    
    try {
        const response = await fetchWithAuth(`/api/v1/elders/${elderId}`, {
            method: 'PATCH',
            body: formDataToSend
        });
        
        if (response.ok) {
            showNotification('Пожилой успешно обновлен!', 'success');
            return true;
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        throw error;
    }
}

async function deleteElder(elderId) {
    if (!confirm('Вы уверены, что хотите удалить этого пожилого?')) {
        return;
    }
    
    try {
        const response = await fetchWithAuth(`/api/v1/elders/${elderId}`, {
            method: 'DELETE'
        });
        
        if (response.ok || response.status === 204) {
            const card = eldersList.querySelector(`.elder-card[data-id="${elderId}"]`);
            if (card) card.remove();
            showNotification('Пожилой успешно удален!', 'success');
            updateEmptyListState();
        } else if (response.status === 400) {
            const errorData = await response.json();
            
            if (errorData.detail?.includes("existing requests")) {
                showNotification('Невозможно удалить пожилого с активными заявками', 'error');
            } else {
                throw new Error(errorData.detail || 'Не удалось удалить пожилого');
            }
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        showNotification('Ошибка при удалении: ' + error.message, 'error');
    }
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