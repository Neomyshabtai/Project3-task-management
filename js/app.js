const App = {
    currentUser: null,
    maxRetries: 3,

    // --- 1. ניתוב (SPA Routing) ---
    navigateTo(templateId) {
        const appContainer = document.getElementById('app');
        const template = document.getElementById(templateId);
        
        if (!template) {
            console.error("Template not found: " + templateId);
            return;
        }

        appContainer.innerHTML = ''; 
        const clone = template.content.cloneNode(true);
        appContainer.appendChild(clone);
        
        this.initEventListeners(templateId);
    },

    initEventListeners(templateId) {
        if (templateId === 'register-template') {
            document.getElementById('register-form').onsubmit = (e) => this.handleSubmit(e, 'register');
        }
        if (templateId === 'login-template') {
            document.getElementById('login-form').onsubmit = (e) => this.handleSubmit(e, 'login');
        }
        if (templateId === 'main-app-template') {
            document.getElementById('logout-btn').onclick = () => this.handleLogout();
            
            // חיבור טופס הוספת משימה חדשה
            const addForm = document.getElementById('add-task-form');
            if (addForm) {
                addForm.onsubmit = (e) => this.handleAddTask(e);
            }

            if (this.currentUser) {
                document.getElementById('user-display-name').innerText = this.currentUser.username;
                this.fetchTasks(); // משיכת המשימות מהשרת ברגע שהעמוד נטען
            }
        }
    },

    // --- 2. וולידציה ---
    validate(data, type) {
        const uReg = /^[a-zA-Z0-9]{3,}$/;
        const pReg = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
        const eReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (type === 'register') {
            if (!uReg.test(data.username)) { alert("שם משתמש לא תקין"); return false; }
            if (!eReg.test(data.email)) { alert("אימייל לא תקין"); return false; }
            if (!pReg.test(data.password)) { alert("סיסמה חלשה מדי"); return false; }
            if (data.password !== data.confirmPassword) { alert("הסיסמאות לא תואמות"); return false; }
        }
        return true;
    },

    // --- 3. מנגנון שליחה עם Retry ---
    sendRequestWithRetry(method, url, data, onSuccess, attempt = 1) {
        const fajax = new FXMLHttpRequest();
        fajax.open(method, url);

        fajax.onload = () => {
            const response = JSON.parse(fajax.responseText);
            onSuccess(response, fajax.status);
        };

        fajax.onerror = () => {
            if (attempt < this.maxRetries) {
                setTimeout(() => this.sendRequestWithRetry(method, url, data, onSuccess, attempt + 1), 1000);
            } else {
                alert("שגיאת תקשורת לאחר מספר ניסיונות.");
            }
        };

        fajax.send(JSON.stringify(data));
    },

    // --- 4. ניהול משימות (החלק החדש) ---
    
    // משיכת משימות מהשרת
    fetchTasks() {
        const data = { userId: this.currentUser.id };
        this.sendRequestWithRetry("GET", "/tasks", data, (res, status) => {
            if (status === 200) {
                this.renderTasks(res.data); // data מגיע מ-AppServer
            }
        });
    },

    // הצגת המשימות בתוך ה-HTML
   renderTasks(tasks) {
    const listContainer = document.getElementById('data-list');
    if (!listContainer) return;

    if (tasks.length === 0) {
        listContainer.innerHTML = '<p>הכל נקי! אין משימות ממתינות.</p>';
        return;
    }

    listContainer.innerHTML = tasks.map(task => `
        <div class="task-item ${task.completed ? 'task-done' : ''}">
            <input type="checkbox" class="task-checkbox" 
                   ${task.completed ? 'checked' : ''} 
                   onchange="App.handleToggle('${task.id}', this.checked)">
            
            <span class="task-text">${task.title}</span>
            
            <div class="task-actions">
                <button class="edit-btn" 
                        ${task.completed ? 'disabled' : ''} 
                        onclick="App.handleEdit('${task.id}', '${task.title}')">
                    ערוך
                </button>
                <button class="delete-btn" onclick="App.handleDelete('${task.id}')">מחק</button>
            </div>
        </div>
    `).join('');
},

   // הוסיפי את הפונקציה החדשה לאובייקט App
handleEdit(id, currentTitle) {
    const newTitle = prompt("ערוך את המשימה:", currentTitle);
    
    if (newTitle === null || newTitle.trim() === "" || newTitle === currentTitle) return;

    const data = { id: id, title: newTitle };
    
    // שליחה בשיטת PUT כפי שנדרש בהנחיות 
    this.sendRequestWithRetry("PUT", "/tasks/update", data, (res, status) => {
        if (status === 200) {
            this.fetchTasks(); // רענון הרשימה
        } else {
            alert(res.message);
        }
    });
},

    handleAddTask(e) {
        e.preventDefault();
        const titleInput = e.target.querySelector('input[name="title"]');
        const data = { 
            userId: this.currentUser.id, 
            title: titleInput.value 
        };

        this.sendRequestWithRetry("POST", "/tasks", data, (res, status) => {
            if (status === 201) {
                titleInput.value = ''; // ניקוי השדה
                this.fetchTasks(); // רענון הרשימה
            }
        });
    },

    handleToggle(id, isCompleted) {
        const data = { id: id, completed: isCompleted };
        this.sendRequestWithRetry("POST", "/tasks/toggle", data, () => {
            this.fetchTasks();
        });
    },

    handleDelete(id) {
        if (!confirm("למחוק את המשימה?")) return;
        const data = { id: id };
        this.sendRequestWithRetry("POST", "/tasks/delete", data, () => {
            this.fetchTasks();
        });
    },

    // --- 5. טיפול בטפסי כניסה/רישום ---
    handleSubmit(e, type) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        if (!this.validate(data, type)) return;

        const url = type === 'login' ? '/auth/login' : '/auth/register';

        this.sendRequestWithRetry("POST", url, data, (res, status) => {
            if (status === 200 || status === 201) {
                if (type === 'login') {
                    this.currentUser = res.data; // שמירת המשתמש המחובר
                    this.navigateTo('main-app-template');
                } else {
                    alert(res.message);
                    this.navigateTo('login-template');
                }
            } else {
                alert(res.message);
            }
        });
    },

    handleLogout() {
        this.currentUser = null;
        this.navigateTo('login-template');
    }
};

window.onload = () => App.navigateTo('login-template');