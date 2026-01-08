document.addEventListener("DOMContentLoaded", () => {
    const list = document.querySelector(".reports-list");
    const firstRow = document.querySelector(".report-row");

    if (!firstRow) return;

    const completedRow = firstRow.cloneNode(true);

    completedRow.classList.add("completed");

    const number = completedRow.querySelector(".report-number");
    if (number) number.remove();

    const relative = completedRow.querySelector(".relative-card");
    if (relative) relative.remove();

    const action = completedRow.querySelector(".report-action");
    if (action) action.remove();

    const label = document.createElement("div");
    label.className = "completed-label";
    label.textContent = "Задание выполнено";

    completedRow.appendChild(label);

    list.appendChild(completedRow);
});
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('reportModal');
    const closeBtn = document.querySelector('.close-btn');
    const cancelBtn = document.querySelector('.cancel-btn');
    const addReportBtn = document.querySelector('.add-report-btn');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('photoUpload');
    const fileList = document.getElementById('fileList');
    const reportForm = document.getElementById('reportForm');
    
    const headerIcons = document.querySelector('.header-icons');

    let uploadedFiles = [];
    addReportBtn.addEventListener('click', function() {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });

    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });

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

    function handleFiles(files) {
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                uploadedFiles.push(file);
                displayFile(file);
            }
        }
        fileInput.value = '';
    }

    function displayFile(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        fileItem.innerHTML = `
            <div>
                <i class="fas fa-image"></i>
                <span>${file.name} (${formatFileSize(file.size)})</span>
            </div>
            <button class="remove-file" type="button" data-name="${file.name}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        fileList.appendChild(fileItem);
        
        const removeBtn = fileItem.querySelector('.remove-file');
        removeBtn.addEventListener('click', function() {
            const fileName = this.getAttribute('data-name');
            uploadedFiles = uploadedFiles.filter(f => f.name !== fileName);
            fileItem.remove();
        });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    reportForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const reportText = document.getElementById('reportText').value.trim();
        
        if (!reportText) {
            alert('Пожалуйста, опишите ваши впечатления');
            return;
        }

        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        
        submitBtn.textContent = 'Отправка...';
        submitBtn.disabled = true;
        
        setTimeout(() => {
            closeModal();
            resetForm();
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

            showBellNotification();

        }, 1500);
    });

    function showBellNotification() {
        let popup = document.getElementById('bell-notification-popup');
        
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'bell-notification-popup';
            popup.className = 'notification-popup';
            popup.innerHTML = `
                <p>Вы опубликовали отчет, он пока на проверке, при успешном выполненни задание будет закрыто!</p>
            `;
            headerIcons.appendChild(popup);
        }

        popup.style.display = 'block';

        setTimeout(() => {
            popup.style.display = 'none';
        }, 6000);
        
        popup.addEventListener('click', function() {
            popup.style.display = 'none';
        });
    }

    function resetForm() {
        document.getElementById('reportText').value = '';
        uploadedFiles = [];
        fileList.innerHTML = '';
    }
});


document.addEventListener('DOMContentLoaded', () => {

    document.querySelectorAll('.elder-card .details-link').forEach(link => {

        link.addEventListener('click', (e) => {
            e.preventDefault();

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const modal = document.createElement('div');
            modal.className = 'modal-card';

            modal.innerHTML = `
                <span class="modal-close">×</span>

                <div style="display:flex;gap:20px;">
                    <img src="./static/images/old-women.png"
                         style="width:90px;height:90px;border-radius:50%">

                    <div>
                        <h3>Иванова Нина Алексеевна</h3>
                        <p><b>Год рождения:</b> 16.11.1960г.</p>
                        <p><b>Состояние здоровья:</b> здорова</p>
                        <p><b>Адрес:</b> г. Екатеринбург, ул. Бебеля 170, кв 30</p>
                        <p><b>Увлечения:</b> вязание</p>
                        <p><b>Комментарий:</b> —</p>
                    </div>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (ev) => {
                if (
                    ev.target === overlay ||
                    ev.target.classList.contains('modal-close')
                ) {
                    overlay.remove();
                }
            });
        });

    });

});