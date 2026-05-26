import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from '@react-pdf/renderer';
import type { ReactNode } from 'react';

// Emojis viram imagens (twemoji via CDN). Se offline, degradam pra ausencia —
// nao quebram o PDF. As fontes nativas (Helvetica) ja cobrem acentos PT-BR.
Font.registerEmojiSource({
  format: 'png',
  url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/',
});

const styles = StyleSheet.create({
  page: {
    paddingVertical: 48,
    paddingHorizontal: 56,
    fontSize: 11,
    lineHeight: 1.5,
    color: '#1f2430',
    fontFamily: 'Helvetica',
  },
  h1: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 8, color: '#11151f' },
  h2: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 14, marginBottom: 6, color: '#11151f' },
  h3: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 4, color: '#11151f' },
  paragraph: { marginBottom: 6 },
  listGroup: { marginBottom: 6 },
  listItem: { flexDirection: 'row', marginBottom: 3, paddingLeft: 6 },
  bullet: { width: 12 },
  listItemText: { flex: 1 },
});

/**
 * Quebra o texto em segmentos <Text> aplicando negrito (`**`) e italico (`*`).
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let i = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      nodes.push(<Text key={`${keyPrefix}-t${i++}`}>{text.slice(lastIndex, m.index)}</Text>);
    }
    if (m[2] !== undefined) {
      nodes.push(
        <Text key={`${keyPrefix}-b${i++}`} style={{ fontFamily: 'Helvetica-Bold' }}>
          {m[2]}
        </Text>,
      );
    } else if (m[3] !== undefined) {
      nodes.push(
        <Text key={`${keyPrefix}-i${i++}`} style={{ fontFamily: 'Helvetica-Oblique' }}>
          {m[3]}
        </Text>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(<Text key={`${keyPrefix}-t${i++}`}>{text.slice(lastIndex)}</Text>);
  }
  return nodes;
}

/**
 * Converte o markdown do resumo em blocos react-pdf (headings, listas, paragrafos).
 */
function renderBlocks(markdown: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  let key = 0;
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const items = listBuffer;
    listBuffer = [];
    const groupKey = key++;
    blocks.push(
      <View key={`list-${groupKey}`} style={styles.listGroup}>
        {items.map((item, idx) => (
          <View key={`li-${groupKey}-${idx}`} style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listItemText}>{renderInline(item, `li-${groupKey}-${idx}`)}</Text>
          </View>
        ))}
      </View>,
    );
  };

  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);

    if (heading) {
      flushList();
      const level = heading[1].length;
      const style = level <= 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
      const hKey = key++;
      blocks.push(
        <Text key={`h-${hKey}`} style={style}>
          {renderInline(heading[2], `h-${hKey}`)}
        </Text>,
      );
    } else if (bullet) {
      listBuffer.push(bullet[1]);
    } else {
      flushList();
      const pKey = key++;
      blocks.push(
        <Text key={`p-${pKey}`} style={styles.paragraph}>
          {renderInline(line, `p-${pKey}`)}
        </Text>,
      );
    }
  }

  flushList();
  return blocks;
}

function SummaryDocument({ markdown, title }: { markdown: string; title: string }) {
  return (
    <Document title={title}>
      <Page size="A4" style={styles.page}>
        {renderBlocks(markdown)}
      </Page>
    </Document>
  );
}

/**
 * Gera um Blob de PDF (texto vetorial, selecionavel) a partir do markdown do
 * resumo. Roda 100% no client — sem endpoint/deploy.
 */
export async function generateSummaryPdfBlob(
  markdown: string,
  title: string,
): Promise<Blob> {
  return pdf(<SummaryDocument markdown={markdown} title={title} />).toBlob();
}
