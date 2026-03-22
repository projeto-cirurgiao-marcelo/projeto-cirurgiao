import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private s3Client: S3Client;
  private readonly bucketName: string;
  private publicUrl: string;
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId = this.configService.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const endpoint = this.configService.get('CLOUDFLARE_R2_ENDPOINT');
    const publicUrl = this.configService.get('CLOUDFLARE_R2_PUBLIC_URL');
    this.bucketName = this.configService.get('CLOUDFLARE_R2_BUCKET');

    // Log para debug
    this.logger.log('Cloudflare R2 Configuration:');
    this.logger.log(`Account ID: ${accountId ? '✓' : '✗'}`);
    this.logger.log(`Access Key ID: ${accessKeyId ? '✓' : '✗'}`);
    this.logger.log(`Secret Access Key: ${secretAccessKey ? '✓' : '✗'}`);
    this.logger.log(`Endpoint: ${endpoint || 'NOT SET'}`);
    this.logger.log(`Bucket: ${this.bucketName || 'NOT SET'}`);
    this.logger.log(`Public URL: ${publicUrl || 'NOT SET'}`);

    if (!accessKeyId || !secretAccessKey || !publicUrl) {
      this.isConfigured = false;
      this.logger.warn('Cloudflare R2 credentials not fully configured — upload features will be disabled');
      return;
    }

    this.isConfigured = true;
    this.publicUrl = publicUrl;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    this.logger.log('✅ Cloudflare R2 client initialized successfully');
  }

  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new Error('Cloudflare R2 is not configured');
    }
  }

  async uploadToR2(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<string> {
    this.ensureConfigured();
    try {
      // Gerar nome único para o arquivo
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${folder}/${randomUUID()}.${fileExtension}`;

      // Upload para R2
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      // Retornar URL pública
      const url = `${this.publicUrl}/${fileName}`;
      
      this.logger.log(`File uploaded successfully: ${url}`);

      return url;
    } catch (error) {
      this.logger.error('Error uploading file to R2', error);
      throw error;
    }
  }

  /**
   * Upload de um Buffer direto para R2 (usado para imagens geradas por IA)
   */
  async uploadBufferToR2(
    buffer: Buffer,
    contentType: string,
    extension: string,
    folder: string = 'thumbnails',
  ): Promise<string> {
    this.ensureConfigured();
    try {
      const fileName = `${folder}/${randomUUID()}.${extension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      const url = `${this.publicUrl}/${fileName}`;
      this.logger.log(`Buffer uploaded successfully: ${url}`);
      return url;
    } catch (error) {
      this.logger.error('Error uploading buffer to R2', error);
      throw error;
    }
  }
}
