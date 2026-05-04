import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

interface GenerateThumbnailParams {
  title: string;
  overlayText?: string;
  style?: string; // mantido para compatibilidade, ignorado
  aspectRatio?: 'horizontal' | 'vertical';
}

@Injectable()
export class AiThumbnailService {
  private readonly logger = new Logger(AiThumbnailService.name);
  private backgroundBuffer: Buffer | null = null;

  constructor() {
    // Carregar imagem de fundo uma unica vez
    // Tentar multiplos caminhos (webpack __dirname = dist/, Docker copia para dist/modules/...)
    const possiblePaths = [
      path.join(__dirname, 'thumbnail-bg.base64.txt'),
      path.join(__dirname, 'modules', 'ai-summaries', 'thumbnail-bg.base64.txt'),
      path.join(process.cwd(), 'dist', 'modules', 'ai-summaries', 'thumbnail-bg.base64.txt'),
      path.join(process.cwd(), 'src', 'modules', 'ai-summaries', 'thumbnail-bg.base64.txt'),
    ];

    for (const bgPath of possiblePaths) {
      try {
        if (fs.existsSync(bgPath)) {
          const base64 = fs.readFileSync(bgPath, 'utf-8').trim();
          this.backgroundBuffer = Buffer.from(base64, 'base64');
          this.logger.log(`Background image loaded from ${bgPath} (${Math.round(this.backgroundBuffer.length / 1024)}KB)`);
          break;
        }
      } catch (error) {
        // Tentar proximo caminho
      }
    }

    if (!this.backgroundBuffer) {
      this.logger.warn('thumbnail-bg.base64.txt not found in any path');
    }
  }

  /**
   * Gera thumbnail com Sharp: background fixo + titulo sobreposto
   */
  async generateThumbnail(params: GenerateThumbnailParams): Promise<{ buffer: Buffer; mimeType: string }> {
    const { title, overlayText, aspectRatio } = params;
    const displayText = overlayText || title;
    const isVertical = aspectRatio === 'vertical';

    this.logger.log(`Generating thumbnail for: "${displayText}" (${isVertical ? 'vertical 9:16' : 'horizontal 16:9'})`);

    if (!this.backgroundBuffer) {
      throw new Error('Background image not loaded');
    }

    // Horizontal default: 1280x720 (16:9). Vertical: 720x1280 (9:16).
    const width = isVertical ? 720 : 1280;
    const height = isVertical ? 1280 : 720;

    try {
      // 1. Criar overlay escuro usando sharp puro (sem SVG)
      const darkOverlay = await sharp({
        create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.4 } },
      }).png().toBuffer();

      // 2. Criar texto usando Pango (built-in do libvips - funciona em Linux)
      // Fonte: Anton Regular (Google Fonts, OFL). Instalada via Dockerfile
      // COPY + fc-cache. Em dev local (Windows/macOS), instale a fonte
      // manualmente do arquivo backend-api/assets/fonts/Anton-Regular.ttf
      // ou o fallback "Sans Bold" (DejaVu/Liberation) será usado.
      // Vertical tem largura ~56% da horizontal, então reduz fontSize
      // proporcional pra evitar overflow lateral mesmo com wrap do Pango.
      const fontSize = isVertical
        ? (displayText.length > 30 ? 44 : displayText.length > 20 ? 56 : 72)
        : (displayText.length > 30 ? 60 : displayText.length > 20 ? 72 : 96);
      const pangoMarkup = `<span foreground="white" font_desc="Anton ${fontSize}">${this.escapeXml(displayText)}</span>`;

      // Margem lateral menor em vertical (60px vs 100px) pra aproveitar espaço útil
      const sideMargin = isVertical ? 60 : 100;

      const textImage = await sharp({
        text: {
          text: pangoMarkup,
          rgba: true,
          width: width - sideMargin,
          align: 'centre',
        },
      }).png().toBuffer();

      // Obter dimensoes do texto para centralizar verticalmente
      const textMeta = await sharp(textImage).metadata();
      const textTop = Math.round((height - (textMeta.height || 100)) / 2);
      const textLeft = Math.round((width - (textMeta.width || 100)) / 2);

      // 3. Compor: background + overlay escuro + texto centralizado
      const result = await sharp(this.backgroundBuffer)
        .resize(width, height, { fit: 'cover' })
        .composite([
          { input: darkOverlay, top: 0, left: 0 },
          { input: textImage, top: textTop, left: textLeft },
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
