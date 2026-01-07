import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as FormData from 'form-data';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as tus from 'tus-js-client';

export interface CloudflareStreamVideo {
  uid: string;
  thumbnail: string;
  thumbnailTimestampPct: number;
  readyToStream: boolean;
  status: {
    state: string;
    pctComplete: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  meta: {
    name?: string;
  };
  created: string;
  modified: string;
  size: number;
  preview: string;
  allowedOrigins: string[];
  requireSignedURLs: boolean;
  uploaded: string;
  uploadExpiry: string | null;
  maxSizeBytes: number;
  maxDurationSeconds: number;
  duration: number;
  input: {
    width: number;
    height: number;
  };
  playback: {
    hls: string;
    dash: string;
  };
  watermark?: {
    uid: string;
  };
}

export interface UploadVideoResponse {
  result: CloudflareStreamVideo;
  success: boolean;
  errors: any[];
  messages: any[];
}

export interface VideoDetails {
  uid: string;
  playbackUrl: string;
  thumbnailUrl: string;
  duration: number;
  status: string;
  readyToStream: boolean;
}

@Injectable()
export class CloudflareStreamService {
  private readonly logger = new Logger(CloudflareStreamService.name);
  private readonly apiClient: AxiosInstance;
  private readonly accountId: string;
  private readonly customerCode: string;
  private readonly streamUrl: string;

  constructor(private configService: ConfigService) {
    this.accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN');
    this.customerCode = this.configService.get<string>('CLOUDFLARE_STREAM_CUSTOMER_CODE');
    this.streamUrl = this.configService.get<string>('CLOUDFLARE_STREAM_URL');

    if (!this.accountId || !apiToken) {
      throw new Error('Cloudflare credentials not configured');
    }

    // Log das credenciais (COMPLETO para debug - remover depois)
    this.logger.log(`Cloudflare Account ID: ${this.accountId}`);
    this.logger.log(`Cloudflare API Token COMPLETO: ${apiToken}`);
    this.logger.log(`Token length: ${apiToken?.length}`);

    this.apiClient = axios.create({
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`,
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    this.logger.log('Cloudflare Stream Service initialized');
  }

  /**
   * Upload de vídeo via URL
   */
  async uploadVideoFromUrl(url: string, metadata?: { name?: string }): Promise<VideoDetails> {
    try {
      this.logger.log(`Uploading video from URL: ${url}`);

      const response = await this.apiClient.post<UploadVideoResponse>('', {
        url,
        meta: metadata,
        requireSignedURLs: false,
        allowedOrigins: ['*'],
      });

      if (!response.data.success) {
        throw new BadRequestException('Failed to upload video to Cloudflare Stream');
      }

      const video = response.data.result;

      return {
        uid: video.uid,
        playbackUrl: `${this.streamUrl}/${video.uid}/manifest/video.m3u8`,
        thumbnailUrl: video.thumbnail,
        duration: video.duration || 0,
        status: video.status.state,
        readyToStream: video.readyToStream,
      };
    } catch (error) {
      this.logger.error('Error uploading video from URL', error);
      throw new BadRequestException('Failed to upload video');
    }
  }

  /**
   * Upload de vídeo via arquivo (buffer ou stream)
   */
  async uploadVideoFromFile(
    file: Buffer | Readable,
    filename: string,
    metadata?: { name?: string },
  ): Promise<VideoDetails> {
    try {
      this.logger.log(`Uploading video file: ${filename}`);

      const formData = new FormData();
      formData.append('file', file, filename);

      if (metadata) {
        formData.append('meta', JSON.stringify(metadata));
      }

      formData.append('requireSignedURLs', 'false');
      formData.append('allowedOrigins', JSON.stringify(['*']));

      const response = await this.apiClient.post<UploadVideoResponse>('', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      if (!response.data.success) {
        throw new BadRequestException('Failed to upload video to Cloudflare Stream');
      }

      const video = response.data.result;

      return {
        uid: video.uid,
        playbackUrl: `${this.streamUrl}/${video.uid}/manifest/video.m3u8`,
        thumbnailUrl: video.thumbnail,
        duration: video.duration || 0,
        status: video.status.state,
        readyToStream: video.readyToStream,
      };
    } catch (error) {
      this.logger.error('Error uploading video file', error);
      throw new BadRequestException('Failed to upload video');
    }
  }

  /**
   * Obter detalhes de um vídeo
   */
  async getVideoDetails(videoId: string): Promise<VideoDetails> {
    try {
      const response = await this.apiClient.get<UploadVideoResponse>(`/${videoId}`);

      if (!response.data.success) {
        throw new BadRequestException('Video not found');
      }

      const video = response.data.result;

      return {
        uid: video.uid,
        playbackUrl: `${this.streamUrl}/${video.uid}/manifest/video.m3u8`,
        thumbnailUrl: video.thumbnail,
        duration: video.duration || 0,
        status: video.status.state,
        readyToStream: video.readyToStream,
      };
    } catch (error) {
      this.logger.error(`Error getting video details for ${videoId}`, error);
      throw new BadRequestException('Failed to get video details');
    }
  }

  /**
   * Deletar um vídeo
   */
  async deleteVideo(videoId: string): Promise<void> {
    try {
      this.logger.log(`Deleting video: ${videoId}`);

      await this.apiClient.delete(`/${videoId}`);

      this.logger.log(`Video deleted successfully: ${videoId}`);
    } catch (error) {
      this.logger.error(`Error deleting video ${videoId}`, error);
      throw new BadRequestException('Failed to delete video');
    }
  }

  /**
   * Listar todos os vídeos
   */
  async listVideos(limit = 100, after?: string): Promise<CloudflareStreamVideo[]> {
    try {
      const params: any = { limit };
      if (after) {
        params.after = after;
      }

      const response = await this.apiClient.get<{
        result: CloudflareStreamVideo[];
        success: boolean;
      }>('', { params });

      if (!response.data.success) {
        throw new BadRequestException('Failed to list videos');
      }

      return response.data.result;
    } catch (error) {
      this.logger.error('Error listing videos', error);
      throw new BadRequestException('Failed to list videos');
    }
  }

  /**
   * Atualizar metadados de um vídeo
   */
  async updateVideoMetadata(
    videoId: string,
    metadata: { name?: string },
  ): Promise<VideoDetails> {
    try {
      this.logger.log(`Updating video metadata: ${videoId}`);

      const response = await this.apiClient.post<UploadVideoResponse>(`/${videoId}`, {
        meta: metadata,
      });

      if (!response.data.success) {
        throw new BadRequestException('Failed to update video metadata');
      }

      const video = response.data.result;

      return {
        uid: video.uid,
        playbackUrl: `${this.streamUrl}/${video.uid}/manifest/video.m3u8`,
        thumbnailUrl: video.thumbnail,
        duration: video.duration || 0,
        status: video.status.state,
        readyToStream: video.readyToStream,
      };
    } catch (error) {
      this.logger.error(`Error updating video metadata for ${videoId}`, error);
      throw new BadRequestException('Failed to update video metadata');
    }
  }

  /**
   * Upload de vídeo via TUS protocol (para arquivos grandes)
   * Suporta arquivos de qualquer tamanho com upload resumível
   */
  async uploadVideoViaTus(
    filePath: string,
    filename: string,
    fileSize: number,
    metadata?: { name?: string },
  ): Promise<VideoDetails> {
    return this.uploadVideoViaTusWithProgress(filePath, filename, fileSize, metadata);
  }

  /**
   * Upload de vídeo via TUS protocol com callback de progresso
   * Suporta arquivos de qualquer tamanho com upload resumível
   */
  async uploadVideoViaTusWithProgress(
    filePath: string,
    filename: string,
    fileSize: number,
    metadata?: { name?: string },
    onProgress?: (progress: number) => Promise<void>,
  ): Promise<VideoDetails> {
    return new Promise((resolve, reject) => {
      this.logger.log(`Starting TUS upload for: ${filename} (${fileSize} bytes)`);

      const file = fs.createReadStream(filePath);
      const apiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN');

      const upload = new tus.Upload(file, {
        endpoint: `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`,
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        chunkSize: 50 * 1024 * 1024, // 50MB chunks
        retryDelays: [0, 1000, 3000, 5000],
        metadata: {
          filename: filename,
          filetype: 'video/mp4',
          name: metadata?.name || filename,
        },
        uploadSize: fileSize,
        onError: (error) => {
          this.logger.error('TUS upload error:', error);
          reject(new BadRequestException(`TUS upload failed: ${error.message}`));
        },
        onProgress: async (bytesUploaded, bytesTotal) => {
          const percentage = (bytesUploaded / bytesTotal) * 100;
          this.logger.log(`TUS upload progress: ${percentage.toFixed(2)}%`);
          
          // Chamar callback de progresso se fornecido
          if (onProgress) {
            try {
              await onProgress(percentage);
            } catch (error) {
              this.logger.warn('Error in progress callback:', error);
            }
          }
        },
        onSuccess: async () => {
          this.logger.log('TUS upload completed successfully');
          
          // Extrair o UID da URL de upload
          const uploadUrl = upload.url;
          const uid = uploadUrl?.split('/').pop();
          
          if (!uid) {
            reject(new BadRequestException('Failed to get video UID from TUS upload'));
            return;
          }

          this.logger.log(`Video UID: ${uid}`);

          // Retornar os detalhes do vídeo
          resolve({
            uid,
            playbackUrl: `${this.streamUrl}/${uid}/manifest/video.m3u8`,
            thumbnailUrl: `${this.streamUrl}/${uid}/thumbnails/thumbnail.jpg`,
            duration: 0, // Será atualizado após processamento
            status: 'uploading',
            readyToStream: false,
          });
        },
      });

      // Verificar se há um upload anterior para retomar
      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length) {
          this.logger.log('Resuming previous upload...');
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      });
    });
  }

  /**
   * Obter URL de upload direto (Direct Creator Upload)
   * Documentação: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
   */
  async getDirectUploadUrl(
    maxDurationSeconds = 21600,
  ): Promise<{ uploadURL: string; uid: string }> {
    try {
      this.logger.log('Requesting direct upload URL from Cloudflare Stream...');
      this.logger.log(`Account ID: ${this.accountId}`);
      
      const response = await this.apiClient.post<{
        result: { uploadURL: string; uid: string };
        success: boolean;
        errors: any[];
        messages: any[];
      }>('/direct_upload', {
        maxDurationSeconds,
        requireSignedURLs: false,
        allowedOrigins: ['*'],
        creator: 'admin', // Identificador do criador
      });

      this.logger.log(`Cloudflare response: ${JSON.stringify(response.data)}`);

      if (!response.data.success) {
        this.logger.error(`Cloudflare errors: ${JSON.stringify(response.data.errors)}`);
        throw new BadRequestException(`Failed to get direct upload URL: ${JSON.stringify(response.data.errors)}`);
      }

      this.logger.log(`Direct upload URL obtained: ${response.data.result.uid}`);
      return response.data.result;
    } catch (error: any) {
      this.logger.error('Error getting direct upload URL', error?.response?.data || error.message);
      
      // Log detalhado do erro
      if (error?.response?.data) {
        this.logger.error(`Cloudflare API Error: ${JSON.stringify(error.response.data)}`);
      }
      
      throw new BadRequestException(
        `Failed to get direct upload URL: ${error?.response?.data?.errors?.[0]?.message || error.message}`
      );
    }
  }

  /**
   * Obter URL de upload TUS direto para o frontend
   * Usa o TUS protocol com Cloudflare API - gera URL autenticada
   * O frontend pode usar esta URL para fazer upload TUS resumível diretamente
   * 
   * Documentação: https://developers.cloudflare.com/stream/uploading-videos/upload-video-file/#resumable-uploads-with-tus-for-large-files
   */
  async getTusUploadUrl(
    fileSize: number,
    filename: string,
    metadata?: { name?: string },
  ): Promise<{ tusUploadUrl: string; uid: string }> {
    try {
      this.logger.log(`Requesting TUS upload URL for file: ${filename} (${fileSize} bytes)`);
      
      const apiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN');
      
      // Criar upload TUS inicial com POST para obter a URL de upload
      // O Cloudflare retorna um Location header com a URL onde continuar o upload
      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream?direct_user=true`,
        null, // Body vazio para criação TUS
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Tus-Resumable': '1.0.0',
            'Upload-Length': fileSize.toString(),
            'Upload-Metadata': this.encodeTusMetadata({
              filename: filename,
              filetype: 'video/mp4',
              name: metadata?.name || filename,
              requiresignedurls: 'false',
              // Não enviar allowedorigins - deixar vazio para não restringir origens
            }),
          },
        },
      );

      // O Cloudflare retorna status 201 e Location header com a URL de upload
      const tusUploadUrl = response.headers['location'] || response.headers['Location'];
      
      if (!tusUploadUrl) {
        this.logger.error('No Location header in Cloudflare TUS response');
        this.logger.error(`Response headers: ${JSON.stringify(response.headers)}`);
        throw new BadRequestException('Failed to get TUS upload URL from Cloudflare');
      }

      // Extrair UID da URL
      const uid = tusUploadUrl.split('/').pop()?.split('?')[0];
      
      if (!uid) {
        throw new BadRequestException('Failed to extract UID from TUS upload URL');
      }

      this.logger.log(`TUS upload URL obtained: ${tusUploadUrl}`);
      this.logger.log(`Video UID: ${uid}`);

      // Atualizar configurações de segurança do vídeo (desabilitar URLs assinadas)
      // Os metadados TUS nem sempre aplicam essas configurações corretamente
      try {
        await this.updateVideoSecuritySettings(uid, {
          requireSignedURLs: false,
          allowedOrigins: [], // Array vazio = sem restrição de origem
        });
        this.logger.log(`Video ${uid} security settings updated: requireSignedURLs=false, allowedOrigins=[]`);
      } catch (securityError) {
        this.logger.warn(`Failed to update security settings for video ${uid}:`, securityError);
        // Não falhar o upload por causa disso - o admin pode ajustar manualmente
      }

      return {
        tusUploadUrl,
        uid,
      };
    } catch (error: any) {
      this.logger.error('Error getting TUS upload URL', error?.response?.data || error.message);
      this.logger.error(`Error details: ${JSON.stringify(error?.response?.headers || {})}`);
      
      throw new BadRequestException(
        `Failed to get TUS upload URL: ${error?.response?.data?.errors?.[0]?.message || error.message}`
      );
    }
  }

  /**
   * Atualizar configurações de segurança de um vídeo
   * Permite desabilitar URLs assinadas e configurar origens permitidas
   */
  async updateVideoSecuritySettings(
    videoId: string,
    settings: { requireSignedURLs?: boolean; allowedOrigins?: string[] },
  ): Promise<void> {
    try {
      this.logger.log(`Updating security settings for video ${videoId}: ${JSON.stringify(settings)}`);

      const response = await this.apiClient.post<UploadVideoResponse>(`/${videoId}`, {
        requireSignedURLs: settings.requireSignedURLs,
        allowedOrigins: settings.allowedOrigins,
      });

      if (!response.data.success) {
        throw new BadRequestException(`Failed to update security settings: ${JSON.stringify(response.data.errors)}`);
      }

      this.logger.log(`Security settings updated for video ${videoId}`);
    } catch (error: any) {
      this.logger.error(`Error updating security settings for ${videoId}`, error?.response?.data || error.message);
      throw new BadRequestException(
        `Failed to update security settings: ${error?.response?.data?.errors?.[0]?.message || error.message}`
      );
    }
  }

  /**
   * Codifica metadata para o formato TUS (base64)
   */
  private encodeTusMetadata(metadata: Record<string, string>): string {
    return Object.entries(metadata)
      .map(([key, value]) => `${key} ${Buffer.from(value).toString('base64')}`)
      .join(',');
  }
}
