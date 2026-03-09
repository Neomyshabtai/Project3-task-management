/**
 * LocalDatabase - מחלקה המשמשת כמעטפת (Wrapper) ל-LocalStorage של הדפדפן.
 * המטרה: ליצור "DB-API" פשוט המאפשר עבודה עם נתונים בצורה מסודרת (CRUD).
 */
class LocalDatabase {
    constructor(key) {
        // המפתח הוא השם שבו המידע יישמר בדפדפן (למשל 'tasks_data' או 'users_data')
        this.key = key;

        // אתחול: אם המפתח לא קיים, יוצרים מערך ריק כטקסט כדי למנוע שגיאות בריצה הראשונה
        if (!localStorage.getItem(this.key)) {
            localStorage.setItem(this.key, JSON.stringify([]));
        }
    }

    /**
     * פונקציית עזר פנימית לשליפת הנתונים.
     * ה-LocalStorage שומר רק טקסט (Strings), לכן חובה להפוך אותו חזרה לאובייקטים בעזרת JSON.parse.
     */
    _load() {
        const data = localStorage.getItem(this.key);
        return JSON.parse(data);
    }

    /**
     * פונקציית עזר פנימית לשמירת הנתונים.
     * לפני השמירה, עלינו להפוך את האובייקטים למחרוזת טקסט בעזרת JSON.stringify.
     */
    _save(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
    }

    /**
     * Create: הוספת פריט חדש למאגר.
     * הפונקציה מייצרת מזהה (ID) ייחודי לכל רשומה על בסיס זמן נוכחי.
     */
    add(item) {
        const allItems = this._load();

        // יצירת אובייקט חדש המשלב את נתוני הפריט עם ID ייחודי
        const newItem = {
            ...item,
            id: Date.now().toString() // שימוש במילי-שניות מבטיח ID שונה לכל לחיצה
        };

        allItems.push(newItem);
        this._save(allItems);

        return newItem; // מחזירים את הפריט שנוצר כדי שהשרת יוכל לשלוח אותו ללקוח
    }

    // Read: שליפת כל הרשומות מהמאגר בבת אחת
    getAll() {
        return this._load();
    }

    // Read: חיפוש רשומה ספציפית לפי ה-ID שלה
    getById(id) {
        const allItems = this._load();
        return allItems.find(item => item.id === id);
    }

    /**
     * Update: עדכון רשומה קיימת.
     * הפונקציה מוצאת את הפריט וממזגת את השדות החדשים לתוכו בעזרת ה-Spread Operator.
     */
    update(id, updatedFields) {
        const allItems = this._load();
        const index = allItems.findIndex(item => item.id === id);

        if (index !== -1) {
            // שומרים על המידע הישן ומחליפים רק את מה שנשלח ב-updatedFields
            allItems[index] = { ...allItems[index], ...updatedFields };
            this._save(allItems);
            return allItems[index];
        }
        return null; // החזרת null אם ה-ID לא נמצא
    }

    /**
     * Delete: מחיקת רשומה.
     * משתמשים ב-filter כדי ליצור מערך חדש ללא הרשומה שרצינו להסיר.
     */
    delete(id) {
        const allItems = this._load();
        const filteredItems = allItems.filter(item => item.id !== id);

        // בדיקה אם המערך קטן, כלומר שמשהו אכן נמחק
        if (allItems.length !== filteredItems.length) {
            this._save(filteredItems);
            return true;
        }
        return false;
    }

    /**
     * פונקציית חיפוש גמישה לפי שדה וערך.
     * משמשת למשל למציאת משימות לפי userId או משתמש לפי email.
     */
    getByProperty(propertyName, value) {
        const allItems = this._load();
        return allItems.filter(item => item[propertyName] === value);
    }
}

// יצירת מאגרי נתונים נפרדים (שתי "מגירות") למשימות ולמשתמשים
const usersDB = new LocalDatabase('users_data');
const tasksDB = new LocalDatabase('tasks_data');