'use client';

/**
 * /display/vidas?token=… — TV de recepção, direção C "registro clínico":
 * foto de capa em tela cheia (quando a história tem mídia com consentimento),
 * número mono sobre ela e a linha do registro no rodapé. Uma história a cada
 * 10 s, resumo a cada 60 s. O token da URL vai pro sessionStorage e some da
 * barra. Params: stories=0 · refresh=<s> · tagline=<texto>.
 * Runbook: chrome --kiosk <link>
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { AnimatedCounter } from '@/components/lives-saved/AnimatedCounter';
import { compactDate } from '@/components/lives-saved/format';
import { padSeq, SPECIES_LABEL, type LifeSavedSummary, type StoryCard } from '@/lib/types/lives-saved.types';
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
  const tagline = params.get('tagline') || 'Registro de vidas salvas';

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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

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
    <div className="dark min-h-screen bg-atlas-bg text-atlas-ink font-sans relative overflow-hidden">
      {/* fundo: foto de capa da história, ou o gradiente navy */}
      <div className={cn('absolute inset-0 transition-opacity duration-500', fade && 'opacity-0')}>
        {story?.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg,#1B2A4A 0%,#0F172A 55%,#0F172A 100%)' }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(15,23,42,.92) 0%, rgba(15,23,42,.72) 45%, rgba(15,23,42,.35) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-[40%]" style={{ background: 'linear-gradient(180deg, transparent, rgba(15,23,42,.95))' }} />
      </div>

      <div className="relative min-h-screen grid grid-rows-[auto_1fr_auto] p-[clamp(20px,4vw,56px)]">
        <div className="flex items-center gap-2.5 font-semibold text-[15px]">
          <span className="size-7 rounded-md bg-atlas-primary text-white grid place-items-center font-serif italic">C</span>
          Projeto Cirurgião
        </div>

        {token === null ? (
          <NoToken />
        ) : (
          <section className="flex flex-col justify-center">
            <div className="atlas-caps text-atlas-muted text-[clamp(10.5px,1.1vw,14px)]">{tagline}</div>
            <div className="font-mono font-medium text-[clamp(96px,17vw,280px)] leading-[0.95] tracking-[-0.03em] my-[clamp(6px,.8vw,12px)] atlas-num">
              {summary ? <AnimatedCounter value={summary.total} pad={4} /> : <span className="text-atlas-muted-2">····</span>}
            </div>
            <div className="font-serif text-[clamp(15px,1.7vw,24px)] leading-[1.35] text-atlas-muted max-w-[34ch] text-balance">
              Cada linha deste registro é um relato assinado por um médico veterinário.
              {summary && summary.newThisWeek > 0 && <span className="text-atlas-warn"> {summary.newThisWeek} nova{summary.newThisWeek > 1 ? 's' : ''} esta semana.</span>}
            </div>
          </section>
        )}

        <footer className="space-y-3">
          {showStories && story && token !== null && (
            <div className={cn('border-t border-atlas-line pt-3 grid grid-cols-[auto_auto_1fr_auto] gap-x-[2.5%] items-baseline text-[clamp(11px,1.2vw,16px)] text-atlas-muted transition-opacity duration-500', fade && 'opacity-0')}>
              <span className="font-mono text-atlas-warn tracking-wide">Nº {padSeq(story.seq)}</span>
              <span className="font-mono text-[0.9em] tracking-wide">
                {compactDate(story.occurredAt ?? story.approvedAt)}
                {story.species ? ` · ${SPECIES_LABEL[story.species].toLowerCase()}` : ''}
              </span>
              <span className="font-serif text-atlas-ink text-[clamp(13px,1.5vw,22px)] truncate">
                {story.procedureSummary || `“${story.excerpt}”`}
              </span>
              <span className="whitespace-nowrap">
                {story.reporterDisplay}
                {story.reporterCrmv && <span className="font-mono text-[0.9em] tracking-wide"> · {story.reporterCrmv}</span>}
              </span>
            </div>
          )}
          <div className="flex justify-between items-end font-mono text-[clamp(10px,1vw,13px)] tracking-wide text-atlas-muted-2">
            <span>
              <i className={cn('inline-block size-[7px] rounded-full mr-2', online ? 'bg-atlas-success' : 'bg-atlas-accent')} />
              {online ? (ago === null ? 'conectando' : ago === 0 ? 'atualizado agora' : `atualizado há ${ago} min`) : 'sem conexão · mostrando último número'}
            </span>
            <span className="font-sans text-atlas-muted">projetocirurgiao.app</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function NoToken() {
  return (
    <section className="flex flex-col items-center justify-center text-center gap-3">
      <div className="font-serif text-[26px] font-medium">Sem credencial de exibição</div>
      <p className="text-atlas-muted max-w-[52ch]">
        Esta tela precisa do link gerado pelo admin em <span className="text-atlas-ink">Vidas salvas › Telas</span>.
        Abra o link completo, com o <span className="font-mono">?token=</span>, uma vez nesta TV.
      </p>
    </section>
  );
}
