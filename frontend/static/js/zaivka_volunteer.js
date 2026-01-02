document.addEventListener('DOMContentLoaded', () => {

    // ТОЛЬКО кнопка "Подробнее" внутри .elder-card
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

            // закрытие
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

document.addEventListener('DOMContentLoaded', function() {
    const respondButtons = document.querySelectorAll('.respond-btn');
    const headerIcons = document.querySelector('.header-icons');

    // Функция создания и показа уведомления
    function showBellNotification() {
        // Проверяем, существует ли уже уведомление, чтобы не дублировать
        let popup = document.getElementById('response-notification-popup');
        
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'response-notification-popup';
            popup.className = 'bell-notification-popup';
            
            // Наполнение текстом как на вашем примере
            popup.innerHTML = `
                <div>Вы отправили отклик на заявку, ждите пока с вами свяжутся или свяжитесь сами!</div>

            `;
            headerIcons.appendChild(popup);
        }

        // Показываем
        popup.style.display = 'block';

        // Скрываем автоматически через 7 секунд
        setTimeout(() => {
            popup.style.display = 'none';
        }, 7000);

        // Закрытие при клике на само уведомление
        popup.onclick = () => popup.style.display = 'none';
    }

    // Навешиваем событие на все кнопки "Откликнуться"
    respondButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault(); // Чтобы страница не прыгала вверх
            
            // Визуальный фидбек на кнопке (опционально)
            const originalText = this.textContent;
            this.textContent = 'Отправлено!';
            this.style.backgroundColor = '#784923ff'; // Затемняем кнопку
            this.disabled = true;

            // Вызываем уведомление у колокольчика
            showBellNotification();
        });
    });
});