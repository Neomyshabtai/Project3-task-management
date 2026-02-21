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
            if (this.currentUser) {
                document.getElementById('user-display-name').innerText = this.currentUser.username;
            }
        }
    },

    // --- 2. וולידציה (הפרדה בין כניסה להרשמה) ---
    validate(data, type) {
        const uReg = /^[a-zA-Z0-9]{3,}$/; // שם משתמש: לפחות 3 תווים
        const pReg = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/; // סיסמה: אות + מספר, לפחות 6
        const eReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // פורמט אימייל בסיסי

        if (type === 'register') {
            // בדיקות קפדניות להרשמה (עם הסברים למשתמש)
            if (!uReg.test(data.username)) {
                alert("שם המשתמש חייב להיות לפחות 3 תווים (אנגלית ומספרים).");
                return false;
            }
            if (!eReg.test(data.email)) {
                alert("כתובת האימייל אינה תקינה.");
                return false;
            }
            if (!pReg.test(data.password)) {
                alert("הסיסמה חייבת לכלול לפחות 6 תווים, אות אחת ומספר אחד.");
                return false;
            }
            if (data.password !== data.confirmPassword) {
                alert("הסיסמאות אינן תואמות.");
                return false;
            }
        } else {
            // בדיקה בסיסית לכניסה (לא חושפים חוקי פורמט לפורצים)
            if (!data.username || !data.password) {
                alert("יש להזין שם משתמש וסיסמה.");
                return false;
            }
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
                console.warn(`ניסיון ${attempt} נכשל, מנסה שוב בעוד שניה...`);
                setTimeout(() => this.sendRequestWithRetry(method, url, data, onSuccess, attempt + 1), 1000);
            } else {
                alert("שגיאת תקשורת: השרת לא מגיב לאחר מספר ניסיונות.");
            }
        };

        fajax.send(JSON.stringify(data));
    },

    // --- 4. טיפול בשליחת טפסים (Unified Handler) ---
    handleSubmit(e, type) {
        e.preventDefault();
        
        // איסוף אוטומטי של כל השדות מהטופס
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // ביצוע וולידציה לפי סוג הטופס
        if (!this.validate(data, type)) return;

        const btn = e.target.querySelector('button');
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "...טוען";

        const url = type === 'login' ? '/auth/login' : '/auth/register';

        this.sendRequestWithRetry("POST", url, data, (res, status) => {
            btn.disabled = false;
            btn.innerText = originalText;

            if (status === 200 || status === 201) {
                if (type === 'login') {
                    this.currentUser = res.data;
                    this.navigateTo('main-app-template');
                } else {
                    alert(res.message);
                    this.navigateTo('login-template');
                }
            } else {
                // הודעת שגיאה מהשרת (כמו "שם משתמש או סיסמה לא נכונים")
                alert(res.message);
            }
        });
    },

    handleLogout() {
        if (confirm("האם ברצונך להתנתק?")) {
            this.currentUser = null;
            this.navigateTo('login-template');
        }
    }
};

// הפעלה ראשונית של עמוד הכניסה
window.onload = () => App.navigateTo('login-template');