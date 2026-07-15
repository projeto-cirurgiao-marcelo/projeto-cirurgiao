import { VertexChatService, GENERAL_SUGGESTIONS } from './vertex-chat.service';

// Regressão do dual-mode: fora de aula (mode 'general') o prompt é o guia
// de plataforma; com contexto de vídeo continua o RAG de transcrições.
const configService = { get: () => undefined } as any;

describe('VertexChatService (modo geral vs aula)', () => {
  let service: VertexChatService;
  let generateContent: jest.Mock;

  beforeEach(() => {
    service = new VertexChatService(configService);
    generateContent = jest.fn().mockResolvedValue({
      response: { candidates: [{ content: { parts: [{ text: 'ok' }] } }] },
    });
    (service as any).model = { generateContent };
  });

  it('modo geral usa o system prompt de plataforma, sem exigir transcrições', async () => {
    await service.generateResponse('Como busco aulas?', {
      mode: 'general',
      relevantChunks: [],
    });

    const sent = generateContent.mock.calls[0][0].contents[0].parts[0].text as string;
    expect(sent).toContain('assistente da plataforma Projeto Cirurgião');
    expect(sent).not.toContain('APENAS as informações fornecidas nas transcrições');
  });

  it('modo aula mantém o prompt RAG de transcrições', async () => {
    await service.generateResponse('Pergunta', {
      videoTitle: 'Aula X',
      relevantChunks: [],
    });

    const sent = generateContent.mock.calls[0][0].contents[0].parts[0].text as string;
    expect(sent).toContain('APENAS as informações fornecidas nas transcrições');
  });

  it('sugestões do modo geral são fixas, sem chamada ao modelo', async () => {
    const suggestions = await service.generateSuggestions({
      mode: 'general',
      relevantChunks: [],
    });

    expect(suggestions).toEqual(GENERAL_SUGGESTIONS);
    expect(generateContent).not.toHaveBeenCalled();
  });
});
