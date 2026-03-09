/**
 * FXMLHttpRequest - מחלקה המדמה את האובייקט המובנה XMLHttpRequest של הדפדפן.
 * המטרה: לאפשר תקשורת אסינכרונית מדומה בין ה-Frontend ל"שרת".
 */
class FXMLHttpRequest {
  constructor() {
    // שלבי הבקשה: 0=Unsent, 1=Opened, 3=Loading, 4=Done
    this.readyState = 0;
    this.status = 0; // קוד הסטטוס שיחזור מהשרת (למשל 200 להצלחה)
    this.responseText = ""; // כאן יישמרו הנתונים שיחזרו מהשרת כטקסט
    this.onload = null;
    this.onerror = null;
    this.onreadystatechange = null;
    this.timeout = 5000; // הגדרת זמן המתנה מקסימלי של 5 שניות
  }

  /**
   * עדכון מצב הבקשה והפעלת האירוע onreadystatechange.
   * זהו דפוס עבודה מונחה אירועים (Event-Driven) המאפשר ל-app.js לדעת מה קורה בבקשה.
   */
  _setReadyState(state) {
    this.readyState = state;
    if (this.onreadystatechange) {
      console.log(`FAJAX: ReadyState changed to ${state}`);
      this.onreadystatechange();
    }
  }

  // שלב ה-Open: הגדרת יעד הבקשה וסוג המתודה (GET/POST)
  open(method, url) {
    this.method = method;
    this.url = url;
    this._setReadyState(1); // מעבר למצב Opened
  }

  /**
   * שלב ה-Send: שליחת הבקשה לשכבת ה-Network.
   * כאן ממומש מנגנון ה-Timeout שמגן על האפליקציה מפני "קפיאה".
   */
  send(data = null) {
    const request = {
      method: this.method,
      url: this.url,
      body: data
    };

    this._setReadyState(3); // מעבר למצב Loading (הבקשה בדרך)

    // יצירת שעון עצר (Timer): אם השרת לא יגיב תוך 5 שניות, נכריז על שגיאה
    const timeoutId = setTimeout(() => {
      if (this.readyState !== 4) {
        console.warn("FAJAX: Request timed out");
        this.status = 0;
        this.responseText = "";
        this._setReadyState(4); // סיום הבקשה בגלל חריגת זמן

        if (this.onerror) this.onerror("שגיאה: זמן ההמתנה הסתיים (Timeout)");
      }
    }, this.timeout);

    // פנייה לשכבת ה-Network המדמה את תעבורת הרשת
    Network.send(request, (response) => {
      // אם התקבלה תגובה, מבטלים את טיימר ה-Timeout
      clearTimeout(timeoutId);

      // בדיקה: אם הבקשה כבר נסגרה בגלל Timeout, נתעלם מהתגובה שהגיעה באיחור
      if (this.readyState === 4 && this.status === 0) return;

      this.status = response.status;

      // המרת אובייקט התגובה למחרוזת (JSON), כפי שקורה בתקשורת HTTP אמיתית
      this.responseText = JSON.stringify(response);

      this._setReadyState(4); // מעבר למצב Done (הנתונים מוכנים)

      // הפעלת ה-Callback של ההצלחה שהוגדר ב-app.js
      if (this.onload) {
        this.onload();
      }
    });
  }
}