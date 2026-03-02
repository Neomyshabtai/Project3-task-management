// שרת האפליקציה - ניהול משימות (AppServer)
class AppServer {

    // --- 1. פונקציית הניתוב (Router) ---
    static handleRequest(request) {
        const { url, method, body } = request;

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

        return { status: 404, message: "נתיב לא נמצא בשרת האפליקציה" };
    }

    // --- 2. שליפת משימות של משתמש ---
    static getTasks(requestData) {
        const { userId } = JSON.parse(requestData);

        if (!userId) {
            return { status: 400, message: "שגיאה: חסר מזהה משתמש" };
        }

        // שליפת משימות לפי ה-API של ה-database.js
        const userTasks = tasksDB.getByProperty('userId', userId);

        return {
            status: 200,
            data: userTasks
        };
    }

    // --- 3. הוספת משימה חדשה (מעודכן לכל השדות) ---
    static addTask(requestData) {
        const data = JSON.parse(requestData);
        const { userId, title } = data;

        if (!title) {
            return { status: 400, message: "שגיאה: חובה להזין כותרת למשימה" };
        }

        // שימוש ב-Spread Operator כדי לשמור את description, priority, category ו-dueDate
        const newTask = tasksDB.add({
            ...data, 
            completed: false,
            createdAt: new Date().toISOString()
        });

        return {
            status: 201,
            message: "המשימה נוספה בהצלחה",
            data: newTask
        };
    }

    // --- 4. עדכון סטטוס משימה ---
    static toggleTaskStatus(requestData) {
        const { id, completed } = JSON.parse(requestData);
        const updatedTask = tasksDB.update(id, { completed: completed });

        if (!updatedTask) {
            return { status: 404, message: "שגיאה: המשימה לא נמצאה" };
        }

        return { status: 200, message: "סטטוס המשימה עודכן" };
    }

    // --- 5. עדכון ועריכת משימה ---
    static updateTask(requestData) {
        const { id, title } = JSON.parse(requestData);
        
        // כאן ניתן להוסיף עדכון שדות נוספים אם תרצי בעתיד (כמו תיאור)
        const updatedTask = tasksDB.update(id, { title: title });

        if (!updatedTask) {
            return { status: 404, message: "שגיאה: המשימה לא נמצאה לעדכון" };
        }

        return { status: 200, message: "המשימה עודכנה בהצלחה" };
    }

    // --- 6. מחיקת משימה ---
    static deleteTask(requestData) {
        const { id } = JSON.parse(requestData);
        const success = tasksDB.delete(id);

        if (!success) {
            return { status: 404, message: "שגיאה: לא ניתן למחוק" };
        }

        return { status: 200, message: "המשימה נמחקה" };
    }
}