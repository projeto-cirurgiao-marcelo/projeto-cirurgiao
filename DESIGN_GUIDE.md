# Guia de Design - Projeto Cirurgião
## Plataforma Educacional de Medicina Veterinária

**Versão:** 1.0
**Data:** 06 de Janeiro de 2026
**Inspiração:** Plataforma Coursera
**Objetivo:** Transformar o Projeto Cirurgião em uma plataforma de aprendizado gamificada, moderna e engajadora

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura de Informação](#arquitetura-de-informação)
3. [Sistema de Design](#sistema-de-design)
4. [Componentes de Interface](#componentes-de-interface)
5. [Layouts por Página](#layouts-por-página)
6. [Sistema de Gamificação](#sistema-de-gamificação)
7. [UX e Padrões de Interação](#ux-e-padrões-de-interação)
8. [Responsividade](#responsividade)
9. [Acessibilidade](#acessibilidade)
10. [Roadmap de Implementação](#roadmap-de-implementação)

---

## 🎯 Visão Geral

### Objetivo do Redesign

Transformar o atual sistema de cursos em uma plataforma de aprendizado imersiva que:
- **Motiva** através de gamificação (badges, pontos, streaks)
- **Engaja** com interface moderna inspirada na Coursera
- **Facilita** o acompanhamento de progresso visual
- **Incentiva** o estudo dedicado com recompensas tangíveis

### Princípios de Design

1. **Clareza antes de Estética** - Informação sempre acessível
2. **Feedback Imediato** - Cada ação gera resposta visual
3. **Progressão Visível** - O aluno sempre sabe onde está
4. **Mobile-First** - Funcionalidade plena em dispositivos móveis
5. **Acessível por Padrão** - WCAG 2.1 AA compliance

---

## 🏗️ Arquitetura de Informação

### Estrutura de Navegação

```
Projeto Cirurgião
│
├── 🏠 Home (Landing Page)
│   ├── Hero Section com CTA
│   ├── Cursos em Destaque
│   ├── Como Funciona
│   ├── Depoimentos
│   └── Footer
│
├── 📚 Catálogo de Cursos
│   ├── Filtros (Categoria, Nível, Duração)
│   ├── Grid de Cursos
│   └── Barra de Busca
│
├── 📖 Página do Curso
│   ├── Header (Título, Instrutor, Rating)
│   ├── Preview do Vídeo
│   ├── Sobre o Curso
│   ├── Conteúdo Programático
│   ├── Instrutor
│   ├── Avaliações
│   └── CTA de Matrícula
│
├── 🎓 Meu Aprendizado (Dashboard do Aluno)
│   ├── Cursos em Andamento
│   ├── Próximas Aulas
│   ├── Estatísticas (Tempo estudado, Streak, Nível)
│   ├── Conquistas Recentes
│   ├── Progresso por Curso
│   └── Certificados
│
├── 🎬 Player de Vídeo
│   ├── Video Player (Cloudflare Stream)
│   ├── Sidebar - Conteúdo do Curso
│   ├── Controles de Velocidade
│   ├── Notas/Anotações
│   ├── Transcrição
│   ├── Recursos (PDFs, Links)
│   └── Navegação Anterior/Próximo
│
├── 🏆 Perfil & Conquistas
│   ├── Informações do Usuário
│   ├── Badges e Conquistas
│   ├── Streak Counter
│   ├── Nível e XP
│   ├── Estatísticas Gerais
│   └── Certificados Conquistados
│
├── 📊 Admin Panel (para Instrutores)
│   ├── Dashboard de Cursos
│   ├── Gerenciamento de Módulos
│   ├── Upload de Vídeos
│   ├── Análise de Engajamento
│   └── Gerenciamento de Alunos
│
└── ⚙️ Configurações
    ├── Perfil
    ├── Notificações
    ├── Preferências
    └── Segurança
```

---

## 🎨 Sistema de Design

### Paleta de Cores

#### Cores Primárias

```css
/* Primary - Azul Médico (Inspirado em Coursera) */
--primary-50: #E3F2FD;
--primary-100: #BBDEFB;
--primary-200: #90CAF9;
--primary-300: #64B5F6;
--primary-400: #42A5F5;
--primary-500: #2196F3;  /* Principal */
--primary-600: #1E88E5;
--primary-700: #1976D2;
--primary-800: #1565C0;
--primary-900: #0D47A1;

/* Accent - Verde Sucesso (para gamificação) */
--accent-50: #E8F5E9;
--accent-100: #C8E6C9;
--accent-200: #A5D6A7;
--accent-300: #81C784;
--accent-400: #66BB6A;
--accent-500: #4CAF50;  /* Conquistas */
--accent-600: #43A047;
--accent-700: #388E3C;
--accent-800: #2E7D32;
--accent-900: #1B5E20;

/* Secondary - Laranja Energia */
--secondary-50: #FFF3E0;
--secondary-100: #FFE0B2;
--secondary-200: #FFCC80;
--secondary-300: #FFB74D;
--secondary-400: #FFA726;
--secondary-500: #FF9800;  /* Streak/Motivação */
--secondary-600: #FB8C00;
--secondary-700: #F57C00;
--secondary-800: #EF6C00;
--secondary-900: #E65100;
```

#### Cores Neutras (Background e Texto)

```css
/* Modo Claro (padrão) */
--bg-primary: #FFFFFF;
--bg-secondary: #F5F7FA;
--bg-tertiary: #E8ECF0;

--text-primary: #1A1A1A;
--text-secondary: #525252;
--text-tertiary: #737373;
--text-disabled: #A3A3A3;

/* Modo Escuro (opcional) */
--dark-bg-primary: #0F172A;
--dark-bg-secondary: #1E293B;
--dark-bg-tertiary: #334155;

--dark-text-primary: #F8FAFC;
--dark-text-secondary: #CBD5E1;
--dark-text-tertiary: #94A3B8;
```

#### Cores Funcionais

```css
/* Status Colors */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;

/* Progresso */
--progress-empty: #E5E7EB;
--progress-partial: #FCD34D;
--progress-complete: #10B981;

/* Gamificação */
--gold: #F59E0B;
--silver: #94A3B8;
--bronze: #CD7F32;
--platinum: #E5E4E2;
```

### Tipografia

#### Fontes

```css
/* Primary Font - Inter (moderna, legível, variável) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Secondary Font - Manrope (títulos alternativos) */
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&display=swap');

/* Monospace - JetBrains Mono (código) */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
```

#### Escala Tipográfica

```css
/* Display (Hero Sections) */
--display-1: 3.5rem;    /* 56px */
--display-2: 3rem;      /* 48px */
--display-3: 2.5rem;    /* 40px */

/* Headings */
--h1: 2rem;             /* 32px */
--h2: 1.75rem;          /* 28px */
--h3: 1.5rem;           /* 24px */
--h4: 1.25rem;          /* 20px */
--h5: 1.125rem;         /* 18px */
--h6: 1rem;             /* 16px */

/* Body */
--body-lg: 1.125rem;    /* 18px */
--body-base: 1rem;      /* 16px */
--body-sm: 0.875rem;    /* 14px */
--body-xs: 0.75rem;     /* 12px */

/* Line Heights */
--leading-tight: 1.2;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

#### Pesos de Fonte

```css
--font-light: 300;
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

### Espaçamento

#### Sistema de 8pt Grid

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### Elevação (Sombras)

```css
/* Shadows */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

/* Glow Effects (gamificação) */
--glow-success: 0 0 20px rgba(76, 175, 80, 0.4);
--glow-primary: 0 0 20px rgba(33, 150, 243, 0.4);
--glow-gold: 0 0 25px rgba(245, 158, 11, 0.5);
```

### Border Radius

```css
--radius-sm: 0.25rem;   /* 4px */
--radius-base: 0.5rem;  /* 8px */
--radius-md: 0.75rem;   /* 12px */
--radius-lg: 1rem;      /* 16px */
--radius-xl: 1.5rem;    /* 24px */
--radius-full: 9999px;  /* Circular */
```

### Transições

```css
/* Durações */
--duration-fast: 150ms;
--duration-base: 200ms;
--duration-slow: 300ms;
--duration-slower: 500ms;

/* Easing */
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

---

## 🧩 Componentes de Interface

### 1. Cards de Curso

#### Card Padrão (Grid de Catálogo)

**Estrutura:**
```
┌─────────────────────────────────┐
│   [Thumbnail/Preview Image]     │
│                                 │ 280x160px
│  [Badge: Novo/Popular]          │
├─────────────────────────────────┤
│ Título do Curso                 │ H4, 2 linhas max
│ Dr. Nome do Instrutor           │ Body-sm
│                                 │
│ ⭐ 4.8 (1.2k avaliações)        │ Body-sm
│                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━ 65%    │ Progress bar
│                                 │
│ [Icon] 12 módulos • 45 aulas    │ Body-xs
│ [Icon] 8h de conteúdo           │ Body-xs
│                                 │
│        [Ver Curso →]            │ Button
└─────────────────────────────────┘
```

**Especificações:**
- **Tamanho:** 320px largura x auto altura
- **Hover:** Elevação de shadow-base para shadow-lg
- **Thumbnail:** Aspect ratio 16:9
- **Badge:** Posição absoluta no canto superior direito
- **Cores:** Background branco, border 1px cinza-200
- **Radius:** radius-lg (16px)

#### Card em Andamento (Dashboard)

**Estrutura:**
```
┌─────────────────────────────────────────────┐
│ [Thumbnail]  │  Cirurgia de Tecidos Moles   │ H5
│  120x90px    │  Dr. João Silva               │ Body-sm
│  [▶ Play]    │                               │
│              │  ━━━━━━━━━━━━━━━━━━━ 45%      │
│              │  Próxima: Módulo 3 - Aula 5   │ Body-xs
│              │  [Continuar →]                │ Button-sm
└─────────────────────────────────────────────┘
```

**Especificações:**
- **Layout:** Horizontal
- **Thumbnail:** Play icon overlay com opacity 0.9
- **Progress:** Altura 6px, cores baseadas em porcentagem
- **Call to Action:** Botão primário, width: 100%

### 2. Video Player

#### Layout Principal

**Estrutura Desktop:**
```
┌──────────────────────────────────────────┬──────────────┐
│                                          │              │
│                                          │  Conteúdo    │
│         Video Player                     │  do Curso    │
│         (16:9)                           │              │
│                                          │  ✓ Módulo 1  │
│                                          │    ▶ Aula 1  │
│                                          │    ○ Aula 2  │
├──────────────────────────────────────────┤  ✓ Módulo 2  │
│ [<< Anterior] Título da Aula [Próxima >>]│    ✓ Aula 3  │
│                                          │    ▶ Aula 4  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │              │
│ 15:30 / 45:00                            │              │
│                                          │  [Quiz]      │
│ [Tabs: Visão Geral | Transcrição |      │  [Recursos]  │
│        Anotações | Recursos]             │              │
│                                          │              │
│ [Conteúdo da Tab Ativa]                  │              │
│                                          │              │
└──────────────────────────────────────────┴──────────────┘
```

**Especificações:**
- **Player:** Cloudflare Stream embed, aspect ratio 16:9
- **Sidebar:** 320px fixa, scroll independente
- **Controles:** Custom UI sobre player nativo
- **Auto-save:** Progresso salvo a cada 10 segundos
- **Marcadores:** Visualização de capítulos na timeline

#### Sidebar de Conteúdo

**Item de Módulo:**
```
┌────────────────────────────────┐
│ ▼ Módulo 1: Fundamentos        │ H6, clickable
│   [Progress: ━━━━━━━━━━ 100%] │
│                                │
│   ✓ Aula 1: Introdução         │ Body-sm, verde
│      [Icon] 15min              │
│                                │
│   ▶ Aula 2: Anatomia           │ Body-sm, azul (ativa)
│      [Icon] 22min              │
│                                │
│   ○ Aula 3: Prática            │ Body-sm, cinza
│      [Icon] 30min • [Quiz]     │
│                                │
└────────────────────────────────┘
```

**Estados:**
- **Completado:** ✓ verde, texto strikethrough opcional
- **Em Progresso:** ▶ azul, background highlight
- **Não Iniciado:** ○ cinza
- **Com Quiz:** Badge "Quiz" após duração
- **Locked:** 🔒 ícone, cursor not-allowed

### 3. Badge de Conquista

**Tipos de Badge:**

#### 1. Badge Desbloqueado
```
┌──────────────┐
│   [🏆 Icon]  │ 64x64px, colorido
│              │
│ Primeira     │ H6, centralizado
│ Conquista    │
│              │
│ Completou    │ Body-xs, cinza
│ primeiro     │
│ curso        │
└──────────────┘
```

#### 2. Badge Bloqueado
```
┌──────────────┐
│   [🔒 Icon]  │ 64x64px, grayscale
│              │
│ ???          │ H6, cinza
│              │
│ Desbloqueie  │ Body-xs
│ completando  │
│ 5 cursos     │
└──────────────┘
```

**Especificações:**
- **Tamanho:** 140px x 180px
- **Hover (desbloqueado):** Glow effect, scale 1.05
- **Animation:** Fade-in + bounce ao desbloquear
- **Modal:** Click abre detalhes do badge

### 4. Botões

#### Primário
```css
background: var(--primary-500);
color: white;
padding: 12px 24px;
border-radius: var(--radius-base);
font-weight: var(--font-semibold);
transition: all var(--duration-base) var(--ease-out);

&:hover {
  background: var(--primary-600);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

&:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}
```

#### Secundário
```css
background: white;
color: var(--primary-500);
border: 2px solid var(--primary-500);
padding: 12px 24px;
border-radius: var(--radius-base);
```

#### Ghost
```css
background: transparent;
color: var(--primary-500);
padding: 12px 24px;
&:hover {
  background: var(--primary-50);
}
```

**Tamanhos:**
- **sm:** padding 8px 16px, text 14px
- **base:** padding 12px 24px, text 16px
- **lg:** padding 16px 32px, text 18px

### 5. Progress Bar

#### Linear Progress
```
┌─────────────────────────────────────┐
│ ████████████████░░░░░░░░░░░░░░░░░░ │ 45%
└─────────────────────────────────────┘
```

**Especificações:**
- **Altura:** 8px (base), 6px (sm), 12px (lg)
- **Cores:**
  - 0-33%: Laranja (#FF9800)
  - 34-66%: Amarelo (#FCD34D)
  - 67-100%: Verde (#10B981)
- **Animation:** Smooth transition 300ms
- **Background:** Cinza-200

#### Circular Progress (Dashboard)
```
     ┌───────┐
     │  75%  │
     │ ●●●●○ │  ← Círculo preenchido
     │       │
     └───────┘
```

**Especificações:**
- **Tamanho:** 120px diâmetro
- **Stroke:** 12px
- **Cores:** Gradiente primário
- **Animação:** Fade-in com contagem numérica

### 6. Notificações Toast

#### Success (Conquista desbloqueada)
```
┌──────────────────────────────────────┐
│ ✅ Nova Conquista Desbloqueada!      │
│                                      │
│ Você conquistou "Estudante Dedicado" │
│ +50 XP                               │
│                                      │
│ [Ver Conquista]  [×]                 │
└──────────────────────────────────────┘
```

**Especificações:**
- **Posição:** Top-right
- **Duração:** 5s (auto-dismiss)
- **Animation:** Slide-in from right + bounce
- **Ação:** Click abre modal de badge

#### Info (Progresso salvo)
```
┌──────────────────────────────────────┐
│ ℹ️ Progresso salvo automaticamente   │
└──────────────────────────────────────┘
```

**Duração:** 2s, sem ação

### 7. Formulários

#### Input Field
```
┌─────────────────────────────────────┐
│ Label                               │ Body-sm, semibold
│ ┌─────────────────────────────────┐ │
│ │ Placeholder text                │ │ Input
│ └─────────────────────────────────┘ │
│ Helper text / Error message         │ Body-xs
└─────────────────────────────────────┘
```

**Estados:**
- **Default:** Border cinza-300
- **Focus:** Border primário, glow effect
- **Error:** Border vermelho, texto erro em vermelho
- **Success:** Border verde (validação)
- **Disabled:** Background cinza-100, cursor not-allowed

#### Checkbox/Radio
```
☑ Label text    ← Checked
☐ Label text    ← Unchecked
```

**Especificações:**
- **Tamanho:** 20px x 20px
- **Checkmark:** Animação scale + fade
- **Cores:** Primário quando checked

---

## 📄 Layouts por Página

### 1. Landing Page (Home)

#### Seção Hero
```
┌────────────────────────────────────────────────────────┐
│                    [Logo]  [Menu]  [Entrar]            │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Domine a Cirurgia Veterinária                       │ Display-1
│   com os Melhores Especialistas                       │
│                                                        │
│   Aprenda técnicas avançadas através de vídeos        │ Body-lg
│   práticos e conteúdo exclusivo.                      │
│                                                        │
│   [Começar Agora] [Ver Cursos]                        │ Buttons
│                                                        │
│                              [Hero Image/Video]       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Especificações:**
- **Altura:** 100vh (primeira viewport)
- **Background:** Gradiente sutil azul-50 → branco
- **CTA Buttons:** Primário (Começar) + Secundário (Ver)
- **Hero Media:** Video loop ou imagem de alta qualidade

#### Seção Cursos em Destaque
```
┌────────────────────────────────────────────────────────┐
│   Cursos Mais Populares                     [Ver Todos →] │ H2
│                                                        │
│   [Card Curso 1]  [Card Curso 2]  [Card Curso 3]     │
│   [Card Curso 4]  [Card Curso 5]  [Card Curso 6]     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Layout:** Grid 3 colunas (desktop), 2 (tablet), 1 (mobile)

#### Seção Como Funciona
```
┌────────────────────────────────────────────────────────┐
│              Como Funciona                             │ H2
│                                                        │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐          │
│  │   [1]    │   │   [2]    │   │   [3]    │          │
│  │ Escolha  │ → │ Assista  │ → │ Pratique │          │
│  │          │   │          │   │          │          │
│  │ Selecione│   │ Aprenda  │   │ Aplique  │          │
│  │ seu curso│   │ no seu   │   │ e ganhe  │          │
│  │          │   │ ritmo    │   │ badges   │          │
│  └──────────┘   └──────────┘   └──────────┘          │
└────────────────────────────────────────────────────────┘
```

**Layout:** 3 cards horizontais com setas

#### Seção Estatísticas
```
┌────────────────────────────────────────────────────────┐
│   10.000+         500+           95%                   │
│   Alunos          Cursos         Satisfação            │ Display-2
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Background:** Azul-500, texto branco

### 2. Catálogo de Cursos

#### Layout Principal
```
┌────────────────────────────────────────────────────────┐
│ [Header com Navegação]                                 │
├────────────┬───────────────────────────────────────────┤
│            │   [Busca: Pesquisar cursos...]            │
│ Filtros    │                                           │
│            │   Mostrando 24 de 156 cursos              │
│ □ Iniciante│                                           │
│ □ Intermed.│   [Card] [Card] [Card] [Card]            │
│ □ Avançado │   [Card] [Card] [Card] [Card]            │
│            │   [Card] [Card] [Card] [Card]            │
│ Duração    │   [Card] [Card] [Card] [Card]            │
│ ○ < 5h     │                                           │
│ ○ 5-10h    │   [Carregar Mais]                         │
│ ○ > 10h    │                                           │
│            │                                           │
│ Área       │                                           │
│ □ Cirurgia │                                           │
│ □ Clínica  │                                           │
│            │                                           │
└────────────┴───────────────────────────────────────────┘
```

**Especificações:**
- **Sidebar Filtros:** 280px fixa, sticky
- **Grid:** 4 colunas (desktop), responsivo
- **Busca:** Debounce 300ms, autocomplete
- **Filtros:** Checkboxes com contador

### 3. Página do Curso

#### Header do Curso
```
┌────────────────────────────────────────────────────────┐
│ [Breadcrumb: Home > Cursos > Cirurgia de Tecidos Moles]│
│                                                        │
│ Cirurgia de Tecidos Moles Avançada                    │ H1
│ Dr. João Silva • Atualizado em Dez 2025              │ Body-sm
│                                                        │
│ ⭐ 4.9 (2.345 avaliações) • 12.456 alunos             │
│                                                        │
│ [Inscrever-se Agora - R$ 299] [♥ Salvar]             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### Preview e Conteúdo
```
┌────────────────────────┬──────────────────────────────┐
│                        │ [Card de Inscrição]          │
│  [Video Preview]       │                              │
│  640x360px             │ R$ 299,00                    │
│                        │ ━━━━━━━━━━━━━━ 45% off      │
│                        │ De: R$ 549,00                │
│                        │                              │
│ [Tabs]                 │ [Inscrever-se]               │
│ • Visão Geral          │                              │
│ • Conteúdo             │ Este curso inclui:           │
│ • Instrutor            │ • 45 aulas em vídeo          │
│ • Avaliações           │ • 8h de conteúdo             │
│                        │ • Certificado                │
│ [Conteúdo da Tab]      │ • Acesso vitalício           │
│                        │ • Suporte do instrutor       │
│ Lorem ipsum...         │                              │
│                        │ [Compartilhar ↗]             │
│                        │                              │
└────────────────────────┴──────────────────────────────┘
```

**Especificações:**
- **Layout:** Two-column (8:4 ratio)
- **Card Inscrição:** Sticky, acompanha scroll
- **Tabs:** Underline style, smooth transition

#### Conteúdo Programático (Tab)
```
┌────────────────────────────────────────────────────────┐
│ 12 Módulos • 45 Aulas • 8h de conteúdo total          │
│                                                        │
│ ▼ Módulo 1: Fundamentos (5 aulas • 45min)            │
│   [Preview] Aula 1: Introdução (10min)               │
│   🔒 Aula 2: Anatomia Básica (12min)                 │
│   🔒 Aula 3: Instrumentação (8min)                   │
│                                                        │
│ ▶ Módulo 2: Técnicas Básicas (8 aulas • 1h 20min)    │
│ ▶ Módulo 3: Técnicas Avançadas (6 aulas • 1h 10min)  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Interação:** Accordion expandível, preview gratuito em algumas aulas

### 4. Dashboard do Aluno (Meu Aprendizado)

#### Header do Dashboard
```
┌────────────────────────────────────────────────────────┐
│ Olá, João! 👋                                          │ H2
│ Continue aprendendo onde parou                         │ Body-lg
│                                                        │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│ │ 🔥 15   │  │ 📚 8    │  │ ⏱ 45h  │  │ 🏆 12   │  │
│ │ Dias    │  │ Cursos  │  │ Estudo │  │ Badges  │  │
│ │ Streak  │  │ Ativos  │  │ Total  │  │         │  │
│ └─────────┘  └─────────┘  └─────────┘  └─────────┘  │
└────────────────────────────────────────────────────────┘
```

**Cards de Estatísticas:**
- **Tamanho:** 25% width cada (responsive)
- **Animação:** Count-up ao carregar
- **Icons:** Coloridos (fogo, livro, relógio, troféu)

#### Cursos em Andamento
```
┌────────────────────────────────────────────────────────┐
│ Continuar Assistindo                         [Ver Todos]│
│                                                        │
│ ┌───────────────────────────────────────────────────┐ │
│ │ [Thumb]  Cirurgia de Tecidos Moles               │ │
│ │ 120x90   Dr. João Silva                          │ │
│ │ [▶]     ━━━━━━━━━━━━━━━━━━━ 45%                 │ │
│ │         Próxima: Módulo 3, Aula 5                │ │
│ │         [Continuar Assistindo →]                 │ │
│ └───────────────────────────────────────────────────┘ │
│                                                        │
│ [Mais 2 cursos em cards similares]                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### Conquistas Recentes
```
┌────────────────────────────────────────────────────────┐
│ Conquistas Recentes                          [Ver Todas]│
│                                                        │
│ [Badge 1]  [Badge 2]  [Badge 3]  [Badge 4]  [+8]      │
│ 64x64px    64x64px    64x64px    64x64px    circular  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Layout:** Horizontal scroll em mobile

#### Progresso por Curso
```
┌────────────────────────────────────────────────────────┐
│ Seus Cursos (8)                              [Ver Todos]│
│                                                        │
│ [Card Grid - 4 colunas]                                │
│ Cada card mostra: Thumbnail, Título, Progresso         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 5. Perfil & Conquistas

#### Header do Perfil
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│          [Avatar]                                      │
│          120x120                                       │
│                                                        │
│          João Silva                                    │ H2
│          @joaosilva                                    │ Body-sm
│          Membro desde Jan 2025                         │
│                                                        │
│   ┌──────────────┐                                    │
│   │ Nível 15     │  ━━━━━━━━━━━━━━━━━ 2.450 / 3.000 XP │
│   │ [🔷 Icon]   │                                     │
│   └──────────────┘                                    │
│                                                        │
│   [Editar Perfil]                                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### Grid de Badges
```
┌────────────────────────────────────────────────────────┐
│ Conquistas (24 / 50)                                   │ H3
│                                                        │
│ [Tab: Todas | Desbloqueadas | Bloqueadas]             │
│                                                        │
│ [Badge] [Badge] [Badge] [Badge] [Badge]               │
│ [Badge] [Badge] [Badge] [🔒]   [🔒]                   │
│ [🔒]   [🔒]   [🔒]   [🔒]   [🔒]                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Layout:** Grid 5 colunas (desktop), auto-fill em mobile

#### Estatísticas Detalhadas
```
┌────────────────────────────────────────────────────────┐
│ Estatísticas de Aprendizado                           │ H3
│                                                        │
│ ┌──────────────┬──────────────┬──────────────┐        │
│ │ 🔥 Streak    │ 📅 Dias      │ ⏱ Tempo      │        │
│ │              │              │              │        │
│ │ 15 dias      │ 45 dias      │ 45h 30min    │        │
│ │ Atual        │ Total        │ Total        │        │
│ └──────────────┴──────────────┴──────────────┘        │
│                                                        │
│ [Gráfico de Atividade (últimos 30 dias)]              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### Certificados
```
┌────────────────────────────────────────────────────────┐
│ Certificados (3)                           [Ver Todos] │
│                                                        │
│ ┌─────────────────┐  ┌─────────────────┐             │
│ │  [Certificado]  │  │  [Certificado]  │             │
│ │  Cirurgia...    │  │  Clínica...     │             │
│ │  Concluído em   │  │  Concluído em   │             │
│ │  15 Dez 2025    │  │  10 Nov 2025    │             │
│ │  [Download ↓]   │  │  [Download ↓]   │             │
│ └─────────────────┘  └─────────────────┘             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Certificado:** Aspect ratio 4:3, preview com hover zoom

---

## 🎮 Sistema de Gamificação

### Arquitetura de Gamificação

#### Novos Modelos de Banco de Dados Necessários

```prisma
// Novo modelo: Badge (Conquista)
model Badge {
  id          String   @id @default(uuid())
  name        String
  description String
  icon        String   // URL ou nome do ícone
  category    BadgeCategory
  tier        BadgeTier
  requirement String   // Descrição do requisito
  xpReward    Int      @default(0)
  createdAt   DateTime @default(now())

  userBadges  UserBadge[]

  @@index([category, tier])
}

enum BadgeCategory {
  COMPLETION    // Completar cursos/módulos
  ENGAGEMENT    // Dias consecutivos, tempo de estudo
  ACHIEVEMENT   // Marcos especiais
  MASTERY       // Domínio de tópicos
}

enum BadgeTier {
  BRONZE
  SILVER
  GOLD
  PLATINUM
  DIAMOND
}

// Relacionamento usuário-badge
model UserBadge {
  id          String   @id @default(uuid())
  userId      String
  badgeId     String
  unlockedAt  DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge       Badge    @relation(fields: [badgeId], references: [id])

  @@unique([userId, badgeId])
  @@index([userId])
}

// Novo modelo: Sistema de Pontos
model UserXP {
  id          String   @id @default(uuid())
  userId      String   @unique
  totalXP     Int      @default(0)
  level       Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions XPTransaction[]
}

// Histórico de XP
model XPTransaction {
  id          String   @id @default(uuid())
  userXPId    String
  amount      Int
  reason      String
  source      XPSource
  sourceId    String?  // ID do curso, vídeo, etc.
  createdAt   DateTime @default(now())

  userXP      UserXP   @relation(fields: [userXPId], references: [id], onDelete: Cascade)

  @@index([userXPId, createdAt])
}

enum XPSource {
  VIDEO_COMPLETION
  COURSE_COMPLETION
  STREAK_BONUS
  QUIZ_COMPLETION
  BADGE_UNLOCK
  DAILY_LOGIN
}

// Novo modelo: Streak
model UserStreak {
  id             String   @id @default(uuid())
  userId         String   @unique
  currentStreak  Int      @default(0)
  longestStreak  Int      @default(0)
  lastActivityAt DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Novo modelo: Daily Activity
model DailyActivity {
  id          String   @id @default(uuid())
  userId      String
  date        DateTime @db.Date
  minutesStudied Int   @default(0)
  videosWatched  Int   @default(0)
  xpEarned    Int      @default(0)

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
}

// Atualizar modelo User
model User {
  // ... campos existentes ...

  // Novas relações
  xp          UserXP?
  streak      UserStreak?
  badges      UserBadge[]
  activities  DailyActivity[]
}

// Atualizar modelo Progress
model Progress {
  // ... campos existentes ...

  xpEarned    Int      @default(0)  // XP ganho por este vídeo
}

// Atualizar modelo Enrollment
model Enrollment {
  // ... campos existentes ...

  xpEarned    Int      @default(0)  // XP total ganho neste curso
}
```

### Sistema de XP e Níveis

#### Cálculo de Nível

```typescript
// Fórmula de progressão exponencial
function calculateLevel(totalXP: number): number {
  // Fórmula: Level = floor(sqrt(XP / 100))
  // Níveis ficam progressivamente mais difíceis
  return Math.floor(Math.sqrt(totalXP / 100));
}

function getXPForNextLevel(currentLevel: number): number {
  return (currentLevel + 1) ** 2 * 100;
}

// Exemplo:
// Nível 1: 0 - 100 XP
// Nível 2: 100 - 400 XP
// Nível 3: 400 - 900 XP
// Nível 10: 8.100 - 10.000 XP
```

#### Recompensas de XP

```typescript
const XP_REWARDS = {
  VIDEO_COMPLETION: 50,
  MODULE_COMPLETION: 200,
  COURSE_COMPLETION: 1000,
  QUIZ_PERFECT_SCORE: 100,
  QUIZ_COMPLETION: 50,
  DAILY_LOGIN: 10,
  STREAK_3_DAYS: 50,
  STREAK_7_DAYS: 150,
  STREAK_30_DAYS: 500,
  FIRST_VIDEO_OF_DAY: 20,
  COMMENT_ON_VIDEO: 5,
  HELPFUL_COMMENT: 15, // votado como útil
};
```

### Sistema de Badges

#### Categorias de Badges

**1. Completion Badges (Conclusão)**
- **Primeira Aula:** Assistiu primeira aula
- **Primeiro Módulo:** Completou primeiro módulo
- **Primeiro Curso:** Completou primeiro curso
- **Colecionador:** 5 cursos completos
- **Mestre:** 10 cursos completos
- **Lenda:** 25 cursos completos

**2. Engagement Badges (Engajamento)**
- **Dedicado:** 3 dias consecutivos (Bronze)
- **Consistente:** 7 dias consecutivos (Prata)
- **Imparável:** 30 dias consecutivos (Ouro)
- **Lendário:** 100 dias consecutivos (Platina)
- **Maratonista:** 5h de estudo em um dia
- **Noturno:** Estudou depois das 22h

**3. Achievement Badges (Conquistas)**
- **Perfeccionista:** 100% de progresso em 3 cursos
- **Velocista:** Completou curso em menos de 7 dias
- **Explorador:** Matriculou-se em 10 cursos
- **Especialista:** Completou todos os cursos de uma categoria

**4. Mastery Badges (Maestria)**
- **Cirurgião Junior:** Completou 3 cursos de cirurgia
- **Cirurgião Pleno:** Completou 5 cursos de cirurgia
- **Cirurgião Sênior:** Completou 10 cursos de cirurgia

#### Design de Badges

**Tier Colors:**
- **Bronze:** #CD7F32 (gradient)
- **Prata:** #C0C0C0
- **Ouro:** #FFD700
- **Platina:** #E5E4E2
- **Diamante:** #B9F2FF (azul brilhante)

**Icon Guidelines:**
- **Formato:** SVG (escalável)
- **Tamanho Base:** 64x64px
- **Versão Desbloqueada:** Full color + glow effect
- **Versão Bloqueada:** Grayscale + opacity 0.4
- **Animação de Unlock:** Scale + rotate + glow

### Sistema de Streaks

#### Regras de Streak

```typescript
interface StreakRules {
  // Atividade qualificada: assistir pelo menos 10min de vídeo
  minimumWatchTime: 600; // segundos

  // Janela de tempo: até às 23:59 do dia
  dailyDeadline: '23:59:59';

  // Grace period: pode recuperar streak se voltar no dia seguinte
  gracePeriodDays: 1;

  // Freeze: pode "congelar" streak por 2 dias (unlock em nível 10)
  freezeAvailable: 2;
  unlockFreezeAtLevel: 10;
}
```

#### Visualização de Streak

**Indicador de Streak:**
```
┌────────────────────────┐
│   🔥 15 DIAS           │ Display-3, laranja
│   Maior: 30 dias       │ Body-sm, cinza
│                        │
│   S  T  Q  Q  S  S  D  │ Calendário semanal
│   ✓  ✓  ✓  ✓  ✓  ✓  ● │ ✓=completo, ●=hoje
│                        │
│   [Continue estudando  │
│    para manter o       │
│    streak! 🎯]         │
└────────────────────────┘
```

**Reminder quando streak está em risco:**
```
┌────────────────────────────────────┐
│ ⚠️ Seu streak de 15 dias está em  │
│    risco! Assista pelo menos 10min │
│    hoje para manter.               │
│                                    │
│    [Continuar Aprendendo →]        │
└────────────────────────────────────┘
```

### Leaderboard (Fase 2)

#### Tipos de Leaderboard

1. **Global:** Todos os usuários
2. **Semanal:** Resetado toda segunda-feira
3. **Por Curso:** Ranking dentro de um curso específico
4. **Amigos:** Apenas amigos conectados (social feature)

#### Layout de Leaderboard

```
┌────────────────────────────────────────────────────────┐
│ Ranking Semanal                          [Global ▼]    │
│                                                        │
│ Período: 30 Dez - 5 Jan                                │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 🥇 1. João Silva                      2.450 XP   │  │
│ │    [Avatar] Nível 15 • 8 cursos                  │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 🥈 2. Maria Santos                    2.320 XP   │  │
│ │    [Avatar] Nível 14 • 7 cursos                  │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 🥉 3. Carlos Oliveira                 2.180 XP   │  │
│ │    [Avatar] Nível 13 • 6 cursos                  │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ...                                                    │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 45. Você                              1.250 XP   │  │ ← Highlight
│ │    [Avatar] Nível 10 • 3 cursos                  │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Especificações:**
- **Posição do usuário:** Sempre visível (sticky ou destacado)
- **Top 3:** Destaque com medalhas (ouro, prata, bronze)
- **Atualização:** Real-time ou a cada 5 minutos

---

## 🎯 UX e Padrões de Interação

### Princípios de UX

#### 1. Feedback Imediato
- **Cada ação** gera resposta visual em < 100ms
- **Loading states** para operações > 200ms
- **Success/Error feedback** com toasts + animations

#### 2. Progressão Visível
- **Progress bars** em todos os níveis (vídeo, módulo, curso)
- **Breadcrumbs** para navegação contextual
- **Next steps** sempre sugeridos

#### 3. Micro-interações

**Hover States:**
```css
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  transition: all 200ms ease-out;
}
```

**Button Click:**
```css
.button:active {
  transform: scale(0.98);
  transition: transform 100ms ease-in;
}
```

**Badge Unlock Animation:**
```css
@keyframes badgeUnlock {
  0% {
    opacity: 0;
    transform: scale(0.5) rotate(-10deg);
  }
  50% {
    transform: scale(1.1) rotate(5deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}
```

### Padrões de Navegação

#### 1. Navegação Principal (Desktop)

```
┌────────────────────────────────────────────────────────┐
│ [Logo]  Cursos  Meu Aprendizado  Conquistas  [🔍] [👤]│
└────────────────────────────────────────────────────────┘
```

**Sticky Header:**
- **Height:** 64px
- **Background:** Branco com shadow-sm
- **Scroll behavior:** Sticky top
- **Avatar dropdown:** Perfil, Configurações, Sair

#### 2. Navegação Mobile

**Bottom Navigation:**
```
┌────────────────────────────────┐
│                                │
│  [Content Area]                │
│                                │
│                                │
└────────────────────────────────┘
┌────────────────────────────────┐
│ 🏠    📚    🏆    👤           │ ← Bottom Nav (fixed)
│ Home  Cursos Badges Perfil     │
└────────────────────────────────┘
```

**Especificações:**
- **Height:** 56px
- **Safe area:** padding-bottom para iOS notch
- **Active state:** Icon colorido + label em bold

#### 3. Breadcrumbs

```
Home > Cursos > Cirurgia > Módulo 1 > Aula 2
```

**Interação:**
- Hover underline em cada link
- Seta ">" com opacity 0.5
- Last item em bold (página atual)

### Estados de Carregamento

#### Skeleton Screens

**Card Skeleton:**
```
┌─────────────────────────────┐
│ ████████████████████████    │ ← Shimmer animation
│ ████████                    │
│                             │
│ ████ ████ ████              │
│ ██████████                  │
│                             │
│ [████████]                  │
└─────────────────────────────┘
```

**Animation:**
```css
@keyframes shimmer {
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 0px,
    #f8f8f8 40px,
    #f0f0f0 80px
  );
  background-size: 468px;
  animation: shimmer 1.2s infinite;
}
```

#### Spinners

**Primary Spinner (Operações importantes):**
```
   ●●●●○
  ●    ○
 ●      ○
  ●    ○
   ●●●●○
```

**Inline Spinner (Operações pequenas):**
```
⟳ Salvando...
```

### Estados Vazios

#### Nenhum Curso Inscrito

```
┌────────────────────────────────────┐
│                                    │
│         [Ilustração SVG]           │
│         📚 (estilo line art)       │
│                                    │
│   Você ainda não está inscrito     │
│   em nenhum curso                  │
│                                    │
│   Explore nosso catálogo e         │
│   comece sua jornada!              │
│                                    │
│   [Explorar Cursos →]              │
│                                    │
└────────────────────────────────────┘
```

**Princípios:**
- **Ilustração leve:** SVG monocromático
- **Texto explicativo:** Não técnico
- **CTA claro:** Próxima ação óbvia

#### Nenhuma Conquista

```
┌────────────────────────────────────┐
│         🏆 (outline style)         │
│                                    │
│   Ainda sem conquistas             │
│                                    │
│   Complete sua primeira aula para  │
│   desbloquear seu primeiro badge!  │
│                                    │
│   [Ver Cursos]                     │
└────────────────────────────────────┘
```

### Modais e Overlays

#### Modal Padrão

**Estrutura:**
```
┌────────────────────────────────────────┐
│ [×]                                    │ ← Close button
│                                        │
│ Título do Modal                        │ H3
│                                        │
│ [Conteúdo do modal com texto,         │
│  formulários, etc.]                   │
│                                        │
│                    [Cancelar] [Salvar]│
└────────────────────────────────────────┘
```

**Backdrop:**
```css
.modal-backdrop {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  animation: fadeIn 200ms ease-out;
}
```

**Animation:**
```css
@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### Badge Detail Modal (Conquista)

```
┌────────────────────────────────────────┐
│                [×]                     │
│                                        │
│         [Badge Icon 128x128]           │
│                                        │
│         Primeira Conquista             │ H2
│         🎉 Desbloqueado!               │
│                                        │
│  Você completou sua primeira aula!     │
│  Continue assim e alcance novas        │
│  conquistas.                           │
│                                        │
│  Recompensa: +50 XP                    │
│                                        │
│  Desbloqueado em: 5 Jan 2026          │
│                                        │
│         [Compartilhar]  [Fechar]       │
└────────────────────────────────────────┘
```

**Animação de entrada:** Scale + bounce + confetti (canvas)

---

## 📱 Responsividade

### Breakpoints

```css
/* Mobile First Approach */
--breakpoint-sm: 640px;   /* Small devices (landscape phones) */
--breakpoint-md: 768px;   /* Medium devices (tablets) */
--breakpoint-lg: 1024px;  /* Large devices (laptops) */
--breakpoint-xl: 1280px;  /* Extra large devices (desktops) */
--breakpoint-2xl: 1536px; /* 2X large devices (large desktops) */
```

### Layout Adaptações

#### Grid de Cursos

```css
/* Mobile (< 640px) */
.course-grid {
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

/* Tablet (640px - 1024px) */
@media (min-width: 640px) {
  .course-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-6);
  }
}

/* Desktop (> 1024px) */
@media (min-width: 1024px) {
  .course-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-8);
  }
}
```

#### Dashboard Stats

```css
/* Mobile: Stack vertical */
.stats-container {
  flex-direction: column;
  gap: var(--space-4);
}

/* Tablet: 2x2 grid */
@media (min-width: 640px) {
  .stats-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop: 4 colunas */
@media (min-width: 1024px) {
  .stats-container {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

#### Video Player

```css
/* Mobile: Full width, sidebar abaixo */
.video-layout {
  flex-direction: column;
}

.video-player {
  width: 100%;
}

.sidebar {
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
}

/* Desktop: Side by side */
@media (min-width: 1024px) {
  .video-layout {
    flex-direction: row;
  }

  .video-player {
    flex: 1;
  }

  .sidebar {
    width: 320px;
    max-height: none;
  }
}
```

### Tipografia Responsiva

```css
/* Fluid Typography */
.display-1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
}

.h1 {
  font-size: clamp(1.5rem, 4vw, 2rem);
}

.body-base {
  font-size: clamp(0.875rem, 2vw, 1rem);
}
```

### Touch Targets (Mobile)

```css
/* Minimum 44x44px para iOS/Android */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Aumentar espaçamento entre elementos clicáveis */
.button-group > * + * {
  margin-left: var(--space-4);
}

@media (max-width: 640px) {
  .button-group > * + * {
    margin-left: var(--space-3);
  }
}
```

---

## ♿ Acessibilidade

### Diretrizes WCAG 2.1 AA

#### 1. Contraste de Cores

**Mínimo 4.5:1 para texto normal:**
```css
/* ✅ Correto */
color: #1A1A1A; /* text-primary */
background: #FFFFFF;
/* Contraste: 16.1:1 */

/* ❌ Evitar */
color: #A3A3A3; /* muito claro */
background: #FFFFFF;
/* Contraste: 2.5:1 (insuficiente) */
```

**Mínimo 3:1 para texto grande (18px+):**
```css
.heading {
  color: var(--text-secondary); /* #525252 */
  background: var(--bg-primary);
  /* Contraste: 8.3:1 ✅ */
}
```

#### 2. Navegação por Teclado

**Focus Visible:**
```css
*:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Nunca remover outline sem substituir */
button:focus {
  outline: none; /* ❌ Evitar */
}

button:focus-visible {
  outline: 2px solid var(--primary-500); /* ✅ Correto */
  box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.2);
}
```

**Skip Links:**
```html
<a href="#main-content" class="skip-link">
  Pular para conteúdo principal
</a>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary-500);
  color: white;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

#### 3. ARIA Labels

**Botões com apenas ícones:**
```html
<button aria-label="Fechar modal">
  <XIcon />
</button>

<button aria-label="Reproduzir vídeo">
  <PlayIcon />
</button>
```

**Progress bars:**
```html
<div
  role="progressbar"
  aria-valuenow="45"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Progresso do curso: 45%"
>
  <div class="progress-fill" style="width: 45%"></div>
</div>
```

**Live Regions (notificações):**
```html
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="toast-container"
>
  <!-- Toasts aqui serão anunciados pelo screen reader -->
</div>
```

#### 4. Semântica HTML

```html
<!-- ✅ Correto -->
<nav aria-label="Navegação principal">
  <ul>
    <li><a href="/cursos">Cursos</a></li>
  </ul>
</nav>

<main id="main-content">
  <h1>Título da Página</h1>
  <section aria-labelledby="section-heading">
    <h2 id="section-heading">Cursos em Destaque</h2>
    <!-- conteúdo -->
  </section>
</main>

<!-- ❌ Evitar -->
<div class="nav">
  <div class="nav-item" onclick="navigate()">Cursos</div>
</div>
```

#### 5. Imagens e Alternativas

```html
<!-- Imagem decorativa -->
<img src="hero.jpg" alt="" role="presentation" />

<!-- Imagem informativa -->
<img
  src="badge.svg"
  alt="Badge de Primeira Conquista desbloqueado"
/>

<!-- Ícone com significado -->
<svg aria-label="Vídeo completado" role="img">
  <CheckIcon />
</svg>
```

#### 6. Formulários Acessíveis

```html
<form>
  <div class="form-group">
    <label for="email">
      Email
      <span aria-label="obrigatório">*</span>
    </label>
    <input
      id="email"
      type="email"
      required
      aria-required="true"
      aria-describedby="email-error"
      aria-invalid="false"
    />
    <span id="email-error" role="alert" class="error">
      <!-- Mensagem de erro aqui -->
    </span>
  </div>
</form>
```

#### 7. Modo de Redução de Movimento

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🛤️ Roadmap de Implementação

### Fase 1: Fundação (Semanas 1-3)

#### Semana 1: Sistema de Design
- [ ] Implementar design tokens (cores, tipografia, espaçamento)
- [ ] Criar componentes base (Button, Input, Card)
- [ ] Configurar Tailwind customizado
- [ ] Criar storybook de componentes

#### Semana 2: Layouts Core
- [ ] Landing page redesign
- [ ] Header/Footer globais
- [ ] Navegação responsiva
- [ ] Dashboard do aluno (básico)

#### Semana 3: Player e Curso
- [ ] Redesign da página de curso
- [ ] Video player aprimorado
- [ ] Sidebar de conteúdo
- [ ] Progress tracking visual

### Fase 2: Gamificação (Semanas 4-6)

#### Semana 4: Backend Gamificação
- [ ] Criar modelos de banco (Badge, UserXP, Streak)
- [ ] Implementar endpoints de XP
- [ ] Sistema de cálculo de nível
- [ ] API de badges

#### Semana 5: Frontend Gamificação
- [ ] Componentes de badge
- [ ] Indicador de XP/Nível
- [ ] Streak counter
- [ ] Notificações de conquista

#### Semana 6: Integração
- [ ] Triggers de XP (vídeo, curso)
- [ ] Sistema de unlock de badges
- [ ] Dashboard de conquistas
- [ ] Perfil do usuário

### Fase 3: Engajamento (Semanas 7-8)

#### Semana 7: Features Sociais
- [ ] Sistema de comentários
- [ ] Q&A em vídeos
- [ ] Avaliações de cursos
- [ ] Compartilhamento social

#### Semana 8: Analytics & Personalization
- [ ] Dashboard de estatísticas
- [ ] Recomendações de cursos
- [ ] Email notifications
- [ ] Push notifications (PWA)

### Fase 4: Polimento (Semanas 9-10)

#### Semana 9: UX e Performance
- [ ] Otimização de performance
- [ ] Skeleton screens
- [ ] Error boundaries
- [ ] Accessibility audit

#### Semana 10: Testes e Launch
- [ ] Testes E2E
- [ ] Testes de acessibilidade
- [ ] Beta testing
- [ ] Deploy produção

---

## 📐 Especificações Técnicas

### Estrutura de Arquivos (Frontend)

```
frontend-web/src/
├── app/
│   ├── (marketing)/
│   │   └── page.tsx                 # Landing page
│   ├── (dashboard)/
│   │   ├── student/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx         # Dashboard do aluno
│   │   │   ├── courses/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx     # Página do curso
│   │   │   │   │   └── watch/
│   │   │   │   │       └── [videoId]/
│   │   │   │   │           └── page.tsx  # Player
│   │   │   └── profile/
│   │   │       └── page.tsx         # Perfil & conquistas
│   │   └── layout.tsx               # Layout dashboard
│   ├── layout.tsx                   # Root layout
│   └── globals.css                  # Design tokens
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── gamification/
│   │   ├── badge-card.tsx
│   │   ├── xp-bar.tsx
│   │   ├── streak-counter.tsx
│   │   ├── level-indicator.tsx
│   │   └── achievement-modal.tsx
│   ├── course/
│   │   ├── course-card.tsx
│   │   ├── module-accordion.tsx
│   │   └── video-list-item.tsx
│   ├── player/
│   │   ├── video-player.tsx
│   │   ├── player-controls.tsx
│   │   └── content-sidebar.tsx
│   └── shared/
│       ├── header.tsx
│       ├── footer.tsx
│       └── navigation.tsx
├── lib/
│   ├── api/
│   │   ├── gamification.service.ts  # Novo
│   │   └── ...existing services
│   ├── types/
│   │   ├── gamification.types.ts    # Novo
│   │   └── ...existing types
│   └── utils/
│       ├── xp-calculator.ts         # Novo
│       └── level-calculator.ts      # Novo
└── hooks/
    ├── use-gamification.ts          # Novo
    └── use-streak.ts                # Novo
```

### Tecnologias Adicionais Recomendadas

```json
{
  "dependencies": {
    "framer-motion": "^11.0.0",          // Animações
    "recharts": "^2.10.0",                // Gráficos
    "react-confetti": "^6.1.0",           // Confetti (badges)
    "date-fns": "^3.0.0",                 // Date utilities
    "canvas-confetti": "^1.9.0"           // Canvas confetti
  }
}
```

### Performance Targets

- **First Contentful Paint:** < 1.5s
- **Largest Contentful Paint:** < 2.5s
- **Time to Interactive:** < 3.5s
- **Cumulative Layout Shift:** < 0.1
- **Lighthouse Score:** > 90 (Performance, Accessibility)

---

## 🎨 Assets e Recursos

### Ícones

**Biblioteca Recomendada:** Lucide React (já em uso)

**Ícones Personalizados Necessários:**
- Badges (SVG customizados para cada conquista)
- Trophy variations (bronze, prata, ouro, platina)
- Flame (streak)
- Specialty icons (cirurgia, clínica, etc.)

### Ilustrações

**Estilo:** Line art, flat design, 2-3 cores

**Necessárias:**
- Empty states (sem cursos, sem badges)
- Error states (404, 500)
- Loading states
- Onboarding

**Fonte Recomendada:** [unDraw](https://undraw.co/) (customizável) ou [Storyset](https://storyset.com/)

### Animações

**Lottie Files Recomendados:**
- Confetti burst (badge unlock)
- Success checkmark
- Loading spinner
- Level up celebration

---

## 📊 Métricas de Sucesso

### KPIs de Engajamento

1. **Retenção:**
   - Day 1, Day 7, Day 30 retention
   - Target: > 40% (D7), > 20% (D30)

2. **Completude:**
   - Course completion rate
   - Target: > 30%

3. **Engagement:**
   - Média de minutos assistidos/dia
   - Target: > 20min

4. **Gamificação:**
   - % usuários com streak > 3 dias
   - Target: > 25%
   - Badges desbloqueados/usuário
   - Target: > 3

5. **Crescimento:**
   - Novos usuários/semana
   - Target: Crescimento 10% M/M

---

## 🔄 Próximos Passos

1. **Review deste documento** com stakeholders
2. **Aprovação de design** (mockups de alta fidelidade)
3. **Setup do ambiente** de desenvolvimento
4. **Início da implementação** (Fase 1)

---

**Documento criado por:** Claude Code
**Para:** Projeto Cirurgião
**Inspiração:** Coursera, Duolingo, Khan Academy
**Status:** Aguardando aprovação

---

## 📎 Apêndices

### A. Referências Visuais

**Plataformas para Inspiração:**
- [Coursera](https://www.coursera.org/) - Layout geral, cards de curso
- [Duolingo](https://www.duolingo.com/) - Gamificação, streaks, badges
- [Khan Academy](https://www.khanacademy.org/) - Video player, progresso
- [Udemy](https://www.udemy.com/) - Página de curso, reviews
- [LinkedIn Learning](https://www.linkedin.com/learning/) - Dashboard profissional

### B. Ferramentas de Design

**Recomendadas:**
- **Figma** - Design de interfaces e protótipos
- **Excalidraw** - Wireframes rápidos
- **Coolors** - Paletas de cores
- **Google Fonts** - Tipografia

### C. Checklist de Acessibilidade

- [ ] Contraste mínimo 4.5:1 (texto normal)
- [ ] Navegação completa por teclado
- [ ] ARIA labels em elementos interativos
- [ ] Alt text em todas as imagens informativas
- [ ] Skip links implementados
- [ ] Focus visible em todos os elementos
- [ ] Semântica HTML correta
- [ ] Testes com screen readers
- [ ] Modo de redução de movimento
- [ ] Formulários com labels associados

---

**Fim do Documento**
