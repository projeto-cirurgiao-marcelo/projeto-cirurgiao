/**
 * Converte Markdown basico (bold, italico, headings, listas e paragrafos) em
 * HTML pronto pra `dangerouslySetInnerHTML`.
 *
 * O texto e escapado ANTES de aplicar as transformacoes, entao e seguro usar
 * mesmo com conteudo editavel pelo usuario (ex.: resumos de aula que o aluno
 * pode editar) — nenhum HTML/script embutido no texto e interpretado.
 *
 * Headings sao rebaixados (`#`/`##` -> h4, `###`+ -> h5) pra ficarem
 * proporcionais aos cards/chat onde sao exibidos.
 */
export function formatMarkdown(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (s: string) =>
    escape(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

  const out: string[] = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) {
      out.push('</ul>');
      listOpen = false;
    }
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);

    if (heading) {
      closeList();
      const tag = heading[1].length <= 2 ? 'h4' : 'h5';
      out.push(`<${tag}>${inline(heading[2])}</${tag}>`);
    } else if (bullet) {
      if (!listOpen) {
        out.push('<ul>');
        listOpen = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }

  closeList();
  return out.join('');
}
