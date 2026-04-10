import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

export interface VttSegment {
  startTime: number;
  endTime: number;
  text: string;
}

interface CacheEntry {
  plainText: string;
  segments: VttSegment[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

@Injectable()
export class VttTextService {
  private readonly logger = new Logger(VttTextService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deriva a URL do VTT a partir dos campos do video (hlsUrl ou externalUrl)
   */
  deriveVttUrl(video: { hlsUrl?: string | null; externalUrl?: string | null }): string | null {
    // Prioridade 1: hlsUrl
    if (video.hlsUrl && video.hlsUrl.includes('playlist.m3u8')) {
      return video.hlsUrl.replace('playlist.m3u8', 'subtitles_pt.vtt');
    }

    // Prioridade 2: externalUrl com .m3u8
    if (video.externalUrl && video.externalUrl.includes('playlist.m3u8')) {
      return video.externalUrl.replace('playlist.m3u8', 'subtitles_pt.vtt');
    }

    return null;
  }

  /**
   * Busca o conteudo VTT do R2 para um video, com cache em memoria
   */
  async fetchVttContent(videoId: string): Promise<string | null> {
    // Verificar cache
    const cached = this.cache.get(videoId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.plainText ? 'cached' : null; // Sinalizar que tem cache
    }

    // Buscar video no banco
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, hlsUrl: true, externalUrl: true },
    });

    if (!video) {
      this.logger.warn(`Video ${videoId} nao encontrado`);
      return null;
    }

    const vttUrl = this.deriveVttUrl(video);
    if (!vttUrl) {
      this.logger.warn(`Nao foi possivel derivar URL do VTT para video ${videoId}`);
      return null;
    }

    try {
      this.logger.log(`Buscando VTT: ${vttUrl}`);
      const response = await axios.get(vttUrl, {
        timeout: 15000,
        responseType: 'text',
      });

      const vttContent = response.data as string;

      // Parsear e cachear
      const plainText = this.parseVttToPlainText(vttContent);
      const segments = this.parseVttToSegments(vttContent);

      this.cache.set(videoId, {
        plainText,
        segments,
        fetchedAt: Date.now(),
      });

      return vttContent;
    } catch (error: any) {
      this.logger.error(`Erro ao buscar VTT para video ${videoId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Parseia conteudo VTT para texto puro (remove header, timestamps, tags)
   */
  parseVttToPlainText(vttContent: string): string {
    const lines = vttContent.split('\n');
    const textLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Pular header WEBVTT e linhas vazias
      if (trimmed === 'WEBVTT' || trimmed === '') continue;

      // Pular linhas de timestamp (00:00:00.000 --> 00:00:00.000)
      if (trimmed.includes('-->')) continue;

      // Pular numeros de sequencia
      if (/^\d+$/.test(trimmed)) continue;

      // Pular metadados (NOTE, STYLE, REGION)
      if (/^(NOTE|STYLE|REGION)/i.test(trimmed)) continue;

      // Remover tags VTT (<v>, <c>, <b>, <i>, etc.)
      const cleanText = trimmed.replace(/<[^>]+>/g, '').trim();

      if (cleanText) {
        textLines.push(cleanText);
      }
    }

    return textLines.join(' ');
  }

  /**
   * Parseia conteudo VTT para array de segmentos com timestamps
   */
  parseVttToSegments(vttContent: string): VttSegment[] {
    const segments: VttSegment[] = [];
    const blocks = vttContent.split(/\n\s*\n/); // Separar por blocos vazios

    for (const block of blocks) {
      const lines = block.trim().split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Buscar linha de timestamp
        const timestampMatch = line.match(
          /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/
        );

        if (timestampMatch) {
          const startTime = this.parseTimestamp(timestampMatch[1]);
          const endTime = this.parseTimestamp(timestampMatch[2]);

          // Coletar linhas de texto apos o timestamp
          const textLines: string[] = [];
          for (let j = i + 1; j < lines.length; j++) {
            const textLine = lines[j].trim();
            if (!textLine || textLine.includes('-->')) break;
            // Remover tags VTT
            const clean = textLine.replace(/<[^>]+>/g, '').trim();
            if (clean) textLines.push(clean);
          }

          if (textLines.length > 0) {
            segments.push({
              startTime,
              endTime,
              text: textLines.join(' '),
            });
          }
        }
      }
    }

    return segments;
  }

  /**
   * Converte timestamp VTT (HH:MM:SS.mmm) para segundos
   */
  private parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Retorna texto puro do VTT para um video (conveniencia)
   */
  async getPlainText(videoId: string): Promise<string | null> {
    // Verificar cache primeiro
    const cached = this.cache.get(videoId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.plainText || null;
    }

    // Buscar e cachear
    await this.fetchVttContent(videoId);

    const entry = this.cache.get(videoId);
    return entry?.plainText || null;
  }

  /**
   * Retorna segmentos parseados do VTT para um video (conveniencia)
   */
  async getSegments(videoId: string): Promise<VttSegment[]> {
    // Verificar cache primeiro
    const cached = this.cache.get(videoId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.segments;
    }

    // Buscar e cachear
    await this.fetchVttContent(videoId);

    const entry = this.cache.get(videoId);
    return entry?.segments || [];
  }

  /**
   * Verifica se o VTT existe no R2 (HEAD request)
   */
  async checkVttExists(videoId: string): Promise<{ available: boolean; url: string | null }> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { hlsUrl: true, externalUrl: true },
    });

    if (!video) return { available: false, url: null };

    const vttUrl = this.deriveVttUrl(video);
    if (!vttUrl) return { available: false, url: null };

    try {
      await axios.head(vttUrl, { timeout: 5000 });
      return { available: true, url: vttUrl };
    } catch {
      return { available: false, url: vttUrl };
    }
  }
}
