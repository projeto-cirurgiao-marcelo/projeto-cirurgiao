/**
 * Formulário do relato. Obrigatórios: nome, CRMV e a atribuição (sem
 * limite). O rascunho já existe no backend; cada mudança é salva com
 * debounce, então fechar o app não perde texto.
 */
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../../src/constants/colors';
import {
  livesSavedService,
  MEDIA_LIMITS,
  SPECIES_LABEL,
  type AnimalSpecies,
  type LifeSavedImpact,
  type MediaKind,
  type ReportInput,
  type Story,
} from '../../../src/services/api/lives-saved.service';
import { useLivesSavedStore } from '../../../src/stores/lives-saved-store';
import { logger } from '../../../src/lib/logger';

const QUESTION = 'Por que você atribui essa vida salva a algo que aprendeu no Projeto Cirurgião?';

type Form = {
  reporterName: string;
  reporterCrmv: string;
  reporterTitle: string;
  attribution: string;
  species?: AnimalSpecies;
  speciesOther: string;
  animalName: string;
  occurredAt: string;
  procedureSummary: string;
  impactType?: LifeSavedImpact;
  consentPublicStory: boolean;
  consentShowName: boolean;
};

function fromStory(s: Story): Form {
  return {
    reporterName: s.reporterDisplay,
    reporterCrmv: s.reporterCrmv ?? '',
    reporterTitle: s.reporterTitle ?? '',
    attribution: s.attribution ?? '',
    species: s.species ?? undefined,
    speciesOther: s.speciesOther ?? '',
    animalName: s.animalName ?? '',
    occurredAt: s.occurredAt ? s.occurredAt.slice(0, 10) : '',
    procedureSummary: s.procedureSummary ?? '',
    impactType: s.impactType ?? undefined,
    consentPublicStory: s.consentPublicStory,
    consentShowName: s.consentShowName,
  };
}

export default function EditReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const refreshSummary = useLivesSavedStore((s) => s.refresh);
  const [story, setStory] = useState<Story | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef<Partial<Form>>({});

  useEffect(() => {
    livesSavedService
      .story(id)
      .then((s) => { setStory(s); setForm(fromStory(s)); })
      .catch((err) => {
        logger.error('[livesSaved] abrir rascunho falhou', err);
        Alert.alert('Não foi possível abrir o relato');
        router.back();
      });
  }, [id]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    dirty.current[key] = value;
    setSaving('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  }

  async function flush(): Promise<boolean> {
    const patch = dirty.current;
    dirty.current = {};
    if (Object.keys(patch).length === 0) { setSaving('saved'); return true; }
    const body: ReportInput = {};
    for (const [k, v] of Object.entries(patch)) {
      (body as Record<string, unknown>)[k] = typeof v === 'string' && v.trim() === '' && k !== 'attribution' ? undefined : v;
    }
    try {
      await livesSavedService.update(id, body);
      setSaving('saved');
      return true;
    } catch (err) {
      logger.error('[livesSaved] autosave falhou', err);
      setSaving('error');
      return false;
    }
  }

  async function handleSubmit() {
    if (timer.current) clearTimeout(timer.current);
    setSubmitting(true);
    try {
      if (!(await flush())) { Alert.alert('Não foi possível salvar', 'Verifique a conexão e tente de novo.'); return; }
      await livesSavedService.submit(id);
      await refreshSummary();
      Alert.alert('Relato enviado', 'Ele entra no contador assim que a moderação aprovar.', [
        { text: 'OK', onPress: () => router.replace('/lives-saved') },
      ]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert('Não foi possível enviar', typeof msg === 'string' ? msg : 'Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete() {
    Alert.alert('Excluir relato?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await livesSavedService.remove(id);
            router.replace('/lives-saved');
          } catch {
            Alert.alert('Não foi possível excluir');
          }
        },
      },
    ]);
  }

  async function pick(kind: MediaKind) {
    if (!story) return;
    const current = story.media.filter((m) => m.kind === kind).length;
    const limit = MEDIA_LIMITS[kind];
    if (current >= limit.maxFiles) {
      Alert.alert(`Máximo de ${limit.maxFiles} ${kind === 'PHOTO' ? 'fotos' : 'vídeos'}`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Sem acesso à galeria', 'Libere o acesso nas configurações do aparelho.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'PHOTO' ? ['images'] : ['videos'],
      allowsMultipleSelection: true,
      selectionLimit: limit.maxFiles - current,
      quality: 0.9,
      exif: false,
    });
    if (res.canceled) return;
    setUploading(res.assets.length);
    for (const a of res.assets) {
      const mimeType = a.mimeType ?? (kind === 'PHOTO' ? 'image/jpeg' : 'video/mp4');
      const sizeBytes = a.fileSize ?? 0;
      if (sizeBytes > limit.maxBytes) {
        Alert.alert(`${a.fileName ?? 'Arquivo'} acima de ${Math.round(limit.maxBytes / 1048576)} MB`);
        setUploading((n) => n - 1);
        continue;
      }
      try {
        await livesSavedService.uploadMedia(id, { uri: a.uri, mimeType, sizeBytes: Math.max(1, sizeBytes) }, kind);
      } catch (err) {
        logger.error('[livesSaved] upload falhou', err);
        Alert.alert('Upload falhou', a.fileName ?? '');
      } finally {
        setUploading((n) => n - 1);
      }
    }
    try {
      setStory(await livesSavedService.story(id));
    } catch { /* lista fica como está */ }
  }

  async function removeMedia(mediaId: string) {
    try {
      await livesSavedService.removeMedia(id, mediaId);
      setStory((s) => (s ? { ...s, media: s.media.filter((m) => m.id !== mediaId) } : s));
    } catch {
      Alert.alert('Não foi possível remover');
    }
  }

  if (!form || !story) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator style={{ marginTop: Spacing['4xl'] }} color={Colors.accent} />
      </SafeAreaView>
    );
  }

  const canSubmit = !!(form.reporterName.trim() && form.reporterCrmv.trim() && form.attribution.trim()) && !submitting && uploading === 0;
  const words = form.attribution.trim() ? form.attribution.trim().split(/\s+/).length : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/lives-saved'))} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Relatar uma vida salva</Text>
        <Text style={styles.saveState}>
          {saving === 'saving' ? 'salvando…' : saving === 'saved' ? 'salvo' : saving === 'error' ? 'erro' : ''}
        </Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {story.status === 'REJECTED' && story.rejectionReason ? (
            <View style={styles.rejected}>
              <Text style={styles.rejectedLabel}>DEVOLVIDO PELA MODERAÇÃO</Text>
              <Text style={styles.bodyText}>{story.rejectionReason}</Text>
            </View>
          ) : null}

          <Section title="Quem relata">
            <Label required>Nome completo</Label>
            <TextInput style={styles.input} value={form.reporterName} onChangeText={(v) => set('reporterName', v)} placeholder="Seu nome" placeholderTextColor={Colors.textMuted} />
            <Label required hint="Ex.: CRMV-SP 12345">CRMV</Label>
            <TextInput style={styles.input} value={form.reporterCrmv} onChangeText={(v) => set('reporterCrmv', v)} autoCapitalize="characters" placeholder="CRMV-UF 00000" placeholderTextColor={Colors.textMuted} />
            <Label hint="opcional">Cargo ou função</Label>
            <TextInput style={styles.input} value={form.reporterTitle} onChangeText={(v) => set('reporterTitle', v)} placeholder="Ex.: Cirurgião veterinário" placeholderTextColor={Colors.textMuted} />
          </Section>

          <Section title={QUESTION} required>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={form.attribution}
              onChangeText={(v) => set('attribution', v)}
              multiline
              textAlignVertical="top"
              placeholder="Conte o caso com as suas palavras. Não há limite de tamanho."
              placeholderTextColor={Colors.textMuted}
            />
            {words > 0 && <Text style={styles.counter}>{words} palavras</Text>}
          </Section>

          <Section title="Sobre o caso" hint="opcional">
            <Label>Espécie</Label>
            <View style={styles.chips}>
              {(Object.keys(SPECIES_LABEL) as AnimalSpecies[]).map((k) => (
                <TouchableOpacity key={k} onPress={() => set('species', form.species === k ? undefined : k)} style={[styles.chip, form.species === k && styles.chipOn]}>
                  <Text style={[styles.chipText, form.species === k && styles.chipTextOn]}>{SPECIES_LABEL[k]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {form.species === 'OTHER' && (
              <TextInput style={styles.input} value={form.speciesOther} onChangeText={(v) => set('speciesOther', v)} placeholder="Qual espécie?" placeholderTextColor={Colors.textMuted} />
            )}
            <Label>Nome do animal</Label>
            <TextInput style={styles.input} value={form.animalName} onChangeText={(v) => set('animalName', v)} placeholderTextColor={Colors.textMuted} />
            <Label hint="AAAA-MM-DD">Data do caso</Label>
            <TextInput style={styles.input} value={form.occurredAt} onChangeText={(v) => set('occurredAt', v)} placeholder="2026-09-18" placeholderTextColor={Colors.textMuted} keyboardType="numbers-and-punctuation" />
            <Label hint="aparece nas listagens">Procedimento em uma linha</Label>
            <TextInput style={styles.input} value={form.procedureSummary} onChangeText={(v) => set('procedureSummary', v)} maxLength={160} placeholderTextColor={Colors.textMuted} />
            <Label>Contribuição do Projeto</Label>
            <View style={styles.chips}>
              {(['DIRECT', 'INDIRECT'] as LifeSavedImpact[]).map((k) => (
                <TouchableOpacity key={k} onPress={() => set('impactType', form.impactType === k ? undefined : k)} style={[styles.chip, form.impactType === k && styles.chipOn]}>
                  <Text style={[styles.chipText, form.impactType === k && styles.chipTextOn]}>{k === 'DIRECT' ? 'Direta' : 'Indireta'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>

          <Section title="Fotos e vídeos" hint="opcional">
            <View style={styles.row}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => pick('PHOTO')} disabled={uploading > 0}>
                <Ionicons name="image-outline" size={16} color={Colors.accentDark} />
                <Text style={styles.secondaryBtnText}>Fotos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => pick('VIDEO')} disabled={uploading > 0}>
                <Ionicons name="videocam-outline" size={16} color={Colors.accentDark} />
                <Text style={styles.secondaryBtnText}>Vídeos</Text>
              </TouchableOpacity>
              {uploading > 0 && (
                <View style={styles.row}>
                  <ActivityIndicator color={Colors.accent} />
                  <Text style={styles.hintText}>enviando {uploading}…</Text>
                </View>
              )}
            </View>
            <Text style={styles.hintText}>até {MEDIA_LIMITS.PHOTO.maxFiles} fotos de 15 MB e {MEDIA_LIMITS.VIDEO.maxFiles} vídeos de 500 MB</Text>
            {story.media.length > 0 && (
              <View style={styles.mediaGrid}>
                {story.media.map((m) => (
                  <View key={m.id} style={styles.mediaItem}>
                    {m.kind === 'PHOTO' ? (
                      <Image source={{ uri: m.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, styles.videoPh]}><Ionicons name="play" size={22} color={Colors.white} /></View>
                    )}
                    <TouchableOpacity style={styles.mediaRemove} onPress={() => removeMedia(m.id)} accessibilityLabel="Remover">
                      <Ionicons name="close" size={14} color={Colors.text} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Section>

          <Section title="Exibição">
            <View style={styles.switchRow}>
              <Switch value={form.consentPublicStory} onValueChange={(v) => set('consentPublicStory', v)} trackColor={{ true: Colors.accent }} />
              <Text style={styles.switchText}>
                Autorizo que este relato apareça como história no mural e na tela do Projeto Cirurgião.
                <Text style={styles.hintText}> Sem marcar, ele conta no número mas fica visível só pra mim.</Text>
              </Text>
            </View>
            <View style={styles.switchRow}>
              <Switch value={form.consentShowName} onValueChange={(v) => set('consentShowName', v)} trackColor={{ true: Colors.accent }} />
              <Text style={styles.switchText}>
                Autorizo exibir meu nome, cargo e CRMV junto ao relato.
                <Text style={styles.hintText}> Sem marcar, aparece como “Médico(a) veterinário(a)”.</Text>
              </Text>
            </View>
          </Section>

          <TouchableOpacity style={[styles.primaryBtn, !canSubmit && styles.primaryBtnOff]} onPress={handleSubmit} disabled={!canSubmit}>
            {submitting ? <ActivityIndicator color={Colors.white} /> : (
              <Text style={styles.primaryBtnText}>{story.status === 'REJECTED' ? 'Reenviar para moderação' : 'Enviar para moderação'}</Text>
            )}
          </TouchableOpacity>
          <Text style={[styles.hintText, { textAlign: 'center' }]}>Nome, CRMV e sua explicação são obrigatórios. O relato entra no contador após a aprovação.</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>Excluir rascunho</Text>
          </TouchableOpacity>
          <View style={{ height: Spacing['5xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, hint, required, children }: { title: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>
          {title}
          {required ? <Text style={{ color: Colors.danger }}> *</Text> : null}
        </Text>
        {hint ? <Text style={styles.hintText}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Label({ children, hint, required }: { children: string; hint?: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {children}
      {required ? <Text style={{ color: Colors.danger }}> *</Text> : null}
      {hint ? <Text style={styles.hintText}> · {hint}</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text },
  saveState: { width: 64, textAlign: 'right', fontSize: FontSize.xs, color: Colors.textMuted },
  content: { padding: Spacing['2xl'], gap: Spacing.lg },
  section: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, gap: Spacing.sm,
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.xs },
  sectionTitle: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text, lineHeight: FontSize.base * 1.3 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary, marginTop: Spacing.xs },
  hintText: { fontSize: FontSize.xs, color: Colors.textMuted },
  input: {
    backgroundColor: Colors.inputBackground, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, fontSize: FontSize.md, color: Colors.inputText,
  },
  textarea: { minHeight: 200, fontSize: FontSize.base, lineHeight: FontSize.base * 1.5 },
  counter: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  chipOn: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  chipTextOn: { color: Colors.accentDark },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.accent, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  secondaryBtnText: { color: Colors.accentDark, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  mediaItem: { width: '31%', aspectRatio: 1, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.accentSoft },
  videoPh: { backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  mediaRemove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  switchText: { flex: 1, fontSize: FontSize.md, color: Colors.text, lineHeight: FontSize.md * 1.45 },
  rejected: { borderWidth: 1, borderColor: Colors.warning, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.xs, backgroundColor: Colors.warningLight },
  rejectedLabel: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.semibold, letterSpacing: 0.6 },
  bodyText: { fontSize: FontSize.md, color: Colors.text, lineHeight: FontSize.md * 1.45 },
  primaryBtn: { backgroundColor: Colors.accent, borderRadius: BorderRadius.lg, paddingVertical: Spacing.lg, alignItems: 'center' },
  primaryBtnOff: { opacity: 0.5 },
  primaryBtnText: { color: Colors.white, fontWeight: FontWeight.semibold, fontSize: FontSize.base },
  deleteBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  deleteText: { color: Colors.danger, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
});
