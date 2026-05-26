import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Cada acesso a process.env usa chave literal estática para que o Next.js faça
// inline correto no bundle do cliente. Acesso dinâmico (process.env[varName])
// NÃO é substituído pelo bundler e resultaria em undefined no browser.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Valida os valores já resolvidos (leituras acima são literais → inlined pelo bundler).
// Falha explicitamente se alguma variável essencial estiver ausente, evitando deploy
// silencioso sem configuração correta.
const REQUIRED = {
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  NEXT_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId,
};

const missing = Object.entries(REQUIRED)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  throw new Error(
    `[Firebase] Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}. ` +
    'Configure-as no .env.local (dev) ou nas variáveis de ambiente do deploy.'
  );
}

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
