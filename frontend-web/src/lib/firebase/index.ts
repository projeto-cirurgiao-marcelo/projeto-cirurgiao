// Firebase Configuration and Services
export { default as app, auth, initAnalytics } from './config';
export { 
  firebaseAuthService, 
  type FirebaseAuthUser, 
  type AuthResult 
} from './auth.service';
