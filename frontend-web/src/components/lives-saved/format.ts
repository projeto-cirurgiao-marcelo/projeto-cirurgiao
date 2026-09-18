/** "18 set 2026" — formato compacto do Atlas (mono, 10.5px). */
export function compactDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/\. de /g, ' ')
    .replace(/ de /g, ' ')
    .replace('.', '');
}
