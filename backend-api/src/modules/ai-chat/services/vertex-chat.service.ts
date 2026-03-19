import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';

export interface ChatContext {
  videoTitle?: string;
  courseTitle?: string;
  relevantChunks: {
    text: string;
    videoTitle?: string;
    startTime: number;
    endTime: number;
  }[];
}

export interface ChatResponse {
  content: string;
  sources: {
    videoId: string;
    videoTitle?: string;
    timestamp: number;
    text: string;
  }[];
  tokenCount?: number;
}

@Injectable()
export class VertexChatService {
  private readonly logger = new Logger(VertexChatService.name);
  private readonly vertexAI: VertexAI;
  private readonly model: GenerativeModel;
  private readonly projectId: string;
  private readonly location: string;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    this.projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || 'projeto-cirurgiao-e8df7';
    this.location = this.configService.get<string>('GOOGLE_CLOUD_LOCATION') || 'southamerica-east1';
    this.modelName = this.configService.get<string>('VERTEX_AI_MODEL') || 'gemini-2.5-flash';

    // Configurar credenciais do Google Cloud
    const credentialsPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    if (credentialsPath) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    }

    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location,
    });

    this.model = this.vertexAI.getGenerativeModel({
      model: this.modelName,
    });

    this.logger.log(`Vertex Chat Service initialized - Model: ${this.modelName}`);
  }

  /**
   * Gera uma resposta do chatbot usando RAG
   */
  async generateResponse(
    userMessage: string,
    context: ChatContext,
    conversationHistory: { role: string; content: string }[] = [],
  ): Promise<ChatResponse> {
    this.logger.log(`Generating response for: "${userMessage.substring(0, 50)}..."`);

    const systemPrompt = this.buildSystemPrompt(context);
    const prompt = this.buildPrompt(userMessage, context, conversationHistory);

    try {
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n' + prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
          topP: 0.9,
        },
      });

      const response = result.response;
      const content = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const tokenCount = response.usageMetadata?.totalTokenCount;

      // Extrair fontes do contexto usado
      const sources = context.relevantChunks.map((chunk, index) => ({
        videoId: `video-${index}`, // Será substituído pelo ID real
        videoTitle: chunk.videoTitle,
        timestamp: chunk.startTime,
        text: chunk.text.substring(0, 200) + '...',
      }));

      this.logger.log(`Response generated. Token count: ${tokenCount || 'N/A'}`);

      return {
        content,
        sources,
        tokenCount,
      };
    } catch (error) {
      this.logger.error('Error generating chat response:', error);
      throw error;
    }
  }

  /**
   * Constrói o prompt do sistema
   */
  private buildSystemPrompt(context: ChatContext): string {
    let contextInfo = '';
    
    if (context.videoTitle) {
      contextInfo += `O aluno está assistindo ao vídeo: "${context.videoTitle}"\n`;
    }
    if (context.courseTitle) {
      contextInfo += `Curso: "${context.courseTitle}"\n`;
    }

    return `
Você é um assistente educacional especializado em Medicina Veterinária, integrado a uma plataforma de cursos online.

## Seu Papel
- Responder dúvidas dos alunos sobre o conteúdo das aulas
- Usar APENAS as informações fornecidas nas transcrições das aulas
- Ser claro, objetivo e didático
- Indicar timestamps específicos quando relevante

## Contexto Atual
${contextInfo}

## Regras Importantes
1. Baseie suas respostas APENAS no conteúdo das transcrições fornecidas
2. Se não encontrar a informação nas transcrições, diga claramente que não tem essa informação
3. Sempre que possível, indique o momento do vídeo onde o assunto é abordado
4. Use linguagem acessível e profissional
5. Formate suas respostas em Markdown para melhor legibilidade
6. Se o aluno perguntar algo fora do escopo das aulas, sugira que consulte o professor

## Formato de Resposta
- Use bullet points para listas
- Destaque termos importantes em **negrito**
- Inclua referências aos vídeos quando aplicável: "📹 [Título do Vídeo] - XX:XX"
`;
  }

  /**
   * Constrói o prompt com contexto e histórico
   */
  private buildPrompt(
    userMessage: string,
    context: ChatContext,
    conversationHistory: { role: string; content: string }[],
  ): string {
    // Formatar chunks relevantes
    let contextText = '';
    if (context.relevantChunks.length > 0) {
      contextText = '## Trechos Relevantes das Aulas\n\n';
      context.relevantChunks.forEach((chunk, index) => {
        const timestamp = this.formatTimestamp(chunk.startTime);
        const videoInfo = chunk.videoTitle ? `[${chunk.videoTitle}]` : '';
        contextText += `### Trecho ${index + 1} ${videoInfo} - ${timestamp}\n`;
        contextText += `${chunk.text}\n\n`;
      });
    } else {
      contextText = '## Contexto\nNenhum trecho específico encontrado nas transcrições.\n\n';
    }

    // Formatar histórico da conversa
    let historyText = '';
    if (conversationHistory.length > 0) {
      historyText = '## Histórico da Conversa\n\n';
      conversationHistory.slice(-6).forEach((msg) => {
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
Responda de forma clara e didática, baseando-se nos trechos das aulas fornecidos acima.
`;
  }

  /**
   * Formata timestamp em MM:SS
   */
  private formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Gera sugestões de perguntas baseadas no contexto
   */
  async generateSuggestions(context: ChatContext): Promise<string[]> {
    if (context.relevantChunks.length === 0) {
      return [
        'Quais são os principais tópicos desta aula?',
        'Pode explicar os conceitos mais importantes?',
        'Quais são os pontos de atenção mencionados?',
      ];
    }

    try {
      const prompt = `
Baseado no seguinte conteúdo de uma aula de Medicina Veterinária, sugira 3 perguntas que um aluno poderia fazer:

${context.relevantChunks.map(c => c.text).join('\n\n')}

Retorne apenas as 3 perguntas, uma por linha, sem numeração.
`;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 256,
          temperature: 0.8,
        },
      });

      const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const suggestions = response.split('\n').filter(s => s.trim()).slice(0, 3);

      return suggestions.length > 0 ? suggestions : [
        'Quais são os principais tópicos desta aula?',
        'Pode explicar os conceitos mais importantes?',
        'Quais são os pontos de atenção mencionados?',
      ];
    } catch (error) {
      this.logger.error('Error generating suggestions:', error);
      return [
        'Quais são os principais tópicos desta aula?',
        'Pode explicar os conceitos mais importantes?',
        'Quais são os pontos de atenção mencionados?',
      ];
    }
  }

  /**
   * Verifica se o serviço está funcionando
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Responda apenas: OK' }] }],
        generationConfig: { maxOutputTokens: 10 },
      });
      return !!result.response;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }
}