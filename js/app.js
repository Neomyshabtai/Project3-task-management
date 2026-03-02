class BaseComponent {
    constructor() {
        this.maxRetries = 3;
    }

    navigateTo(templateId) {
        const appContainer = document.getElementById('app');
        const template = document.getElementById(templateId);
        if (!template) return;
        appContainer.innerHTML = ''; 
        appContainer.appendChild(template.content.cloneNode(true));
        this.initEventListeners(templateId);
    }

    // ניהול ה-Loader (Spinner)
    toggleLoader(show) {
        const loader = document.getElementById('loader');
        if (show) loader.classList.replace('loader-hidden', 'loader-visible');
        else loader.classList.replace('loader-visible', 'loader-hidden');
    }

    showModal(message) {
        const modal = document.getElementById('custom-modal');
        document.getElementById('modal-message').innerText = message;
        modal.classList.replace('modal-hidden', 'modal-visible');
    }

    closeModal() {
        document.getElementById('custom-modal').classList.replace('modal-visible', 'modal-hidden');
    }

    sendRequest(method, url, data, onSuccess, attempt = 1) {
        if (attempt === 1) this.toggleLoader(true);

        const fajax = new FXMLHttpRequest();
        fajax.open(method, url);

        fajax.onload = () => {
            this.toggleLoader(false);
            onSuccess(JSON.parse(fajax.responseText), fajax.status);
        };

        fajax.onerror = () => {
            if (attempt < this.maxRetries) {
                setTimeout(() => this.sendRequest(method, url, data, onSuccess, attempt + 1), 1000);
            } else {
                this.toggleLoader(false);
                this.showModal("שגיאת תקשורת לאחר מספר ניסיונות. ייתכן שיבוש ברשת.");
            }
        };

        fajax.send(JSON.stringify(data));
    }
}

class TaskManager extends BaseComponent {
    constructor() {
        super();
        this.currentUser = null;
        this.currentFilter = 'all';
    }

    initEventListeners(templateId) {
    if (templateId === 'login-template' || templateId === 'register-template') {
        new AuthManager(this).initEventListeners(templateId);
    } else if (templateId === 'main-app-template') {
        // התנתקות
        document.getElementById('logout-btn').onclick = () => { 
            this.currentUser = null; 
            this.navigateTo('login-template'); 
        };

        const addForm = document.getElementById('add-task-form');
        if (addForm) {
            addForm.onsubmit = (e) => this.handleAddTask(e);
            
            // --- חסימת תאריכים מהעבר ---
            const dateInput = addForm.querySelector('input[name="dueDate"]');
            if (dateInput) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.setAttribute('min', today);
                dateInput.value = today; // ברירת מחדל להיום
            }
        }

        document.getElementById('user-display-name').innerText = this.currentUser.username;
        this.fetchTasks();
    }
}

    filterByCategory(category) {
        this.currentFilter = category;
        this.fetchTasks();
    }

    fetchTasks() {
        this.sendRequest("GET", "/tasks", { userId: this.currentUser.id }, (res) => {
            let tasks = res.data;
            if (this.currentFilter !== 'all') tasks = tasks.filter(t => t.category === this.currentFilter);
            this.renderTasks(tasks);
        });
    }

    renderTasks(tasks) {
        const list = document.getElementById('data-list');
        const icons = { studies: '📚', gym: '🏋️', work: '💼', personal: '💖' };
        
        list.innerHTML = tasks.length === 0 ? '<p class="empty-msg">אין משימות ברשימה זו.</p>' : tasks.map(t => `
            <div class="task-item priority-${t.priority} ${t.completed ? 'task-done' : ''}">
                <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="app.handleToggle('${t.id}', this.checked)">
                <div class="task-info">
                    <strong>${icons[t.category] || '📌'} ${t.title}</strong>
                    <p>${t.description || ''}</p>
                    ${t.dueDate ? `<small>📅 ${t.dueDate}</small>` : ''}
                </div>
                <div class="task-actions">
                    <button onclick="app.handleEdit('${t.id}', '${t.title}')" ${t.completed ? 'disabled' : ''}>✏️</button>
                    <button onclick="app.handleDelete('${t.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    handleAddTask(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.userId = this.currentUser.id;
        this.sendRequest("POST", "/tasks", data, () => { e.target.reset(); this.fetchTasks(); });
    }

    handleToggle(id, done) { this.sendRequest("POST", "/tasks/toggle", { id, completed: done }, () => this.fetchTasks()); }
    
    handleDelete(id) { 
        if(confirm("למחוק את המשימה?")) this.sendRequest("POST", "/tasks/delete", { id }, () => this.fetchTasks()); 
    }

    handleEdit(id, old) { 
        const title = prompt("עדכן כותרת משימה:", old);
        if(title && title.trim() !== "") {
            this.sendRequest("PUT", "/tasks/update", { id, title }, () => this.fetchTasks());
        }
    }
}

class AuthManager extends BaseComponent {
    constructor(mainApp) { super(); this.mainApp = mainApp; }
    
    initEventListeners(tid) {
    // זיהוי סוג הטופס לפי ה-Template
    const type = tid === 'register-template' ? 'register' : 'login';
    const form = document.getElementById(`${type}-form`);
    
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault(); // מניעת רענון עמוד
            this.handleSubmit(e, type);
        };
    }
}

    handleSubmit(e, type) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        this.sendRequest("POST", `/auth/${type}`, data, (res, status) => {
            if (status < 300) {
                if (type === 'login') { 
                    this.mainApp.currentUser = res.data; 
                    this.mainApp.navigateTo('main-app-template'); 
                } else { 
                    this.showModal("הרישום בוצע בהצלחה! כעת ניתן להתחבר."); 
                    this.mainApp.navigateTo('login-template'); 
                }
            } else {
                this.showModal(res.message);
            }
        });
    }
}

const app = new TaskManager();
window.onload = () => app.navigateTo('login-template');