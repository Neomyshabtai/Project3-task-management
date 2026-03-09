/**
 * AppServer - שרת האפליקציה המדומה.
 * אחראי על ניהול המשימות (CRUD) ואכיפת לוגיקה עסקית.
 */
class AppServer {

    /**
     * פונקציית הניתוב (Router) - הצומת המרכזי של השרת.
     * מקבלת בקשה גולמית מה-Network ומנתבת אותה לפונקציה המתאימה.
     */
    static handleRequest(request) {
        const { url, method, body } = request;

        // פענוח גוף הבקשה (ממחרוזת JSON לאובייקט) לצורך בדיקות
        const parsedBody = body ? JSON.parse(body) : {};

        /**
         * בדיקת הרשאה (Authorization):
         * כל פנייה לשרת האפליקציה חייבת לכלול מזהה משתמש. זהו שלב קריטי לאבטחת המידע.
         */
        if (!parsedBody.userId) {
            return { status: 401, message: "גישה נדחתה: נדרשת כניסה למערכת" };
        }

        // ניתוב לפי כתובת (URL) וסוג הבקשה (Method)
        if (url === '/tasks' && method === 'GET') {
            return this.getTasks(body);
        }
        if (url === '/tasks' && method === 'POST') {
            return this.addTask(body);
        }
        if (url === '/tasks/toggle' && method === 'POST') {
            return this.toggleTaskStatus(body);
        }
        if (url === '/tasks/delete' && method === 'POST') {
            return this.deleteTask(body);
        }
        if (url === '/tasks/update' && method === 'PUT') {
            return this.updateTask(body);
        }

        // אם הכתובת לא קיימת בשרת
        return { status: 404, message: "נתיב לא נמצא בשרת האפליקציה" };
    }

    /**
     * Read: שליפת משימות של משתמש ספציפי מהמאגר.
     * מבטיחה שמשתמש יראה רק את המשימות ששייכות לו.
     */
    static getTasks(requestData) {
        const { userId } = JSON.parse(requestData);

        if (!userId) {
            return { status: 400, message: "שגיאה: חסר מזהה משתמש" };
        }

        // שימוש במתודה getByProperty של המאגר לסינון מהיר
        const userTasks = tasksDB.getByProperty('userId', userId);

        return {
            status: 200,
            data: userTasks
        };
    }

    /**
     * Create: הוספת משימה חדשה.
     * מוסיפה ערכי ברירת מחדל כמו סטטוס 'לא בוצע' וחותמת זמן.
     */
    static addTask(requestData) {
        const data = JSON.parse(requestData);
        const { userId, title } = data;

        // ולידציה בסיסית: אי אפשר ליצור משימה ללא כותרת
        if (!title) {
            return { status: 400, message: "שגיאה: חובה להזין כותרת למשימה" };
        }

        const newTask = tasksDB.add({
            ...data,
            completed: false,
            createdAt: new Date().toISOString() // שמירת זמן יצירה לפורמט סטנדרטי
        });

        return {
            status: 201, // סטטוס המציין יצירת משאב חדש בהצלחה
            message: "המשימה נוספה בהצלחה",
            data: newTask
        };
    }

    /**
     * Update: עדכון סטטוס הביצוע (V) של המשימה.
     */
    static toggleTaskStatus(requestData) {
        const { id, completed } = JSON.parse(requestData);
        const updatedTask = tasksDB.update(id, { completed: completed });

        if (!updatedTask) {
            return { status: 404, message: "שגיאה: המשימה לא נמצאה" };
        }

        return { status: 200, message: "סטטוס המשימה עודכן" };
    }

    /**
     * Update: עריכת פרטי משימה קיימת (תיאור, תאריך, עדיפות).
     */
    static updateTask(requestData) {
        const data = JSON.parse(requestData);
        const { id } = data;

        // מיזוג המידע החדש לתוך הרשומה הקיימת במאגר
        const updatedTask = tasksDB.update(id, data);

        if (!updatedTask) {
            return { status: 404, message: "המשימה לא נמצאה" };
        }

        return { status: 200, message: "המשימה עודכנה בהצלחה" };
    }

    /**
     * Delete: הסרת משימה מהמאגר לצמיתות.
     */
    static deleteTask(requestData) {
        const { id } = JSON.parse(requestData);
        const success = tasksDB.delete(id);

        if (!success) {
            return { status: 404, message: "שגיאה: לא ניתן למחוק" };
        }

        return { status: 200, message: "המשימה נמחקה" };
    }
}