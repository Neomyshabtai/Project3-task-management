/**
 * BaseComponent - מחלקת האב (Parent Class) של כל הרכיבים.
 * המטרה: לרכז פונקציות תשתית שחוזרות על עצמן בכל האפליקציה (עקרון ה-DRY - Don't Repeat Yourself).
 */
class BaseComponent {
    constructor() {
        // הגדרת כמות ניסיונות מקסימלית לשליחת בקשה במקרה של תקלה ברשת
        this.maxRetries = 3;
    }

    /**
     * ניהול ניווט SPA (Single Page Application).
     * מחליף את תוכן העמוד בלי לרענן את הדפדפן.
     * @param {string} templateId - ה-ID של התגית <template> ב-HTML שרוצים להציג.
     */
    navigateTo(templateId) {
        const appContainer = document.getElementById('app');
        const template = document.getElementById(templateId);
        if (!template) return;

        // 1. ניקוי הקונטיינר הראשי מכל תוכן קודם
        appContainer.innerHTML = '';

        // 2. שכפול תוכן התבנית (Deep Clone) והזרקתו לעמוד. 
        // השימוש ב-true מבטיח שגם כל אלמנטי הבן בתוך התבנית ישוכפלו.
        appContainer.appendChild(template.content.cloneNode(true));

        // 3. הפעלת מאזיני אירועים (כמו לחיצות על כפתורים) עבור העמוד החדש שנוצר
        this.initEventListeners(templateId);
    }

    /**
     * ניהול נראות הספינר (Loader).
     * נותן פידבק ויזואלי למשתמש שהמערכת עובדת ולא "קפאה" בזמן המתנה לשרת.
     */
    toggleLoader(show) {
        const loader = document.getElementById('loader');
        if (show) loader.classList.replace('loader-hidden', 'loader-visible');
        else loader.classList.replace('loader-visible', 'loader-hidden');
    }

    /**
     * הצגת מודאל הודעה חכם (Custom Modal).
     * @param {string} message - הטקסט שיוצג למשתמש.
     * @param {boolean} autoClose - האם המודאל צריך להיסגר לבד אחרי 3 שניות (מתאים להודעות חיווי).
     * @param {function} onConfirm - פונקציה שתרוץ רק אם המשתמש ילחץ על "אישור" (מתאים למחיקה).
     */
    showModal(message, autoClose = true, onConfirm = null) {
        const modal = document.getElementById('custom-modal');
        const footer = document.getElementById('modal-footer');
        document.getElementById('modal-message').innerText = message;

        footer.innerHTML = ''; // ניקוי כפתורים מהודעות קודמות
        modal.classList.replace('modal-hidden', 'modal-visible');

        if (autoClose) {
            // אם זו הודעה לידיעה בלבד, היא תיעלם אוטומטית כדי לא להציק למשתמש
            setTimeout(() => this.closeModal(), 3000);
        } else {
            // מצב אישור (Confirmation): יצירת כפתורי "כן" ו-"לא" באופן דינמי
            const yesBtn = document.createElement('button');
            yesBtn.innerText = 'כן, בטוחה';
            yesBtn.className = 'save-btn';
            yesBtn.onclick = () => {
                if (onConfirm) onConfirm(); // הפעלת הפעולה שהועברה (למשל מחיקה)
                this.closeModal();
            };

            const noBtn = document.createElement('button');
            noBtn.innerText = 'ביטול';
            noBtn.className = 'cancel-btn';
            noBtn.onclick = () => this.closeModal();

            footer.appendChild(yesBtn);
            footer.appendChild(noBtn);
        }
    }

    closeModal() {
        document.getElementById('custom-modal').classList.replace('modal-visible', 'modal-hidden');
    }

    /**
     * לב המערכת: פונקציה אסינכרונית לשליחת בקשות HTTP (דרך FAJAX).
     * כוללת מנגנון Retry אוטומטי לשיפור אמינות המערכת.
     */
    sendRequest(method, url, data, onSuccess, attempt = 1) {
        // מציגים לואדר רק בניסיון הראשון כדי לא להבהב למשתמש ב-Retry
        if (attempt === 1) this.toggleLoader(true);

        const fajax = new FXMLHttpRequest();
        fajax.open(method, url);

        fajax.onload = () => {
            this.toggleLoader(false);
            // המרת המחרוזת שחזרה מהשרת (JSON) חזרה לאובייקט JavaScript לצורך עבודה
            onSuccess(JSON.parse(fajax.responseText), fajax.status);
        };

        fajax.onerror = () => {
            // מנגנון ה-Retry: אם הבקשה נכשלה, ננסה שוב עד המקסימום המותר
            if (attempt < this.maxRetries) {
                // המתנה של שנייה אחת בין ניסיונות כדי לתת לרשת להתאושש
                setTimeout(() => this.sendRequest(method, url, data, onSuccess, attempt + 1), 1000);
            } else {
                this.toggleLoader(false);
                this.showModal("שגיאת תקשורת לאחר מספר ניסיונות. בדקי את החיבור.");
            }
        };

        // שליחת הנתונים כשהם מקודדים למחרוזת JSON
        fajax.send(JSON.stringify(data));
    }
}

/**
 * TaskManager - מנהלת את לוגיקת המשימות (CRUD, סינון ותצוגה).
 */
class TaskManager extends BaseComponent {
    constructor() {
        super(); // קריאה ל-Constructor של BaseComponent (ירושה)
        this.currentUser = null; // ישמור את אובייקט המשתמש שנכנס למערכת
        this.currentFilter = 'all'; // מצב הסינון הנוכחי (Default: הצגת הכל)
        // מפת אייקונים המקשרת בין שם הקטגוריה לאייקון הויזואלי שלה
        this.categoryIcons = { personal: '💖', work: '💼', studies: '📚', gym: '🏋️' };
    }

    /**
     * אתחול מאזינים לאירועים בהתאם לעמוד שהמשתמש נמצא בו.
     * מונע מצב של ניסיון לגשת לאלמנטים שלא קיימים ב-DOM הנוכחי.
     */
    initEventListeners(templateId) {
        if (templateId === 'login-template' || templateId === 'register-template') {
            new AuthManager(this).initEventListeners(templateId);
        } else if (templateId === 'main-app-template') {
            // הגדרת כפתור התנתקות
            document.getElementById('logout-btn').onclick = () => {
                this.currentUser = null;
                this.navigateTo('login-template');
            };

            // הגדרת טופס הוספת משימה
            const addForm = document.getElementById('add-task-form');
            if (addForm) addForm.onsubmit = (e) => this.handleAddTask(e);

            // הצגת שם המשתמש בכותרת
            document.getElementById('user-display-name').innerText = this.currentUser.username;

            // שליפת משימות ראשונית עם טעינת העמוד
            this.fetchTasks();
        }
    }

    filterByCategory(category) {
        this.currentFilter = category;
        this.fetchTasks(); // שליפה מחדש ורינדור לפי הפילטר החדש
    }

    /**
     * שליפת משימות מהשרת, סינון לפי קטגוריה וביצוע מיון דו-שכבתי.
     */
    fetchTasks() {
        this.sendRequest("GET", "/tasks", { userId: this.currentUser.id }, (res) => {
            let tasks = res.data;

            // 1. שלב הסינון: השארת רק המשימות שמתאימות לקטגוריה שנבחרה
            if (this.currentFilter !== 'all') {
                tasks = tasks.filter(t => t.category === this.currentFilter);
            }

            // 2. שלב המיון הדו-שכבתי:
            // הגדרת סדר עדיפויות מספרי (ערך נמוך יותר = יופיע גבוה יותר ברשימה)
            const priorityOrder = { high: 1, medium: 2, low: 3 };

            tasks.sort((a, b) => {
                // רמה א': השוואה לפי דחיפות (Priority)
                if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                }

                // רמה ב': אם הדחיפות זהה, מיון לפי תאריך יעד (הקרוב ביותר למעלה)
                // משימות ללא תאריך מקבלות ערך דמיוני רחוק מאוד כדי שיופיעו בסוף
                const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
                const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');

                return dateA - dateB;
            });

            // 3. שליחת המערך המעובד (מסונן וממוין) לתצוגה ב-DOM
            this.renderTasks(tasks);
        });
    }

    /**
     * בניית רשימת המשימות ב-DOM בעזרת Template Literals.
     */
    renderTasks(tasks) {
        const list = document.getElementById('data-list');
        // אם אין משימות, נציג הודעה מתאימה למשתמש
        list.innerHTML = tasks.length === 0 ? '<p class="empty-msg">אין משימות.</p>' : tasks.map(t => `
            <div class="task-item priority-${t.priority} ${t.completed ? 'task-done' : ''}">
                <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''} 
                       onchange="app.handleToggle('${t.id}', this.checked)">
                
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
        `).join(''); // הפיכת המערך למחרוזת אחת גדולה של HTML
    }

    /**
     * פתיחת מודאל העריכה וטעינת נתוני המשימה הספציפית לתוך השדות.
     */
    handleOpenEdit(id) {
        this.sendRequest("GET", "/tasks", { userId: this.currentUser.id }, (res) => {
            const task = res.data.find(t => t.id === id);
            if (!task) return;
            const modal = document.getElementById('edit-task-modal');
            const form = document.getElementById('edit-task-form');

            // עדכון הכותרת במודאל
            document.getElementById('display-task-title').innerText = `${this.categoryIcons[task.category] || '📌'} ${task.title}`;

            // מילוי השדות בערכים הקיימים
            form.id.value = task.id; // שדה נסתר לצורך זיהוי המשימה בעדכון
            form.description.value = task.description || "";
            form.dueDate.value = task.dueDate || "";
            form.priority.value = task.priority;

            modal.classList.replace('modal-hidden', 'modal-visible');
            form.onsubmit = (e) => this.handleUpdateTask(e);
        });
    }

    handleUpdateTask(e) {
        e.preventDefault();
        // הפיכת נתוני הטופס לאובייקט JavaScript פשוט
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.userId = this.currentUser.id;

        this.sendRequest("PUT", "/tasks/update", data, () => {
            this.closeEditModal();
            this.fetchTasks(); // רענון הרשימה כדי לראות את השינויים
        });
    }

    closeEditModal() {
        document.getElementById('edit-task-modal').classList.replace('modal-visible', 'modal-hidden');
    }

    /**
     * מחיקת משימה בעזרת המודאל החכם שיצרנו ב-BaseComponent.
     */
    handleDelete(id) {
        // קריאה למודאל במצב אישור (autoClose = false)
        this.showModal("האם את בטוחה שברצונך למחוק את המשימה?", false, () => {
            // הבלוק הזה יתבצע רק אם המשתמש ילחץ על "כן, בטוחה"
            this.sendRequest("POST", "/tasks/delete", { id, userId: this.currentUser.id }, () => {
                this.fetchTasks();
            });
        });
    }

    handleToggle(id, done) {
        // עדכון מצב הביצוע (Checked/Unchecked) של המשימה בשרת
        this.sendRequest("POST", "/tasks/toggle", { id, completed: done, userId: this.currentUser.id }, () => this.fetchTasks());
    }

    handleAddTask(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.userId = this.currentUser.id;
        this.sendRequest("POST", "/tasks", data, () => {
            e.target.reset(); // ניקוי הטופס לאחר הוספה מוצלחת
            this.fetchTasks();
        });
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
            form.onsubmit = (e) => this.handleSubmit(e, type);
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
                    // הצלחה ברישום: הצגת הודעה זמנית וניווט אוטומטי לאחר מכן
                    this.mainApp.showModal("הרישום בוצע בהצלחה! מעביר אותך להתחברות...", true);

                    setTimeout(() => {
                        this.mainApp.navigateTo('login-template');
                    }, 3000);
                }
            } else {
                // הצגת שגיאות (כמו מייל קיים או סיסמה לא חוקית) שחזרו מהשרת
                this.mainApp.showModal(res.message, true);
            }
        });
    }
}

// יצירת מופע של האפליקציה וטעינת עמוד הכניסה עם עליית האתר
const app = new TaskManager();
window.onload = () => app.navigateTo('login-template');