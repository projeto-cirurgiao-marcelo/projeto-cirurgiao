import {
  parseCsv,
  parseCsvRecords,
  filterTobias,
  validateCsvRows,
  checkAlignment,
  buildSummary,
  normalizeForCompare,
  isDryRunClean,
  parseApplyArgs,
  validateApplyArgs,
  pickBackupFields,
  planBatches,
  parseBackupJsonl,
  selectBackupForRollback,
  CsvRecord,
} from './tobias-reembed-planner';

const HEADER =
  'chunkIndex,chapter,chapterPt,content,contentPt,language,pageStart,pageEnd';

// helper: monta um CSV a partir de linhas já formatadas (campos entre aspas)
function csv(...dataLines: string[]): string {
  return [HEADER, ...dataLines].join('\n') + '\n';
}

describe('tobias-reembed-planner (dry-run puro)', () => {
  describe('parseCsv — campos multi-linha', () => {
    it('parseia campo entre aspas com vírgula e quebra de linha', () => {
      const text =
        HEADER +
        '\n' +
        '0,,,"Line one, still one\nLine two","Linha um, ainda um\nLinha dois",en,1,2\n';
      const rows = parseCsv(text);
      expect(rows).toHaveLength(2); // header + 1 registro
      expect(rows[1][0]).toBe('0');
      expect(rows[1][3]).toBe('Line one, still one\nLine two');
      expect(rows[1][4]).toBe('Linha um, ainda um\nLinha dois');
      expect(rows[1][5]).toBe('en');
    });

    it('trata aspas escapadas ("")', () => {
      const text = HEADER + '\n' + '0,,,"He said ""hi""","Disse ""oi""",en,1,1\n';
      const recs = parseCsvRecords(text);
      expect(recs[0].content).toBe('He said "hi"');
      expect(recs[0].contentPt).toBe('Disse "oi"');
    });
  });

  describe('filterTobias — só language=en', () => {
    it('ignora Fossum/pt-BR e mantém en', () => {
      const text = csv(
        '0,,,"Tobias A","Tobias A pt",en,1,1',
        '0,,,"Fossum A","Fossum A pt",pt-BR,1,1',
        '1,,,"Tobias B","Tobias B pt",EN,2,2', // case-insensitive
      );
      const recs = parseCsvRecords(text);
      const tob = filterTobias(recs);
      expect(tob).toHaveLength(2);
      expect(tob.every((r) => r.language.trim().toLowerCase() === 'en')).toBe(true);
    });
  });

  describe('validateCsvRows', () => {
    it('passa quando tudo presente e contagem bate', () => {
      const rows: CsvRecord[] = [
        { chunkIndex: '0', content: 'a', contentPt: 'a-pt', language: 'en', chapter: '', chapterPt: '', pageStart: '', pageEnd: '' },
        { chunkIndex: '1', content: 'b', contentPt: 'b-pt', language: 'en', chapter: '', chapterPt: '', pageStart: '', pageEnd: '' },
      ];
      const v = validateCsvRows(rows, 2);
      expect(v.ok).toBe(true);
      expect(v.missingContentPt).toBe(0);
    });

    it('FALHA se falta contentPt', () => {
      const rows: CsvRecord[] = [
        { chunkIndex: '0', content: 'a', contentPt: 'a-pt', language: 'en', chapter: '', chapterPt: '', pageStart: '', pageEnd: '' },
        { chunkIndex: '1', content: 'b', contentPt: '   ', language: 'en', chapter: '', chapterPt: '', pageStart: '', pageEnd: '' },
      ];
      const v = validateCsvRows(rows, 2);
      expect(v.missingContentPt).toBe(1);
      expect(v.ok).toBe(false);
    });

    it('FALHA se chunkIndex duplica', () => {
      const rows: CsvRecord[] = [
        { chunkIndex: '0', content: 'a', contentPt: 'a-pt', language: 'en', chapter: '', chapterPt: '', pageStart: '', pageEnd: '' },
        { chunkIndex: '0', content: 'b', contentPt: 'b-pt', language: 'en', chapter: '', chapterPt: '', pageStart: '', pageEnd: '' },
      ];
      const v = validateCsvRows(rows, 2);
      expect(v.duplicateIndexes).toContain(0);
      expect(v.uniqueOk).toBe(false);
      expect(v.ok).toBe(false);
    });

    it('FALHA se contagem difere do esperado', () => {
      const rows: CsvRecord[] = [
        { chunkIndex: '0', content: 'a', contentPt: 'a-pt', language: 'en', chapter: '', chapterPt: '', pageStart: '', pageEnd: '' },
      ];
      const v = validateCsvRows(rows, 6161);
      expect(v.countOk).toBe(false);
      expect(v.ok).toBe(false);
    });
  });

  describe('checkAlignment — content CSV vs DB', () => {
    const mk = (chunkIndex: string, content: string): CsvRecord => ({
      chunkIndex, content, contentPt: content + '-pt', language: 'en', chapter: '', chapterPt: '', pageStart: '', pageEnd: '',
    });

    it('ok quando content bate (com normalização de whitespace)', () => {
      const csvRows = [mk('0', 'Hello   world'), mk('1', 'Foo bar')];
      const db = [
        { chunkIndex: 0, content: 'Hello world' },
        { chunkIndex: 1, content: '  Foo   bar ' },
      ];
      const a = checkAlignment(csvRows, db);
      expect(a.matched).toBe(2);
      expect(a.mismatches).toBe(0);
      expect(a.ok).toBe(true);
    });

    it('FALHA quando content do CSV difere do DB', () => {
      const csvRows = [mk('0', 'Hello world'), mk('1', 'Foo bar')];
      const db = [
        { chunkIndex: 0, content: 'Hello world' },
        { chunkIndex: 1, content: 'COMPLETELY DIFFERENT' },
      ];
      const a = checkAlignment(csvRows, db);
      expect(a.mismatches).toBe(1);
      expect(a.ok).toBe(false);
    });

    it('FALHA quando há chunkIndex só no CSV ou só no DB', () => {
      const csvRows = [mk('0', 'a'), mk('2', 'c')];
      const db = [
        { chunkIndex: 0, content: 'a' },
        { chunkIndex: 1, content: 'b' },
      ];
      const a = checkAlignment(csvRows, db);
      expect(a.onlyInCsv).toContain(2);
      expect(a.onlyInDb).toContain(1);
      expect(a.ok).toBe(false);
    });
  });

  describe('buildSummary — só contagens, sem conteúdo', () => {
    it('summary contém apenas números e nenhum content/contentPt', () => {
      const rows: CsvRecord[] = [
        { chunkIndex: '0', content: 'SECRET_BOOK_TEXT', contentPt: 'TEXTO_SECRETO_LIVRO', language: 'en', chapter: '', chapterPt: '', pageStart: '', pageEnd: '' },
      ];
      const v = validateCsvRows(rows, 1);
      const a = checkAlignment(rows, [{ chunkIndex: 0, content: 'SECRET_BOOK_TEXT' }]);
      const summary = buildSummary(v, 1, a);

      expect(summary).toEqual({
        csvRows: 1,
        dbChunks: 1,
        missingContentPt: 0,
        translatedReady: 1,
        mismatches: 0,
        wouldUpdate: 1,
      });
      // nenhum valor do summary é conteúdo do livro
      const serialized = JSON.stringify(summary);
      expect(serialized).not.toContain('SECRET_BOOK_TEXT');
      expect(serialized).not.toContain('TEXTO_SECRETO_LIVRO');
      // todos os valores são numéricos
      expect(Object.values(summary).every((v) => typeof v === 'number')).toBe(true);
      expect(isDryRunClean(v, a)).toBe(true);
    });
  });

  describe('normalizeForCompare', () => {
    it('colapsa whitespace e faz trim', () => {
      expect(normalizeForCompare('  a\n\t b   c ')).toBe('a b c');
    });
  });

  describe('--apply: guardas de argumentos', () => {
    const base = ['--apply', '--csv', 'x.csv', '--backup', 'b.jsonl', '--confirm-tobias-prod', '--batch-size', '50'];

    it('libera quando todas as travas estão presentes', () => {
      const a = parseApplyArgs(base);
      expect(a.apply).toBe(true);
      expect(a.batchSize).toBe(50);
      expect(validateApplyArgs(a)).toEqual([]);
    });

    it('FALHA sem --confirm-tobias-prod', () => {
      const argv = base.filter((x) => x !== '--confirm-tobias-prod');
      const errs = validateApplyArgs(parseApplyArgs(argv));
      expect(errs.some((e) => e.includes('--confirm-tobias-prod'))).toBe(true);
    });

    it('FALHA sem --backup', () => {
      const argv = ['--apply', '--csv', 'x.csv', '--confirm-tobias-prod', '--batch-size', '50'];
      const errs = validateApplyArgs(parseApplyArgs(argv));
      expect(errs.some((e) => e.includes('--backup'))).toBe(true);
    });

    it('FALHA sem --batch-size (ou inválido)', () => {
      const argv = ['--apply', '--csv', 'x.csv', '--backup', 'b.jsonl', '--confirm-tobias-prod'];
      const errs = validateApplyArgs(parseApplyArgs(argv));
      expect(errs.some((e) => e.includes('--batch-size'))).toBe(true);
    });

    it('sem --apply não exige travas (dry-run)', () => {
      const a = parseApplyArgs(['--csv', 'x.csv']);
      expect(a.apply).toBe(false);
      expect(validateApplyArgs(a)).toEqual([]);
    });
  });

  describe('pickBackupFields — só campos permitidos', () => {
    it('inclui os campos de rollback e NÃO inclui content (EN) nem outros', () => {
      const chunk = {
        id: 'c1',
        chunkIndex: 3,
        contentPt: 'PT',
        chapterPt: 'CapPT',
        isTranslated: false,
        isIndexed: true,
        embedding: '[0.1,0.2]',
        content: 'ENGLISH_BOOK_TEXT',
        language: 'en',
        documentId: 'doc',
      };
      const b = pickBackupFields(chunk);
      expect(Object.keys(b).sort()).toEqual(
        ['chapterPt', 'chunkIndex', 'contentPt', 'embedding', 'id', 'isIndexed', 'isTranslated'].sort(),
      );
      expect((b as any).content).toBeUndefined();
      expect((b as any).language).toBeUndefined();
      expect(JSON.stringify(b)).not.toContain('ENGLISH_BOOK_TEXT');
    });
  });

  describe('planBatches — respeita --limit / --start-index / --batch-size', () => {
    const idx = [0, 1, 2, 3, 4, 5, 6];

    it('respeita --limit', () => {
      const b = planBatches(idx, 2, { limit: 3 });
      expect(b.flat()).toEqual([0, 1, 2]);
      expect(b).toEqual([[0, 1], [2]]);
    });

    it('respeita --start-index', () => {
      const b = planBatches(idx, 3, { startIndex: 4 });
      expect(b.flat()).toEqual([4, 5, 6]);
    });

    it('batches têm no máximo batchSize itens', () => {
      const b = planBatches(idx, 3);
      expect(b.map((x) => x.length)).toEqual([3, 3, 1]);
    });
  });

  describe('rollback: parseBackupJsonl + selectBackupForRollback', () => {
    const mkLine = (chunkIndex: number) =>
      JSON.stringify({
        id: `id-${chunkIndex}`,
        chunkIndex,
        contentPt: null,
        chapterPt: null,
        isTranslated: false,
        isIndexed: true,
        embedding: '[0.1,0.2]',
      });

    it('parseBackupJsonl ignora linhas em branco', () => {
      const text = [mkLine(0), '', mkLine(1), '  ', mkLine(2)].join('\n') + '\n';
      const recs = parseBackupJsonl(text);
      expect(recs).toHaveLength(3);
      expect(recs[0].id).toBe('id-0');
    });

    it('selectBackupForRollback restaura exatamente chunkIndex 0..maxIndex', () => {
      const recs = parseBackupJsonl(
        Array.from({ length: 21 }, (_, i) => mkLine(i)).join('\n'),
      );
      const sel = selectBackupForRollback(recs, 9);
      expect(sel).toHaveLength(10); // 0..9
      expect(sel.map((r) => r.chunkIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      // só ids/chunkIndex são "expostos"; nenhum content no registro
      expect((sel[0] as any).content).toBeUndefined();
    });
  });
});
