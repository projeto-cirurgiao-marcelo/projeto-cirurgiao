/**
 * A tela do quiz desenhada em Rive (`assets/rive/quiz.riv`, fonte em
 * `rive/quiz/`). Só desenha: recebe o `QuizViewModel` e devolve os toques.
 *
 * Duas regras do runtime que moldam este arquivo (validadas na fase 0):
 * - Mudar uma lista de um view model já ligado ao RiveView não redesenha no
 *   Android. Então as listas (alternativas, revisão) são preenchidas antes e o
 *   RiveView remonta (key) quando o conteúdo delas muda. Textos, números e
 *   estados atualizam ao vivo.
 * - Fast Refresh fecha as instâncias nativas; recarregar a tela resolve.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Fit,
  RiveView,
  Semantics,
  useRiveFile,
  useViewModelInstance,
  type ViewModelInstance,
} from '@rive-app/react-native';

import { logger } from '../../../lib/logger';
import type { ConfidenceLevel } from '../../../types/quiz.types';
import { QUIZ_TRIGGERS, type QuizViewModel } from './quiz-view-model';

/** Liga o quiz em Rive (build com EXPO_PUBLIC_QUIZ_RIVE=1). Desligado = quiz antigo. */
export const QUIZ_RIVE_ENABLED = process.env.EXPO_PUBLIC_QUIZ_RIVE === '1';
/** Sonda de diagnóstico (só build preview): mostra fase, montagens e o último trigger recebido. */
const QUIZ_RIVE_DEBUG = process.env.EXPO_PUBLIC_QUIZ_RIVE_DEBUG === '1';

export interface QuizRiveViewProps {
  vm: QuizViewModel;
  onOptionTap: (index: number) => void;
  onConfidence: (level: ConfidenceLevel) => void;
  onContinue: () => void;
  onRetry: () => void;
  onClose: () => void;
}

type Kind = 'string' | 'number' | 'boolean' | 'enum';
const SCALARS: [keyof QuizViewModel, Kind][] = [
  ['phase', 'enum'],
  ['progressLabel', 'string'],
  ['questionNumber', 'number'],
  ['questionCount', 'number'],
  ['questionText', 'string'],
  ['locked', 'boolean'],
  ['combo', 'number'],
  ['xpProgress', 'number'],
  ['feedbackKind', 'enum'],
  ['feedbackTitle', 'string'],
  ['feedbackSubtitle', 'string'],
  ['xpGained', 'number'],
  ['accuracy', 'number'],
  ['confidence', 'enum'],
  ['canContinue', 'boolean'],
  ['submitting', 'boolean'],
  ['score', 'number'],
  ['passed', 'boolean'],
  ['resultSummary', 'string'],
  ['generating', 'boolean'],
];

function setProp(inst: ViewModelInstance, name: string, kind: Kind, value: unknown) {
  if (kind === 'string') inst.stringProperty(name)?.set(String(value));
  else if (kind === 'number') inst.numberProperty(name)?.set(Number(value));
  else if (kind === 'boolean') inst.booleanProperty(name)?.set(Boolean(value));
  else inst.enumProperty(name)?.set(String(value));
}

const QUIZ_FILE = require('../../../../assets/rive/quiz.riv');

export function QuizRiveView({ vm, ...callbacks }: QuizRiveViewProps) {
  const { riveFile, error: fileError } = useRiveFile(QUIZ_FILE);
  const { instance, error: vmError } = useViewModelInstance(riveFile, {
    async: true,
  });

  // Callbacks e vm mais recentes, sem reassinar os listeners a cada render.
  const cb = useRef(callbacks);
  cb.current = callbacks;
  const vmRef = useRef(vm);
  vmRef.current = vm;

  useEffect(() => {
    if (fileError) logger.error('[QuizRiveView] arquivo .riv', fileError);
    if (vmError) logger.error('[QuizRiveView] view model', vmError);
  }, [fileError, vmError]);

  // --- toques da tela (triggers do Quiz)
  // A folha de feedback e o resultado nunca são `display: none` na cena (o
  // rive-ios não entrega toque em contêiner que nasce colapsado); fora da fase
  // eles ficam fora do artboard, mas continuam na árvore semântica. Por isso
  // cada trigger só vale na fase dele — um VoiceOver "ativando" um botão
  // fora de hora não dispara nada.
  //
  // Reassinado a cada montagem do RiveView (mountedKey): no iOS o stream de um
  // trigger da instância raiz pode morrer quando o RiveView anterior é
  // destruído; as linhas das listas não sofrem disso porque nascem de novo.
  const [mountedKey, setMountedKey] = useState<string | null>(null);
  const [debug, setDebug] = useState({ mounts: 0, last: '' });
  const trace = (what: string) => {
    if (!QUIZ_RIVE_DEBUG) return;
    logger.info(`[QuizRiveView] ${what}`);
    setDebug((d) => ({ ...d, last: `${what} @${new Date().toISOString().slice(11, 19)}` }));
  };
  useEffect(() => {
    if (!instance || !mountedKey) return;
    const on = (name: string, phase: QuizViewModel['phase'] | null, fn: () => void) =>
      instance.triggerProperty(name)?.addListener(() => {
        trace(`trigger ${name} (fase ${vmRef.current.phase})`);
        if (phase === null || vmRef.current.phase === phase) fn();
      });
    const unsubs = [
      on(QUIZ_TRIGGERS.continue, 'feedback', () => cb.current.onContinue()),
      on(QUIZ_TRIGGERS.retry, 'result', () => cb.current.onRetry()),
      on(QUIZ_TRIGGERS.close, null, () => cb.current.onClose()),
      ...(Object.entries(QUIZ_TRIGGERS.confidence) as [ConfidenceLevel, string][]).map(([level, name]) =>
        on(name, 'feedback', () => cb.current.onConfidence(level)),
      ),
    ];
    if (QUIZ_RIVE_DEBUG) setDebug((d) => ({ ...d, mounts: d.mounts + 1 }));
    return () => unsubs.forEach((u) => u?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, mountedKey]);

  // --- valores simples: só manda o que mudou
  const sent = useRef<Record<string, unknown>>({});
  useEffect(() => {
    sent.current = {};
  }, [instance]);
  useEffect(() => {
    if (!instance) return;
    for (const [name, kind] of SCALARS) {
      if (sent.current[name] === vm[name]) continue;
      setProp(instance, name, kind, vm[name]);
      sent.current[name] = vm[name];
    }
  });

  // --- listas: preenche e só então monta (ou remonta) o RiveView
  const listsKey = useMemo(
    () => JSON.stringify([vm.options.map((o) => o.text), vm.review]),
    [vm.options, vm.review],
  );
  const rows = useRef<{ inst: ViewModelInstance; state?: string }[]>([]);

  useEffect(() => {
    if (!riveFile || !instance) return;
    let cancelled = false;
    const unsubs: (() => void)[] = [];
    setMountedKey(null);

    (async () => {
      const [optionVM, reviewVM] = await Promise.all([
        riveFile.viewModelByNameAsync('Option'),
        riveFile.viewModelByNameAsync('ReviewItem'),
      ]);
      const options = instance.listProperty('options');
      const review = instance.listProperty('review');
      if (!optionVM || !reviewVM || !options || !review)
        throw new Error('view models do .riv não batem com o contrato');

      const { options: opts, review: items } = vmRef.current;
      for (const list of [options, review]) {
        for (let n = await list.getLengthAsync(); n > 0; n--) await list.removeInstanceAtAsync(0);
      }

      const newRows: typeof rows.current = [];
      for (let i = 0; i < opts.length; i++) {
        const row = await optionVM.createDefaultInstanceAsync();
        if (!row || cancelled) return;
        row.stringProperty('text')?.set(opts[i].text);
        row.enumProperty('state')?.set(opts[i].state);
        const tap = row.triggerProperty(QUIZ_TRIGGERS.optionTap);
        if (tap)
          unsubs.push(
            tap.addListener(() => {
              trace(`option ${i}`);
              cb.current.onOptionTap(i);
            }),
          );
        newRows.push({ inst: row, state: opts[i].state });
        await options.addInstanceAsync(row);
      }
      for (const item of items) {
        const row = await reviewVM.createDefaultInstanceAsync();
        if (!row || cancelled) return;
        row.stringProperty('title')?.set(item.title);
        row.stringProperty('question')?.set(item.question);
        row.booleanProperty('isCorrect')?.set(item.isCorrect);
        row.stringProperty('yourAnswer')?.set(item.yourAnswer);
        row.stringProperty('correctAnswer')?.set(item.correctAnswer);
        row.stringProperty('explanation')?.set(item.explanation);
        await review.addInstanceAsync(row);
      }
      if (cancelled) return;
      rows.current = newRows;
      setMountedKey(listsKey);
    })().catch((e) => logger.error('[QuizRiveView] montando listas', e));

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [riveFile, instance, listsKey]);

  // --- estado de cada alternativa (atualiza ao vivo)
  useEffect(() => {
    vm.options.forEach((o, i) => {
      const row = rows.current[i];
      if (!row || row.state === o.state) return;
      row.inst.enumProperty('state')?.set(o.state);
      row.state = o.state;
    });
  }, [vm.options, mountedKey]);

  return (
    <View style={styles.root}>
      {riveFile && instance && mountedKey === listsKey ? (
        <RiveView
          key={listsKey}
          file={riveFile}
          dataBind={instance}
          fit={Fit.Layout}
          autoPlay
          semantics={Semantics.Automatic}
          style={StyleSheet.absoluteFill}
          onError={(e) => logger.error('[QuizRiveView] RiveView', e)}
        />
      ) : null}
      {QUIZ_RIVE_DEBUG ? (
        <Text style={styles.debug} pointerEvents="none">
          {`rive dbg · fase ${vm.phase} · montagens ${debug.mounts} · ${debug.last || 'nenhum trigger'}`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Mesma cor do topo do fundo da cena: a remontagem entre perguntas não pisca branco.
  root: { flex: 1, backgroundColor: '#F4FAFF' },
  debug: {
    position: 'absolute',
    top: 56,
    left: 8,
    right: 8,
    fontSize: 10,
    color: '#B00020',
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 2,
  },
});
