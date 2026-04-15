import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { profileService, UserProfile } from '../../src/services/api/profile.service';
import useAuthStore from '../../src/stores/auth-store';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../src/constants/colors';

const SPECIALIZATIONS_OPTIONS = [
  'Cirurgia Geral',
  'Ortopedia',
  'Neurologia',
  'Anestesiologia',
  'Oftalmologia',
  'Dermatologia',
  'Cardiologia',
  'Oncologia',
  'Odontologia Veterinária',
  'Emergência e Terapia Intensiva',
  'Diagnóstico por Imagem',
  'Medicina de Felinos',
  'Medicina de Equinos',
  'Animais Silvestres',
  'Reprodução Animal',
  'Nutrição Animal',
  'Patologia Clínica',
  'Fisioterapia e Reabilitação',
];

export default function EditProfileScreen() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await profileService.getProfile();
      setName(profile.name || '');
      setProfession(profile.profession || '');
      setBio(profile.bio || '');
      setState(profile.state || '');
      setCity(profile.city || '');
      setSpecializations(profile.specializations || []);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      Alert.alert('Erro', 'Não foi possível carregar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialization = (spec: string) => {
    setSpecializations((prev) =>
      prev.includes(spec)
        ? prev.filter((s) => s !== spec)
        : [...prev, spec]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'O nome é obrigatório.');
      return;
    }

    try {
      setSaving(true);
      const updated = await profileService.updateProfile({
        name: name.trim(),
        profession: profession.trim() || undefined,
        bio: bio.trim() || undefined,
        state: state.trim() || undefined,
        city: city.trim() || undefined,
        specializations,
      });

      // Atualizar o user no auth store
      if (user && updated.name !== user.name) {
        setUser({ ...user, name: updated.name });
      }

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveHeaderButton}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Text style={styles.saveHeaderText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Nome */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nome completo *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Profissão */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Profissão</Text>
            <TextInput
              style={styles.input}
              value={profession}
              onChangeText={setProfession}
              placeholder="Ex: Médico Veterinário"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Bio */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Sobre você</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Conte um pouco sobre você..."
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
              numberOfLines={4}
            />
          </View>

          {/* Localização */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Localização</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.inputHalf]}
                value={state}
                onChangeText={setState}
                placeholder="Estado (UF)"
                placeholderTextColor={Colors.textMuted}
                maxLength={2}
                autoCapitalize="characters"
              />
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={city}
                onChangeText={setCity}
                placeholder="Cidade"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          {/* Especializações */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Especializações</Text>
            <Text style={styles.sublabel}>
              Selecione suas áreas de interesse
            </Text>
            <View style={styles.chipContainer}>
              {SPECIALIZATIONS_OPTIONS.map((spec) => {
                const selected = specializations.includes(spec);
                return (
                  <TouchableOpacity
                    key={spec}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleSpecialization(spec)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {spec}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  saveHeaderButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  saveHeaderText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  fieldGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sublabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  inputHalf: {
    width: 80,
  },
  inputFlex: {
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  chipSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: FontWeight.medium,
  },
});
