import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAytVknlJ6DEPqoT4ZVk20mDi7pH17cFgE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "projeto-cirurgiao-e8df7.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "projeto-cirurgiao-e8df7",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "projeto-cirurgiao-e8df7.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "81746498042",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:81746498042:web:43aef280753c02166cd443",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-H4B40TC7Z8"
};

// Inicializa o Firebase (evita inicialização duplicada)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Exporta os serviços do Firebase
export const auth = getAuth(app);

// Analytics (apenas no cliente)
export const initAnalytics = async () => {
  if (typeof window !== 'undefined') {
    const supported = await isSupported();
    if (supported) {
      return getAnalytics(app);
    }
  }
  return null;
};

export default app;
