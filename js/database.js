//מאגר מידע
//מנהל את ה-Local Storage
//עליו לכלול "DB-API" (סט פונקציות לביצוע פעולות במאגר)
//ולוודא שכל רשומה היא אובייקט JSON עם שדה id

class LocalDatabase {
    constructor(key) {
        // המפתח הוא השם שבו המידע יישמר בדפדפן (למשל 'tasks' או 'users')
        this.key = key; 

        // אם המגירה ריקה, נשים בה מערך ריק כדי שלא נקבל שגיאות בהמשך
        if (!localStorage.getItem(this.key)) {
            localStorage.setItem(this.key, JSON.stringify([]));
        }
    }

    // שליפת כל הנתונים מהמגירה והפיכתם חזרה לאובייקטים של JS
    _load() {
        const data = localStorage.getItem(this.key);
        return JSON.parse(data); // הופך טקסט חזרה למערך [cite: 306]
    }

    // שמירת מערך הנתונים חזרה למגירה כטקסט
    _save(data) {
        localStorage.setItem(this.key, JSON.stringify(data)); // 
    }

    add(item) {
        const allItems = this._load();
        
        // יצירת מזהה ייחודי פשוט (מבוסס זמן) כפי שנדרש 
        const newItem = {
            ...item,
            id: Date.now().toString() 
        };

        allItems.push(newItem);
        this._save(allItems);
        
        return newItem; // מחזירים את הפריט שנוצר עם ה-ID שלו
    }

    getAll() {
        return this._load();
    }

    getById(id) {
    const allItems = this._load();
    // חיפוש הפריט שה-id שלו תואם לזה שקיבלנו
    return allItems.find(item => item.id === id);
    }

    update(id, updatedFields) {
    const allItems = this._load();
    const index = allItems.findIndex(item => item.id === id);

    if (index !== -1) {
        // מיזוג השדות הקיימים עם השדות החדשים שנשלחו
        allItems[index] = { ...allItems[index], ...updatedFields };
        this._save(allItems);
        return allItems[index];
    }
    return null; // אם לא נמצאה הרשומה
    }

    delete(id) {
    const allItems = this._load();
    // יצירת מערך חדש ללא הפריט שאותו אנחנו רוצים למחוק
    const filteredItems = allItems.filter(item => item.id !== id);
    
    if (allItems.length !== filteredItems.length) {
        this._save(filteredItems);
        return true; // המחיקה הצליחה
    }
    return false; // לא נמצא מה למחוק
    }

    getByProperty(propertyName, value) {
    const allItems = this._load();
    // החזרת כל הפריטים שתואמים לערך המבוקש
    return allItems.filter(item => item[propertyName] === value);
    }
}

// יצירת שני מאגרי המידע הנדרשים לפרויקט 
const usersDB = new LocalDatabase('users_data');
const tasksDB = new LocalDatabase('tasks_data');

// ייצוא המאגרים לשימוש בשאר חלקי המערכת (אם אתן משתמשות במודולים)
// או פשוט להשאיר אותם כמשתנים גלובליים שקובץ השרת יוכל לראות