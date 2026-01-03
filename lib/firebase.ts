// Firebase config - lazy loaded to prevent SSR issues
const firebaseConfig = {
  apiKey: "AIzaSyAi77SUb105ysBaI7gnCGXgRBj-dtLflcE",
  authDomain: "clinio-7d443.firebaseapp.com",
  projectId: "clinio-7d443",
  storageBucket: "clinio-7d443.firebasestorage.app",
  messagingSenderId: "525711440320",
  appId: "1:525711440320:web:a4bc26f0843758c5d6f025"
};

let firebaseAppInstance: any = null;

// Lazy initialize Firebase - only on client side
export const getFirebaseApp = () => {
  if (typeof window === 'undefined') {
    throw new Error('Firebase can only be initialized on the client side');
  }
  
  if (!firebaseAppInstance) {
    const { initializeApp, getApps } = require('firebase/app');
    
    // Check if already initialized
    const apps = getApps();
    if (apps.length > 0) {
      firebaseAppInstance = apps[0];
    } else {
      firebaseAppInstance = initializeApp(firebaseConfig);
    }
  }
  
  return firebaseAppInstance;
};

// For backward compatibility
export const firebaseApp = new Proxy({} as any, {
  get(target, prop) {
    const app = getFirebaseApp();
    return app[prop];
  }
});

