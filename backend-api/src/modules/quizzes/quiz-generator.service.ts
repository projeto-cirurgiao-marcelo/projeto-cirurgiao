import { Injectable, Logger } from '@nestjs/common';
import { VertexAiService } from '../ai-summaries/vertex-ai.service';
import { GeneratedQuiz, QuizQuestion } from './interfaces/quiz.interface';
import { QuizDifficulty } from '@prisma/client';

@Injectable()
export class QuizGeneratorService {
  private readonly logger = new Logger(QuizGeneratorService.name);

  constructor(private vertexAiService: VertexAiService) {}

  /**
   * Gera um quiz com IA baseado no conteúdo do vídeo
   */
  async generateQuiz(params: {
    content: string; // Transcrição ou legenda do vídeo
    videoTitle: string;
    difficulty?: QuizDifficulty;
    questionCount?: number;
  }): Promise<GeneratedQuiz> {
    const {
      content,
      videoTitle,
      difficulty = QuizDifficulty.MEDIUM,
      questionCount = 10,
    } = params;

    this.logger.log(
      `Generating quiz for video: ${videoTitle}, difficulty: ${difficulty}, questions: ${questionCount}`,
    );

    const prompt = this.buildQuizPrompt(
      content,
      videoTitle,
      difficulty,
      questionCount,
    );

    try {
      const result = await this.vertexAiService['model'].generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
          topP: 0.9,
        },
      });

      const response = result.response;
      const generatedText =
        response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extrair JSON da resposta
      const quiz = this.parseQuizFromResponse(generatedText);

      this.logger.log(
        `Quiz generated successfully with ${quiz.questions.length} questions`,
      );

      return quiz;
    } catch (error) {
      this.logger.error('Error generating quiz with Vertex AI:', error);
      throw error;
    }
  }

  /**
   * Constrói o prompt para geração do quiz
   */
  private buildQuizPrompt(
    content: string,
    videoTitle: string,
    difficulty: QuizDifficulty,
    questionCount: number,
  ): string {
    const difficultyInstructions = {
      EASY: 'Perguntas básicas de compreensão e memorização. Respostas diretas do conteúdo.',
      MEDIUM:
        'Perguntas que exigem compreensão e aplicação dos conceitos. Algumas inferências necessárias.',
      HARD: 'Perguntas que exigem análise crítica, síntese e aplicação prática. Cenários complexos.',
    };

    return `
Você é um professor especializado em Medicina Veterinária criando um quiz educacional.

## Contexto
Você receberá o conteúdo de uma aula em vídeo: "${videoTitle}"

## Tarefa
Crie um quiz de múltipla escolha com ${questionCount} perguntas.

## Instruções Importantes
1. Cada pergunta deve ter EXATAMENTE 4 opções (A, B, C, D)
2. Apenas UMA opção está correta
3. As opções incorretas devem ser plausíveis (não óbvias)
4. Perguntas devem testar compreensão, não apenas memorização
5. Inclua explicação detalhada para cada resposta correta
6. Varie os tipos de perguntas (conceitual, aplicação, análise)
7. Dificuldade: ${difficulty} - ${difficultyInstructions[difficulty]}

## Formato de Saída (JSON VÁLIDO)
Retorne APENAS um objeto JSON válido, sem texto adicional antes ou depois:

{
  "questions": [
    {
      "question": "Texto da pergunta aqui?",
      "options": [
        "Opção A - primeira alternativa",
        "Opção B - segunda alternativa",
        "Opção C - terceira alternativa",
        "Opção D - quarta alternativa"
      ],
      "correctAnswer": 1,
      "explanation": "Explicação detalhada de por que a opção B está correta e as outras estão incorretas."
    }
  ]
}

IMPORTANTE: 
- correctAnswer deve ser o ÍNDICE (0, 1, 2 ou 3) da resposta correta no array options
- Retorne APENAS o JSON, sem markdown, sem \`\`\`json, sem texto adicional
- O JSON deve ser válido e parseável

## Conteúdo da Aula
${content.substring(0, 15000)} ${content.length > 15000 ? '...(conteúdo truncado)' : ''}
`;
  }

  /**
   * Extrai e valida o JSON da resposta da IA
   */
  private parseQuizFromResponse(response: string): GeneratedQuiz {
    try {
      // Remover possíveis marcadores de código
      let cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Tentar encontrar o JSON no texto
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanedResponse);

      // Validar estrutura
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid quiz structure: missing questions array');
      }

      // Validar cada questão
      parsed.questions.forEach((q: any, index: number) => {
        if (!q.question || typeof q.question !== 'string') {
          throw new Error(`Question ${index}: missing or invalid question text`);
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error(`Question ${index}: must have exactly 4 options`);
        }
        if (
          typeof q.correctAnswer !== 'number' ||
          q.correctAnswer < 0 ||
          q.correctAnswer > 3
        ) {
          throw new Error(
            `Question ${index}: correctAnswer must be 0, 1, 2, or 3`,
          );
        }
        if (!q.explanation || typeof q.explanation !== 'string') {
          throw new Error(`Question ${index}: missing or invalid explanation`);
        }
      });

      return parsed as GeneratedQuiz;
    } catch (error) {
      this.logger.error('Error parsing quiz response:', error);
      this.logger.error('Response was:', response);
      throw new Error(
        `Failed to parse quiz from AI response: ${error.message}`,
      );
    }
  }
}