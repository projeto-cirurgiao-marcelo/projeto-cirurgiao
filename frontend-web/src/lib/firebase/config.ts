import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Valida que todas as variáveis de ambiente essenciais do Firebase estão presentes.
// Falha explicitamente em build/init para evitar deploy silencioso apontando para
// credenciais inválidas ou ausentes.
function getRequiredFirebaseEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[Firebase] Variável de ambiente obrigatória ausente: ${name}. ` +
      'Configure todas as variáveis NEXT_PUBLIC_FIREBASE_* no ambiente de deploy.'
    );
  }
  return value;
}

const REQUIRED_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  throw new Error(
    `[Firebase] Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}. ` +
    'Configure-as no .env.local (dev) ou nas variáveis de ambiente do deploy.'
  );
}

// Configuração do Firebase
const firebaseConfig = {
  apiKey: getRequiredFirebaseEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getRequiredFirebaseEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getRequiredFirebaseEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: getRequiredFirebaseEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
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
