// שרת האפליקציה - ניהול משימות (AppServer)
// הקובץ אחראי על הלוגיקה של ניהול המשימות מול ה-tasksDB
class AppServer {

    // --- 1. פונקציית הניתוב (Router) ---
    // מקבלת את הבקשה מה-Network ומחליטה לאיזו פונקציה לשלוח אותה
    static handleRequest(request) {
        const { url, method, body } = request;

        // ניתוב לפי נתיב (URL) וסוג בקשה (Method)
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

        return { status: 404, message: "נתיב לא נמצא בשרת האפליקציה" };
    }

    // --- 2. שליפת משימות של משתמש ---
    static getTasks(requestData) {
        const { userId } = JSON.parse(requestData);

        if (!userId) {
            return { status: 400, message: "שגיאה: חסר מזהה משתמש" };
        }

        // שליפת משימות ששייכות רק למשתמש המחובר
        const userTasks = tasksDB.getByProperty('userId', userId);

        return {
            status: 200,
            data: userTasks // מחזירים אובייקט, ה-FAJAX יהפוך לטקסט
        };
    }

    // --- 3. הוספת משימה חדשה ---
    static addTask(requestData) {
        const { userId, title } = JSON.parse(requestData);

        if (!title) {
            return { status: 400, message: "שגיאה: חובה להזין כותרת למשימה" };
        }

        // שמירה במאגר דרך ה-DB-API
        const newTask = tasksDB.add({
            userId: userId,
            title: title,
            completed: false,
            createdAt: new Date().toISOString()
        });

        return {
            status: 201,
            message: "המשימה נוספה בהצלחה",
            data: newTask
        };
    }

    // --- 4. עדכון סטטוס משימה (בוצע/לא בוצע) ---
    static toggleTaskStatus(requestData) {
        const { id, completed } = JSON.parse(requestData);

        // עדכון הרשומה הספציפית ב-Local Storage
        const updatedTask = tasksDB.update(id, { completed: completed });

        if (!updatedTask) {
            return { status: 404, message: "שגיאה: המשימה לא נמצאה" };
        }

        return {
            status: 200,
            message: "סטטוס המשימה עודכן",
            data: updatedTask
        };
    }

    // --- 5. מחיקת משימה ---
    static deleteTask(requestData) {
        const { id } = JSON.parse(requestData);

        const success = tasksDB.delete(id);

        if (!success) {
            return { status: 404, message: "שגיאה: לא ניתן למחוק משימה שלא קיימת" };
        }

        return {
            status: 200,
            message: "המשימה נמחקה בהצלחה"
        };
    }
}