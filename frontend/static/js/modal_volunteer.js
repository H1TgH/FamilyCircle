document.addEventListener("DOMContentLoaded", () => {
    const list = document.querySelector(".reports-list");
    const firstRow = document.querySelector(".report-row");

    if (!firstRow) return;

    // Клонируем строку
    const completedRow = firstRow.cloneNode(true);

    // Добавляем класс выполнено
    completedRow.classList.add("completed");

    // Удаляем номер
    const number = completedRow.querySelector(".report-number");
    if (number) number.remove();

    // Удаляем родственника
    const relative = completedRow.querySelector(".relative-card");
    if (relative) relative.remove();

    // Удаляем кнопку
    const action = completedRow.querySelector(".report-action");
    if (action) action.remove();

    // Добавляем плашку "Задание выполнено"
    const label = document.createElement("div");
    label.className = "completed-label";
    label.textContent = "Задание выполнено";

    completedRow.appendChild(label);

    // Добавляем вторую карточку
    list.appendChild(completedRow);
});

document.addEventListener('DOMContentLoaded', function() {
    // Элементы модального окна
    const modal = document.getElementById('reportModal');
    const closeBtn = document.querySelector('.close-btn');
    const cancelBtn = document.querySelector('.cancel-btn');
    const addReportBtn = document.querySelector('.add-report-btn');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('photoUpload');
    const fileList = document.getElementById('fileList');
    const reportForm = document.getElementById('reportForm');
    
    let uploadedFiles = [];

    // Открытие модального окна
    addReportBtn.addEventListener('click', function() {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });

    // Закрытие модального окна
    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Закрытие при клике вне окна
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Обработка загрузки файлов
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });

    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#ff9f43';
        this.style.backgroundColor = '#fffaf0';
    });

    uploadArea.addEventListener('dragleave', function() {
        this.style.borderColor = '#e0e0e0';
        this.style.backgroundColor = '#fff';
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#e0e0e0';
        this.style.backgroundColor = '#fff';
        
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', function() {
        if (this.files.length) {
            handleFiles(this.files);
        }
    });

    // Обработка выбранных файлов
    function handleFiles(files) {
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                uploadedFiles.push(file);
                displayFile(file);
            }
        }
        fileInput.value = '';
    }

    // Отображение загруженных файлов
    function displayFile(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        fileItem.innerHTML = `
            <div>
                <i class="fas fa-image"></i>
                <span>${file.name} (${formatFileSize(file.size)})</span>
            </div>
            <button class="remove-file" data-name="${file.name}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        fileList.appendChild(fileItem);
        
        // Удаление файла
        const removeBtn = fileItem.querySelector('.remove-file');
        removeBtn.addEventListener('click', function() {
            const fileName = this.getAttribute('data-name');
            uploadedFiles = uploadedFiles.filter(f => f.name !== fileName);
            fileItem.remove();
        });
    }

    // Форматирование размера файла
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Обработка отправки формы
    reportForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const reportText = document.getElementById('reportText').value.trim();
        
        if (!reportText) {
            alert('Пожалуйста, опишите ваши впечатления');
            return;
        }
        
        // Создаем объект FormData для отправки
        const formData = new FormData();
        formData.append('report', reportText);
        
        uploadedFiles.forEach((file, index) => {
            formData.append(`photo_${index}`, file);
        });
        
        // Здесь будет отправка данных на сервер
        console.log('Отправка отчета:', {
            text: reportText,
            files: uploadedFiles.map(f => f.name)
        });
        
        // Имитация отправки
        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        
        submitBtn.textContent = 'Отправка...';
        submitBtn.disabled = true;
        
        setTimeout(() => {
            alert('Отчет успешно отправлен на проверку!');
            closeModal();
            resetForm();
            
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            // Здесь можно обновить интерфейс или показать сообщение об успехе
        }, 1500);
    });

    // Сброс формы
    function resetForm() {
        document.getElementById('reportText').value = '';
        uploadedFiles = [];
        fileList.innerHTML = '';
    }
});