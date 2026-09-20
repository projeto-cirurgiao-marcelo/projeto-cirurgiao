'use client';

/**
 * /display/vidas?token=… — abre uma vez com o token na URL, guarda em
 * sessionStorage e limpa a barra. Sem interação: número grande, uma
 * história a cada 10 s, resumo a cada 60 s. Paleta = tokens dark do Atlas
 * (classe .dark no wrapper), ou clara com ?theme=light.
 *
 * Params: stories=0 (só número) · refresh=<s> · theme=light · tagline=<texto>
 * Runbook: Chrome em modo quiosque → chrome --kiosk <link>
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { AnimatedCounter } from '@/components/lives-saved/AnimatedCounter';
import { SPECIES_LABEL, type LifeSavedSummary, type StoryCard } from '@/lib/types/lives-saved.types';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const STORAGE_KEY = 'pc-display-token';
const STORY_MS = 10_000;

export default function DisplayPage() {
  return (
    <Suspense fallback={null}>
      <Display />
    </Suspense>
  );
}

function Display() {
  const params = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<LifeSavedSummary | null>(null);
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(false);
  const [online, setOnline] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const showStories = params.get('stories') !== '0';
  const refreshMs = Math.max(15, Number(params.get('refresh')) || 60) * 1000;
  const light = params.get('theme') === 'light';
  const tagline = params.get('tagline') || 'Cada número é um relato assinado por um médico veterinário. Nenhum foi digitado à mão.';

  // Token: URL → sessionStorage → limpa a URL.
  useEffect(() => {
    let t: string | null = null;
    try {
      const fromUrl = params.get('token');
      if (fromUrl) {
        sessionStorage.setItem(STORAGE_KEY, fromUrl);
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.toString());
      }
      t = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      t = params.get('token');
    }
    setToken(t);
  }, [params]);

  const client = useMemo(
    () => (token ? axios.create({ baseURL: API, timeout: 15_000, headers: { 'x-display-token': token } }) : null),
    [token],
  );

  const load = useCallback(async () => {
    if (!client) return;
    try {
      const [s, st] = await Promise.all([
        client.get<LifeSavedSummary>('/lives-saved/summary'),
        showStories ? client.get<{ items: StoryCard[] }>('/lives-saved/stories', { params: { limit: 24 } }) : null,
      ]);
      setSummary(s.data);
      if (st) setStories(st.data.items);
      setOnline(true);
      setFetchedAt(Date.now());
    } catch {
      setOnline(false);
    }
  }, [client, showStories]);

  useEffect(() => {
    load();
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [load, refreshMs]);

  // Relógio do rodapé ("atualizado há X min").
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Rotação com crossfade.
  useEffect(() => {
    if (stories.length < 2) return;
    const id = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % stories.length);
        setFade(false);
      }, 500);
    }, STORY_MS);
    return () => clearInterval(id);
  }, [stories.length]);

  // Wake lock pra TV não apagar; re-pede ao voltar do background.
  const lock = useRef<{ release: () => Promise<void> } | null>(null);
  useEffect(() => {
    const request = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
        if (nav.wakeLock && document.visibilityState === 'visible') lock.current = await nav.wakeLock.request('screen');
      } catch {
        /* sem wake lock, segue */
      }
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      lock.current?.release().catch(() => undefined);
    };
  }, []);

  const story = stories[idx] ?? null;
  const ago = fetchedAt ? Math.max(0, Math.round((now - fetchedAt) / 60_000)) : null;

  return (
    <div className={cn(!light && 'dark', 'min-h-screen bg-atlas-bg text-atlas-ink font-sans')}>
      <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 p-[clamp(20px,4vw,56px)] pt-[clamp(60px,9vw,110px)] pb-[clamp(56px,7vw,90px)]">
        <div className="absolute left-[clamp(20px,4vw,56px)] top-[clamp(16px,3vw,36px)] flex items-center gap-2.5 font-semibold text-[15px]">
          <span className="size-7 rounded-md bg-atlas-primary text-white grid place-items-center font-serif italic">C</span>
          Projeto Cirurgião
        </div>

        {token === null ? (
          <NoToken />
        ) : (
          <>
            <section className="flex flex-col justify-center">
              <div className="atlas-caps text-atlas-muted text-[clamp(10.5px,1.1vw,14px)]">Vidas salvas por quem aprendeu aqui</div>
              <div className="font-serif font-medium text-[clamp(96px,16vw,260px)] leading-[0.95] tracking-[-0.03em] my-[clamp(8px,1vw,14px)] atlas-num">
                {summary ? <AnimatedCounter value={summary.total} /> : <span className="text-atlas-muted-2">…</span>}
              </div>
              <p className="font-serif text-[clamp(15px,1.7vw,24px)] leading-[1.35] text-atlas-muted max-w-[30ch] text-balance">{tagline}</p>
            </section>

            {showStories && (
              <section className="flex items-center">
                {story ? (
                  <article
                    className={cn(
                      'w-full bg-atlas-surface border border-atlas-line rounded-md overflow-hidden transition-opacity duration-500',
                      fade && 'opacity-0',
                    )}
                  >
                    {story.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={story.cover} alt="" className="w-full max-h-[36vh] object-cover" />
                    )}
                    <div className="p-[clamp(16px,2.4vw,32px)] relative">
                      <div className="atlas-caps text-atlas-muted-2 mb-3 text-[clamp(10px,.9vw,12px)]">
                        {story.species ? SPECIES_LABEL[story.species] : 'Vida salva'}
                        {story.procedureSummary ? ` · ${story.procedureSummary}` : ''}
                      </div>
                      <p className="font-serif text-[clamp(16px,2vw,28px)] leading-[1.35] text-atlas-ink line-clamp-5">“{story.excerpt}”</p>
                      <div className="mt-4 text-[clamp(12px,1.2vw,16px)] text-atlas-muted">
                        <span className="text-atlas-ink font-medium">{story.reporterDisplay}</span>
                        {story.reporterCrmv && <> · <span className="font-mono tracking-wide text-[0.9em]">{story.reporterCrmv}</span></>}
                        {story.reporterTitle && <div>{story.reporterTitle}</div>}
                      </div>
                      {stories.length > 1 && (
                        <div
                          key={idx}
                          className="absolute left-0 bottom-0 h-[2px] bg-atlas-primary animate-[display-bar_10s_linear_forwards]"
                          style={{ width: '0%' }}
                        />
                      )}
                    </div>
                  </article>
                ) : (
                  <p className="text-atlas-muted text-[clamp(14px,1.5vw,20px)] font-serif max-w-[36ch]">
                    As histórias aparecem aqui quando os veterinários autorizam a exibição.
                  </p>
                )}
              </section>
            )}

            <footer className="absolute left-[clamp(20px,4vw,56px)] right-[clamp(20px,4vw,56px)] bottom-[clamp(14px,2.6vw,28px)] flex justify-between items-end font-mono text-[clamp(10px,1vw,13px)] tracking-wide text-atlas-muted-2">
              <span>
                <i className={cn('inline-block size-[7px] rounded-full mr-2', online ? 'bg-atlas-success' : 'bg-atlas-accent')} />
                {online ? (ago === null ? 'conectando' : ago === 0 ? 'atualizado agora' : `atualizado há ${ago} min`) : 'sem conexão · mostrando último número'}
                {summary && summary.newThisWeek > 0 && <span className="text-atlas-warn"> · +{summary.newThisWeek} esta semana</span>}
              </span>
              <span className="font-sans text-atlas-muted">projetocirurgiao.app</span>
            </footer>
          </>
        )}
      </div>
      <style>{`
        @keyframes display-bar { from { width: 0% } to { width: 100% } }
        @media (prefers-reduced-motion: reduce) { .animate-\\[display-bar_10s_linear_forwards\\] { animation: none; width: 100% !important; } }
      `}</style>
    </div>
  );
}

function NoToken() {
  return (
    <section className="lg:col-span-2 flex flex-col items-center justify-center text-center gap-3">
      <div className="font-serif text-[26px] font-medium">Sem credencial de exibição</div>
      <p className="text-atlas-muted max-w-[52ch]">
        Esta tela precisa do link gerado pelo admin em <span className="text-atlas-ink">Vidas salvas › Telas</span>.
        Abra o link completo, com o <span className="font-mono">?token=</span>, uma vez nesta TV.
      </p>
    </section>
  );
}
