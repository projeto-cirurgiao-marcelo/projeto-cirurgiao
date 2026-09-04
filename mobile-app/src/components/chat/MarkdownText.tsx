/**
 * Renderizador leve do Markdown que o Mentor IA devolve (vertex-chat.service:
 * títulos, bullets, **negrito**, *itálico*, `código` e citações
 * "📹 [Título da aula] - MM:SS"). Sem dependência nativa nem parser completo —
 * só o subconjunto que o prompt pede, o que basta pra não mostrar asteriscos
 * crus na bolha. Espelha o formatMarkdown do web (video-chat-widget).
 */
import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { Colors as colors } from '../../constants/colors';

export interface VideoCitation {
  title: string;
  /** Segundos, a partir de "MM:SS" ou "H:MM:SS". */
  seconds: number;
  label: string;
}

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'bullet'; depth: number; text: string }
  | { kind: 'ordered'; depth: number; index: string; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'blank' };

/**
 * "📹 [Título] - MM:SS" (formato do prompt) ou só "📹 MM:SS" (o modelo
 * abrevia quando a aula é a atual). Título ausente = aula atual.
 */
const CITATION_RE = /📹\s*(?:\[([^\]]+)\]\s*-\s*)?(\d{1,2}:\d{2}(?::\d{2})?)/g;

/** Quebra o texto em blocos de linha (título, item de lista, parágrafo). */
export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (line.trim() === '') {
      blocks.push({ kind: 'blank' });
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2] });
      continue;
    }
    const indent = /^(\s*)/.exec(line)![1].length;
    const depth = Math.min(3, Math.floor(indent / 2));
    const bullet = /^\s*[*\-•]\s+(.*)$/.exec(line);
    if (bullet) {
      blocks.push({ kind: 'bullet', depth, text: bullet[1] });
      continue;
    }
    const ordered = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      blocks.push({ kind: 'ordered', depth, index: ordered[1], text: ordered[2] });
      continue;
    }
    blocks.push({ kind: 'paragraph', text: line.trim() });
  }
  // Colapsa linhas em branco consecutivas.
  return blocks.filter((b, i) => !(b.kind === 'blank' && blocks[i - 1]?.kind === 'blank'));
}

export function parseTimestamp(label: string): number {
  const parts = label.split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

type Inline =
  | { kind: 'text'; text: string; bold?: boolean; italic?: boolean; code?: boolean }
  | { kind: 'citation'; citation: VideoCitation };

/** Negrito, itálico, código inline e citações de vídeo dentro de uma linha. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  // Primeiro as citações (podem conter asteriscos no título), depois ênfase.
  let last = 0;
  for (const m of text.matchAll(CITATION_RE)) {
    if (m.index! > last) out.push(...parseEmphasis(text.slice(last, m.index)));
    out.push({
      kind: 'citation',
      citation: { title: (m[1] ?? '').trim(), seconds: parseTimestamp(m[2]), label: m[2] },
    });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(...parseEmphasis(text.slice(last)));
  return out;
}

function parseEmphasis(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /(\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\*(?!\s)(.+?)(?<!\s)\*|_(?!\s)(.+?)(?<!\s)_)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ kind: 'text', text: text.slice(last, m.index) });
    if (m[2] !== undefined || m[3] !== undefined) {
      out.push({ kind: 'text', text: m[2] ?? m[3], bold: true });
    } else if (m[4] !== undefined) {
      out.push({ kind: 'text', text: m[4], code: true });
    } else {
      out.push({ kind: 'text', text: m[5] ?? m[6], italic: true });
    }
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

interface MarkdownTextProps {
  children: string;
  /** Estilo base do texto (cor, tamanho). */
  style?: StyleProp<TextStyle>;
  /** Toque numa citação "📹 [aula] - MM:SS" (ex.: pular o player). */
  onCitationPress?: (citation: VideoCitation) => void;
}

function InlineRun({
  parts,
  style,
  onCitationPress,
}: {
  parts: Inline[];
  style?: StyleProp<TextStyle>;
  onCitationPress?: (c: VideoCitation) => void;
}) {
  return (
    <Text style={[styles.base, style]}>
      {parts.map((p, i) =>
        p.kind === 'citation' ? (
          <Text
            key={i}
            style={styles.citation}
            onPress={onCitationPress ? () => onCitationPress(p.citation) : undefined}
            accessibilityRole={onCitationPress ? 'button' : undefined}
          >
            {p.citation.title
              ? `📹 ${p.citation.title} · ${p.citation.label}`
              : `📹 ${p.citation.label}`}
          </Text>
        ) : (
          <Text
            key={i}
            style={[p.bold && styles.bold, p.italic && styles.italic, p.code && styles.code]}
          >
            {p.text}
          </Text>
        ),
      )}
    </Text>
  );
}

export function MarkdownText({ children, style, onCitationPress }: MarkdownTextProps) {
  const blocks = parseBlocks(children ?? '');
  return (
    <View>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'blank':
            return <View key={i} style={styles.gap} />;
          case 'heading':
            return (
              <InlineRun
                key={i}
                parts={parseInline(block.text)}
                style={[style, styles.heading, block.level === 1 && styles.h1]}
                onCitationPress={onCitationPress}
              />
            );
          case 'bullet':
          case 'ordered':
            return (
              <View key={i} style={[styles.listItem, { paddingLeft: 4 + block.depth * 14 }]}>
                <Text style={[styles.base, style, styles.marker]}>
                  {block.kind === 'bullet' ? (block.depth > 0 ? '◦' : '•') : `${block.index}.`}
                </Text>
                <View style={styles.listBody}>
                  <InlineRun
                    parts={parseInline(block.text)}
                    style={style}
                    onCitationPress={onCitationPress}
                  />
                </View>
              </View>
            );
          default:
            return (
              <InlineRun
                key={i}
                parts={parseInline(block.text)}
                style={style}
                onCitationPress={onCitationPress}
              />
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { fontSize: 14, lineHeight: 20, color: colors.text },
  gap: { height: 6 },
  heading: { fontWeight: '700', marginTop: 4 },
  h1: { fontSize: 16, lineHeight: 22 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  code: {
    fontFamily: 'monospace',
    backgroundColor: `${colors.accent}12`,
    paddingHorizontal: 3,
    borderRadius: 3,
  },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 2 },
  marker: { width: 18, textAlign: 'center' },
  listBody: { flex: 1 },
  citation: { color: colors.accent, fontWeight: '600' },
});
