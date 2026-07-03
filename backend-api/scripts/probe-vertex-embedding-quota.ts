/**
 * Probe isolado da quota de embeddings do Vertex AI. NÃO usa DB, CSV nem
 * reembed-tobias.ts. Prova qual project/location/model/endpoint chamamos e
 * tenta reproduzir o 429 (RESOURCE_EXHAUSTED) enquanto se olha o painel do GCP.
 *
 * Mesma resolução de config do backend (knowledge-search.service.ts):
 *   project  = GOOGLE_CLOUD_PROJECT_ID | GOOGLE_CLOUD_PROJECT | projeto-cirurgiao-e8df7
 *   location = GOOGLE_CLOUD_LOCATION | southamerica-east1
 *   model    = VERTEX_EMBEDDING_MODEL | text-embedding-004
 *
 * Uso:
 *   GOOGLE_APPLICATION_CREDENTIALS=<adc.json> \
 *   npx tsx scripts/probe-vertex-embedding-quota.ts --count 20 --sleep-ms 0
 *
 * Flags: --count <n> --sleep-ms <n> [--model <m>] [--location <l>]
 *
 * NÃO loga token/ADC/headers nem payload completo. Texto fixo e inofensivo.
 */
import { GoogleAuth } from 'google-auth-library';

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function numArg(flag: string, def: number): number {
  const v = getArg(flag);
  return v !== undefined && /^\d+$/.test(v) ? parseInt(v, 10) : def;
}
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function shortMsg(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  return m.replace(/\s+/g, ' ').slice(0, 300);
}
function statusOf(err: unknown): number | string {
  const e = err as { code?: unknown; status?: unknown; response?: { status?: unknown } };
  return (
    (typeof e?.response?.status === 'number' && e.response.status) ||
    (typeof e?.status === 'number' && e.status) ||
    (typeof e?.code === 'number' && e.code) ||
    (typeof e?.code === 'string' && e.code) ||
    'n/a'
  ) as number | string;
}

async function main() {
  const project =
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    'projeto-cirurgiao-e8df7';
  const location = getArg('--location') || process.env.GOOGLE_CLOUD_LOCATION || 'southamerica-east1';
  const model = getArg('--model') || process.env.VERTEX_EMBEDDING_MODEL || 'text-embedding-004';
  const count = numArg('--count', 20);
  const sleepMs = numArg('--sleep-ms', 0);

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:predict`;

  console.log('=== Vertex embedding quota probe ===');
  console.log(`project:  ${project}`);
  console.log(`location: ${location}`);
  console.log(`model:    ${model}`);
  console.log(`endpoint: ${url}`); // sem token
  console.log(`count=${count} sleep-ms=${sleepMs}`);
  console.log('----');

  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();

  let ok = 0;
  let firstErrorAt: number | null = null;
  let first429At: number | null = null;

  for (let i = 1; i <= count; i++) {
    const ts = new Date().toISOString();
    try {
      const res = await client.request({
        url,
        method: 'POST',
        data: { instances: [{ content: `teste quota embeddings projeto cirurgiao chamada ${i}` }] },
      });
      const data = res.data as any;
      const dim = data?.predictions?.[0]?.embeddings?.values?.length;
      ok++;
      console.log(`[${ts}] #${i} OK status=${res.status} dim=${dim ?? 'n/a'}`);
    } catch (err) {
      const st = statusOf(err);
      const is429 = st === 429 || /quota exceeded|resource_exhausted|too many requests/i.test(shortMsg(err));
      if (firstErrorAt === null) firstErrorAt = i;
      if (is429 && first429At === null) first429At = i;
      console.log(`[${ts}] #${i} FAIL status=${st} ${is429 ? '(QUOTA/429)' : ''} msg="${shortMsg(err)}"`);
      if (is429) {
        console.log('----');
        console.log(`⛔ 429/quota na chamada #${i}. Parando (não insistir em loop longo).`);
        break;
      }
    }
    if (sleepMs > 0 && i < count) await sleep(sleepMs);
  }

  console.log('----');
  console.log(
    `RESUMO: ok=${ok}/${count} primeiro_erro=${firstErrorAt ?? 'nenhum'} primeiro_429=${first429At ?? 'nenhum'}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro fatal do probe:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
