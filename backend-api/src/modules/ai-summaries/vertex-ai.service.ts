import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';

export interface GenerateSummaryParams {
  transcription: string;
  notes: string[];
  videoTitle: string;
  contentSource?: 'transcript' | 'caption'; // Fonte do conteúdo (opcional)
}

export interface SummaryResult {
  content: string;
  tokenCount?: number;
}

@Injectable()
export class VertexAiService {
  private readonly logger = new Logger(VertexAiService.name);
  private readonly vertexAI: VertexAI;
  private readonly model: GenerativeModel;
  private readonly projectId: string;
  private readonly location: string;
  private readonly modelName: string;

  constructor(private configService: ConfigService) {
    this.projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || 'projeto-cirurgiao-e8df7';
    this.location = this.configService.get<string>('GOOGLE_CLOUD_LOCATION') || 'southamerica-east1';
    this.modelName = this.configService.get<string>('VERTEX_AI_MODEL') || 'gemini-2.5-flash';

    // Configurar credenciais do Google Cloud
    const credentialsPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    if (credentialsPath) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
      this.logger.log(`Using Google Cloud credentials from: ${credentialsPath}`);
    } else {
      this.logger.warn('GOOGLE_APPLICATION_CREDENTIALS not set. Using default credentials.');
    }

    this.logger.log(`Initializing Vertex AI with project: ${this.projectId}, location: ${this.location}, model: ${this.modelName}`);

    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location,
    });

    this.model = this.vertexAI.getGenerativeModel({
      model: this.modelName,
    });

    this.logger.log('Vertex AI Service initialized successfully');
  }

  /**
   * Gera um resumo personalizado combinando transcrição e anotações do aluno
   */
  async generateSummary(params: GenerateSummaryParams): Promise<SummaryResult> {
    const { transcription, notes, videoTitle, contentSource = 'transcript' } = params;

    this.logger.log(`Generating summary for video: ${videoTitle}`);
    this.logger.log(`Content source: ${contentSource}`);
    this.logger.log(`Transcription length: ${transcription.length} chars`);
    this.logger.log(`Notes count: ${notes.length}`);

    const prompt = this.buildPrompt(transcription, notes, videoTitle, contentSource);

    try {
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.7,
          topP: 0.9,
        },
      });

      const response = result.response;
      const content = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Tentar obter contagem de tokens (se disponível)
      const tokenCount = response.usageMetadata?.totalTokenCount;

      this.logger.log(`Summary generated successfully. Token count: ${tokenCount || 'N/A'}`);

      return {
        content,
        tokenCount,
      };
    } catch (error) {
      this.logger.error('Error generating summary with Vertex AI:', error);
      throw error;
    }
  }

  /**
   * Constrói o prompt para geração do resumo
   */
  private buildPrompt(transcription: string, notes: string[], videoTitle: string, contentSource: 'transcript' | 'caption' = 'transcript'): string {
    const notesSection = notes.length > 0
      ? notes.map((note, index) => `${index + 1}. ${note}`).join('\n')
      : 'O aluno ainda não fez anotações para esta aula.';

    const contentLabel = contentSource === 'caption' ? 'Legendas da Aula' : 'Transcrição da Aula';

    return `
Você é um assistente educacional especializado em Medicina Veterinária.

## Contexto
Você receberá:
1. ${contentSource === 'caption' ? 'As legendas' : 'A transcrição'} de uma aula em vídeo
2. As anotações pessoais do aluno (se houver)

## Tarefa
Gere um resumo estruturado e personalizado da aula "${videoTitle}", integrando as anotações do aluno quando relevante.

## Instruções Importantes
- Use linguagem clara e objetiva
- Destaque os conceitos mais importantes
- Se o aluno tiver anotações, integre-as de forma contextualizada
- Mantenha o foco em Medicina Veterinária
- Use emojis para melhorar a legibilidade
- O resumo deve ser útil para revisão antes de provas

## Formato de Saída (Markdown)

# 📚 Resumo: ${videoTitle}

## 📌 Tópicos Principais
- Liste os principais tópicos abordados na aula
- Use bullet points para facilitar a leitura

## 🔑 Conceitos-Chave
- **Conceito 1**: Explicação breve e clara
- **Conceito 2**: Explicação breve e clara
(Liste todos os conceitos importantes)

## 📝 Integração com Suas Anotações
(Se o aluno tiver anotações, integre-as aqui de forma contextualizada, mostrando como elas se relacionam com o conteúdo da aula)

## ⚠️ Pontos de Atenção
- Destaque pontos que merecem atenção especial
- Erros comuns a evitar
- Cuidados importantes na prática

## 📖 Sugestões de Estudo
- Sugestões de tópicos para aprofundamento
- Conexões com outras áreas da Medicina Veterinária

---

## ${contentLabel}
${transcription}

---

## Anotações do Aluno
${notesSection}
`;
  }

  /**
   * Melhora um texto (título ou descrição) usando IA
   */
  async improveText(text: string, type: 'title' | 'description', context?: string): Promise<string> {
    const prompts: Record<string, string> = {
      title: `Você é um especialista em redação acadêmica de Medicina Veterinária.
Melhore o título abaixo corrigindo gramática, ortografia e tornando-o mais claro e profissional.
Mantenha o sentido original e o comprimento similar. Responda APENAS com o título melhorado, sem explicações.
${context ? `\nContexto do curso/módulo: ${context}` : ''}

Título original: "${text}"`,

      description: `Você é um especialista em redação acadêmica de Medicina Veterinária.
Melhore a descrição abaixo corrigindo gramática, ortografia, melhorando a clareza e tornando-a mais profissional e atrativa para estudantes.
Mantenha o sentido original. Responda APENAS com a descrição melhorada, sem explicações adicionais.
${context ? `\nContexto do curso/módulo: ${context}` : ''}

Descrição original: "${text}"`,
    };

    try {
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompts[type] }],
          },
        ],
        generationConfig: {
          maxOutputTokens: type === 'title' ? 100 : 1024,
          temperature: 0.3,
          topP: 0.8,
        },
      });

      const improved = result.response.candidates?.[0]?.content?.parts?.[0]?.text || text;
      // Remove aspas que a IA pode adicionar
      return improved.replace(/^["']|["']$/g, '').trim();
    } catch (error) {
      this.logger.error('Error improving text with Vertex AI:', error);
      throw error;
    }
  }

  /**
   * Gera uma descrição a partir de um título usando IA
   */
  async generateDescription(title: string, context?: string): Promise<string> {
    const prompt = `Você é um especialista em Medicina Veterinária criando conteúdo educacional.
Gere uma descrição concisa (2-3 frases) para uma aula/vídeo com o título abaixo.
A descrição deve ser informativa, profissional e atrativa para estudantes de veterinária.
Responda APENAS com a descrição, sem explicações adicionais.
${context ? `\nContexto do curso/módulo: ${context}` : ''}

Título da aula: "${title}"`;

    try {
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0.7,
          topP: 0.9,
        },
      });

      const description = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return description.replace(/^["']|["']$/g, '').trim();
    } catch (error) {
      this.logger.error('Error generating description with Vertex AI:', error);
      throw error;
    }
  }

  /**
   * Verifica se o serviço está configurado corretamente
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Tenta uma chamada simples para verificar a conexão
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Responda apenas: OK' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 10,
        },
      });

      return !!result.response;
    } catch (error) {
      this.logger.error('Vertex AI health check failed:', error);
      return false;
    }
  }
}