/**
 * Funções puras do dry-run de re-embedding do Tobias (RAG Biblioteca).
 *
 * Sem IO, sem Prisma, sem embeddings — só parse/validação/alinhamento, para
 * serem testáveis offline. O script `scripts/reembed-tobias.ts` faz o IO
 * (ler CSV, consultar o DB) e chama estas funções.
 *
 * Regra: nada aqui loga conteúdo de livro. O summary carrega SÓ contagens.
 */

export interface CsvRecord {
  chunkIndex: string;
  chapter: string;
  chapterPt: string;
  content: string;
  contentPt: string;
  language: string;
  pageStart: string;
  pageEnd: string;
  [key: string]: string;
}

export interface DbChunk {
  chunkIndex: number;
  content: string;
}

/**
 * Parser CSV RFC4180 mínimo: lida com aspas, vírgulas e quebras de linha
 * dentro de campos entre aspas, e aspas escapadas (`""`).
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let started = false; // houve algum caractere/field nesta linha?

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
      started = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
      started = true;
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      started = false;
    } else if (c === '\r') {
      // ignora CR (trata \r\n como \n)
    } else {
      field += c;
      started = true;
    }
  }
  // último campo/linha (arquivo sem newline final)
  if (started || field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Converte o CSV em registros usando o header. Descarta linhas em branco. */
export function parseCsvRecords(text: string): CsvRecord[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const records: CsvRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    // linha totalmente vazia
    if (r.length === 1 && r[0] === '') continue;
    const rec: Record<string, string> = {};
    header.forEach((key, idx) => {
      rec[key] = r[idx] ?? '';
    });
    records.push(rec as CsvRecord);
  }
  return records;
}

/** Filtra as linhas do Tobias: `language === 'en'` (case-insensitive, trim). */
export function filterTobias(records: CsvRecord[]): CsvRecord[] {
  return records.filter((r) => (r.language ?? '').trim().toLowerCase() === 'en');
}

export interface CsvValidation {
  count: number;
  expected: number;
  countOk: boolean;
  duplicateIndexes: number[];
  uniqueOk: boolean;
  missingContentPt: number;
  missingContent: number;
  missingChunkIndex: number;
  ok: boolean;
}

function parseIndex(s: string): number | null {
  const t = (s ?? '').trim();
  if (!/^\d+$/.test(t)) return null;
  return parseInt(t, 10);
}

/** Valida contagem, unicidade de chunkIndex e presença de content/contentPt/chunkIndex. */
export function validateCsvRows(rows: CsvRecord[], expected = 6161): CsvValidation {
  const seen = new Map<number, number>();
  let missingContentPt = 0;
  let missingContent = 0;
  let missingChunkIndex = 0;

  for (const r of rows) {
    const idx = parseIndex(r.chunkIndex);
    if (idx === null) missingChunkIndex++;
    else seen.set(idx, (seen.get(idx) ?? 0) + 1);
    if (!(r.contentPt ?? '').trim()) missingContentPt++;
    if (!(r.content ?? '').trim()) missingContent++;
  }

  const duplicateIndexes = [...seen.entries()]
    .filter(([, n]) => n > 1)
    .map(([idx]) => idx);
  const countOk = rows.length === expected;
  const uniqueOk = duplicateIndexes.length === 0;
  const ok =
    countOk &&
    uniqueOk &&
    missingContentPt === 0 &&
    missingContent === 0 &&
    missingChunkIndex === 0;

  return {
    count: rows.length,
    expected,
    countOk,
    duplicateIndexes,
    uniqueOk,
    missingContentPt,
    missingContent,
    missingChunkIndex,
    ok,
  };
}

/** Normalização leve de whitespace para comparar content CSV vs DB. */
export function normalizeForCompare(s: string): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

export interface Alignment {
  matched: number;
  mismatches: number;
  onlyInCsv: number[];
  onlyInDb: number[];
  ok: boolean;
}

/**
 * Compara CSV (Tobias) vs chunks do DB por `chunkIndex`. `content` deve bater
 * (normalizado). Diverge → não-ok (o script aborta).
 */
export function checkAlignment(csv: CsvRecord[], db: DbChunk[]): Alignment {
  const csvByIdx = new Map<number, string>();
  for (const r of csv) {
    const idx = parseIndex(r.chunkIndex);
    if (idx !== null) csvByIdx.set(idx, r.content ?? '');
  }
  const dbByIdx = new Map<number, string>();
  for (const c of db) dbByIdx.set(c.chunkIndex, c.content ?? '');

  let matched = 0;
  let mismatches = 0;
  for (const [idx, dbContent] of dbByIdx) {
    if (!csvByIdx.has(idx)) continue;
    matched++;
    if (normalizeForCompare(csvByIdx.get(idx)!) !== normalizeForCompare(dbContent)) {
      mismatches++;
    }
  }
  const onlyInCsv = [...csvByIdx.keys()].filter((i) => !dbByIdx.has(i));
  const onlyInDb = [...dbByIdx.keys()].filter((i) => !csvByIdx.has(i));
  const ok = mismatches === 0 && onlyInCsv.length === 0 && onlyInDb.length === 0;

  return { matched, mismatches, onlyInCsv, onlyInDb, ok };
}

/** Summary do dry-run — SÓ contagens (nunca conteúdo). */
export interface DryRunSummary {
  csvRows: number;
  dbChunks: number;
  missingContentPt: number;
  translatedReady: number;
  mismatches: number;
  wouldUpdate: number;
}

export function buildSummary(
  csvVal: CsvValidation,
  dbChunkCount: number,
  align: Alignment,
): DryRunSummary {
  return {
    csvRows: csvVal.count,
    dbChunks: dbChunkCount,
    missingContentPt: csvVal.missingContentPt,
    translatedReady: csvVal.count - csvVal.missingContentPt,
    mismatches: align.mismatches,
    wouldUpdate: align.matched,
  };
}

/** true se o dry-run está apto (validações + alinhamento) para um futuro apply. */
export function isDryRunClean(csvVal: CsvValidation, align: Alignment): boolean {
  return csvVal.ok && align.ok;
}

// ---------------------------------------------------------------------------
// --apply: guardas de argumentos, backup e batching (funções puras)
// ---------------------------------------------------------------------------

export interface ApplyArgs {
  apply: boolean;
  csv?: string;
  backup?: string;
  confirmTobiasProd: boolean;
  batchSize?: number;
  limit?: number;
  startIndex?: number;
}

export function parseApplyArgs(argv: string[]): ApplyArgs {
  const has = (f: string) => argv.includes(f);
  const val = (f: string) => {
    const i = argv.indexOf(f);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const num = (s?: string) =>
    s !== undefined && /^\d+$/.test(s.trim()) ? parseInt(s.trim(), 10) : undefined;
  return {
    apply: has('--apply'),
    csv: val('--csv'),
    backup: val('--backup'),
    confirmTobiasProd: has('--confirm-tobias-prod'),
    batchSize: num(val('--batch-size')),
    limit: num(val('--limit')),
    startIndex: num(val('--start-index')),
  };
}

/** Retorna a lista de erros de guarda para --apply. Vazio = liberado. */
export function validateApplyArgs(a: ApplyArgs): string[] {
  const errs: string[] = [];
  if (!a.apply) return errs;
  if (!a.csv) errs.push('--csv <path> é obrigatório');
  if (!a.backup) errs.push('--backup <path> é obrigatório para --apply');
  if (!a.confirmTobiasProd)
    errs.push('--confirm-tobias-prod é obrigatório para --apply');
  if (a.batchSize === undefined || a.batchSize <= 0)
    errs.push('--batch-size <n> (>0) é obrigatório para --apply');
  return errs;
}

/** Campos permitidos no backup (inclui contentPt para rollback; exclui `content` EN). */
export interface BackupRecord {
  id: string;
  chunkIndex: number;
  contentPt: string | null;
  chapterPt: string | null;
  isTranslated: boolean;
  isIndexed: boolean;
  embedding: string | null;
}

export function pickBackupFields<T extends BackupRecord>(c: T): BackupRecord {
  return {
    id: c.id,
    chunkIndex: c.chunkIndex,
    contentPt: c.contentPt,
    chapterPt: c.chapterPt,
    isTranslated: c.isTranslated,
    isIndexed: c.isIndexed,
    embedding: c.embedding,
  };
}

/** Divide os chunkIndex em batches, respeitando --start-index e --limit. */
export function planBatches(
  indexes: number[],
  batchSize: number,
  opts: { startIndex?: number; limit?: number } = {},
): number[][] {
  let sel = [...indexes].sort((a, b) => a - b);
  if (opts.startIndex !== undefined) sel = sel.filter((i) => i >= opts.startIndex!);
  if (opts.limit !== undefined) sel = sel.slice(0, opts.limit);
  const batches: number[][] = [];
  const size = Math.max(1, batchSize);
  for (let i = 0; i < sel.length; i += size) batches.push(sel.slice(i, i + size));
  return batches;
}
