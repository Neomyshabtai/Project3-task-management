//מנגנון FAJAX
//מכיל את מימוש המחלקה FXMLHttpRequest המדמה את XMLHttpRequest
//כל פעולת תקשורת חייבת ליצור אובייקט חדש מהסוג הזה
class FXMLHttpRequest {
  constructor() {
    this.readyState = 0; // Unsent
    this.status = 0;
    this.responseText = "";
    this.onload = null;
    this.onerror = null;
    this.onreadystatechange = null;
    this.timeout = 5000;
  }

  // פונקציה פנימית לעדכון מצב והפעלת אירוע שינוי מצב
  _setReadyState(state) {
    this.readyState = state;
    if (this.onreadystatechange) {
        console.log(`FAJAX: ReadyState changed to ${state}`);
        this.onreadystatechange();
    }
  }

  open(method, url) {
    this.method = method;
    this.url = url;
    this._setReadyState(1); // Opened
  }

  send(data = null) {
    const request = {
      method: this.method,
      url: this.url,
      body: data
    };

    this._setReadyState(3); // Loading

    const timeoutId = setTimeout(() => {
      if (this.readyState !== 4) {
        console.warn("FAJAX: Request timed out");
        this.status = 0;
        this.responseText = "";
        this._setReadyState(4); // Done

        if (this.onerror) this.onerror("שגיאה: זמן ההמתנה הסתיים (Timeout)");
      }
    }, this.timeout);

    Network.send(request, (response) => {
      clearTimeout(timeoutId);

      // אם כבר הגענו ל-Timeout, אל תעשה כלום
      if (this.readyState === 4 && this.status === 0) return;

      this.status = response.status;
      
      // התיקון החשוב: שומרים את כל ה-response כטקסט
      // כדי ש-app.js יוכל לגשת ל-res.message ו-res.data
      this.responseText = JSON.stringify(response); 
      
      this._setReadyState(4); // Done

      // התיקון הקריטי: אם השרת ענה, אנחנו מפעילים את onload.
      // ה-app.js הוא זה שיבדוק אם הסטטוס הוא 200 או 401.
      if (this.onload) {
        this.onload();
      }
    });
  }
}