class Network {
    static send(request, serverCallback) {
        const randomState = Math.random();
        let delay;

        // 1. קביעת הדיליי בצורה רנדומלית
        if (randomState < 0.3) {
            // מצב מהיר - רוב הזמן (70%)
            delay = Math.floor(Math.random() * 300) + 100; // 100-400ms
        } else if (randomState < 0.8) {
            // מצב איטי - מדי פעם (10%)
            delay = Math.floor(Math.random() * 2000) + 2000; // 2000-4000ms
            console.warn("Network: חווה עומס, שליחה איטית...");
        } else {
            // מצב איבוד הודעה (20%)
            delay = 1000; // זמן עד שההודעה "נעלמת"
        }

        console.log(`Network: Request to ${request.url} will take ${delay}ms`);

        setTimeout(() => {
            // האם ההודעה נאבדה? (רק אם נפלנו על ה-20% האחרונים)
            if (randomState >= 0.8) {
                console.error("Network: הודעה נאבדה בכביש המשובש!");
                return; // ה-FAJAX יחכה ל-Timeout ויפעיל Retry
            }
            
            // ניתוב לשרת המתאים
            const response = this.routeToServer(request);
            serverCallback(response);
        }, delay);
    }

    static routeToServer(request) {
        if (request.url.startsWith('/auth')) {
            return AuthServer.handleRequest(request);
        }
        if (typeof AppServer !== 'undefined') {
            return AppServer.handleRequest(request);
        }
        return { status: 501, message: "שרת האפליקציה לא מחובר" };
    }
}