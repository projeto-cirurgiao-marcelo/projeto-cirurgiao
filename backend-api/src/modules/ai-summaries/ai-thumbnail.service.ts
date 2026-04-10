import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

interface GenerateThumbnailParams {
  title: string;
  overlayText?: string;
  style?: string; // mantido para compatibilidade, ignorado
}

@Injectable()
export class AiThumbnailService {
  private readonly logger = new Logger(AiThumbnailService.name);
  private backgroundBuffer: Buffer | null = null;

  constructor() {
    // Carregar imagem de fundo uma unica vez
    try {
      const bgPath = path.join(__dirname, 'thumbnail-bg.base64.txt');
      if (fs.existsSync(bgPath)) {
        const base64 = fs.readFileSync(bgPath, 'utf-8').trim();
        this.backgroundBuffer = Buffer.from(base64, 'base64');
        this.logger.log(`Background image loaded (${Math.round(this.backgroundBuffer.length / 1024)}KB)`);
      } else {
        this.logger.warn('thumbnail-bg.base64.txt not found');
      }
    } catch (error) {
      this.logger.warn('Failed to load background image:', error.message);
    }
  }

  /**
   * Gera thumbnail com Sharp: background fixo + titulo sobreposto
   */
  async generateThumbnail(params: GenerateThumbnailParams): Promise<{ buffer: Buffer; mimeType: string }> {
    const { title, overlayText } = params;
    const displayText = overlayText || title;

    this.logger.log(`Generating thumbnail for: "${displayText}"`);

    if (!this.backgroundBuffer) {
      throw new Error('Background image not loaded');
    }

    // Dimensoes do thumbnail (16:9)
    const width = 1280;
    const height = 720;

    // Preparar texto: quebrar em linhas se muito longo
    const lines = this.wrapText(displayText, 25);
    const fontSize = lines.length > 2 ? 52 : lines.length > 1 ? 60 : 72;
    const lineHeight = fontSize * 1.3;
    const totalTextHeight = lines.length * lineHeight;
    const textStartY = height - totalTextHeight - 80; // Posicionar no terco inferior

    // Criar SVG com texto e gradiente
    const textElements = lines.map((line, i) => {
      const y = textStartY + (i * lineHeight) + fontSize;
      return `<text x="50%" y="${y}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="white" letter-spacing="1">${this.escapeXml(line)}</text>`;
    }).join('\n');

    // Gradiente escuro no terco inferior para contraste
    const gradientTop = Math.max(textStartY - 60, height * 0.4);

    const svgOverlay = `
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="textGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="black" stop-opacity="0"/>
            <stop offset="40%" stop-color="black" stop-opacity="0"/>
            <stop offset="100%" stop-color="black" stop-opacity="0.75"/>
          </linearGradient>
        </defs>
        <rect x="0" y="${gradientTop}" width="${width}" height="${height - gradientTop}" fill="url(#textGrad)"/>
        ${textElements}
      </svg>
    `;

    try {
      const result = await sharp(this.backgroundBuffer)
        .resize(width, height, { fit: 'cover' })
        .composite([
          {
            input: Buffer.from(svgOverlay),
            top: 0,
            left: 0,
          },
        ])
        .png({ quality: 90 })
        .toBuffer();

      this.logger.log(`Thumbnail generated: ${result.length} bytes`);
      return { buffer: result, mimeType: 'image/png' };
    } catch (error) {
      this.logger.error('Error generating thumbnail:', error);
      throw error;
    }
  }

  /**
   * Quebra texto em linhas de no maximo maxChars caracteres
   */
  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 > maxChars && currentLine.length > 0) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += (currentLine ? ' ' : '') + word;
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    // Maximo 3 linhas
    return lines.slice(0, 3);
  }

  /**
   * Escapa caracteres especiais para SVG/XML
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
