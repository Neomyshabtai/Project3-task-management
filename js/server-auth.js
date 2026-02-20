//יכיל את פונקציות השרת לרישום משתמש חדש ובדיקת פרטי כניסה

//זכרי שבפרויקט הסופי, הפונקציה הזו לא תיקרא ישירות מהכפתור באתר. 
// היא "תחכה" בצד השרת, ומי שיעביר לה את המידע יהיה רכיב ה-
// Network (הכביש המשובש) לאחר השהיה אקראית.

// שרת האימות - אחראי על רישום וכניסה
const authServer = {
    
    // פונקציית רישום משתמש חדש
    register: function(requestData) {
        // 1. פירוק הנתונים שהגיעו מהלקוח (בפורמט JSON)
        const { username, password } = JSON.parse(requestData);

        // 2. בדיקת תקינות בסיסית (ולידציה)
        if (!username || !password) {
            return JSON.stringify({
                status: 400,
                message: "שגיאה: שם משתמש וסיסמה הם שדות חובה"
            });
        }

        // 3. בדיקה האם המשתמש כבר קיים במאגר (מניעת כפילויות)
        const existingUsers = usersDB.getByProperty('username', username);
        if (existingUsers.length > 0) {
            return JSON.stringify({
                status: 409,
                message: "שגיאה: שם המשתמש כבר תפוס"
            });
        }

        // 4. שמירת המשתמש החדש במאגר דרך ה-DB-API
        const newUser = usersDB.add({ username, password });

        // 5. החזרת תגובת הצלחה ללקוח
        return JSON.stringify({
            status: 201,
            message: "הרישום בוצע בהצלחה!",
            user: { id: newUser.id, username: newUser.username }
        });
    },
    
    // פונקציית כניסה למערכת
    login: function(requestData) {
        // 1. פירוק הנתונים שהגיעו מהלקוח [cite: 306, 430]
        const { username, password } = JSON.parse(requestData);

        // 2. חיפוש המשתמש במאגר המידע לפי שם המשתמש [cite: 393, 443]
        const users = usersDB.getByProperty('username', username);
        const user = users[0]; // מחזיר את המשתמש הראשון שנמצא

        // 3. בדיקה - האם המשתמש בכלל קיים? 
        if (!user) {
            return JSON.stringify({
                status: 404,
                message: "שגיאה: משתמש לא נמצא"
            });
        }

        // 4. בדיקת התאמת סיסמה 
        if (user.password !== password) {
            return JSON.stringify({
                status: 401,
                message: "שגיאה: סיסמה שגויה"
            });
        }

        // 5. אישור כניסה - מחזירים תגובה הכוללת את פרטי המשתמש (ללא הסיסמה!) [cite: 395, 430, 439]
        return JSON.stringify({
            status: 200,
            message: "התחברת בהצלחה!",
            user: { id: user.id, username: user.username }
        });
    }
};