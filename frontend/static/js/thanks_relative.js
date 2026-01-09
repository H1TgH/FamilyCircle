const thanksBtn = document.getElementById('thanks-btn');
const helpCount = document.getElementById('help-count');

thanksBtn.addEventListener('click', function() {
    // 1. Берем текущее значение из текста (например, "1")
    let currentNumber = parseInt(helpCount.textContent);
    
    // 2. Увеличиваем на 1
    helpCount.textContent = currentNumber + 1;
    
    // 3. Делаем кнопку неактивной и меняем вид
    thanksBtn.classList.add('disabled');
    thanksBtn.disabled = true;
});