import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

interface GenerateThumbnailParams {
  title: string;
  overlayText?: string;
  style?: 'medical' | 'surgical' | 'anatomy' | 'clinical';
}

@Injectable()
export class AiThumbnailService {
  private readonly logger = new Logger(AiThumbnailService.name);
  private readonly apiKey: string;
  private backgroundBase64: string | null = null;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('VERTEX_AI_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn('VERTEX_AI_API_KEY not set — thumbnail generation will not work');
    } else {
      this.logger.log('AI Thumbnail Service initialized (Gemini 3 Pro Image)');
    }

    // Carregar imagem de fundo (base64) uma unica vez na inicializacao
    try {
      const bgPath = path.join(__dirname, 'thumbnail-bg.base64.txt');
      if (fs.existsSync(bgPath)) {
        this.backgroundBase64 = fs.readFileSync(bgPath, 'utf-8').trim();
        this.logger.log(`Background image loaded (${Math.round(this.backgroundBase64.length / 1024)}KB base64)`);
      } else {
        this.logger.warn('thumbnail-bg.base64.txt not found — thumbnails without background');
      }
    } catch (error) {
      this.logger.warn('Failed to load background image:', error.message);
    }
  }

  /**
   * Gera uma thumbnail usando Gemini 3 Pro Image via Gemini API
   * Usa imagem de fundo fixa do Projeto Cirurgiao + titulo da aula
   */
  async generateThumbnail(params: GenerateThumbnailParams): Promise<{ buffer: Buffer; mimeType: string }> {
    const { title, overlayText } = params;

    const displayText = overlayText || title;

    const prompt = `You are designing a thumbnail for a veterinary surgery online course video.

BACKGROUND: I'm providing the official background image of the "Projeto Cirurgiao" platform. You MUST use this exact image as the background — do not change, replace, or ignore it.

TASK: Add the following text as an overlay on this background image:
"${displayText}"

TEXT RULES:
- The text must be the MAIN focus of the image
- Use a large, bold, modern sans-serif font (like Montserrat or Inter)
- Text color: white (#FFFFFF)
- Place a subtle dark gradient or semi-transparent overlay behind the text for readability
- Center the text horizontally, positioned in the center or lower third
- If the text is long, break it into 2 lines maximum
- Keep the text clean and professional

IMPORTANT:
- Always consider the lesson title as reference for the mood
- Do NOT add any other text, logos, or watermarks
- Do NOT change the background — only add the text overlay
- The result must be 16:9 aspect ratio
- Output a high-quality image`;

    this.logger.log(`Generating thumbnail for: "${title}"`);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`;

      // Construir parts: texto + imagem de fundo (se disponivel)
      const parts: any[] = [{ text: prompt }];

      if (this.backgroundBase64) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: this.backgroundBase64,
          },
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-goog-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts,
            },
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
              aspectRatio: '16:9',
              imageSize: '1K',
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Gemini API error: ${response.status} - ${errorText.substring(0, 500)}`);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();

      const candidates = data.candidates;
      if (!candidates || candidates.length === 0) {
        this.logger.error(`No candidates: ${JSON.stringify(data).substring(0, 500)}`);
        throw new Error('Gemini nao gerou resposta');
      }

      const responseParts = candidates[0]?.content?.parts || [];
      this.logger.log(`Response parts: ${responseParts.length}`);

      for (const part of responseParts) {
        if (part.inlineData || part.inline_data) {
          const inlineData = part.inlineData || part.inline_data;
          const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
          this.logger.log(`Found image: mimeType=${mimeType}`);
          const imageBuffer = Buffer.from(inlineData.data, 'base64');
          this.logger.log(`Thumbnail generated (${imageBuffer.length} bytes)`);
          return { buffer: imageBuffer, mimeType };
        }
        if (part.text) {
          this.logger.log(`Text: ${part.text.substring(0, 100)}`);
        }
      }

      this.logger.error(`No image in response. Parts: ${JSON.stringify(responseParts.map(p => Object.keys(p)))}`);
      throw new Error('Gemini nao retornou imagem');
    } catch (error) {
      this.logger.error('Error generating thumbnail:', error);
      throw error;
    }
  }
}
