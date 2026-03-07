class Network {
    static send(request, serverCallback) {
        const randomState = Math.random();
        let delay;
        let isDropped = false;

        // 1. קביעת הדיליי בצורה רנדומלית – לפי הדרישות: 1 עד 3 שניות
        if (randomState < 0.7) {
            // מצב רגיל (70%) – השהיה של 1-2 שניות
            delay = Math.floor(Math.random() * 1000) + 1000; // 1000-2000ms
        } else if (randomState < 0.85) {
            // מצב איטי (15%) – השהיה של 2-3 שניות
            delay = Math.floor(Math.random() * 1000) + 2000; // 2000-3000ms
            console.warn("Network: חווה עומס, שליחה איטית...");
        } else {
            // מצב איבוד הודעה (15%) – בטווח 10%-50% כנדרש
            delay = Math.floor(Math.random() * 1000) + 1000;
            isDropped = true;
        }

        console.log(`Network: Request to ${request.url} will take ${delay}ms | dropped: ${isDropped}`);

        setTimeout(() => {
            // האם ההודעה נאבדה?
            if (isDropped) {
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
