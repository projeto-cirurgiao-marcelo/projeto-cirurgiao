import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  MarkdownText,
  parseBlocks,
  parseInline,
  parseTimestamp,
} from '../src/components/chat/MarkdownText';

const SAMPLE = [
  'Olá! Aqui estão os principais tópicos:',
  '',
  '* **Introdução à Castração**',
  '  * O treinamento visa discutir a técnica. 📹 [Como vender a cirurgia] - 00:00',
  '* **Definição**',
  '  * Em machos: **orquiectomia** (retirada dos testículos).',
  '1. Primeiro passo',
  '## Resumo',
].join('\n');

describe('MarkdownText — parser', () => {
  it('quebra em blocos: parágrafo, bullets com profundidade, numerado e título', () => {
    const blocks = parseBlocks(SAMPLE);
    expect(blocks.map((b) => b.kind)).toEqual([
      'paragraph',
      'blank',
      'bullet',
      'bullet',
      'bullet',
      'bullet',
      'ordered',
      'heading',
    ]);
    expect(blocks[3]).toMatchObject({ kind: 'bullet', depth: 1 });
    expect(blocks[7]).toMatchObject({ kind: 'heading', level: 2, text: 'Resumo' });
  });

  it('negrito, itálico e código viram runs; asteriscos somem', () => {
    const parts = parseInline('Em fêmeas: **ovário-histerectomia** ou *ovariectomia* e `x`');
    expect(parts).toEqual([
      { kind: 'text', text: 'Em fêmeas: ' },
      { kind: 'text', text: 'ovário-histerectomia', bold: true },
      { kind: 'text', text: ' ou ' },
      { kind: 'text', text: 'ovariectomia', italic: true },
      { kind: 'text', text: ' e ' },
      { kind: 'text', text: 'x', code: true },
    ]);
  });

  it('citação "📹 [Título] - MM:SS" vira citação com segundos', () => {
    const parts = parseInline('Veja 📹 [Como vender a cirurgia] - 01:05 no vídeo.');
    expect(parts[1]).toEqual({
      kind: 'citation',
      citation: { title: 'Como vender a cirurgia', seconds: 65, label: '01:05' },
    });
    expect(parseTimestamp('1:02:03')).toBe(3723);
  });

  it('citação abreviada "(📹 MM:SS)" — sem título — também vira citação', () => {
    const parts = parseInline('Cuidado com advogados (📹 34:53)');
    expect(parts).toEqual([
      { kind: 'text', text: 'Cuidado com advogados (' },
      { kind: 'citation', citation: { title: '', seconds: 2093, label: '34:53' } },
      { kind: 'text', text: ')' },
    ]);
  });
});

describe('MarkdownText — render', () => {
  it('não exibe asteriscos e chama onCitationPress ao tocar na citação', () => {
    const onCitationPress = jest.fn();
    const { queryByText, getByText } = render(
      <MarkdownText onCitationPress={onCitationPress}>{SAMPLE}</MarkdownText>,
    );

    expect(queryByText(/\*\*/)).toBeNull();
    expect(getByText('Introdução à Castração')).toBeTruthy();
    expect(getByText('Resumo')).toBeTruthy();

    fireEvent.press(getByText('📹 Como vender a cirurgia · 00:00'));
    expect(onCitationPress).toHaveBeenCalledWith({
      title: 'Como vender a cirurgia',
      seconds: 0,
      label: '00:00',
    });
  });
});
