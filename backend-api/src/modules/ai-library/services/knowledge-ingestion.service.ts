import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { KnowledgeSearchService } from './knowledge-search.service';

interface ChunkData {
  content: string;
  chapter?: string;
  pageStart?: number;
  pageEnd?: number;
}

@Injectable()
export class KnowledgeIngestionService {
  private readonly logger = new Logger(KnowledgeIngestionService.name);
  private readonly CHUNK_SIZE = 512; // tokens (~2048 caracteres)
  private readonly CHUNK_OVERLAP = 0.15; // 15% de overlap
  private readonly translationModel: GenerativeModel;

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: KnowledgeSearchService,
    private readonly configService: ConfigService,
  ) {
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || 'projeto-cirurgiao-e8df7';
    const location = this.configService.get<string>('GOOGLE_CLOUD_LOCATION') || 'southamerica-east1';
    const modelName = this.configService.get<string>('VERTEX_LIBRARY_MODEL') || 'gemini-2.5-flash';

    const vertexAI = new VertexAI({ project: projectId, location });
    this.translationModel = vertexAI.getGenerativeModel({ model: modelName });
  }

  /**
   * Processa um documento: extrai texto, divide em chunks e gera embeddings
   */
  async processDocument(documentId: string): Promise<{
    totalChunks: number;
    indexedChunks: number;
    errors: number;
  }> {
    this.logger.log(`Starting document processing: ${documentId}`);

    // Marcar como em processamento
    await this.prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' },
    });

    try {
      const document = await this.prisma.knowledgeDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Extrair texto do PDF via GCS
      const text = await this.extractTextFromPdf(document.gcsPath);

      // Dividir em chunks
      const chunks = this.splitIntoChunks(text);
      this.logger.log(`Split document into ${chunks.length} chunks`);

      // Criar chunks no banco e gerar embeddings
      let indexedChunks = 0;
      let errors = 0;

      const needsTranslation = document.language !== 'pt-BR';
      if (needsTranslation) {
        this.logger.log(`Document language is "${document.language}" — chunks will be translated to pt-BR`);
      }

      for (let i = 0; i < chunks.length; i++) {
        try {
          let contentPt = chunks[i].content;
          let chapterPt = chunks[i].chapter || null;

          // Traduzir se o documento não é pt-BR
          if (needsTranslation) {
            const translated = await this.translateChunk(chunks[i].content, chunks[i].chapter);
            contentPt = translated.contentPt;
            chapterPt = translated.chapterPt || chapterPt;
          }

          // Gerar embedding a partir do conteúdo em português
          const embedding = await this.searchService.generateEmbedding(contentPt);

          // Upsert non-vector fields via the typed Prisma API, then persist
          // the pgvector `embedding` via raw SQL (Prisma DSL cannot express
          // Unsupported column writes).
          const upserted = await this.prisma.knowledgeChunk.upsert({
            where: {
              documentId_chunkIndex: {
                documentId,
                chunkIndex: i,
              },
            },
            create: {
              documentId,
              chunkIndex: i,
              content: chunks[i].content,
              contentPt,
              chapter: chunks[i].chapter || null,
              chapterPt,
              pageStart: chunks[i].pageStart || null,
              pageEnd: chunks[i].pageEnd || null,
              language: document.language,
              isIndexed: true,
              isTranslated: true,
            },
            update: {
              content: chunks[i].content,
              contentPt,
              chapter: chunks[i].chapter || null,
              chapterPt,
              pageStart: chunks[i].pageStart || null,
              pageEnd: chunks[i].pageEnd || null,
              isIndexed: true,
              isTranslated: true,
            },
          });

          const vectorLiteral = `[${embedding.join(',')}]`;
          await this.prisma.$executeRawUnsafe(
            `UPDATE knowledge_chunks SET embedding = $1::vector WHERE id = $2`,
            vectorLiteral,
            upserted.id,
          );

          indexedChunks++;

          // Log progresso a cada 50 chunks
          if ((i + 1) % 50 === 0) {
            this.logger.log(`Processed ${i + 1}/${chunks.length} chunks`);
          }

          // Delay para evitar rate limiting na API de embeddings/tradução
          if ((i + 1) % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          this.logger.error(`Error processing chunk ${i}:`, error);
          errors++;
        }
      }

      // Atualizar documento
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          status: 'COMPLETED',
          totalChunks: chunks.length,
          processedAt: new Date(),
        },
      });

      this.logger.log(
        `Document ${documentId} processed: ${indexedChunks} indexed, ${errors} errors`,
      );

      return { totalChunks: chunks.length, indexedChunks, errors };
    } catch (error) {
      this.logger.error(`Error processing document ${documentId}:`, error);

      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          status: 'ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Extrai texto de um PDF armazenado no GCS
   * Usa pdf-parse para PDFs com texto selecionável
   */
  private async extractTextFromPdf(gcsPath: string): Promise<string> {
    try {
      // Importar Storage e pdf-parse dinamicamente
      const { Storage } = await import('@google-cloud/storage');
      const storage = new Storage();

      // Extrair bucket e caminho do gcsPath (gs://bucket/path)
      const match = gcsPath.match(/^gs:\/\/([^/]+)\/(.+)$/);
      if (!match) {
        throw new Error(`Invalid GCS path: ${gcsPath}`);
      }

      const [, bucketName, filePath] = match;

      // Baixar o arquivo
      const [buffer] = await storage.bucket(bucketName).file(filePath).download();

      // Parsear o PDF (pdf-parse v1)
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);

      this.logger.log(
        `Extracted ${data.numpages} pages, ${data.text.length} chars from ${gcsPath}`,
      );

      return data.text;
    } catch (error) {
      this.logger.error(`Error extracting text from ${gcsPath}:`, error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Divide texto em chunks com overlap
   */
  private splitIntoChunks(text: string): ChunkData[] {
    const chunks: ChunkData[] = [];
    const charChunkSize = this.CHUNK_SIZE * 4; // ~4 chars por token
    const overlapChars = Math.floor(charChunkSize * this.CHUNK_OVERLAP);

    // Tentar detectar capítulos/seções
    const sections = this.detectSections(text);

    if (sections.length > 1) {
      // Se detectou seções, chunkar por seção
      for (const section of sections) {
        const sectionChunks = this.chunkText(section.content, charChunkSize, overlapChars);
        for (const chunk of sectionChunks) {
          chunks.push({
            content: chunk,
            chapter: section.title,
            pageStart: section.pageStart,
            pageEnd: section.pageEnd,
          });
        }
      }
    } else {
      // Sem seções detectadas, chunkar texto inteiro
      const textChunks = this.chunkText(text, charChunkSize, overlapChars);
      for (const chunk of textChunks) {
        chunks.push({ content: chunk });
      }
    }

    return chunks;
  }

  /**
   * Detecta seções/capítulos no texto
   */
  private detectSections(text: string): {
    title: string;
    content: string;
    pageStart?: number;
    pageEnd?: number;
  }[] {
    // Padrões comuns de capítulos em livros-texto
    const chapterPatterns = [
      /^(?:Chapter|Capítulo|CHAPTER|CAPÍTULO)\s+\d+[.:]\s*(.+)$/gm,
      /^(?:PARTE|Part|SECTION|Seção)\s+\w+[.:]\s*(.+)$/gm,
      /^\d+\.\s+([A-Z][A-ZÀ-Ú\s]{5,})$/gm,
    ];

    const sections: { title: string; content: string; startIndex: number }[] = [];

    for (const pattern of chapterPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        sections.push({
          title: (match[1] || match[0]).trim(),
          content: '',
          startIndex: match.index,
        });
      }

      if (sections.length > 2) break; // Encontrou padrão válido
    }

    if (sections.length <= 1) {
      return [{ title: 'Conteúdo', content: text }];
    }

    // Ordenar por posição e extrair conteúdo
    sections.sort((a, b) => a.startIndex - b.startIndex);

    return sections.map((section, index) => {
      const endIndex = index < sections.length - 1
        ? sections[index + 1].startIndex
        : text.length;

      return {
        title: section.title,
        content: text.substring(section.startIndex, endIndex).trim(),
      };
    });
  }

  /**
   * Divide texto em pedaços com overlap
   */
  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];

    // Dividir por parágrafos primeiro
    const paragraphs = text.split(/\n\s*\n/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        // Overlap: manter final do chunk anterior
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + '\n\n' + trimmed;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Se algum chunk ainda for muito grande, dividir por sentenças
    const finalChunks: string[] = [];
    for (const chunk of chunks) {
      if (chunk.length > chunkSize * 1.5) {
        const sentences = chunk.split(/(?<=[.!?])\s+/);
        let subChunk = '';
        for (const sentence of sentences) {
          if (subChunk.length + sentence.length > chunkSize && subChunk.length > 0) {
            finalChunks.push(subChunk.trim());
            subChunk = sentence;
          } else {
            subChunk += (subChunk ? ' ' : '') + sentence;
          }
        }
        if (subChunk.trim()) {
          finalChunks.push(subChunk.trim());
        }
      } else {
        finalChunks.push(chunk);
      }
    }

    return finalChunks.filter(c => c.length > 50); // Ignorar chunks muito pequenos
  }

  /**
   * Traduz um chunk de texto para português brasileiro usando Gemini
   * Otimizado para texto técnico de medicina veterinária
   */
  async translateChunk(
    content: string,
    chapter?: string,
  ): Promise<{ contentPt: string; chapterPt?: string }> {
    const prompt = `Traduza o texto a seguir de inglês para português brasileiro.
Regras:
- Mantenha termos técnicos de medicina veterinária precisos
- Preserve a formatação original (parágrafos, listas, quebras de linha)
- NÃO adicione explicações, comentários ou notas — apenas traduza
- Retorne SOMENTE o texto traduzido

Texto:
${content}`;

    try {
      const result = await this.translationModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.1, // Mais determinístico para tradução fiel
        },
      });

      const contentPt = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || content;

      let chapterPt: string | undefined;
      if (chapter) {
        const chapterResult = await this.translationModel.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Traduza este título de capítulo de inglês para português brasileiro. Retorne APENAS o título traduzido, sem explicações:\n\n${chapter}`,
                },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 100, temperature: 0.1 },
        });
        chapterPt = chapterResult.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      }

      return { contentPt, chapterPt };
    } catch (error) {
      this.logger.error(`Error translating chunk: ${error}`);
      // Fallback: retorna o original se tradução falhar
      return { contentPt: content, chapterPt: chapter };
    }
  }
}
