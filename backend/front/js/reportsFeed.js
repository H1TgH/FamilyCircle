console.log('Reports feed script loaded');

document.addEventListener('DOMContentLoaded', function() {
    loadReportsFeed();
    setupCreatePostButton();
});

async function loadReportsFeed() {
    const postList = document.querySelector('.post-list');
    if (postList) {
        postList.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading-spinner"></div><p>Загрузка отчетов...</p></div>';
    }
    
    try {
        const response = await fetchWithAuth('/api/v1/reports/feed');
        if (response.ok) {
            const reports = await response.json();
            const uniqueReports = reports.filter((report, index, self) =>
                index === self.findIndex(r => r.id === report.id)
            );
            await renderReportsFeed(uniqueReports);
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось загрузить отчеты' }));
            showNotification('Ошибка загрузки отчетов: ' + (error.detail || 'Попробуйте обновить страницу'), 'error');
            if (postList) {
                postList.innerHTML = '<p style="text-align: center; padding: 40px; color: #f44336;">Ошибка загрузки отчетов</p>';
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки ленты:', error);
        showNotification('Ошибка соединения с сервером. Проверьте подключение к интернету.', 'error');
        if (postList) {
            postList.innerHTML = '<p style="text-align: center; padding: 40px; color: #f44336;">Ошибка соединения</p>';
        }
    }
}

async function renderReportsFeed(reports) {
    const postList = document.querySelector('.post-list');
    if (!postList) {
        console.error('Контейнер постов не найден');
        return;
    }
    
    postList.innerHTML = '';
    
    const uniqueReports = reports.filter((report, index, self) =>
        index === self.findIndex(r => r.id === report.id)
    );
    
    for (const report of uniqueReports) {
        const reportCard = await createReportCard(report);
        postList.appendChild(reportCard);
    }
}

function getRequestStatusText(status) {
    const statusMap = {
        'open': 'Не в работе',
        'in_progress': 'В работе',
        'done': 'Закрыто'
    };
    return statusMap[status] || status;
}

async function createReportCard(report) {
    console.log('=== СОЗДАНИЕ КАРТОЧКИ ПОСТА ===');
    
    const currentUserId = getUserId();
    console.log('Текущий ID пользователя:', currentUserId);
    console.log('Имя автора:', report.author_name, report.author_surname);
    
    let isOwner = false;
    let avatarUrl = './img/avatar.png';
    let reportAuthorId = report.author_id;
    
    if (!reportAuthorId) {
        try {
            console.log('author_id не найден, пытаемся получить данные текущего пользователя');
            const userResponse = await fetchWithAuth('/api/v1/users/me');
            if (userResponse.ok) {
                const userData = await userResponse.json();
                console.log('Данные текущего пользователя:', userData);
                
                const sameName = userData.name === report.author_name;
                const sameSurname = userData.surname === report.author_surname;
                isOwner = sameName && sameSurname;
                
                console.log('Сравнение по имени:', sameName);
                console.log('Сравнение по фамилии:', sameSurname);
                console.log('Это владелец?', isOwner);
                
                if (isOwner && !reportAuthorId) {
                    reportAuthorId = userData.id;
                }
                
                avatarUrl = await getAuthorAvatarUrl(userData.id);
            }
        } catch (error) {
            console.error('Ошибка получения данных пользователя:', error);
        }
    } else {
        isOwner = currentUserId && reportAuthorId && 
                  String(currentUserId) === String(reportAuthorId);
        console.log('Сравнение по author_id:', isOwner);
        
        avatarUrl = await getAuthorAvatarUrl(reportAuthorId);
    }
    
    console.log('Аватар URL:', avatarUrl);
    console.log('=============================');
    
    const card = document.createElement('section');
    card.className = 'post-card';
    card.dataset.id = report.id;
    
    const reportDate = new Date(report.created_at);
    const timeAgo = getTimeAgo(reportDate);
    
    let imagesHTML = '';
    if (report.images && report.images.length > 0) {
        imagesHTML = `
            <div class="post-image-wrapper">
                <img src="${report.images[0].presigned_url}" class="post-image" alt="Фото отчета" onerror="this.src='./img/default-image.png'">
            </div>
        `;
    }
    
    let taskInfo = '';
    if (report.request_task_name) {
        const statusText = getRequestStatusText(report.request_status);
        taskInfo = `
            <p class="post-task">Задание: ${escapeHtml(report.request_task_name)}</p>
            <p class="post-status">Статус заявки: ${statusText}</p>
        `;
    } else {
        taskInfo = '<p class="post-status">Статус: опубликовано</p>';
    }
    
    card.innerHTML = `
        <div class="post-header">
            <div class="post-user">
                <img src="${avatarUrl}" class="post-avatar" alt="Аватар" onerror="this.onerror=null; this.src='./img/avatar.png'">
                <div class="post-user-info">
                    <h3 class="post-name">${escapeHtml(report.author_name)} ${escapeHtml(report.author_surname)}</h3>
                    ${taskInfo}
                </div>
            </div>
        </div>
        <p class="post-text">${escapeHtml(report.description)}</p>
        ${imagesHTML}
        <div class="post-actions">
            <div class="post-icon-wrapper">
                <img src="./img/heart.svg" class="post-icon like-icon" alt="Лайк" data-report-id="${report.id}">
            </div>
            <div class="post-icon-wrapper">
                <img src="./img/chat.svg" class="post-icon comment-icon" alt="Комментарий" data-report-id="${report.id}">
            </div>
        </div>
        <p class="post-time">${timeAgo}</p>
    `;
    
    const likeIcon = card.querySelector('.like-icon');
    const commentIcon = card.querySelector('.comment-icon');
    
    if (likeIcon) {
        likeIcon.addEventListener('click', function() {
            const reportId = this.getAttribute('data-report-id');
            handleLike(reportId);
        });
    }
    
    if (commentIcon) {
        commentIcon.addEventListener('click', function() {
            const reportId = this.getAttribute('data-report-id');
            showComments(reportId);
        });
    }
    
    if (isOwner) {
        console.log('✅ Добавляю шестеренку для поста', report.id);
        
        const gearButton = document.createElement('button');
        gearButton.className = 'post-actions-gear';
        gearButton.innerHTML = '<i class="fas fa-cog"></i>';
        card.appendChild(gearButton);
        
        const actionMenu = document.createElement('div');
        actionMenu.className = 'post-action-menu';
        actionMenu.innerHTML = `
            <button class="post-action-item" data-action="edit">Изменить</button>
            <button class="post-action-item delete" data-action="delete">Удалить</button>
        `;
        card.appendChild(actionMenu);

        gearButton.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('Клик по шестеренке для поста', report.id);
            
            const allMenus = document.querySelectorAll('.post-action-menu');
            allMenus.forEach(menu => {
                if (menu !== actionMenu) {
                    menu.classList.remove('active');
                }
            });
            
            actionMenu.classList.toggle('active');
            
            function closeMenuHandler(e) {
                if (!actionMenu.contains(e.target) && !gearButton.contains(e.target)) {
                    actionMenu.classList.remove('active');
                    document.removeEventListener('click', closeMenuHandler);
                }
            }
            
            if (actionMenu.classList.contains('active')) {
                document.addEventListener('click', closeMenuHandler);
            }
        });
        
        const editBtn = actionMenu.querySelector('[data-action="edit"]');
        const deleteBtn = actionMenu.querySelector('[data-action="delete"]');
        
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('Нажата кнопка Изменить для отчета', report.id);
            editReport(report.id);
            actionMenu.classList.remove('active');
        });
        
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('Нажата кнопка Удалить для отчета', report.id);
            deleteReport(report.id);
            actionMenu.classList.remove('active');
        });
        
    } else {
        console.log('❌ Это не мой пост, шестеренку не добавляю');
    }
    
    return card;
}

function getUserId() {
    const accessToken = localStorage.getItem('access_token');
    console.log('Access token:', accessToken ? 'есть' : 'нет');
    
    if (!accessToken) {
        console.log('Токен не найден');
        return null;
    }
    
    try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        console.log('Payload из токена:', payload);
        console.log('ID пользователя (sub):', payload.sub);
        console.log('Роль пользователя:', payload.role);
        return payload.sub;
    } catch (e) {
        console.error('Ошибка при разборе токена:', e);
        return null;
    }
}

function togglePostActionMenu(button, reportId) {
    const menu = button.nextElementSibling;
    const allMenus = document.querySelectorAll('.post-action-menu');
    
    allMenus.forEach(m => {
        if (m !== menu) {
            m.classList.remove('active');
        }
    });
    
    menu.classList.toggle('active');
    
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target) && !button.contains(e.target)) {
            menu.classList.remove('active');
            document.removeEventListener('click', closeMenu);
        }
    });
}

async function editReport(reportId) {
    try {
        const response = await fetchWithAuth(`/api/v1/reports/${reportId}`);
        if (response.ok) {
            const report = await response.json();
            showEditPostModal(report);
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось загрузить пост' }));
            showNotification('Ошибка: ' + (error.detail || 'Не удалось загрузить пост'), 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки поста:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

function showEditPostModal(report) {
    editingReportId = report.id;
    imagesToDelete = [];
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'editPostOverlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'editPostModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" id="closeEditModal">&times;</button>
            <h3 class="modal-title">Редактировать пост</h3>
            
            <form class="report-form" id="editPostForm">
                <div class="form-group">
                    <textarea id="editPostDescription" class="modal-input" rows="3" 
                        placeholder="Делитесь своими впечатлениями, общайтесь, благодарите..." required>${escapeHtml(report.description || '')}</textarea>
                </div>
                
                <div class="form-group">
                    <div class="existing-images-section">
                        <p>Существующие фотографии:</p>
                        <div class="existing-images" id="existingImages">
                            ${report.images && report.images.length > 0 ? 
                                report.images.map(img => `
                                    <div class="image-preview-item">
                                        <img src="${img.presigned_url}" alt="Фото" onerror="this.src='./img/default-image.png'">
                                        <button type="button" class="remove-image" data-id="${img.id}">×</button>
                                    </div>
                                `).join('') : 
                                '<p style="color: #888; font-size: 14px;">Нет фотографий</p>'
                            }
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <div class="modal-upload-area">
                        <p>Добавить новые фотографии</p>
                        <input type="file" id="newImages" multiple accept="image/*">
                        <div id="imagePreviewEdit" class="image-preview" style="margin-top: 10px;"></div>
                    </div>
                </div>
            </form>
            
            <div class="modal-actions">
                <button type="button" class="cancel-btn" id="cancelEditBtn">Отмена</button>
                <button type="button" class="modal-submit" id="savePostBtn">Сохранить изменения</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    setTimeout(() => initEditPostModal(report), 0);
}

async function getAuthorAvatarUrl(userId) {
    try {
        const response = await fetchWithAuth(`/api/v1/users/${userId}`);
        if (response.ok) {
            const userData = await response.json();

            if (userData.avatar_url) {
                return userData.avatar_url;
            } else if (userData.avatar_presigned_url) {
                return userData.avatar_presigned_url;
            } else if (userData.avatar_key) {
                return `http://localhost:9000/avatars/${userData.avatar_key}`;
            }
        }
    } catch (error) {
        console.error('Ошибка получения аватара пользователя:', error);
    }
    
    return './img/profile.png';
}


function initEditPostModal(report) {
    const overlay = document.getElementById('editPostOverlay');
    const modal = document.getElementById('editPostModal');
    
    if (!overlay || !modal) {
        console.error('Модальное окно не найдено');
        return;
    }
    
    const closeBtn = modal.querySelector('#closeEditModal');
    const cancelBtn = modal.querySelector('#cancelEditBtn');
    const saveBtn = modal.querySelector('#savePostBtn');
    const newImagesInput = modal.querySelector('#newImages');
    const imagePreview = modal.querySelector('#imagePreviewEdit');

    function closeModal() {
        console.log('Закрытие модального окна');
        modal.classList.remove('active');
        overlay.classList.remove('active');
        
        setTimeout(() => {
            if (modal && modal.parentNode) {
                modal.remove();
            }
            if (overlay && overlay.parentNode) {
                overlay.remove();
            }
        }, 300);
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', async function() {
            await updatePost();
        });
    }
    
    modal.querySelectorAll('.remove-image[data-id]').forEach(btn => {
        btn.addEventListener('click', function() {
            const imageId = this.dataset.id;
            imagesToDelete.push(imageId);
            this.parentElement.remove();
            
            const existingImages = modal.querySelector('#existingImages');
            if (existingImages.children.length === 0) {
                existingImages.innerHTML = '<p style="color: #888; font-size: 14px;">Нет фотографий</p>';
            }
        });
    });

    if (newImagesInput && imagePreview) {
        newImagesInput.addEventListener('change', function() {
            imagePreview.innerHTML = '';
            const files = Array.from(this.files).slice(0, 10);
            
            files.forEach((file, index) => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const preview = document.createElement('div');
                        preview.className = 'image-preview-item';
                        preview.innerHTML = `
                            <img src="${e.target.result}" alt="Предпросмотр">
                            <button type="button" class="remove-image" data-index="${index}">×</button>
                        `;
                        imagePreview.appendChild(preview);
                        
                        preview.querySelector('.remove-image').addEventListener('click', function() {
                            removeImageFromPreview(index, newImagesInput);
                            preview.remove();
                        });
                    };
                    reader.readAsDataURL(file);
                }
            });
        });
    }

    function handleEscKey(e) {
        if (e.key === 'Escape') {
            console.log('Нажата клавиша ESC');
            closeModal();
            document.removeEventListener('keydown', handleEscKey);
        }
    }
    
    document.addEventListener('keydown', handleEscKey);

    function cleanup() {
        document.removeEventListener('keydown', handleEscKey);
    }

    const originalCloseModal = closeModal;
    closeModal = function() {
        cleanup();
        originalCloseModal();
    };
    
    cancelBtn.addEventListener('click', cleanup);
    closeBtn.addEventListener('click', cleanup);
    
    function removeImageFromPreview(index, inputElement) {
        if (!inputElement) return;
        
        const dt = new DataTransfer();
        const files = Array.from(inputElement.files);
        files.splice(index, 1);
        files.forEach(file => dt.items.add(file));
        inputElement.files = dt.files;
    }
}

let editingReportId = null;
let imagesToDelete = [];

async function updatePost() {
    if (!editingReportId) return;
    
    const description = document.getElementById('editPostDescription')?.value.trim();
    if (!description) {
        showNotification('Введите описание поста', 'error');
        return;
    }
    
    const saveBtn = document.querySelector('#savePostBtn');
    if (!saveBtn) return;
    
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Сохранение...';
    saveBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('description', description);
        
        imagesToDelete.forEach(id => {
            formData.append('delete_images', id);
        });
        
        const newImagesInput = document.getElementById('newImages');
        if (newImagesInput && newImagesInput.files.length > 0) {
            Array.from(newImagesInput.files).forEach(file => {
                formData.append('images', file);
            });
        }
        
        const response = await fetchWithAuth(`/api/v1/reports/${editingReportId}`, {
            method: 'PATCH',
            body: formData
        });
        
        if (response.ok) {
            showNotification('Пост успешно обновлен!', 'success');
            closeEditModal();
            loadReportsFeed();
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось обновить пост' }));
            showNotification('Ошибка: ' + (error.detail || 'Не удалось обновить пост'), 'error');
        }
    } catch (error) {
        console.error('Ошибка обновления поста:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

async function deletePost() {
    if (!editingReportId) return;
    
    const deleteBtn = document.querySelector('#deletePostBtn');
    const originalText = deleteBtn.textContent;
    deleteBtn.textContent = 'Удаление...';
    deleteBtn.disabled = true;
    
    try {
        const response = await fetchWithAuth(`/api/v1/reports/${editingReportId}`, {
            method: 'DELETE'
        });
        
        if (response.status === 204) {
            showNotification('Пост успешно удален', 'success');
            closeEditModal();
            loadReportsFeed();
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось удалить пост' }));
            showNotification('Ошибка: ' + (error.detail || 'Не удалось удалить пост'), 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления поста:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    } finally {
        deleteBtn.textContent = originalText;
        deleteBtn.disabled = false;
    }
}

function closeEditModal() {
    const modal = document.getElementById('editPostModal');
    const overlay = document.getElementById('editPostOverlay');
    
    if (modal) {
        modal.classList.remove('active');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
    
    setTimeout(() => {
        if (modal) modal.remove();
        if (overlay) overlay.remove();
    }, 300);
    
    editingReportId = null;
    imagesToDelete = [];
}

async function deleteReport(reportId) {
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) return;
    
    try {
        const response = await fetchWithAuth(`/api/v1/reports/${reportId}`, {
            method: 'DELETE'
        });
        
        if (response.status === 204) {
            showNotification('Пост успешно удален', 'success');
            loadReportsFeed();
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось удалить пост' }));
            showNotification('Ошибка: ' + (error.detail || 'Не удалось удалить пост'), 'error');
        }
    } catch (error) {
        console.error('Ошибка удаления поста:', error);
        showNotification('Ошибка соединения с сервером', 'error');
    }
}

function setupCreatePostButton() {
    const createPostBtn = document.querySelector('.create-post-btn');
    const modal = document.getElementById('createPostModal');
    const closeModalBtn = document.getElementById('closeModal');
    const modalSubmitBtn = document.querySelector('.modal-submit');
    
    if (!createPostBtn) return;
    
    createPostBtn.addEventListener('click', async function() {
        const requests = await loadUserRequests();
        showCreatePostModal(requests);
    });
    
    if (closeModalBtn && modal) {
        closeModalBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    if (modalSubmitBtn) {
        modalSubmitBtn.addEventListener('click', submitReport);
    }
}

async function loadUserRequests() {
    try {
        const response = await fetchWithAuth('/api/v1/requests/me?limit=30');
        if (response.ok) {
            const requests = await response.json();
            return requests.filter(req => req.status === 'done' || req.status === 'in_progress');
        }
        return [];
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        return [];
    }
}

function showCreatePostModal(requests) {
    const modal = document.getElementById('createPostModal');
    const modalContent = modal.querySelector('.modal-content');
    
    const oldForm = modalContent.querySelector('.report-form');
    if (oldForm) oldForm.remove();
    
    const formHTML = `
        <div class="report-form">
            <div class="form-group">
                <label for="requestSelect">Выберите заявку (необязательно):</label>
                <select id="requestSelect">
                    <option value="">Без привязки к заявке</option>
                    ${requests.map(req => `
                        <option value="${req.id}">
                            ${escapeHtml(req.task_name)} (${new Date(req.created_at).toLocaleDateString('ru-RU')})
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <textarea id="postText" class="modal-input" rows="3" 
                    placeholder="Делитесь своими впечатлениями, общайтесь, благодарите..." required></textarea>
            </div>
            <div class="form-group">
                <div class="modal-upload-area">
                    <p>Загрузите фотографии</p>
                    <input type="file" id="imageInput" multiple accept="image/*">
                    <div id="imagePreview" style="margin-top: 10px;"></div>
                </div>
            </div>
        </div>
    `;
    
    const submitBtn = modalContent.querySelector('.modal-submit');
    submitBtn.insertAdjacentHTML('beforebegin', formHTML);
    
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    
    if (imageInput) {
        imageInput.addEventListener('change', function() {
            imagePreview.innerHTML = '';
            const files = Array.from(this.files).slice(0, 10);
            
            files.forEach((file, index) => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const preview = document.createElement('div');
                        preview.className = 'image-preview-item';
                        preview.style.cssText = 'display: inline-block; position: relative; margin: 5px;';
                        preview.innerHTML = `
                            <img src="${e.target.result}" alt="Предпросмотр" style="width: 100px; height: 100px; object-fit: cover; border-radius: 5px;">
                            <button type="button" class="remove-image" data-index="${index}" style="position: absolute; top: 0; right: 0; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer;">×</button>
                        `;
                        imagePreview.appendChild(preview);
                        
                        preview.querySelector('.remove-image').addEventListener('click', function() {
                            removeImageFromPreview(index);
                        });
                    };
                    reader.readAsDataURL(file);
                }
            });
        });
    }
    
    modal.style.display = 'flex';
}

function removeImageFromPreview(index) {
    const imageInput = document.getElementById('imageInput');
    const dt = new DataTransfer();
    const files = Array.from(imageInput.files);
    
    files.splice(index, 1);
    
    files.forEach(file => dt.items.add(file));
    imageInput.files = dt.files;
    
    const event = new Event('change');
    imageInput.dispatchEvent(event);
}

async function submitReport() {
    const requestId = document.getElementById('requestSelect').value;
    const description = document.getElementById('postText').value.trim();
    const imageInput = document.getElementById('imageInput');
    
    if (!description) {
        showNotification('Пожалуйста, введите описание', 'error');
        document.getElementById('postText').focus();
        return;
    }
    
    const formData = new FormData();
    if (requestId) {
        formData.append('request_id', requestId);
    }
    formData.append('description', description);
    
    if (imageInput.files.length > 0) {
        Array.from(imageInput.files).forEach(file => {
            formData.append('images', file);
        });
    }
    
    const submitBtn = document.querySelector('.modal-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Отправка...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetchWithAuth('/api/v1/reports', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const report = await response.json();
            showNotification('Пост успешно создан!', 'success');
            
            document.getElementById('createPostModal').style.display = 'none';
            
            loadReportsFeed();
            
            document.getElementById('postText').value = '';
            document.getElementById('requestSelect').value = '';
            document.getElementById('imageInput').value = '';
            document.getElementById('imagePreview').innerHTML = '';
            
        } else {
            const error = await response.json().catch(() => ({ detail: 'Не удалось создать пост' }));
            showNotification('Ошибка: ' + (error.detail || 'Не удалось создать пост'), 'error');
        }
    } catch (error) {
        console.error('Ошибка создания поста:', error);
        showNotification('Ошибка соединения с сервером. Проверьте подключение к интернету.', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} м назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} д назад`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} н назад`;
    
    return date.toLocaleDateString('ru-RU');
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
        padding: 15px 25px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-size: 14px;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 4000);
}

function handleLike(reportId) {
    console.log('Лайк для отчета:', reportId);
}

function showComments(reportId) {
    console.log('Комментарии для отчета:', reportId);
}

window.togglePostActionMenu = togglePostActionMenu;
window.editReport = editReport;
window.deleteReport = deleteReport;
window.handleLike = handleLike;
window.showComments = showComments;
window.removeImageFromPreview = removeImageFromPreview;

window.updatePost = updatePost;
window.closeEditModal = closeEditModal;