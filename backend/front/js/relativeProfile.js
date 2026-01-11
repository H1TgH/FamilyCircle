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
                <div class="elder-main-info">
                    <div class="elder-avatar-wrapper">
                        ${avatarHtml}
                    </div>
                    <div class="elder-primary-info">
                        <div class="primary-info-row">
                            <span class="primary-label"></span>
                            <span class="primary-value elder-name">${escapeHtml(displayData.fullName)}</span>
                        </div>
                        <div class="primary-info-row">
                            <span class="primary-label">Дата рождения:</span>
                            <span class="primary-value">${escapeHtml(displayData.birthYear)}</span>
                        </div>
                        <div class="health-details">
                            <div class="health-detail">
                                <span class="primary-label">Состояние здоровья</span>
                                <span class="detail-label">Физические ограничения:</span>
                                <span class="detail-value">${escapeHtml(displayData.physicalLimitations)};</span>
                            </div>
                            <div class="health-detail diseases-container">
                                <span class="detail-label">Заболевания:</span>
                                <span class="detail-value">${escapeHtml(displayData.diseases)}</span>
                            </div>
                        </div>
                        <div class="primary-info-row">
                            <span class="primary-label">Адрес проживания:</span>
                            <span class="primary-value">${escapeHtml(displayData.address)}</span>
                        </div>
                    </div>
                </div>
                <div class="elder-actions">
                    <button class="edit-btn" data-id="${displayData.id}">
                        <img class="elder-card-edit" src="./img/edit.svg" alt="Редактировать">
                    </button>
                    <button class="delete-btn" data-id="${displayData.id}">
                        <img class="elder-card-delete" src="./img/trash.svg" alt="Удалить">
                    </button>
                </div>
            </div>
            
            <div class="elder-secondary-info">
                <div class="secondary-info-row">
                    <span class="secondary-label">Особенности:</span>
                    <span class="secondary-value">${escapeHtml(displayData.features)}</span>
                </div>
                <div class="secondary-info-row">
                    <span class="secondary-label">Увлечения:</span>
                    <span class="secondary-value">${escapeHtml(displayData.hobbies)}</span>
                </div>
                <div class="secondary-info-row comment-row">
                    <span class="secondary-label">Комментарий:</span>
                    <span class="secondary-value">${escapeHtml(displayData.comment)}</span>
                </div>
            </div>
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
            ? `<img class="elder-avatar" src="${escapeHtml(currentData.avatarUrl)}" alt="Аватар" onerror="this.src='./img/profile.png'">`
            : `<img class="elder-avatar" src="./img/profile.png" alt="Аватар">`;
        
        elderCard.innerHTML = `
            <div class="elder-card-content editing-form" data-elder-id="${elderId}">
                <div class="elder-header">
                    <div class="elder-main-info">
                        <div class="elder-avatar-wrapper">
                            <label for="edit-elder-avatar-upload">
                                ${avatarHtml}
                            </label>
                            <input id="edit-elder-avatar-upload" type="file" accept="image/*" class="avatar-input" style="display: none;" />
                        </div>
                        <div class="elder-primary-info">
                            <div class="primary-info-row">
                                <span class="primary-label"></span>
                                <input type="text" class="elder-name-input" value="${escapeHtml(currentData.fullName)}" placeholder="ФИО" required>
                            </div>
                            <div class="primary-info-row">
                                <span class="primary-label">Дата рождения:</span>
                                <input type="text" class="primary-value-input" value="${escapeHtml(currentData.birthYear)}" placeholder="16.11.1960" required>
                            </div>
                            <div class="health-details">
                                <div class="health-detail">
                                    <span class="detail-label">Физические ограничения:</span>
                                    <input type="text" class="detail-value-input" value="${escapeHtml(currentData.physicalLimitations)}" placeholder="нет">
                                </div>
                                <div class="health-detail diseases-container">
                                    <span class="detail-label">Заболевания:</span>
                                    <input type="text" class="detail-value-input" value="${escapeHtml(currentData.diseases)}" placeholder="Не указано" required>
                                </div>
                            </div>
                            <div class="primary-info-row">
                                <span class="primary-label">Адрес проживания:</span>
                                <input type="text" class="primary-value-input" value="${escapeHtml(currentData.address)}" placeholder="Не указан" required>
                            </div>
                        </div>
                    </div>
                    <div class="elder-actions">
                        <button type="submit" class="save-edit-btn" data-id="${elderId}">
                            <img src="./img/save.svg" alt="Сохранить">
                        </button>
                        <button type="button" class="cancel-edit-btn" data-id="${elderId}">
                            <img src="./img/cancel.svg" alt="Отмена">
                        </button>
                    </div>
                </div>
                
                <div class="elder-secondary-info">
                    <div class="secondary-info-row">
                        <span class="secondary-label">Особенности:</span>
                        <input type="text" class="secondary-value-input" value="${escapeHtml(currentData.features)}" placeholder="Не указано" required>
                    </div>
                    <div class="secondary-info-row">
                        <span class="secondary-label">Увлечения:</span>
                        <input type="text" class="secondary-value-input" value="${escapeHtml(currentData.hobbies)}" placeholder="Не указано" required>
                    </div>
                    <div class="secondary-info-row comment-row">
                        <span class="secondary-label">Комментарий:</span>
                        <textarea class="secondary-value-textarea" rows="2" placeholder="Дополнительная информация">${escapeHtml(currentData.comment)}</textarea>
                    </div>
                </div>
            </div>
        `;
        
        const saveBtn = elderCard.querySelector('.save-edit-btn');
        const cancelBtn = elderCard.querySelector('.cancel-edit-btn');
        const avatarInput = elderCard.querySelector('#edit-elder-avatar-upload');
        
        saveBtn.addEventListener('click', async function() {
            await handleEditSubmit(elderId);
        });
        
        cancelBtn.addEventListener('click', async function() {
            elderCard.classList.remove('editing');
            await loadElders();
        });
        
        avatarInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const avatarImg = elderCard.querySelector('.elder-avatar');
                    if (avatarImg) {
                        avatarImg.src = e.target.result;
                    }
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
        
        const avatarLabel = elderCard.querySelector('.elder-avatar-wrapper label');
        if (avatarLabel) {
            avatarLabel.addEventListener('click', function(e) {
                e.preventDefault();
                avatarInput.click();
            });
        }
        
    } catch (error) {
        showNotification('Ошибка при загрузке данных: ' + error.message, 'error');
    }
}

async function handleEditSubmit(elderId) {
    const elderCard = document.querySelector(`.elder-card[data-id="${elderId}"]`);
    if (!elderCard) return;
    
    const formData = {
        fullName: elderCard.querySelector('.elder-name-input').value.trim(),
        birthYear: elderCard.querySelector('.primary-value-input').value.trim(),
        physicalLimitations: elderCard.querySelector('.health-detail:first-child .detail-value-input').value.trim(),
        diseases: elderCard.querySelector('.diseases-container .detail-value-input').value.trim(),
        address: elderCard.querySelector('.primary-info-row:last-child .primary-value-input').value.trim(),
        features: elderCard.querySelector('.secondary-info-row:first-child .secondary-value-input').value.trim(),
        hobbies: elderCard.querySelector('.secondary-info-row:nth-child(2) .secondary-value-input').value.trim(),
        comment: elderCard.querySelector('.secondary-value-textarea').value.trim()
    };
    
    const errors = validateElderForm(formData);
    if (errors.length > 0) {
        showNotification('Пожалуйста, заполните все обязательные поля:\n' + errors.join('\n'), 'error');
        return;
    }
    
    const avatarInput = elderCard.querySelector('#edit-elder-avatar-upload');
    const avatarFile = avatarInput && avatarInput.files.length > 0 ? avatarInput.files[0] : null;
    
    try {
        const success = await updateElder(elderId, formData, avatarFile);
        if (success) {
            await loadElders();
        }
    } catch (error) {
        showNotification('Ошибка при обновлении данных: ' + error.message, 'error');
        elderCard.classList.remove('editing');
        await loadElders();
    }
}

async function createElder(formData, avatarFile) {
    const formDataToSend = new FormData();
    
    formDataToSend.append('full_name', formData.fullName);
    formDataToSend.append('birthday', convertDateToApiFormat(formData.birthYear));
    formDataToSend.append('health_status', 'хорошее');
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
    formDataToSend.append('health_status', 'хорошее');
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