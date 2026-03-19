import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GenerateThumbnailParams {
  title: string;
  overlayText?: string;
  style?: 'medical' | 'surgical' | 'anatomy' | 'clinical';
}

@Injectable()
export class AiThumbnailService {
  private readonly logger = new Logger(AiThumbnailService.name);
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('VERTEX_AI_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn('VERTEX_AI_API_KEY not set — thumbnail generation will not work');
    } else {
      this.logger.log('AI Thumbnail Service initialized (Gemini 3 Pro Image)');
    }
  }

  /**
   * Gera uma thumbnail usando Gemini 3 Pro Image via Gemini API
   */
  async generateThumbnail(params: GenerateThumbnailParams): Promise<{ buffer: Buffer; mimeType: string }> {
    const { title, overlayText, style = 'medical' } = params;

    const styleDescriptions: Record<string, string> = {
      medical:
        'clean modern design, soft blue and white gradient background, abstract geometric shapes, professional and elegant',
      surgical:
        'teal and white color scheme, abstract clean lines, modern minimalist design, professional gradient',
      anatomy:
        'warm neutral tones, elegant abstract shapes, scientific illustration feel, earthy palette',
      clinical:
        'green and white theme, modern minimalist, soft gradients, clean and inviting design',
    };

    const displayText = overlayText || title;

    const prompt = `Generate a beautiful, professional 16:9 thumbnail image for an online course video lesson.

The lesson topic is: "${title}"
Visual style: ${styleDescriptions[style]}

MANDATORY TEXT OVERLAY:
- Write the text "${displayText}" prominently on the image
- The text must be large, bold, and clearly readable
- Use a modern sans-serif font in white or light color
- Place a semi-transparent dark gradient or overlay behind the text for contrast
- Center the text horizontally, positioned in the lower third or center of the image

Image requirements:
- Modern, clean, abstract background design suitable for an educational platform
- Use beautiful gradients and subtle geometric or abstract elements
- The mood should match the topic "${title}" conceptually
- Do NOT include any people, animals, blood, or graphic content
- High quality, sharp, professional aesthetic
- Think of it like a premium course platform thumbnail (similar to Udemy or Coursera style)`;

    this.logger.log(`Generating thumbnail for: "${title}" (style: ${style})`);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-goog-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
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
        throw new Error('Gemini não gerou resposta');
      }

      const parts = candidates[0]?.content?.parts || [];
      this.logger.log(`Response parts: ${parts.length}`);

      for (const part of parts) {
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

      this.logger.error(`No image in response. Parts: ${JSON.stringify(parts.map(p => Object.keys(p)))}`);
      throw new Error('Gemini não retornou imagem');
    } catch (error) {
      this.logger.error('Error generating thumbnail:', error);
      throw error;
    }
  }
}
