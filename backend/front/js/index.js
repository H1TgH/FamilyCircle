document.addEventListener('DOMContentLoaded', function() {
    updateNavigation();
    updatePageContent();
});

function updateNavigation() {
    const authButtons = document.getElementById('authButtons');
    const header = document.querySelector('.header .container');
    
    if (!authButtons) return;
    
    if (isAuthenticated()) {
        const userName = getUserNameFromToken();
        const userRole = getUserRole();

        
        const newHeader = `
            <div class="logo"><img class="logo-img" src="img/logo.png" alt="logo"></div>
            
            <div class="header-icons">
                <i class="fas fa-bell"></i>
                <div class="profile-icon">
                    <a href="profile"><img src="./img/profile.png" alt="Профиль" /></a>
                </div>
            </div>
        `;
        
        header.innerHTML = newHeader;
        header.className = 'header-bar container';
        
        const authButtonsContainer = document.getElementById('authButtonsContainer');
        if (authButtonsContainer) {
            authButtonsContainer.remove();
        }
        
    } else {
        authButtons.innerHTML = `
            <button class="auth-btn login-btn" onclick="window.location.href='./login'">
                Войти <img src="./img/input.png" style="height: 20px; width: 20px;">
            </button>
        `;
    }
}

function getUserNameFromToken() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return 'Пользователь';
    
    try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        return payload.name || payload.sub || 'Пользователь';
    } catch (e) {
        return 'Пользователь';
    }
}

function updatePageContent() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const authUserButtons = document.getElementById('authUserButtons');
    const findSupportBtn = document.getElementById('findSupportBtn');
    const becomeVolunteerBtn = document.getElementById('becomeVolunteerBtn');
    const requestsBtn = document.getElementById('requestsBtn');
    
    if (isAuthenticated()) {
        if (welcomeMessage) {
            welcomeMessage.style.display = 'block';
            getUserInfo().then(user => {
                if (user && document.getElementById('userName')) {
                    const roleText = isRelative() ? 'родственник' : 'волонтер';
                    document.getElementById('userName').textContent = `${user.name || 'Пользователь'} (${roleText})`;
                }
            });
        }
        
        if (authUserButtons) {
            authUserButtons.style.display = 'flex';
            authUserButtons.style.gap = '20px';
            authUserButtons.style.justifyContent = 'center';
            authUserButtons.style.width = '100%';
        }
        
        if (isRelative()) {
            if (findSupportBtn) {
                findSupportBtn.href = 'requests';
            }
            if (requestsBtn) {
                requestsBtn.style.display = 'block';
                requestsBtn.onclick = function() {
                    window.location.href = 'feed';
                };
            }
        } else if (isVolunteer()) {
            if (findSupportBtn) {
                findSupportBtn.href = 'feed';
                findSupportBtn.querySelector('button').textContent = 'Просмотреть заявки';
            }
            if (requestsBtn) {
                requestsBtn.style.display = 'block';
                requestsBtn.textContent = 'Мои задания';
                requestsBtn.onclick = function() {
                    window.location.href = 'requests';
                };
            }
        }
        
        if (isVolunteer() && becomeVolunteerBtn) {
            becomeVolunteerBtn.style.display = 'none';
        }
        
    } else {
        if (welcomeMessage) welcomeMessage.style.display = 'none';
        if (authUserButtons) authUserButtons.style.display = 'none';
        
        if (findSupportBtn) {
            findSupportBtn.href = 'requests';
            findSupportBtn.querySelector('button').textContent = 'Найти поддержку';
        }
        if (becomeVolunteerBtn) {
            becomeVolunteerBtn.style.display = 'block';
        }
    }
}

function goToProfile() {
    if (isRelative() || isVolunteer()) {
        window.location.href = 'profile';
    }
}

function goToRequests() {
    if (isRelative()) {
        window.location.href = 'feed';
    } else if (isVolunteer()) {
        window.location.href = 'requests';
    }
}

window.updateNavigation = updateNavigation;
window.goToProfile = goToProfile;
window.goToRequests = goToRequests;