import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { KnowledgeSearchResult } from './knowledge-search.service';

export interface LibraryChatResponse {
  content: string;
  sources: {
    documentTitle: string;
    chapter: string | null;
    pageStart: number | null;
    pageEnd: number | null;
    snippet: string;
  }[];
  tokenCount?: number;
}

@Injectable()
export class LibraryChatService {
  private readonly logger = new Logger(LibraryChatService.name);
  private readonly model: GenerativeModel;

  constructor(private readonly configService: ConfigService) {
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || 'projeto-cirurgiao-e8df7';
    const location = this.configService.get<string>('GOOGLE_CLOUD_LOCATION') || 'southamerica-east1';
    const modelName = this.configService.get<string>('VERTEX_LIBRARY_MODEL') || 'gemini-2.5-flash';

    const credentialsPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    if (credentialsPath) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    }

    const vertexAI = new VertexAI({ project: projectId, location });
    this.model = vertexAI.getGenerativeModel({ model: modelName });

    this.logger.log(`Library Chat Service initialized - Model: ${modelName}`);
  }

  /**
   * Gera resposta baseada nos chunks encontrados
   */
  async generateResponse(
    userMessage: string,
    relevantChunks: KnowledgeSearchResult[],
    conversationHistory: { role: string; content: string }[] = [],
  ): Promise<LibraryChatResponse> {
    this.logger.log(`Generating library response for: "${userMessage.substring(0, 80)}..."`);

    const systemPrompt = this.buildSystemPrompt();
    const prompt = this.buildPrompt(userMessage, relevantChunks, conversationHistory);

    try {
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n' + prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.3, // Mais determinístico para respostas factuais
          topP: 0.85,
        },
      });

      const response = result.response;
      const content = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const tokenCount = response.usageMetadata?.totalTokenCount;

      // Extrair fontes dos chunks usados
      const sources = relevantChunks.slice(0, 5).map(chunk => ({
        documentTitle: chunk.documentTitle,
        chapter: chunk.chapter,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        snippet: chunk.content.substring(0, 200) + '...',
      }));

      this.logger.log(`Library response generated. Tokens: ${tokenCount || 'N/A'}`);

      return { content, sources, tokenCount };
    } catch (error) {
      this.logger.error('Error generating library response:', error);
      throw error;
    }
  }

  /**
   * Gera título automático para a conversa
   */
  async generateTitle(firstMessage: string): Promise<string> {
    try {
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Gere um título curto (máximo 6 palavras) em português para uma conversa que começa com esta pergunta sobre medicina veterinária:\n\n"${firstMessage}"\n\nRetorne APENAS o título, sem aspas.`,
              },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 30, temperature: 0.5 },
      });

      return (
        result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        firstMessage.substring(0, 50)
      );
    } catch {
      return firstMessage.substring(0, 50);
    }
  }

  /**
   * Gera sugestões de perguntas iniciais
   */
  async generateSuggestions(): Promise<string[]> {
    return [
      'Quais são as principais técnicas de sutura em cirurgia veterinária?',
      'Explique os protocolos de anestesia para cães e gatos',
      'Quais são os sinais clínicos de piometra em cadelas?',
      'Descreva o manejo pós-operatório em cirurgias ortopédicas',
      'Quais são as diferenças entre anestesia inalatória e injetável?',
    ];
  }

  private buildSystemPrompt(): string {
    return `
Você é um assistente especializado em Medicina Veterinária, com acesso a uma extensa base de conhecimento composta por livros-texto de referência da área.

## Seu Papel
- Responder dúvidas sobre medicina veterinária com base EXCLUSIVA nos trechos dos livros fornecidos
- Ser preciso, didático e cientificamente rigoroso
- Sempre citar as fontes (livro, capítulo e página quando disponível)
- Responder SEMPRE em português do Brasil, independentemente do idioma da fonte

## Regras Importantes
1. Baseie suas respostas APENAS no conteúdo dos trechos fornecidos
2. Se a informação não estiver nos trechos, diga claramente: "Não encontrei essa informação nos materiais disponíveis"
3. NÃO invente informações nem complemente com conhecimento externo
4. Cite as fontes no formato: 📚 [Título do Livro] - Capítulo X, p. XX
5. Use linguagem técnica apropriada, mas acessível a estudantes
6. Formate as respostas em Markdown para legibilidade
7. Para conteúdo em inglês, traduza naturalmente para português na resposta

## Formato de Resposta
- Use **negrito** para termos técnicos importantes
- Use bullet points para listas
- Inclua citações de fonte ao final de cada bloco informativo
- Se relevante, organize a resposta com subtítulos (##)
`;
  }

  private buildPrompt(
    userMessage: string,
    chunks: KnowledgeSearchResult[],
    conversationHistory: { role: string; content: string }[],
  ): string {
    // Formatar chunks como contexto
    let contextText = '';
    if (chunks.length > 0) {
      contextText = '## Trechos Relevantes dos Livros\n\n';
      chunks.forEach((chunk, index) => {
        const pageInfo = chunk.pageStart
          ? ` (p. ${chunk.pageStart}${chunk.pageEnd && chunk.pageEnd !== chunk.pageStart ? `-${chunk.pageEnd}` : ''})`
          : '';
        const chapterInfo = chunk.chapter ? ` - ${chunk.chapter}` : '';

        contextText += `### Trecho ${index + 1}: ${chunk.documentTitle}${chapterInfo}${pageInfo}\n`;
        contextText += `${chunk.content}\n\n`;
      });
    } else {
      contextText = '## Contexto\nNenhum trecho relevante encontrado nos livros.\n\n';
    }

    // Formatar histórico
    let historyText = '';
    if (conversationHistory.length > 0) {
      historyText = '## Histórico da Conversa\n\n';
      conversationHistory.slice(-6).forEach(msg => {
        const role = msg.role === 'user' ? '**Aluno**' : '**Assistente**';
        historyText += `${role}: ${msg.content}\n\n`;
      });
    }

    return `
${contextText}
${historyText}
## Pergunta do Aluno
${userMessage}

## Sua Resposta
Responda em português do Brasil, com base nos trechos dos livros fornecidos acima. Cite as fontes.
`;
  }
}
