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
            document.getElementById('logout-btn').onclick = () => { 
                this.currentUser = null; 
                this.navigateTo('login-template'); 
            };
            const addForm = document.getElementById('add-task-form');
            if (addForm) addForm.onsubmit = (e) => this.handleAddTask(e);
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
        list.innerHTML = tasks.length === 0 ? '<p class="empty-msg">אין משימות.</p>' : tasks.map(t => `
            <div class="task-item priority-${t.priority} ${t.completed ? 'task-done' : ''}">
                <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''} onchange="app.handleToggle('${t.id}', this.checked)">
                <div class="task-info">
                    <strong>${t.title}</strong>
                    <p>${t.description || ''}</p>
                    ${t.dueDate ? `<small>📅 ${t.dueDate}</small>` : ''}
                </div>
                <div class="task-actions">
                    <button onclick="app.handleOpenEdit('${t.id}')" ${t.completed ? 'disabled' : ''}>✏️</button>
                    <button onclick="app.handleDelete('${t.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    handleOpenEdit(id) {
        this.sendRequest("GET", "/tasks", { userId: this.currentUser.id }, (res) => {
            const task = res.data.find(t => t.id === id);
            if (!task) return;
            const modal = document.getElementById('edit-task-modal');
            const form = document.getElementById('edit-task-form');
            document.getElementById('display-task-title').innerText = task.title;
            // ✅ תוקן: עכשיו שדה name="id" קיים ב-HTML
            form.id.value = task.id;
            form.description.value = task.description || "";
            form.dueDate.value = task.dueDate || "";
            form.priority.value = task.priority;
            modal.classList.replace('modal-hidden', 'modal-visible');
            form.onsubmit = (e) => this.handleUpdateTask(e);
        });
    }

    handleUpdateTask(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        // הוספת userId לאימות בשרת
        data.userId = this.currentUser.id;
        this.sendRequest("PUT", "/tasks/update", data, () => {
            this.closeEditModal();
            this.fetchTasks();
        });
    }

    closeEditModal() {
        document.getElementById('edit-task-modal').classList.replace('modal-visible', 'modal-hidden');
    }

    handleDelete(id) {
        if(confirm("למחוק את המשימה?")) {
            this.sendRequest("POST", "/tasks/delete", { id, userId: this.currentUser.id }, () => this.fetchTasks());
        }
    }

    handleToggle(id, done) { 
        this.sendRequest("POST", "/tasks/toggle", { id, completed: done, userId: this.currentUser.id }, () => this.fetchTasks()); 
    }
    
    handleAddTask(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.userId = this.currentUser.id;
        this.sendRequest("POST", "/tasks", data, () => { e.target.reset(); this.fetchTasks(); });
    }
}

class AuthManager extends BaseComponent {
    constructor(mainApp) { super(); this.mainApp = mainApp; }
    
    initEventListeners(tid) {
        const type = tid === 'register-template' ? 'register' : 'login';
        const form = document.getElementById(`${type}-form`);
        
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
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
