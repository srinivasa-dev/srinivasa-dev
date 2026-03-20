import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js';
import {
    API_KEY,
    AUTH_DOMAIN,
    PROJECT_ID,
    STORAGE_BUCKET,
    MESSAGING_SENDER_ID,
    APP_ID,
    MEASUREMENT_ID
} from './apikeys.js';

const hasFirebaseConfig = [
    API_KEY,
    AUTH_DOMAIN,
    PROJECT_ID,
    STORAGE_BUCKET,
    MESSAGING_SENDER_ID,
    APP_ID
].every(Boolean);

if (hasFirebaseConfig) {
    const firebaseConfig = {
        apiKey: API_KEY,
        authDomain: AUTH_DOMAIN,
        projectId: PROJECT_ID,
        storageBucket: STORAGE_BUCKET,
        messagingSenderId: MESSAGING_SENDER_ID,
        appId: APP_ID
    };

    if (MEASUREMENT_ID) {
        firebaseConfig.measurementId = MEASUREMENT_ID;
    }

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

    if (MEASUREMENT_ID) {
        isSupported()
            .then(supported => {
                if (supported) {
                    getAnalytics(app);
                }
            })
            .catch(() => {
                // Ignore analytics failures in unsupported environments.
            });
    }
}
