/**
 * BaseComponent - מחלקת האב של הרכיבים באפליקציה.
 * מרכזת פונקציות תשתית כמו ניווט, טעינה ותקשורת.
 */
class BaseComponent {
    constructor() {
        // הגדרת כמות ניסיונות מקסימלית לשליחת בקשה במקרה של תקלה ברשת
        this.maxRetries = 3;
    }

    /**
     * ניהול ניווט SPA (Single Page Application).
     * מחליף את תוכן העמוד על ידי שכפול Template מה-HTML לתוך קונטיינר ה-app.
     */
    navigateTo(templateId) {
        const appContainer = document.getElementById('app');
        const template = document.getElementById(templateId);
        if (!template) return;

        appContainer.innerHTML = '';
        appContainer.appendChild(template.content.cloneNode(true));
        this.initEventListeners(templateId); // הפעלת האזנה לאירועים עבור התבנית החדשה
    }

    // ניהול נראות הספינר (Loader) כדי לתת פידבק למשתמש בזמן המתנה לשרת
    toggleLoader(show) {
        const loader = document.getElementById('loader');
        if (show) loader.classList.replace('loader-hidden', 'loader-visible');
        else loader.classList.replace('loader-visible', 'loader-hidden');
    }

    // הצגת מודאל הודעה מעוצב במקום ה-alert המובנה של הדפדפן
    showModal(message) {
        const modal = document.getElementById('custom-modal');
        document.getElementById('modal-message').innerText = message;
        modal.classList.replace('modal-hidden', 'modal-visible');
    }

    closeModal() {
        document.getElementById('custom-modal').classList.replace('modal-visible', 'modal-hidden');
    }

    /**
     * לב המערכת: פונקציה אסינכרונית לשליחת בקשות דרך מנגנון ה-FAJAX שבנינו.
     * כוללת לוגיקת Retry (ניסיון חוזר) במקרה של שגיאת תקשורת.
     */
    sendRequest(method, url, data, onSuccess, attempt = 1) {
        // הפעלת לואדר רק בניסיון הראשון
        if (attempt === 1) this.toggleLoader(true);

        const fajax = new FXMLHttpRequest();
        fajax.open(method, url);

        fajax.onload = () => {
            this.toggleLoader(false);
            onSuccess(JSON.parse(fajax.responseText), fajax.status);
        };

        fajax.onerror = () => {
            // אם הבקשה נכשלה ועדיין לא הגענו למקסימום ניסיונות, ננסה שוב לאחר שנייה
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

/**
 * TaskManager - מנהלת את לוגיקת המשימות (CRUD, סינון ותצוגה).
 */
class TaskManager extends BaseComponent {
    constructor() {
        super();
        this.currentUser = null;
        this.currentFilter = 'all';
        // ריכוז האייקונים במקום אחד למניעת כפילויות
        this.categoryIcons = { personal: '💖', work: '💼', studies: '📚', gym: '🏋️' };
    }

    // אתחול מאזינים לאירועים בהתאם לעמוד שהמשתמש נמצא בו כעת
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

    /**
     * שליפת משימות מהשרת המדומה, סינונן לפי קטגוריה ומיון דו-שכבתי.
     * המטרה: להציג למשתמש קודם את המשימות הדחופות ביותר.
     */
    fetchTasks() {
        this.sendRequest("GET", "/tasks", { userId: this.currentUser.id }, (res) => {
            let tasks = res.data;

            // 1. שלב הסינון: אם נבחרה קטגוריה ספציפית, נציג רק אותה
            if (this.currentFilter !== 'all') {
                tasks = tasks.filter(t => t.category === this.currentFilter);
            }

            // 2. שלב המיון הדו-שכבתי:
            // הגדרת סדר עדיפויות מספרי (ערך נמוך יותר = דחוף יותר)
            const priorityOrder = { high: 1, medium: 2, low: 3 };

            tasks.sort((a, b) => {
                // רמה א': השוואה לפי עדיפות (High -> Medium -> Low)
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                }

                // רמה ב': אם העדיפות זהה, נמיין לפי התאריך הקרוב ביותר (Due Date)
                const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
                const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');

                return dateA - dateB; // הפרש חיובי מקדם את התאריך הרחוק יותר למטה
            });

            // 3. שליחת הרשימה הממוינת והמסוננת לתצוגה ב-DOM
            this.renderTasks(tasks);
        });
    }

    /**
     * בניית רשימת המשימות ב-DOM.
     * משתמשת ב-map וב-Template Literals כדי לייצר קוד HTML דינמי ונקי.
     */
    renderTasks(tasks) {
        const list = document.getElementById('data-list');
        list.innerHTML = tasks.length === 0 ? '<p class="empty-msg">אין משימות.</p>' : tasks.map(t => `
            <div class="task-item priority-${t.priority} ${t.completed ? 'task-done' : ''}">
                <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''} onchange="app.handleToggle('${t.id}', this.checked)">
                <div class="task-info">
                    <strong>${this.categoryIcons[t.category] || '📌'} ${t.title}</strong>
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

    // פתיחת מודאל העריכה ומילוי השדות בנתונים הקיימים של המשימה
    handleOpenEdit(id) {
        this.sendRequest("GET", "/tasks", { userId: this.currentUser.id }, (res) => {
            const task = res.data.find(t => t.id === id);
            if (!task) return;
            const modal = document.getElementById('edit-task-modal');
            const form = document.getElementById('edit-task-form');

            // הצגת האייקון והכותרת יחד בראש המודאל
            document.getElementById('display-task-title').innerText = `${this.categoryIcons[task.category] || '📌'} ${task.title}`;

            form.id.value = task.id; // שימוש בשדה נסתר לשמירת ה-ID
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
        if (confirm("למחוק את המשימה?")) {
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

/**
 * AuthManager - מנהלת את תהליכי ההתחברות והרישום.
 */
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

// אתחול האפליקציה וטעינת עמוד הכניסה
const app = new TaskManager();
window.onload = () => app.navigateTo('login-template');