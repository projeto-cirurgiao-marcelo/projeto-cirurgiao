import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: admin.app.App;

  onModuleInit() {
    try {
      // Verifica se já foi inicializado
      if (admin.apps.length > 0) {
        this.app = admin.apps[0];
        this.logger.log('Firebase Admin SDK already initialized');
        return;
      }

      const projectId = process.env.FIREBASE_PROJECT_ID || 'projeto-cirurgiao-e8df7';

      // Método 1: Arquivo de service account (local)
      // Usa process.cwd() para pegar a raiz do projeto onde npm run start:dev é executado
      const serviceAccountFileName = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'firebase-service-account.json';
      const absolutePath = path.join(process.cwd(), serviceAccountFileName);
      
      this.logger.log(`Looking for service account at: ${absolutePath}`);
      
      try {
        if (fs.existsSync(absolutePath)) {
          // Usa fs.readFileSync ao invés de require para evitar problemas com webpack
          const fileContent = fs.readFileSync(absolutePath, 'utf8');
          const serviceAccount = JSON.parse(fileContent);
          
          this.app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id || projectId,
          });
          this.logger.log(`Firebase Admin SDK initialized with service account file (project: ${serviceAccount.project_id})`);
          return;
        } else {
          this.logger.warn(`Service account file not found at: ${absolutePath}`);
        }
      } catch (e) {
        this.logger.warn(`Could not load service account from file path: ${e.message}`);
      }

      // Método 2: JSON inline via variável de ambiente
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          this.app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId,
          });
          this.logger.log('Firebase Admin SDK initialized with inline service account');
          return;
        } catch (e) {
          this.logger.warn('Could not parse inline service account key');
        }
      }

      // Método 3: Application Default Credentials (para Cloud Run/GKE)
      try {
        this.app = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId,
        });
        this.logger.log('Firebase Admin SDK initialized with Application Default Credentials');
      } catch (e) {
        this.logger.error('Failed to initialize Firebase Admin SDK with any method');
        throw e;
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
      throw error;
    }
  }

  /**
   * Verifica um ID token do Firebase e retorna os dados decodificados
   */
  async verifyIdToken(idToken: string): Promise<DecodedIdToken | null> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      this.logger.error('Error verifying Firebase ID token', error);
      return null;
    }
  }

  /**
   * Obtém informações de um usuário pelo UID
   */
  async getUser(uid: string): Promise<admin.auth.UserRecord | null> {
    try {
      return await admin.auth().getUser(uid);
    } catch (error) {
      this.logger.error(`Error getting user ${uid}`, error);
      return null;
    }
  }

  /**
   * Obtém informações de um usuário pelo email
   */
  async getUserByEmail(email: string): Promise<admin.auth.UserRecord | null> {
    try {
      return await admin.auth().getUserByEmail(email);
    } catch (error) {
      this.logger.error(`Error getting user by email ${email}`, error);
      return null;
    }
  }

  /**
   * Define custom claims para um usuário (ex: role)
   */
  async setCustomClaims(uid: string, claims: Record<string, any>): Promise<boolean> {
    try {
      await admin.auth().setCustomUserClaims(uid, claims);
      this.logger.log(`Custom claims set for user ${uid}`);
      return true;
    } catch (error) {
      this.logger.error(`Error setting custom claims for user ${uid}`, error);
      return false;
    }
  }

  /**
   * Cria um usuário no Firebase Auth
   */
  async createUser(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<admin.auth.UserRecord | null> {
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: false,
      });
      this.logger.log(`User created: ${userRecord.uid}`);
      return userRecord;
    } catch (error) {
      this.logger.error('Error creating user', error);
      return null;
    }
  }

  /**
   * Deleta um usuário do Firebase Auth
   */
  async deleteUser(uid: string): Promise<boolean> {
    try {
      await admin.auth().deleteUser(uid);
      this.logger.log(`User deleted: ${uid}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting user ${uid}`, error);
      return false;
    }
  }

  /**
   * Gera um link para verificação de email
   */
  async generateEmailVerificationLink(email: string): Promise<string | null> {
    try {
      const link = await admin.auth().generateEmailVerificationLink(email);
      return link;
    } catch (error) {
      this.logger.error(`Error generating email verification link`, error);
      return null;
    }
  }

  /**
   * Gera um link para reset de senha
   */
  async generatePasswordResetLink(email: string): Promise<string | null> {
    try {
      const link = await admin.auth().generatePasswordResetLink(email);
      return link;
    } catch (error) {
      this.logger.error(`Error generating password reset link`, error);
      return null;
    }
  }

  /**
   * Envia e-mail de redefinição de senha via Firebase Identity Toolkit REST API.
   * Usa os templates configurados no Firebase Console para o e-mail.
   * Requer FIREBASE_API_KEY (Web API Key) nas variáveis de ambiente.
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      this.logger.error('FIREBASE_API_KEY not configured in environment variables');
      throw new Error('Firebase API Key não configurada');
    }

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || 'Falha ao enviar e-mail de recuperação';
      this.logger.error(`Firebase password reset email error: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    this.logger.log(`Password reset email sent successfully to ${email}`);
  }
}
