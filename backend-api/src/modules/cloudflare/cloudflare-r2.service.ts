import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

export interface FileMetadata {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
}

@Injectable()
export class CloudflareR2Service {
  private readonly logger = new Logger(CloudflareR2Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    const r2AccessKeyId = this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const r2SecretAccessKey = this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    // ConfigService returns undefined for missing keys; we tolerate that
    // (R2 features go into degraded mode below) but TypeScript strict
    // needs a concrete string assignment here.
    this.bucket = this.configService.get<string>('CLOUDFLARE_R2_BUCKET') ?? '';
    this.endpoint = this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT') ?? '';
    this.publicUrl = this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL') ?? '';

    if (!r2AccessKeyId || !r2SecretAccessKey || !this.bucket || !this.endpoint) {
      this.logger.warn('Cloudflare R2 credentials not fully configured - R2 features will be disabled');
      // Não lançar erro, apenas avisar
      return;
    }

    try {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: this.endpoint,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });

      this.logger.log('Cloudflare R2 Service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize R2 client', error);
      this.logger.warn('R2 features will be disabled');
    }
  }

  /**
   * Upload de arquivo para R2
   */
  async uploadFile(
    file: Buffer | Readable,
    key: string,
    contentType?: string,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    try {
      this.logger.log(`Uploading file to R2: ${key}`);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: metadata,
      });

      await this.s3Client.send(command);

      const url = this.getPublicUrl(key);

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        url,
        bucket: this.bucket,
      };
    } catch (error) {
      this.logger.error(`Error uploading file to R2: ${key}`, error);
      throw new BadRequestException('Failed to upload file');
    }
  }

  /**
   * Download de arquivo do R2
   */
  async downloadFile(key: string): Promise<Readable> {
    try {
      this.logger.log(`Downloading file from R2: ${key}`);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new BadRequestException('File not found');
      }

      return response.Body as Readable;
    } catch (error) {
      this.logger.error(`Error downloading file from R2: ${key}`, error);
      throw new BadRequestException('Failed to download file');
    }
  }

  /**
   * Deletar arquivo do R2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      this.logger.log(`Deleting file from R2: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting file from R2: ${key}`, error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  /**
   * Listar arquivos no R2
   */
  async listFiles(prefix?: string, maxKeys = 1000): Promise<FileMetadata[]> {
    try {
      this.logger.log(`Listing files from R2 with prefix: ${prefix || 'none'}`);

      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents) {
        return [];
      }

      return response.Contents.map((item) => ({
        key: item.Key!,
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
      }));
    } catch (error) {
      this.logger.error('Error listing files from R2', error);
      throw new BadRequestException('Failed to list files');
    }
  }

  /**
   * Verificar se arquivo existe
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obter metadados de um arquivo
   */
  async getFileMetadata(key: string): Promise<FileMetadata> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType,
      };
    } catch (error) {
      this.logger.error(`Error getting file metadata from R2: ${key}`, error);
      throw new BadRequestException('Failed to get file metadata');
    }
  }

  /**
   * Gerar URL assinada para download temporário
   */
  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return url;
    } catch (error) {
      this.logger.error(`Error generating signed URL for: ${key}`, error);
      throw new BadRequestException('Failed to generate signed URL');
    }
  }

  /**
   * Gerar URL assinada para upload temporário
   */
  async getSignedUploadUrl(
    key: string,
    contentType?: string,
    expiresIn = 3600,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return url;
    } catch (error) {
      this.logger.error(`Error generating signed upload URL for: ${key}`, error);
      throw new BadRequestException('Failed to generate signed upload URL');
    }
  }

  /**
   * Copiar arquivo dentro do R2
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<UploadResult> {
    try {
      this.logger.log(`Copying file in R2: ${sourceKey} -> ${destinationKey}`);

      // Download do arquivo original
      const fileStream = await this.downloadFile(sourceKey);

      // Upload para o novo destino
      const chunks: Buffer[] = [];
      for await (const chunk of fileStream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      const result = await this.uploadFile(buffer, destinationKey);

      this.logger.log(`File copied successfully: ${sourceKey} -> ${destinationKey}`);

      return result;
    } catch (error) {
      this.logger.error(`Error copying file in R2: ${sourceKey} -> ${destinationKey}`, error);
      throw new BadRequestException('Failed to copy file');
    }
  }

  /**
   * Gerar chave única para arquivo
   */
  generateFileKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

    return `${prefix}/${timestamp}-${randomString}-${sanitizedFilename}`;
  }

  /**
   * Obter URL pública do arquivo
   */
  getPublicUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    // Fallback para o endpoint direto se publicUrl não estiver configurado
    return `${this.endpoint}/${this.bucket}/${key}`;
  }
}
