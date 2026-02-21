//יכיל את פונקציות השרת לרישום משתמש חדש ובדיקת פרטי כניסה

//זכרי שבפרויקט הסופי, הפונקציה הזו לא תיקרא ישירות מהכפתור באתר. 
// היא "תחכה" בצד השרת, ומי שיעביר לה את המידע יהיה רכיב ה-
// Network (הכביש המשובש) לאחר השהיה אקראית.

// שרת האימות - אחראי על רישום וכניסה
class AuthServer {
    // פונקציית ניתוב - היא מקבלת אובייקט request מה-Network
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
static register(requestData) {
    const data = JSON.parse(requestData);
    const { username, password, email } = data;

    // 1. בדיקה שכל השדות הגיעו
    if (!username || !password || !email) {
        return { status: 400, message: "שגיאה: כל השדות חובה" };
    }

    // 2. בדיקה אם שם המשתמש תפוס (כבר קיים לך)
    const existingUser = usersDB.getByProperty('username', username);
    if (existingUser.length > 0) {
        return { status: 409, message: "שגיאה: שם המשתמש כבר קיים" };
    }

    // 3. הבדיקה החדשה: האם המייל כבר קיים במערכת?
    const existingEmail = usersDB.getByProperty('email', email);
    if (existingEmail.length > 0) {
        return { 
            status: 409, 
            message: "שגיאה: קיימת כבר הרשמה עם כתובת האימייל הזו" 
        };
    }

    // 4. אם הכל בסדר - שומרים ב-DB
    const newUser = usersDB.add({ username, password, email });
    return { 
        status: 201, 
        message: "הרישום בוצע בהצלחה!", 
        data: { id: newUser.id, username: newUser.username } 
    };
 }

    static login(requestData) {
        const { username, password } = JSON.parse(requestData);
        const users = usersDB.getByProperty('username', username);
        const user = users[0];

        if (!user || user.password !== password) {
            return { status: 401,
                 message: "שם המשתמש או הסיסמה אינם תקינים" };
        }

        return { 
            status: 200, 
            message: "התחברת בהצלחה!", 
            data: { id: user.id, username: user.username } 
        };
    }
}