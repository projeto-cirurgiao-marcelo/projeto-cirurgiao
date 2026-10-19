import { QuizGeneratorService } from './quiz-generator.service';

/** parseQuizFromResponse é privado; testamos pelo contrato (string → quiz). */
const parse = (text: string) =>
  (new QuizGeneratorService({} as never) as unknown as { parseQuizFromResponse: (s: string) => { questions: unknown[] } })
    .parseQuizFromResponse(text);

const question = {
  question: 'Qual fio?',
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 1,
  explanation: 'Porque sim.',
};

describe('QuizGeneratorService.parseQuizFromResponse', () => {
  it('aceita JSON limpo', () => {
    expect(parse(JSON.stringify({ questions: [question, question] })).questions).toHaveLength(2);
  });

  it('tolera cerca ```json, prosa em volta e vírgula sobrando antes de ] e }', () => {
    const sloppy =
      'Aqui está o quiz:\n```json\n{ "questions": [ ' +
      JSON.stringify(question).replace(/}$/, ', }') +
      ', ] , }\n```\nBons estudos!';
    expect(parse(sloppy).questions).toHaveLength(1);
  });

  it('rejeita resposta sem questions', () => {
    expect(() => parse('{"foo": 1}')).toThrow(/questions/);
  });
});
