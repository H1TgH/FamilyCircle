document.addEventListener('DOMContentLoaded', function() {
    loadReportsFeed();
    setupCreatePostButton();
});

async function loadReportsFeed() {
    try {
        const response = await fetchWithAuth('/api/v1/reports/feed');
        if (response.ok) {
            const reports = await response.json();
            renderReportsFeed(reports);
        }
    } catch (error) {
        console.error('Ошибка загрузки ленты:', error);
    }
}

function renderReportsFeed(reports) {
    const postList = document.querySelector('.post-list');
    if (!postList) {
        console.error('Контейнер постов не найден');
        return;
    }
    
    postList.innerHTML = '';
    
    if (!reports || reports.length === 0) {
        postList.innerHTML = '<p class="no-reports" style="text-align: center; padding: 40px;">Нет отчетов</p>';
        return;
    }
    
    reports.forEach(report => {
        const reportCard = createReportCard(report);
        postList.appendChild(reportCard);
    });
}

function createReportCard(report) {
    const card = document.createElement('section');
    card.className = 'post-card';
    card.dataset.id = report.id;
    
    const reportDate = new Date(report.created_at);
    const timeAgo = getTimeAgo(reportDate);
    
    let imagesHTML = '';
    if (report.images && report.images.length > 0) {
        imagesHTML = `
            <div class="post-image-wrapper">
                <img src="${report.images[0].presigned_url}" class="post-image" alt="Фото отчета">
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="post-header">
            <div class="post-user">
                <img src="/img/avatar.png" class="post-avatar" alt="Аватар">
                <div class="post-user-info">
                    <h3 class="post-name">${escapeHtml(report.volunteer_surname)} ${escapeHtml(report.volunteer_name)}</h3>
                    <p class="post-task">Категория: ${getCategoryText(report.request_category)}</p>
                    <p class="post-status">Статус: выполнено</p>
                </div>
            </div>
            ${getReportMenuHTML(report)}
        </div>
        <p class="post-text">${escapeHtml(report.description)}</p>
        ${imagesHTML}
        <div class="post-actions">
            <img src="/img/heart.svg" class="post-icon" alt="Лайк" onclick="handleLike('${report.id}')">
            <img src="/img/chat.svg" class="post-icon" alt="Комментарий" onclick="showComments('${report.id}')">
        </div>
        <p class="post-time">${timeAgo}</p>
    `;
    
    return card;
}

function getReportMenuHTML(report) {
    return `
        <div class="post-menu-wrapper">
            <button class="post-menu-btn" onclick="toggleReportMenu('${report.id}')">⋮</button>
            <div class="post-menu" id="menu-${report.id}" style="display: none;">
                <button class="menu-item" onclick="deleteReport('${report.id}')">Удалить</button>
            </div>
        </div>
    `;
}

function toggleReportMenu(reportId) {
    const menu = document.getElementById(`menu-${reportId}`);
    const allMenus = document.querySelectorAll('.post-menu');
    
    allMenus.forEach(m => {
        if (m.id !== `menu-${reportId}`) {
            m.style.display = 'none';
        }
    });
    
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

async function deleteReport(reportId) {
    if (!confirm('Вы уверены, что хотите удалить этот отчет?')) return;
    
    try {
        const response = await fetchWithAuth(`/api/v1/reports/${reportId}`, {
            method: 'DELETE'
        });
        
        if (response.status === 204) {
            alert('Отчет удален');
            loadReportsFeed();
        } else {
            const error = await response.json();
            alert('Ошибка: ' + (error.detail || 'Не удалось удалить отчет'));
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        alert('Ошибка соединения с сервером');
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
        if (requests.length === 0) {
            alert('У вас нет завершенных заявок для создания отчета');
            return;
        }
        
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
        const response = await fetchWithAuth('/api/v1/requests/me?limit=50');
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
                <label for="requestSelect">Выберите заявку:*</label>
                <select id="requestSelect" required>
                    <option value="">Выберите заявку</option>
                    ${requests.map(req => `
                        <option value="${req.id}">
                            ${escapeHtml(req.description || req.category)} (${new Date(req.created_at).toLocaleDateString('ru-RU')})
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="postText">Описание:*</label>
                <textarea id="postText" class="modal-input" rows="3" 
                    placeholder="Опишите выполнение заявки..." required></textarea>
            </div>
            <div class="form-group">
                <label>Загрузите фотографии (макс. 10):</label>
                <div class="modal-upload-area">
                    <p>Перетащите файлы сюда или нажмите для выбора</p>
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
    
    if (!requestId) {
        alert('Пожалуйста, выберите заявку');
        return;
    }
    
    if (!description) {
        alert('Пожалуйста, введите описание');
        document.getElementById('postText').focus();
        return;
    }
    
    const formData = new FormData();
    formData.append('request_id', requestId);
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
            alert('Отчет успешно создан!');
            
            document.getElementById('createPostModal').style.display = 'none';
            
            loadReportsFeed();
            
            document.getElementById('postText').value = '';
            document.getElementById('imageInput').value = '';
            document.getElementById('imagePreview').innerHTML = '';
            
        } else {
            const error = await response.json();
            alert('Ошибка: ' + (error.detail || 'Не удалось создать отчет'));
        }
    } catch (error) {
        console.error('Ошибка создания отчета:', error);
        alert('Ошибка соединения с сервером');
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

function getCategoryText(category) {
    const categoryMap = {
        'shopping': 'Покупки',
        'medication': 'Лекарства',
        'housework': 'Работа по дому',
        'walk': 'Прогулка',
        'other': 'Другое'
    };
    return categoryMap[category] || category;
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

function handleLike(reportId) {
    console.log('Лайк для отчета:', reportId);
}

function showComments(reportId) {
    console.log('Комментарии для отчета:', reportId);
}

window.toggleReportMenu = toggleReportMenu;
window.deleteReport = deleteReport;
window.handleLike = handleLike;
window.showComments = showComments;