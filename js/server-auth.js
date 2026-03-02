// שרת האימות - אחראי על רישום וכניסה
class AuthServer {
    // פונקציית ניתוב - מקבלת בקשה מה-Network
    static handleRequest(request) {
        const { url, method, body } = request;

        if (url === '/auth/register' && method === 'POST') {
            return this.register(body);
        }
        if (url === '/auth/login' && method === 'POST') {
            return this.login(body);
        }

        return { status: 404, message: "נתיב לא נמצא בשרת האימות" };
    }

    // --- רישום משתמש חדש ---
    static register(requestData) {
        const data = JSON.parse(requestData);
        const { username, password, email } = data;

        // 1. בדיקה שכל השדות הגיעו
        if (!username || !password || !email) {
            return { status: 400, message: "שגיאה: כל השדות חובה" };
        }

        // 2. בדיקה אם שם המשתמש כבר קיים
        const existingUser = usersDB.getByProperty('username', username);
        if (existingUser.length > 0) {
            return { status: 409, message: "שם המשתמש הזה כבר תפוס" };
        }

        // 3. בדיקה אם המייל כבר קיים במערכת
        const existingEmail = usersDB.getByProperty('email', email);
        if (existingEmail.length > 0) {
            return { 
                status: 409, 
                message: "כתובת האימייל הזו כבר רשומה במערכת" 
            };
        }

        // 4. שמירה ב-DB
        const newUser = usersDB.add({ username, password, email });
        
        return { 
            status: 201, 
            message: "הרישום בוצע בהצלחה!", 
            data: { id: newUser.id, username: newUser.username } 
        };
    }

    // --- כניסת משתמש (לפי אימייל) ---
    static login(requestData) {
        const { email, password } = JSON.parse(requestData);

        // חיפוש המשתמש לפי כתובת האימייל בלבד
        const users = usersDB.getByProperty('email', email);
        const user = users[0];

        // בדיקה אם המשתמש קיים ואם הסיסמה תואמת
        if (!user || user.password !== password) {
            return { 
                status: 401, 
                message: "כתובת האימייל או הסיסמה אינם נכונים" 
            };
        }

        // החזרת פרטי המשתמש (ללא הסיסמה) לצורך ניהול Session ב-Frontend
        return { 
            status: 200, 
            message: "התחברת בהצלחה!", 
            data: { id: user.id, username: user.username, email: user.email } 
        };
    }
}