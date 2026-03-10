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
    // 1. הפיכת הנתונים לאובייקט
    const data = JSON.parse(requestData);
    const { username, password, email } = data;

    // 2. ולידציית נוכחות: בדיקה שכל השדות מולאו
    if (!username || !password || !email) {
        return { status: 400, message: "שגיאה: כל השדות חובה." };
    }

    // 3. בדיקת פורמט אימייל (Regex)
    // בודק שיש תווים, סימן @, ושוב תווים עם נקודה 
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { status: 400, message: "שגיאה: פורמט האימייל אינו תקין." };
    }

    // 4. בדיקת חוזק סיסמה (Regex)
    // לפחות 4 תווים, לפחות אות אחת גדולה (A-Z) ולפחות מספר אחד (0-9)
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{4,}$/;
    if (!passwordRegex.test(password)) {
        return { 
            status: 400, 
            message: "הסיסמה חייבת להיות לפחות 4 תווים, לכלול אות גדולה ומספר." 
        };
    }

    // 5. בדיקת ייחודיות שם משתמש
    if (usersDB.getByProperty('username', username).length > 0) {
        return { status: 409, message: "שם המשתמש הזה כבר תפוס." };
    }

    // 6. בדיקת ייחודיות אימייל
    if (usersDB.getByProperty('email', email).length > 0) {
        return { status: 409, message: "כתובת האימייל הזו כבר רשומה במערכת." };
    }

    // 7. בדיקת ייחודיות סיסמה (הדרישה המיוחדת שלך: "הכל ייחודי")
    // בודק אם יש כבר משתמש אחר עם אותה סיסמה בדיוק
    if (usersDB.getByProperty('password', password).length > 0) {
        return { status: 409, message: "הסיסמה הזו כבר קיימת במערכת, בחרי סיסמה אחרת." };
    }

    // 8. אם עברנו את כל המחסומים - שמירה במאגר
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