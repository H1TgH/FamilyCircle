document.addEventListener('DOMContentLoaded', () => {
    // 1. ЛОГИКА ОТОБРАЖЕНИЯ НУЖНОГО ПОСТА
    const selectedPost = JSON.parse(localStorage.getItem('selectedPost'));

    if (selectedPost) {
        const mainPost = document.querySelector('.main-post');
        if (mainPost) {
            mainPost.querySelector('.post-name').textContent = selectedPost.name;
            mainPost.querySelector('.post-avatar').src = selectedPost.avatar;
            mainPost.querySelector('.post-text').textContent = selectedPost.text;
            
            // Если есть блок с заданием, обновляем его
            const taskEl = mainPost.querySelector('.post-task');
            if (taskEl) taskEl.textContent = selectedPost.task;
        }
    }

    // 2. ЛОГИКА ОТПРАВКИ КОММЕНТАРИЯ
    const sendBtn = document.getElementById('send-comment-btn');
    const input = document.getElementById('comment-input');
    const commentsList = document.getElementById('comments-list');
    const countSpan = document.getElementById('comment-count');

    sendBtn.addEventListener('click', () => {
        const text = input.value.trim();

        if (text !== "") {
            const newComment = document.createElement('div');
            newComment.classList.add('comment-item');

            // ТУТ ИЗМЕНЕНО: Имя автора теперь Иванова Анна Николаевна
            newComment.innerHTML = `
                <img src="static/images/relative.png" class="comment-avatar" alt="Аватар">
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-name">Иванова Анна Николаевна</span>
                        <span class="comment-time">только что</span>
                    </div>
                    <p class="comment-text">${text}</p>
                </div>
            `;

            commentsList.prepend(newComment);
            input.value = "";

            let currentCount = parseInt(countSpan.textContent);
            countSpan.textContent = currentCount + 1;
        } else {
            alert("Пожалуйста, введите текст комментария.");
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            sendBtn.click();
        }
    });
});