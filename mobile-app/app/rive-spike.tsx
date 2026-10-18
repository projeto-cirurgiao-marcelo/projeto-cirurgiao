/**
 * Fase 0 do quiz em Rive — tela de viabilidade, fora do fluxo do app.
 * Abrir com: projetocirurgiao://rive-spike
 *
 * Prova: lista de alternativas vinda do app, toque voltando pro app,
 * texto longo em pt-BR, leitor de tela. Apagar quando o quiz Rive entrar.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Fit,
  RiveView,
  Semantics,
  useRiveFile,
  useViewModelInstance,
  type ViewModelInstance,
} from '@rive-app/react-native';

const QUESTIONS = [
  {
    question:
      'Qual fio é mais indicado para a sutura intradérmica após uma orquiectomia em cão?',
    options: [
      'Poliglecaprone 25 (absorvível monofilamentar)',
      'Seda',
      'Nylon multifilamentar, com nós externos e retirada dos pontos em 10 a 14 dias após o procedimento',
      'Aço',
      'Categute cromado',
    ],
    correct: 0,
  },
  {
    question: 'Tempo de jejum hídrico recomendado antes da anestesia em cães adultos saudáveis?',
    options: ['Nenhum', '2 horas', '12 horas'],
    correct: 1,
  },
];

const WHITE = 0xffffffff;
const GREEN = 0xffdcfce7;
const RED = 0xfffee2e2;

export default function RiveSpikeScreen() {
  const t0 = useRef(Date.now());
  const [log, setLog] = useState<string[]>([]);
  const [qIndex, setQIndex] = useState(0);
  // Monta o RiveView só depois da lista preenchida (teste: a lista não re-renderiza ao vivo).
  const [readyFor, setReadyFor] = useState(-1);
  const add = (line: string) =>
    setLog((l) => [`${((Date.now() - t0.current) / 1000).toFixed(2)}s ${line}`, ...l].slice(0, 30));

  const { riveFile, error: fileError } = useRiveFile(require('../assets/rive/quiz-spike.riv'));
  const { instance, error: vmError } = useViewModelInstance(riveFile, { async: true });

  useEffect(() => {
    if (fileError) add(`ERRO arquivo: ${fileError.message}`);
    if (vmError) add(`ERRO view model: ${vmError.message}`);
  }, [fileError, vmError]);

  // Preenche a pergunta atual a partir do app (substitui o conteúdo de exemplo do .riv).
  useEffect(() => {
    if (!riveFile || !instance) return;
    const q = QUESTIONS[qIndex];
    const unsubs: (() => void)[] = [];
    let cancelled = false;

    setReadyFor(-1);
    (async () => {
      const started = Date.now();
      instance.stringProperty('header')?.set(`Pergunta ${qIndex + 1} de ${QUESTIONS.length} (vinda do app)`);
      instance.stringProperty('question')?.set(q.question);

      const list = instance.listProperty('options');
      const optionVM = await riveFile.viewModelByNameAsync('Option');
      if (!list || !optionVM) return add('ERRO: lista ou view model Option não encontrado');

      const lenBefore = await list.getLengthAsync();
      for (let n = lenBefore; n > 0; n--) await list.removeInstanceAtAsync(0);
      add(`lista: ${lenBefore} itens antes, ${await list.getLengthAsync()} depois de limpar`);

      const rows: ViewModelInstance[] = [];
      for (let i = 0; i < q.options.length; i++) {
        const row = await optionVM.createDefaultInstanceAsync();
        if (!row || cancelled) return;
        row.stringProperty('text')?.set(q.options[i]);
        row.colorProperty('fill')?.set(WHITE);
        const tap = row.triggerProperty('tap');
        if (tap) {
          unsubs.push(
            tap.addListener(() => {
              const ok = i === q.correct;
              rows.forEach((r) => r.colorProperty('fill')?.set(WHITE));
              row.colorProperty('fill')?.set(ok ? GREEN : RED);
              add(`toque na alternativa ${i + 1} → ${ok ? 'CERTA' : 'errada'}`);
            }),
          );
        }
        rows.push(row);
        await list.addInstanceAsync(row);
      }
      add(
        `pergunta ${qIndex + 1} montada: ${q.options.length} alternativas em ${Date.now() - started}ms; lista tem ${await list.getLengthAsync()}`,
      );
      if (!cancelled) setReadyFor(qIndex);
    })().catch((e) => add(`ERRO montando: ${e?.message ?? e}`));

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [riveFile, instance, qIndex]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.rive}>
        {riveFile && instance && readyFor === qIndex ? (
          <RiveView
            key={qIndex}
            file={riveFile}
            dataBind={instance}
            fit={Fit.Layout}
            autoPlay
            semantics={Semantics.Automatic}
            style={StyleSheet.absoluteFill}
            onError={(e) => add(`ERRO RiveView: ${e.message}`)}
          />
        ) : (
          <Text style={styles.loading}>Carregando .riv…</Text>
        )}
      </View>
      <View style={styles.panel}>
        <Pressable
          style={styles.next}
          onPress={() => setQIndex((i) => (i + 1) % QUESTIONS.length)}
          accessibilityRole="button"
        >
          <Text style={styles.nextText}>Trocar pergunta (testa lista com 3 e 5 itens)</Text>
        </Pressable>
        <ScrollView>
          {log.map((l, i) => (
            <Text key={i} style={styles.log}>
              {l}
            </Text>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FA' },
  rive: { flex: 1 },
  loading: { margin: 20, color: '#64748B' },
  panel: { height: 170, borderTopWidth: 1, borderColor: '#CBD5E1', padding: 8, backgroundColor: '#0F172A' },
  next: { backgroundColor: '#1E6FD9', borderRadius: 8, padding: 10, marginBottom: 6 },
  nextText: { color: 'white', textAlign: 'center', fontWeight: '600' },
  log: { color: '#E2E8F0', fontFamily: 'monospace', fontSize: 11 },
});
