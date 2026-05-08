/**
 * Video Processor Trigger Worker
 *
 * Consome mensagens da Cloudflare Queue (disparadas por R2 Event Notifications)
 * e envia webhook para o Cloud Run processar o vídeo.
 *
 * Fluxo:
 *   R2 upload → Event Notification → Queue → ESTE WORKER → Cloud Run (GPU)
 */

export default {
  /**
   * Queue consumer - chamado quando uma mensagem chega na fila.
   *
   * Estrategia: ack imediato + dispatch fire-and-forget pro Cloud Run.
   *
   * Motivacao: Cloud Run /process bloqueia 5-20min processando (encode +
   * transcribe + upload). Worker fetch tem timeout subrequest (~30s-5min
   * dependendo do plano) — esperar resposta sincrona quebra com timeout
   * e dispara message.retry(), criando loop de reprocessamento porque
   * Cloud Run nao para quando conexao cai.
   *
   * Idempotency safety net: server.py checa se output ja existe em R2
   * antes de processar — duplicate dispatch e harmless.
   */
  async queue(batch, env, ctx) {
    for (const message of batch.messages) {
      try {
        const event = message.body;

        const bucket = event.bucket || '';
        const key = event.object?.key || '';
        const size = event.object?.size || 0;
        const action = event.action || '';

        console.log(`Evento R2: ${action} | Key: ${key} | Size: ${(size / 1024 / 1024).toFixed(1)} MB`);

        if (action !== 'PutObject' && action !== 'CompleteMultipartUpload') {
          console.log(`Ignorando acao: ${action}`);
          message.ack();
          continue;
        }

        const isVideo = /\.(mp4|mov|mkv)$/i.test(key);
        if (!isVideo) {
          console.log(`Nao e video: ${key}`);
          message.ack();
          continue;
        }

        const payload = {
          bucket,
          key,
          size,
          action,
          timestamp: new Date().toISOString(),
        };

        // Fire-and-forget: ack ANTES do fetch terminar.
        // ctx.waitUntil mantem o fetch vivo ate completar mesmo apos
        // o handler retornar — sem isso o Worker poderia ser killed
        // antes do request chegar no Cloud Run.
        const dispatch = fetch(`${env.CLOUD_RUN_URL}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.WEBHOOK_SECRET}`,
          },
          body: JSON.stringify(payload),
        })
          .then(async (resp) => {
            if (!resp.ok) {
              const text = await resp.text().catch(() => '');
              console.error(`Cloud Run rejected ${resp.status}: ${text.slice(0, 300)}`);
            } else {
              console.log(`Cloud Run accepted: ${key}`);
            }
          })
          .catch((err) => {
            console.error(`Cloud Run dispatch error: ${err.message}`);
          });

        ctx.waitUntil(dispatch);
        message.ack();

      } catch (error) {
        console.error(`Erro processando mensagem: ${error.message}`);
        // ack mesmo em erro para nao reciclar uma mensagem corrompida
        // pra sempre. Mensagens corrompidas vao pro DLQ se essa logica
        // estourar max_retries=3.
        message.retry();
      }
    }
  },

  /**
   * HTTP handler - endpoint para verificar status e disparar manualmente
   */
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'video-processor-trigger' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Disparo manual - POST /trigger com { key: "inbox/video.mp4" }
    if (url.pathname === '/trigger' && request.method === 'POST') {
      const auth = request.headers.get('Authorization');
      if (auth !== `Bearer ${env.WEBHOOK_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      const body = await request.json();
      const key = body.key;
      if (!key) {
        return new Response(JSON.stringify({ error: 'key is required' }), { status: 400 });
      }

      // Enviar direto para Cloud Run
      const payload = {
        bucket: 's3-projeto-cirurgiao',
        key,
        size: 0,
        action: 'ManualTrigger',
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`${env.CLOUD_RUN_URL}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.WEBHOOK_SECRET}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Video Processor Trigger Worker', { status: 200 });
  },
};
