import { Injectable, Logger } from '@nestjs/common';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: KnowledgeSearchService,
  ) {}

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

      for (let i = 0; i < chunks.length; i++) {
        try {
          // Gerar embedding
          const embedding = await this.searchService.generateEmbedding(chunks[i].content);

          // Salvar chunk com embedding
          await this.prisma.knowledgeChunk.upsert({
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
              chapter: chunks[i].chapter || null,
              pageStart: chunks[i].pageStart || null,
              pageEnd: chunks[i].pageEnd || null,
              language: document.language,
              embedding: embedding,
              isIndexed: true,
            },
            update: {
              content: chunks[i].content,
              chapter: chunks[i].chapter || null,
              pageStart: chunks[i].pageStart || null,
              pageEnd: chunks[i].pageEnd || null,
              embedding: embedding,
              isIndexed: true,
            },
          });

          indexedChunks++;

          // Log progresso a cada 50 chunks
          if ((i + 1) % 50 === 0) {
            this.logger.log(`Processed ${i + 1}/${chunks.length} chunks`);
          }

          // Delay para evitar rate limiting na API de embeddings
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
}
