'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { Bold, Italic, Heading2, List } from 'lucide-react';
import { cn } from '@/lib/utils';

// tiptap-markdown injeta `storage.markdown` em runtime mas nao estende os tipos
// do TipTap — helper pra serializar o doc atual de volta pra markdown.
const toMarkdown = (editor: { storage: unknown }): string =>
  (editor.storage as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();

interface MarkdownEditorProps {
  /** Conteudo em markdown (fonte de verdade armazenada no backend). */
  value: string;
  /** Recebe o markdown serializado a cada alteracao. */
  onChange: (markdown: string) => void;
  className?: string;
}

/**
 * Editor WYSIWYG que le e grava **markdown**. O usuario formata por botoes
 * (negrito, italico, titulo, lista) sem ver os simbolos `**`/`##`/`-`; a
 * extensao tiptap-markdown converte de/para markdown, mantendo o download .md
 * e a renderizacao intactos.
 */
export function MarkdownEditor({ value, onChange, className }: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content: value,
    // Next.js (SSR): evita mismatch de hidratacao renderizando so no client.
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(toMarkdown(editor));
    },
    editorProps: {
      attributes: {
        class: cn(
          'min-h-[360px] w-full px-4 py-3 focus:outline-none',
          'text-[14px] leading-[1.6] text-atlas-ink-2',
          '[&_h1]:font-serif [&_h1]:font-semibold [&_h1]:text-atlas-ink [&_h1]:text-[1.15rem] [&_h1]:mt-3 [&_h1]:mb-1.5',
          '[&_h2]:font-serif [&_h2]:font-semibold [&_h2]:text-atlas-ink [&_h2]:text-[1.05rem] [&_h2]:mt-3 [&_h2]:mb-1',
          '[&_h3]:font-serif [&_h3]:font-semibold [&_h3]:text-atlas-ink [&_h3]:text-[0.95rem] [&_h3]:mt-2.5 [&_h3]:mb-1',
          '[&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5',
          '[&_strong]:font-semibold [&_strong]:text-atlas-ink',
        ),
      },
    },
  });

  // Sincroniza quando o markdown externo muda (ex.: abrir outro resumo). O guard
  // evita reset de cursor quando a alteracao veio do proprio editor.
  useEffect(() => {
    if (!editor) return;
    const current = toMarkdown(editor);
    if (value !== current) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const btnClass = (active: boolean) =>
    cn(
      'flex size-8 items-center justify-center rounded transition-colors',
      active
        ? 'bg-atlas-ink text-atlas-surface'
        : 'text-atlas-muted hover:bg-atlas-surface-2 hover:text-atlas-ink',
    );

  if (!editor) {
    return (
      <div
        className={cn(
          'min-h-[400px] rounded-md border border-atlas-line bg-atlas-surface',
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-md border border-atlas-line bg-atlas-surface',
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-atlas-line px-2 py-1.5">
        <button
          type="button"
          title="Negrito"
          aria-label="Negrito"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive('bold'))}
        >
          <Bold className="size-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          title="Itálico"
          aria-label="Itálico"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive('italic'))}
        >
          <Italic className="size-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          title="Título"
          aria-label="Título"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btnClass(editor.isActive('heading', { level: 2 }))}
        >
          <Heading2 className="size-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          title="Lista"
          aria-label="Lista"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive('bulletList'))}
        >
          <List className="size-4" strokeWidth={2} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
