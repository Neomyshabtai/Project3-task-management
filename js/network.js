/**
 * Network - מחלקה המדמה את תשתית האינטרנט.
 * היא אחראית על יצירת השהיות רנדומליות ודימוי של איבוד מידע ברשת.
 */
class Network {
    /**
     * פונקציה סטטית השולחת בקשה.
     * משתמשת ב-Math.random כדי לייצר התפלגות הסתברותית של מצבי רשת.
     */
    static send(request, serverCallback) {
        const randomState = Math.random(); // הגרלת מספר בין 0 ל-1
        let delay;
        let isDropped = false;

        // 1. קביעת הדיליי והמצב בצורה רנדומלית - חלוקת הטווח למצבים שונים
        if (randomState < 0.7) {
            // מצב רגיל (70% מהזמן): השהיה סטנדרטית של 1-2 שניות
            delay = Math.floor(Math.random() * 1000) + 1000;
        } else if (randomState < 0.85) {
            // מצב איטי (15% מהזמן): השהיה ארוכה יותר של 2-3 שניות
            delay = Math.floor(Math.random() * 1000) + 2000;
            console.warn("Network: חווה עומס, שליחה איטית...");
        } else {
            // מצב איבוד הודעה (15% מהזמן): מדמה חבילת מידע שלא הגיעה ליעדה
            delay = Math.floor(Math.random() * 1000) + 1000;
            isDropped = true;
        }

        console.log(`Network: Request to ${request.url} will take ${delay}ms | dropped: ${isDropped}`);

        // שימוש ב-setTimeout כדי לדמות את האופי האסינכרוני של האינטרנט
        setTimeout(() => {
            // אם ההודעה "נפלה", אנחנו פשוט לא קוראים ל-Callback.
            // כתוצאה מכך, ה-FAJAX יחכה עד ה-Timeout שלו ויפעיל את מנגנון ה-Retry.
            if (isDropped) {
                console.error("Network: הודעה נאבדה בכביש המשובש!");
                return;
            }

            // ניתוב הבקשה לשרת הלוגי המתאים לפי ה-URL
            const response = this.routeToServer(request);
            serverCallback(response);
        }, delay);
    }

    /**
     * פונקציית ניתוב (Router) - מחליטה איזה "שרת" יטפל בבקשה.
     * מדמה עבודה מול מספר שירותים (Services) שונים.
     */
    static routeToServer(request) {
        // ניתוב לשרת האימות עבור כל מה שקשור ל-Login/Register
        if (request.url.startsWith('/auth')) {
            return AuthServer.handleRequest(request);
        }
        // ניתוב לשרת האפליקציה עבור ניהול המשימות
        if (typeof AppServer !== 'undefined') {
            return AppServer.handleRequest(request);
        }
        // טיפול במקרה קצה שבו השרת לא זמין
        return { status: 501, message: "שרת האפליקציה לא מחובר" };
    }
}