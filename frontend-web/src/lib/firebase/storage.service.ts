import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, UploadTaskSnapshot } from 'firebase/storage';
import app from './config';

// Inicializar Firebase Storage
const storage = getStorage(app);

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error';
}

export interface UploadResult {
  url: string;
  path: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

/**
 * Upload de arquivo para Firebase Storage
 * @param file Arquivo a ser enviado
 * @param path Caminho no Storage (ex: 'materials/videoId/')
 * @param onProgress Callback de progresso
 * @returns Promise com URL e metadados do arquivo
 */
export async function uploadFile(
  file: File,
  path: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Gerar nome único para o arquivo
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}_${sanitizedName}`;
  const fullPath = `${path}${fileName}`;
  
  // Criar referência
  const storageRef = ref(storage, fullPath);
  
  // Iniciar upload
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        
        if (onProgress) {
          onProgress({
            progress,
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            state: snapshot.state as UploadProgress['state'],
          });
        }
      },
      (error) => {
        console.error('Erro no upload:', error);
        reject(new Error(`Erro ao fazer upload: ${error.message}`));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          resolve({
            url: downloadURL,
            path: fullPath,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
          });
        } catch (error: any) {
          reject(new Error(`Erro ao obter URL: ${error.message}`));
        }
      }
    );
  });
}

/**
 * Upload de material didático (PDF, DOC, etc.)
 * @param file Arquivo do material
 * @param videoId ID do vídeo associado
 * @param onProgress Callback de progresso
 */
export async function uploadMaterial(
  file: File,
  videoId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  // Validar tipo de arquivo
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Tipo de arquivo não permitido: ${file.type}`);
  }

  // Limite de 50MB
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Arquivo muito grande. Limite: 50MB');
  }

  const path = `materials/${videoId}/`;
  return uploadFile(file, path, onProgress);
}

/**
 * Deletar arquivo do Firebase Storage
 * @param path Caminho completo do arquivo
 */
export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Obter URL de download de um arquivo
 * @param path Caminho do arquivo no Storage
 */
export async function getFileUrl(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}

/**
 * Formatar tamanho de arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Obter extensão do arquivo
 */
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

/**
 * Verificar se é um tipo de arquivo permitido
 */
export function isAllowedFileType(file: File): boolean {
  const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
  const extension = getFileExtension(file.name);
  return allowedExtensions.includes(extension);
}

export const storageService = {
  uploadFile,
  uploadMaterial,
  deleteFile,
  getFileUrl,
  formatFileSize,
  getFileExtension,
  isAllowedFileType,
};
