import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
} from '../../src/constants/colors';

// LayoutAnimation funciona nativamente na Nova Arquitetura (newArchEnabled);
// o antigo UIManager.setLayoutAnimationEnabledExperimental virou no-op e só
// gerava warning no dev client.

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'Conta e Acesso',
    question: 'Como faço para criar uma conta?',
    answer: 'O acesso ao Projeto Cirurgião é por convite. Use as credenciais da sua conta para entrar. Se precisar de ajuda com sua conta, entre em contato com o suporte em Ajuda e Suporte.',
  },
  {
    category: 'Conta e Acesso',
    question: 'Esqueci minha senha, como recuperar?',
    answer: 'Na tela de login, toque em "Esqueci minha senha". Informe seu email cadastrado e enviaremos um link para redefinição. Verifique também a pasta de spam.',
  },
  {
    category: 'Conta e Acesso',
    question: 'Posso usar a mesma conta no app e no site?',
    answer: 'Sim! Sua conta é única e funciona tanto no aplicativo mobile quanto na versão web. Seu progresso é sincronizado automaticamente entre as plataformas.',
  },
  {
    category: 'Conta e Acesso',
    question: 'Como excluir minha conta?',
    answer: 'Em Perfil, toque em "Excluir minha conta" no fim da tela e confirme. Seus dados de cadastro são anonimizados na hora e o acesso é encerrado em todos os dispositivos. A exclusão é permanente. Também é possível pedir pelo site, em Perfil, ou por e-mail para contato@projetocirurgiao.app.',
  },
  {
    category: 'Cursos e Aulas',
    question: 'Quais aulas posso assistir?',
    answer: 'Você pode assistir às aulas liberadas para sua conta. Outros conteúdos podem exibir apenas uma prévia. Iniciar um curso não libera automaticamente todas as aulas. Se uma aula que já faz parte do seu acesso estiver indisponível, entre em contato com o suporte em Ajuda e Suporte.',
  },
  {
    category: 'Cursos e Aulas',
    question: 'Meu progresso é salvo automaticamente?',
    answer: 'Sim! O app salva seu progresso automaticamente a cada 10 segundos enquanto você assiste uma aula. Ao retornar, o vídeo continuará de onde você parou.',
  },
  {
    category: 'Cursos e Aulas',
    question: 'O que é o Quiz de cada aula?',
    answer: 'Cada aula pode ter um quiz gerado por inteligência artificial baseado no conteúdo do vídeo. O quiz é uma forma de testar seus conhecimentos e cada tentativa gera perguntas diferentes, garantindo um aprendizado contínuo.',
  },
  {
    category: 'Cursos e Aulas',
    question: 'Como funcionam os resumos por IA?',
    answer: 'Na aba "Resumo" de cada aula, a IA analisa a transcrição do vídeo e gera um resumo em formato de texto. Você pode gerar até 3 versões diferentes do resumo para cada aula.',
  },
  {
    category: 'Fórum',
    question: 'Como faço uma pergunta no fórum?',
    answer: 'Acesse a aba "Fórum", escolha a categoria adequada e toque em "Novo Tópico". Descreva sua dúvida detalhadamente para receber respostas mais precisas dos colegas e instrutores.',
  },
  {
    category: 'Fórum',
    question: 'Posso vincular minha pergunta a uma aula?',
    answer: 'Sim! Ao criar um tópico, você pode selecionar o curso e vídeo relacionados. Isso ajuda outros alunos a encontrarem dúvidas semelhantes.',
  },
  {
    category: 'Mentor IA',
    question: 'O que é o Mentor IA?',
    answer: 'O Mentor IA é um assistente inteligente que pode responder dúvidas sobre o conteúdo das aulas. Ele utiliza as transcrições dos vídeos para fornecer respostas contextualizadas e referenciadas.',
  },
  {
    category: 'Técnico',
    question: 'O app funciona offline?',
    answer: 'É necessária conexão com a internet para assistir aulas e acessar os recursos. O app não oferece download de vídeos para assistir offline.',
  },
  {
    category: 'Técnico',
    question: 'Qual a versão mínima do Android/iOS?',
    answer: 'O aplicativo requer Android 7.0 (API 24) ou superior, ou iOS 15.1 ou superior.',
  },
];

const CATEGORIES = [...new Set(FAQ_DATA.map((f) => f.category))];

export default function FAQScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const toggleItem = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const filteredFAQ = selectedCategory
    ? FAQ_DATA.filter((f) => f.category === selectedCategory)
    : FAQ_DATA;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/help')}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perguntas Frequentes</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Category filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQ items */}
        {filteredFAQ.map((item, index) => {
          const globalIndex = FAQ_DATA.indexOf(item);
          const isExpanded = expandedIndex === globalIndex;
          return (
            <TouchableOpacity
              key={globalIndex}
              style={styles.faqItem}
              onPress={() => toggleItem(globalIndex)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.textMuted}
                />
              </View>
              {isExpanded && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  categoryList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    paddingRight: Spacing.lg,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  categoryChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  faqItem: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
    lineHeight: FontSize.md * 1.4,
  },
  faqAnswer: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.6,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
