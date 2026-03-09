/**
 * AuthServer - שרת האימות המדומה.
 * תפקידו לנהל את תהליכי הרישום (Signup) והכניסה (Login) למערכת.
 */
class AuthServer {
    /**
     * פונקציית ניתוב - מקבלת בקשה מה-Network ומחליטה איזו פעולת אימות לבצע.
     * מפרידה בין בקשות רישום לבקשות התחברות לפי הכתובת (URL).
     */
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

    /**
     * רישום משתמש חדש: מבצע ולידציה ובודק כפילויות לפני שמירה במאגר.
     * מחזירה סטטוס 201 (Created) במקרה של הצלחה.
     */
    static register(requestData) {
        // הפיכת הנתונים ממחרוזת JSON חזרה לאובייקט לצורך עבודה נוחה
        const data = JSON.parse(requestData);
        const { username, password, email } = data;

        // 1. ולידציית נוכחות: בדיקה שכל השדות הגיעו מה-Frontend
        if (!username || !password || !email) {
            return { status: 400, message: "שגיאה: כל השדות חובה" };
        }

        // 2. מניעת כפילויות (שם משתמש): בדיקה מול המאגר אם השם כבר תפוס
        const existingUser = usersDB.getByProperty('username', username);
        if (existingUser.length > 0) {
            return { status: 409, message: "שם המשתמש הזה כבר תפוס" };
        }

        // 3. מניעת כפילויות (אימייל): בדיקה מול המאגר אם המייל כבר קיים במערכת
        const existingEmail = usersDB.getByProperty('email', email);
        if (existingEmail.length > 0) {
            return {
                status: 409, // סטטוס המציין קונפליקט בנתונים
                message: "כתובת האימייל הזו כבר רשומה במערכת"
            };
        }

        // 4. שמירה סופית במאגר הנתונים המקומי
        const newUser = usersDB.add({ username, password, email });

        return {
            status: 201,
            message: "הרישום בוצע בהצלחה!",
            data: { id: newUser.id, username: newUser.username }
        };
    }

    /**
     * כניסת משתמש: אימות פרטי זיהוי (מייל וסיסמה) מול הנתונים השמורים במאגר.
     */
    static login(requestData) {
        const { email, password } = JSON.parse(requestData);

        // שליפת המשתמש לפי האימייל (מפתח זיהוי ייחודי)
        const users = usersDB.getByProperty('email', email);
        const user = users[0];

        // בדיקת תקינות: האם המשתמש קיים והאם הסיסמה שהזין תואמת למה ששמור
        if (!user || user.password !== password) {
            return {
                status: 401, // סטטוס המציין חוסר הרשאה / פרטים שגויים
                message: "כתובת האימייל או הסיסמה אינם נכונים"
            };
        }

        /**
         * החזרת פרטי המשתמש לצורך ניהול ה-Session ב-Frontend.
         * שימי לב: לא מחזירים את הסיסמה חזרה ללקוח מטעמי אבטחה.
         */
        return {
            status: 200,
            message: "התחברת בהצלחה!",
            data: { id: user.id, username: user.username, email: user.email }
        };
    }
}