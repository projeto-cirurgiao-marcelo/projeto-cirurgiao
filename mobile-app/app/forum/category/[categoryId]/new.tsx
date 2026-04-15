/**
 * Criar novo tópico no fórum
 * Formulário com título, conteúdo e seletor de categoria
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ForumCategory } from '../../../../src/types';
import { forumService } from '../../../../src/services/api/forum.service';
import { forumCategoriesService } from '../../../../src/services/api/forum-categories.service';
import { getErrorMessage } from '../../../../src/services/api/client';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../../../src/constants/colors';

const MAX_TITLE_LENGTH = 200;

export default function NewTopicScreen() {
  const { categoryId: initialCategoryId } = useLocalSearchParams<{ categoryId: string }>();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);
  const [contentFocused, setContentFocused] = useState(false);

  // Categoria selecionada
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId || '');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const isValid =
    title.trim().length >= 5 &&
    content.trim().length >= 10 &&
    selectedCategoryId.length > 0;

  // Carregar categorias ao montar
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const data = await forumCategoriesService.getAll();
      setCategories(data);
      // Se o initialCategoryId não está na lista, selecionar a primeira
      if (initialCategoryId && data.some((c) => c.id === initialCategoryId)) {
        setSelectedCategoryId(initialCategoryId);
      } else if (data.length > 0) {
        setSelectedCategoryId(data[0].id);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as categorias.');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const topic = await forumService.createTopic({
        title: title.trim(),
        content: content.trim(),
        categoryId: selectedCategoryId,
      });
      router.replace(`/forum/topic/${topic.id}` as any);
    } catch (err) {
      const message = getErrorMessage(err);
      Alert.alert('Erro', message || 'Não foi possível criar o tópico.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectCategory = (category: ForumCategory) => {
    setSelectedCategoryId(category.id);
    setShowCategoryPicker(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="close" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Tópico</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
          style={[
            styles.submitButton,
            (!isValid || isSubmitting) && styles.submitButtonDisabled,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.submitText}>Publicar</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Dicas */}
          <View style={styles.tips}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={Colors.accent}
            />
            <Text style={styles.tipsText}>
              Seja claro no título. Descreva sua dúvida com detalhes para
              receber melhores respostas.
            </Text>
          </View>

          {/* Seletor de categoria */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categoria</Text>
            {isLoadingCategories ? (
              <View style={[styles.categorySelector, styles.categorySelectorLoading]}>
                <ActivityIndicator size="small" color={Colors.accent} />
                <Text style={styles.categorySelectorPlaceholder}>
                  Carregando categorias...
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.categorySelector,
                  showCategoryPicker && styles.inputFocused,
                ]}
                onPress={() => setShowCategoryPicker(true)}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <View style={styles.categorySelectorIcon}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={16}
                    color={Colors.accent}
                  />
                </View>
                <Text
                  style={[
                    styles.categorySelectorText,
                    !selectedCategory && styles.categorySelectorPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedCategory?.name || 'Selecione uma categoria'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Título */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Título</Text>
            <TextInput
              style={[
                styles.input,
                titleFocused && styles.inputFocused,
              ]}
              placeholder="Ex: Como realizar sutura intradérmica em gatos?"
              placeholderTextColor={Colors.inputPlaceholder}
              value={title}
              onChangeText={(text) =>
                text.length <= MAX_TITLE_LENGTH && setTitle(text)
              }
              maxLength={MAX_TITLE_LENGTH}
              autoCapitalize="sentences"
              editable={!isSubmitting}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
            />
            <Text style={styles.charCount}>
              {title.length}/{MAX_TITLE_LENGTH}
            </Text>
          </View>

          {/* Conteúdo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[
                styles.textArea,
                contentFocused && styles.inputFocused,
              ]}
              placeholder="Descreva sua dúvida ou contribuição com o máximo de detalhes possível..."
              placeholderTextColor={Colors.inputPlaceholder}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              autoCapitalize="sentences"
              editable={!isSubmitting}
              onFocus={() => setContentFocused(true)}
              onBlur={() => setContentFocused(false)}
            />
          </View>

          {/* Validação */}
          {(title.length > 0 || content.length > 0) && !isValid && (
            <View style={styles.validation}>
              {!selectedCategoryId && (
                <Text style={styles.validationText}>
                  {'\u2022'} Selecione uma categoria
                </Text>
              )}
              {title.trim().length < 5 && (
                <Text style={styles.validationText}>
                  {'\u2022'} Título deve ter pelo menos 5 caracteres
                </Text>
              )}
              {content.trim().length < 10 && (
                <Text style={styles.validationText}>
                  {'\u2022'} Descrição deve ter pelo menos 10 caracteres
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de seleção de categoria */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Selecione a categoria</Text>

            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedCategoryId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      isSelected && styles.modalItemSelected,
                    ]}
                    onPress={() => handleSelectCategory(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalItemIcon}>
                      <Ionicons
                        name="chatbubbles-outline"
                        size={18}
                        color={isSelected ? Colors.accent : Colors.textSecondary}
                      />
                    </View>
                    <View style={styles.modalItemContent}>
                      <Text
                        style={[
                          styles.modalItemName,
                          isSelected && styles.modalItemNameSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      {item.description ? (
                        <Text style={styles.modalItemDesc} numberOfLines={1}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={Colors.accent}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  submitButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius['2xl'],
    minWidth: 80,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  form: {
    padding: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  tips: {
    flexDirection: 'row',
    backgroundColor: Colors.accentSoft,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  tipsText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.accent,
    lineHeight: FontSize.sm * 1.5,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.inputText,
    minHeight: 48,
  },
  textArea: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.inputText,
    minHeight: 160,
    lineHeight: FontSize.md * 1.5,
  },
  inputFocused: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  validation: {
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  validationText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
  },

  // ---- Seletor de categoria ----
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
    gap: Spacing.sm,
  },
  categorySelectorLoading: {
    justifyContent: 'center',
  },
  categorySelectorIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySelectorText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.inputText,
  },
  categorySelectorPlaceholder: {
    color: Colors.inputPlaceholder,
  },

  // ---- Modal de categoria ----
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '60%',
    paddingBottom: Spacing['3xl'],
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  modalList: {
    paddingHorizontal: Spacing.lg,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  modalItemSelected: {
    backgroundColor: Colors.accentSoft,
  },
  modalItemIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  modalItemNameSelected: {
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  modalItemDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
