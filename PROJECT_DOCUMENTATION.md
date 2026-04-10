# Projeto Cirurgiao - Documentacao Completa do Projeto

> **Data de atualizacao:** 10/04/2026
> **Proposito:** Documento de referencia para continuidade do desenvolvimento nas plataformas Web e React Native.

---

## 1. VISAO GERAL DO PROJETO

**Projeto Cirurgiao** e uma plataforma de cursos online voltada para **cirurgia veterinaria**, composta por tres camadas:

| Camada | Tecnologia | Funcao |
|--------|-----------|--------|
| **Backend API** | NestJS + PostgreSQL + Prisma | API REST centralizada |
| **Frontend Web** | Next.js 15 + React 19 + shadcn/ui | Painel Admin + Area do Aluno |
| **Mobile App** | Expo (React Native) + Expo Router | Area do Aluno (sem Admin) |

### Arquitetura Geral

```
┌─────────────────┐     ┌─────────────────┐
│  Frontend Web   │     │   Mobile App    │
│  (Next.js 15)   │     │ (Expo/RN)       │
│  Admin + Aluno  │     │  Apenas Aluno   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │ HTTPS / REST
              ┌──────┴──────┐
              │ Backend API │
              │  (NestJS)   │
              └──────┬──────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───┴───┐    ┌───────┴──────┐  ┌─────┴─────┐
│ PostgreSQL │ Cloudflare R2 │  │ Firebase  │
│ (Prisma)   │ + Stream     │  │ Auth      │
└────────┘   └──────────────┘  └───────────┘
                     │
              ┌──────┴──────┐
              │ Google Cloud │
              │ Vertex AI    │
              │ (IA/RAG)     │
              └─────────────┘
```

---

## 2. STACK TECNICA DETALHADA

### 2.1 Backend API

- **Runtime:** Node.js 20 + NestJS v10.3.0
- **ORM:** Prisma v5.22.0
- **Banco de Dados:** PostgreSQL 15
- **Cache:** Redis 7
- **Autenticacao:** Firebase Admin SDK v13.2.0 + JWT + Passport
- **Armazenamento de Arquivos:** Cloudflare R2 (S3-compatible)
- **Video Streaming:** HLS via Cloudflare R2 CDN (4K) + Cloudflare Stream (fallback 1080p)
- **Legendas:** Arquivos VTT no R2 (subtitles_pt.vtt), servidos via VttTextService compartilhado
- **IA/ML:** Google Cloud Vertex AI v1.10.0 (resumos, quiz generation, chatbot RAG) - usa VTT como fonte de texto
- **Upload de Videos:** TUS protocol (resumable uploads)
- **Documentacao API:** Swagger/OpenAPI em `/api/docs`
- **Rate Limiting:** ThrottlerModule (20 req/s e 100 req/min por IP)
- **Prefixo Global:** `/api/v1`
- **Body Limit:** 50MB

### 2.2 Frontend Web

- **Framework:** Next.js 15.3.6 (App Router, Turbopack)
- **React:** v19.2.0
- **UI Library:** shadcn/ui + Radix UI (22 componentes base)
- **Estilizacao:** Tailwind CSS v4 + Framer Motion v12.34.3
- **State Management:** Zustand v5.0.8 (6 stores)
- **Forms:** React Hook Form v7.66.0 + Zod v4.1.12
- **HTTP Client:** Axios v1.13.2 com interceptors + Firebase SDK v11.7.1
- **Video Player:** HLS.js v1.6.15 (player customizado com seletor de qualidade 4K/1080p/720p e CC)
- **Drag & Drop:** @hello-pangea/dnd v18.0.1
- **Upload:** tus-js-client v4.2.3
- **Icones:** Lucide React v0.553.0
- **Temas:** next-themes v0.4.6 (dark mode)
- **Toasts:** Sonner v2.0.7

### 2.3 Mobile App

- **Framework:** Expo v52.0.0
- **React Native:** v0.76.9
- **Roteamento:** Expo Router v4.0.9
- **State Management:** Zustand v5.0.3
- **Persistencia Local:** AsyncStorage + Secure Store
- **Video Player:** Expo Video v2.0.6
- **Icones:** Expo Vector Icons (Ionicons)
- **UI:** Linear Gradient, React Native Tab View
- **HTTP Client:** Axios com interceptors

---

## 3. BANCO DE DADOS (Prisma Schema)

### 3.1 Modelos (36 entidades)

```
USUARIOS E AUTENTICACAO:
├── User              - id, email, password, name, role (ADMIN|INSTRUCTOR|STUDENT), isActive
├── UserProfile       - userId, photoUrl, profession, specializations[], state, city, bio, onboardingCompleted
└── RefreshToken      - token, userId, expiresAt, isRevoked

ESTRUTURA DE CURSOS:
├── Course            - title, slug, description, thumbnail*, thumbnailVertical, thumbnailHorizontal,
│                       instructorId, isPublished, price
├── Module            - title, description, thumbnail*, thumbnailVertical, thumbnailHorizontal,
│                       order, courseId
└── Video             - title, description, cloudflareId, cloudflareUrl, thumbnailUrl, duration,
                        moduleId, order, isPublished, uploadStatus, uploadProgress, uploadError,
                        tempFilePath, externalUrl, hlsUrl, videoSource

PROGRESSO E INTERACAO:
├── Enrollment        - userId, courseId, enrolledAt, completedAt, progress, lastAccessAt
├── Progress          - userId, videoId, watched, watchedAt, watchTime, completed, completedAt
├── VideoLike         - videoId, userId
└── VideoNote         - videoId, userId, content, timestamp (segundos)

CONTEUDO DE VIDEO:
├── VideoTranscript   - videoId, language, segments (JSON), fullText
├── VideoMaterial     - videoId, title, description, type (PDF|LINK|ARTICLE|VIDEO|IMAGE), url,
│                       fileSize, order
└── VideoSummary      - videoId, userId, content (Markdown), version (1-3), generationCount, tokenCount

FORUM:
├── ForumCategory     - name, description, icon, color, order
├── ForumTopic        - title, content, authorId, categoryId, courseId?, videoId?,
│                       isPinned, isClosed, isSolved, views, upvotes, downvotes, lastActivityAt
├── ForumReply        - content, topicId, authorId, parentReplyId?, isSolution, isEdited,
│                       upvotes, downvotes
├── ForumTopicVote    - value (+1/-1), topicId, userId
├── ForumReplyVote    - value (+1/-1), replyId, userId
└── ForumReport       - topicId, reporterId, reason, description, status
                        (PENDING|REVIEWED|RESOLVED|DISMISSED), resolvedAt, resolvedBy

QUIZ GAMIFICADO:
├── Quiz              - videoId, title, description, difficulty (EASY|MEDIUM|HARD), timeLimit, passingScore
├── QuizQuestion      - quizId, question, options (JSON), correctAnswer, explanation, order, points
├── QuizAttempt       - quizId, userId, score (0-100 %), correctCount, totalQuestions, timeSpent, passed
└── QuizAnswer        - attemptId, questionId, answer, isCorrect, timeSpent

CHATBOT IA (RAG):
├── ChatConversation  - userId, videoId?, courseId?, title
├── ChatMessage       - conversationId, role (user|assistant), content, sources (JSON), tokenCount, feedback
└── TranscriptEmbedding - videoId, chunkIndex, chunkText, startTime, endTime, embeddingId, isIndexed

BIBLIOTECA IA (RAG de Livros):
├── KnowledgeDocument - title, fileName, gcsPath, language, totalPages, totalChunks, status
│                       (PENDING|PROCESSING|COMPLETED|ERROR), errorMessage, processedAt
├── KnowledgeChunk    - documentId, chunkIndex, content, contentPt, chapter, chapterPt,
│                       pageStart, pageEnd, language, embedding[], isIndexed, isTranslated
├── LibraryConversation - userId, title
├── LibraryMessage    - conversationId, role, content, sources[], tokenCount, feedback
└── TokenUsageDaily   - userId, date, tokensUsed

GAMIFICACAO:
├── XpLog             - userId, action, xp, description, referenceId (append-only)
├── UserBadge         - userId, badgeSlug, unlockedAt
├── UserStreak        - userId, currentStreak, longestStreak, lastActiveDate, freezesAvailable
├── GamificationChallenge - userId, type, templateKey, title, description, difficulty
│                          (EASY|MEDIUM|HARD), xpReward, icon, target, expiresAt, completedAt, claimedAt
└── GamificationEvent - userId, type, data[], seen, readAt
```

### 3.2 Enums

| Enum | Valores |
|------|---------|
| `Role` | ADMIN, INSTRUCTOR, STUDENT |
| `VideoUploadStatus` | PENDING, UPLOADING, PROCESSING, READY, ERROR |
| `MaterialType` | PDF, LINK, ARTICLE, VIDEO, IMAGE |
| `ReportReason` | SPAM, INAPPROPRIATE, OFFENSIVE, OFF_TOPIC, OTHER |
| `ReportStatus` | PENDING, REVIEWED, RESOLVED, DISMISSED |
| `QuizDifficulty` | EASY, MEDIUM, HARD |
| `DocumentProcessingStatus` | PENDING, PROCESSING, COMPLETED, ERROR |
| `ChallengePeriod` | DAILY, WEEKLY, SPECIAL |
| `GamificationChallengeDifficulty` | EASY, MEDIUM, HARD |

### 3.3 Migrations (16 aplicadas)

```
20251109081640_init
20251119214805_add_courses_modules_videos
20251126182818_make_cloudflare_url_optional
20251126190703_add_video_upload_status
20251203174016_enhance_progress_model
20251212172018_add_video_progress_model
20260109105513_add_video_embed_fields
20260113_add_thumbnail_orientations
20260114_add_video_features
20260115_add_forum
20260126_add_module_thumbnails
20260227_add_gamification
20260227_add_readAt_to_events
20260320_add_ai_library
20260401_add_chunk_translation_fields
20260408_add_hls_url_field              ← Novo: campo hlsUrl para HLS R2 4K
```

---

## 4. BACKEND API - MODULOS E ENDPOINTS

### 4.1 Modulos do Backend (24 modulos)

| Modulo | Descricao |
|--------|-----------|
| `auth` | Login (local + Firebase), registro, refresh token, recuperacao de senha |
| `users` | CRUD usuarios, overview de alunos, detalhes de aluno com matriculas/quizzes |
| `profile` | Perfil completo: foto, onboarding, alteracao de senha |
| `courses` | CRUD cursos, publicacao, thumbnails, slug |
| `modules` | CRUD modulos, reordenacao, thumbnails |
| `videos` | CRUD videos, 8 metodos de upload, sincronizacao Cloudflare, mover entre modulos |
| `progress` | Tracking de progresso (watched, completed, watchTime), summary, enrolled courses |
| `upload` | Upload de thumbnails para Cloudflare R2 |
| `cloudflare` | Integracao R2 (storage) e Stream (video) - servicos compartilhados |
| `firebase` | Firebase Admin SDK + FirebaseAuthGuard |
| `likes` | Like/unlike/toggle em videos |
| `notes` | Notas dos alunos com timestamp, contagem, listagem global |
| `materials` | Materiais complementares (PDFs, links), reordenacao |
| `transcripts` | ~~Transcricao de videos~~ (DESATIVADO - substituido por VTT do R2) |
| `captions` | Legendas auto-geradas (12 idiomas) para Cloudflare, status VTT para R2 |
| `shared/vtt` | **NOVO:** VttTextService - busca, parseia e cacheia VTT do R2 CDN |
| `forum` | Topicos, respostas aninhadas, votacao, denuncias, solucao, moderacao |
| `forum-categories` | CRUD categorias do forum (ADMIN) |
| `ai-summaries` | Resumos com Vertex AI (max 3 por video/aluno) - usa VTT do R2. Thumbnail com Sharp (imagem fixa + titulo) |
| `ai-chat` | Chatbot RAG com chunks do VTT, indexacao |
| `ai-library` | Biblioteca IA: ingestao de documentos, RAG, quota de tokens |
| `quizzes` | Quizzes gerados por IA, submissao, tentativas, estatisticas |
| `gamification` | XP, badges, streaks, challenges, leaderboard, eventos |
| `shared/prisma` | Modulo Prisma compartilhado |
| `shared/tasks` | Background tasks |

### 4.2 Endpoints Completos (170+)

**Autenticacao:**
```
POST /aulas/92339018203          - Registro (rota secreta/protegida)
POST /auth/login                 - Login local
POST /auth/firebase-login        - Sincronizacao Firebase → backend
POST /auth/refresh               - Renovar token
POST /auth/forgot-password       - Recuperacao de senha
POST /auth/logout                - Logout [Protected]
GET  /auth/me                    - Dados do usuario autenticado [Protected]
```

**Cursos:**
```
POST   /courses                  - Criar [ADMIN, INSTRUCTOR]
GET    /courses                  - Listar (publicados ou todos para admin)
GET    /courses/my-courses       - Cursos do instrutor [INSTRUCTOR, ADMIN]
GET    /courses/:id              - Detalhes
GET    /courses/slug/:slug       - Por slug
PATCH  /courses/:id              - Atualizar [INSTRUCTOR, ADMIN]
DELETE /courses/:id              - Deletar [INSTRUCTOR, ADMIN]
PATCH  /courses/:id/toggle-publish - Publicar/despublicar [INSTRUCTOR, ADMIN]
POST   /courses/:id/thumbnail   - Upload thumbnail [INSTRUCTOR, ADMIN]
```

**Modulos:**
```
POST   /courses/:courseId/modules          - Criar [INSTRUCTOR, ADMIN]
GET    /courses/:courseId/modules          - Listar
GET    /courses/:courseId/modules/next-order - Proximo order [INSTRUCTOR, ADMIN]
PATCH  /courses/:courseId/modules/reorder  - Reordenar [INSTRUCTOR, ADMIN]
GET    /modules/:id                       - Detalhes
PATCH  /modules/:id                       - Atualizar [INSTRUCTOR, ADMIN]
DELETE /modules/:id                       - Deletar [INSTRUCTOR, ADMIN]
POST   /modules/:id/thumbnail             - Upload thumbnail [INSTRUCTOR, ADMIN]
```

**Videos (8 metodos de upload):**
```
POST   /modules/:moduleId/videos                    - Criar com Cloudflare ID [INSTRUCTOR, ADMIN]
POST   /videos/upload-url                            - URL de upload direto [INSTRUCTOR, ADMIN]
POST   /modules/:moduleId/videos/upload-url-direct   - Upload direto TUS [INSTRUCTOR, ADMIN]
POST   /modules/:moduleId/videos/tus-upload-url      - TUS para arquivos grandes [INSTRUCTOR, ADMIN]
POST   /modules/:moduleId/videos/upload-file         - Upload de arquivo (async) [INSTRUCTOR, ADMIN]
POST   /modules/:moduleId/videos/from-url            - De URL externa [INSTRUCTOR, ADMIN]
POST   /modules/:moduleId/videos/from-embed          - Embed (YouTube/Vimeo) [INSTRUCTOR, ADMIN]
GET    /modules/:moduleId/videos                     - Listar videos do modulo
GET    /modules/:moduleId/videos/next-order          - Proximo order [INSTRUCTOR, ADMIN]
PATCH  /modules/:moduleId/videos/reorder             - Reordenar videos [INSTRUCTOR, ADMIN]
GET    /videos/:id                                   - Detalhes
PATCH  /videos/:id                                   - Atualizar [INSTRUCTOR, ADMIN]
DELETE /videos/:id                                   - Deletar [INSTRUCTOR, ADMIN]
PATCH  /videos/:id/toggle-publish                    - Publicar/despublicar [INSTRUCTOR, ADMIN]
POST   /videos/:id/sync                              - Sincronizar com Cloudflare [INSTRUCTOR, ADMIN]
POST   /videos/:id/move                              - Mover para outro modulo [INSTRUCTOR, ADMIN]
POST   /videos/:id/thumbnail                         - Upload thumbnail [INSTRUCTOR, ADMIN]
GET    /videos/:id/upload-status                     - Status do upload [INSTRUCTOR, ADMIN]
```

**Progresso:**
```
POST /progress                        - Salvar progresso [Protected]
GET  /progress/video/:videoId         - Progresso de um video [Protected]
GET  /progress/course/:courseId       - Progresso de um curso [Protected]
POST /progress/video/:videoId/complete   - Marcar como concluido [Protected]
POST /progress/video/:videoId/incomplete - Marcar como incompleto [Protected]
GET  /progress/summary                - Resumo geral de progresso [Protected]
GET  /progress/enrolled-courses       - Cursos matriculados [Protected]
```

**Likes:**
```
GET    /videos/:videoId/likes         - Status do like [Protected]
POST   /videos/:videoId/like          - Curtir [Protected]
DELETE /videos/:videoId/like          - Descurtir [Protected]
POST   /videos/:videoId/like/toggle   - Toggle like [Protected]
```

**Notas:**
```
POST   /videos/:videoId/notes        - Criar nota [Protected]
GET    /videos/:videoId/notes        - Listar notas do video [Protected]
GET    /videos/:videoId/notes/count  - Contar notas [Protected]
GET    /notes                        - Todas as notas do usuario [Protected]
GET    /notes/:noteId                - Detalhe da nota [Protected]
PUT    /notes/:noteId                - Atualizar [Protected]
DELETE /notes/:noteId                - Deletar [Protected]
```

**Materiais:**
```
POST   /videos/:videoId/materials       - Adicionar material [Protected]
GET    /videos/:videoId/materials       - Listar
GET    /videos/:videoId/materials/:id   - Detalhe
PATCH  /videos/:videoId/materials/:id   - Atualizar [Protected]
DELETE /videos/:videoId/materials/:id   - Deletar [Protected]
POST   /videos/:videoId/materials/reorder - Reordenar [Protected]
```

**Transcricoes (DESATIVADO - endpoints removidos em 10/04/2026):**
```
# Endpoints de transcricao desativados. VTT do R2 e a fonte unica de texto.
# Dados historicos mantidos na tabela video_transcripts.
```

**Legendas:**
```
POST   /videos/:videoId/captions/generate       - Gerar legendas [ADMIN, INSTRUCTOR]
GET    /videos/:videoId/captions                - Listar
GET    /videos/:videoId/captions/:lang/status   - Status da geracao [ADMIN, INSTRUCTOR]
GET    /videos/:videoId/captions/:lang/vtt      - Download VTT
DELETE /videos/:videoId/captions/:lang          - Deletar [ADMIN, INSTRUCTOR]
```

**Forum:**
```
POST   /forum/topics              - Criar topico [Protected]
GET    /forum/topics              - Listar (com filtros)
GET    /forum/topics/:id          - Topico com respostas
PATCH  /forum/topics/:id          - Atualizar [Protected]
DELETE /forum/topics/:id          - Deletar [Protected]
POST   /forum/replies             - Criar resposta [Protected]
PATCH  /forum/replies/:id         - Atualizar resposta [Protected]
DELETE /forum/replies/:id         - Deletar resposta [Protected]
POST   /forum/votes/topics        - Votar em topico [Protected]
POST   /forum/votes/replies       - Votar em resposta [Protected]
POST   /forum/topics/:topicId/solution/:replyId - Marcar como solucao [Protected]
POST   /forum/reports             - Denunciar topico [Protected]
GET    /forum/reports             - Listar denuncias (admin)
```

**Categorias do Forum:**
```
POST   /forum-categories       - Criar [ADMIN]
GET    /forum-categories       - Listar
GET    /forum-categories/:id   - Detalhes
PATCH  /forum-categories/:id   - Atualizar [ADMIN]
DELETE /forum-categories/:id   - Deletar [ADMIN]
```

**Resumos IA:**
```
POST   /videos/:videoId/summaries/generate            - Gerar resumo [Protected]
GET    /videos/:videoId/summaries                     - Listar resumos [Protected]
GET    /videos/:videoId/summaries/remaining           - Geracoes restantes [Protected]
GET    /videos/:videoId/summaries/:summaryId          - Detalhe [Protected]
PUT    /videos/:videoId/summaries/:summaryId          - Editar [Protected]
DELETE /videos/:videoId/summaries/:summaryId          - Deletar [Protected]
GET    /videos/:videoId/summaries/:summaryId/download - Download Markdown [Protected]
```

**Assistente IA de Texto:**
```
POST /ai/improve-text            - Melhorar texto [Protected]
POST /ai/generate-description    - Gerar descricao a partir de titulo [Protected]
POST /ai/generate-thumbnail      - Gerar thumbnail com IA [Protected]
```

**Quizzes:**
```
POST   /videos/:videoId/quizzes/generate - Gerar quiz com IA [Protected]
GET    /videos/:videoId/quizzes          - Listar quizzes do video [Protected]
GET    /videos/:videoId/quiz-stats       - Estatisticas do video [Protected]
GET    /quizzes/:quizId                  - Obter quiz (sem respostas) [Protected]
DELETE /quizzes/:quizId                  - Deletar [Protected]
POST   /quizzes/:quizId/submit           - Submeter respostas [Protected]
GET    /quizzes/:quizId/attempts         - Tentativas do usuario [Protected]
GET    /quizzes/:quizId/stats            - Estatisticas do quiz [Protected]
GET    /attempts/:attemptId              - Detalhes da tentativa [Protected]
GET    /users/me/quiz-stats              - Estatisticas gerais do usuario [Protected]
```

**Chatbot IA:**
```
POST   /chat/conversations              - Criar conversa [Protected]
GET    /chat/conversations              - Listar conversas [Protected]
GET    /chat/conversations/:id          - Conversa com mensagens [Protected]
DELETE /chat/conversations/:id          - Deletar conversa [Protected]
POST   /chat/conversations/:id/messages - Enviar mensagem (auto-reply IA) [Protected]
POST   /chat/messages/:id/feedback      - Avaliar resposta [Protected]
GET    /chat/suggestions                - Sugestoes publicas
POST   /chat/index/video/:videoId       - Indexar transcricao [ADMIN, INSTRUCTOR]
POST   /chat/index/all                  - Indexar todas [ADMIN]
```

**Biblioteca IA:**
```
POST   /library/chat/conversations              - Criar conversa [Protected]
GET    /library/chat/conversations              - Listar conversas [Protected]
GET    /library/chat/conversations/:id          - Obter conversa [Protected]
DELETE /library/chat/conversations/:id          - Deletar conversa [Protected]
POST   /library/chat/conversations/:id/messages - Enviar mensagem [Protected]
POST   /library/chat/messages/:id/feedback      - Feedback [Protected]
GET    /library/quota                           - Quota de tokens [Protected]
GET    /library/suggestions                     - Sugestoes
POST   /library/admin/documents/ingest          - Ingerir documento [ADMIN]
GET    /library/admin/documents                 - Listar documentos [ADMIN]
GET    /library/admin/documents/:id/status      - Status do documento [ADMIN]
POST   /library/admin/documents/:id/reindex     - Re-indexar [ADMIN]
DELETE /library/admin/documents/:id             - Deletar documento [ADMIN]
```

**Usuarios (Admin):**
```
GET    /users                    - Listar todos [ADMIN, INSTRUCTOR]
GET    /users/students/overview  - Dashboard de alunos [ADMIN]
GET    /users/students/:id       - Detalhes do aluno [ADMIN]
GET    /users/:id                - Detalhes do usuario [ADMIN, INSTRUCTOR]
PUT    /users/:id                - Atualizar [ADMIN]
DELETE /users/:id                - Deletar [ADMIN]
```

**Perfil:**
```
GET  /profile                   - Perfil completo [Protected]
PUT  /profile                   - Atualizar perfil [Protected]
POST /profile/photo             - Upload de foto [Protected]
POST /profile/change-password   - Alterar senha [Protected]
PUT  /profile/onboarding        - Completar onboarding [Protected]
POST /profile/onboarding/skip   - Pular onboarding [Protected]
```

**Gamificacao:**
```
GET    /gamification/profile            - Perfil de gamificacao [Protected]
GET    /gamification/badges             - Badges do usuario [Protected]
GET    /gamification/leaderboard        - Ranking [Protected]
GET    /gamification/challenges         - Desafios [Protected]
POST   /gamification/challenges/:id/claim - Resgatar recompensa [Protected]
GET    /gamification/events/recent      - Eventos recentes [Protected]
GET    /gamification/events/history     - Historico de eventos [Protected]
PATCH  /gamification/events/read-all    - Marcar todos como lidos [Protected]
PATCH  /gamification/events/:id/seen    - Marcar como visto [Protected]
PATCH  /gamification/events/:id/read    - Marcar como lido [Protected]
```

**Upload:**
```
POST /upload/thumbnail          - Upload de thumbnail para R2 [ADMIN, INSTRUCTOR]
```

---

## 5. FRONTEND WEB - ESTRUTURA COMPLETA

### 5.1 Rotas Implementadas

**Autenticacao:**
```
/(auth)/login             - Tela de login (split layout, dark theme, redirect por role)
/(auth)/register          - Tela de registro
/(auth)/forgot-password   - Recuperacao de senha
```

**Admin Dashboard:**
```
/(dashboard)/admin/                                              - Dashboard (KPIs, grafico matriculas, atividade recente, tabela de cursos)
/(dashboard)/admin/courses                                       - Listagem de cursos (grid/list, busca, drag-drop, publish toggle)
/(dashboard)/admin/courses/new                                   - Criar curso (titulo, descricao, preco, thumbnail com IA)
/(dashboard)/admin/courses/[id]/edit                             - Editar curso (info, modulos, videos, drag-drop, publish toggle)
/(dashboard)/admin/courses/[id]/modules/new                      - Criar modulo
/(dashboard)/admin/courses/[id]/modules/[moduleId]/edit          - Editar modulo
/(dashboard)/admin/modules                                       - Listagem global de modulos (filtro por curso, busca, delete)
/(dashboard)/admin/modules/[moduleId]/videos/page                - Listar videos do modulo
/(dashboard)/admin/modules/[moduleId]/videos/[videoId]/edit      - Editar video (player, legendas VTT/Cloudflare, materiais, quizzes, URL HLS)
/(dashboard)/admin/videos                                        - Listagem global de videos (filtro cascata curso→modulo, busca, status upload, publish)
/(dashboard)/admin/students                                      - Listagem de alunos (KPIs, tabela paginada, filtros, ativo/inativo)
/(dashboard)/admin/students/[id]                                 - Detalhes do aluno (info, KPIs, matriculas, historico quizzes)
/(dashboard)/admin/settings                                      - Configuracoes (3 tabs: Perfil, Plataforma, Notificacoes)
```

**Area do Aluno (Student):**
```
/(dashboard)/student/courses                                     - Explorar cursos (hero banner, busca, stats, grid)
/(dashboard)/student/my-courses                                  - Meus cursos (continue assistindo, matriculados, disponiveis)
/(dashboard)/student/in-progress                                 - Cursos em andamento (stats, ordenado por ultimo acesso)
/(dashboard)/student/completed                                   - Cursos concluidos (stats, banner, ordenado por conclusao)
/(dashboard)/student/courses/[id]                                - Pagina do curso
/(dashboard)/student/courses/[id]/modules/[moduleId]             - Conteudo do modulo
/(dashboard)/student/courses/[id]/watch/[videoId]                - Player HLS 4K + features:
                                                                   - Seletor de qualidade (Auto/720p/1080p/4K)
                                                                   - Seletor de velocidade (0.5x-2x)
                                                                   - Legendas CC (VTT do R2)
                                                                   - Resumos IA (3x)
                                                                   - Notas com timestamp
                                                                   - Materiais complementares
                                                                   - Likes
                                                                   - Chat IA (widget lateral)
/(dashboard)/student/courses/[id]/quiz/[quizId]                  - Interface de quiz gamificado
/(dashboard)/student/forum                                       - Categorias do forum (busca, stats)
/(dashboard)/student/forum/[categoryId]                          - Topicos da categoria
/(dashboard)/student/forum/[categoryId]/new                      - Criar topico
/(dashboard)/student/forum/topic/[topicId]                       - Topico com respostas e votacao
/(dashboard)/student/gamification                                - Hub de gamificacao (3 tabs: Overview, Achievements, Leaderboard)
/(dashboard)/student/gamification/badges                         - Detalhe de badges
/(dashboard)/student/gamification/leaderboard                    - Detalhe do leaderboard
/(dashboard)/student/library                                     - Biblioteca IA (chat RAG, conversas, quota de tokens)
/(dashboard)/student/profile                                     - Perfil (foto, dados, senha, especializacoes)
```

**Plataforma (layouts alternativos estilo Coursera):**
```
/(platform)/admin/courses-new                                    - Cursos admin (layout Coursera)
/(platform)/student/my-courses-new                               - Meus cursos (layout Coursera)
```

**Outras:**
```
/                    - Landing page (hero, cursos destaque, pos-graduacao, comunidade, instrutor, calendario)
/test-player         - Teste de Video.js player com HLS
/api/upload/thumbnail - API route para upload de thumbnails
```

### 5.2 Sidebar Navigation

**Admin Sidebar (6 itens):**
```
1. Dashboard        → /admin                 ✅ Implementado
2. Cursos           → /admin/courses         ✅ Implementado
3. Modulos          → /admin/modules         ✅ Implementado
4. Videos           → /admin/videos          ✅ Implementado
5. Alunos           → /admin/students        ✅ Implementado
6. Configuracoes    → /admin/settings        ✅ Implementado
```

**Student Sidebar (7+ itens):**
```
1. Meus Cursos      → /student/my-courses    ✅ Implementado
2. Explorar Cursos  → /student/courses       ✅ Implementado
3. Em Progresso     → /student/in-progress   ✅ Implementado
4. Concluidos       → /student/completed     ✅ Implementado
5. Forum            → /student/forum         ✅ Implementado
6. Gamificacao      → /student/gamification  ✅ Implementado
7. Biblioteca IA    → /student/library       ✅ Implementado
8. Perfil           → /student/profile       ✅ Implementado
```

### 5.3 Componentes (87 arquivos)

**Admin (4):** thumbnail-upload, video-captions-manager (R2 VTT + Cloudflare), video-materials-manager, video-quiz-manager

**Auth (4):** auth-provider, forgot-password-form, login-form, register-form

**Chatbot (2):** chat-widget, video-chat-widget

**Dashboard (1):** stat-card

**Forum (4):** category-card, reply-card, topic-card, vote-buttons

**Gamificacao (17):** AchievementToast, BadgeCard, BadgeGrid, BadgeUnlockModal, ChallengeCard, ChallengesList, GamificationProvider, GamificationSidebar, LeaderboardPodium, LeaderboardTable, LevelBadge, LevelUpModal, StatsPanel, StreakDisplay, XpHistoryFeed, XpPopup, XpProgressBar

**Layout (7):** admin-header, admin-sidebar, coursera-header, notification-center, profile-dropdown, student-header, student-sidebar

**Quiz (6):** quiz-card, quiz-completion-modal, quiz-intro, quiz-locked-card, quiz-player, quiz-results

**Shared (3):** footer, header, page-transition

**Student (4):** course-card, course-card-new, hero-banner, module-card

**UI shadcn (22):** accordion, avatar, badge, button, card, checkbox, dialog, dropdown-menu, form, input, label, progress, progress-enhanced, scroll-area, select, separator, sheet, sonner, table, tabs, textarea, tooltip

**Video Player (7):** hls-video-player (HLS.js 4K), video-breadcrumbs, video-like-button, video-materials, video-materials-carousel, video-notes, video-summaries

### 5.4 Services API (21 arquivos)

```
client.ts                   - Axios clients (apiClient 30s, uploadClient 5min)
auth.ts                     - Login/registro/refresh/logout/profile/forgotPassword
courses.service.ts          - CRUD cursos, thumbnail, publish
modules.service.ts          - CRUD modulos, reorder
videos.service.ts           - CRUD videos, 8 metodos upload, TUS, polling
progress.service.ts         - Progresso, summary, enrolled courses
likes.service.ts            - Like/unlike/toggle
notes.service.ts            - CRUD notas, contagem, listagem global
materials.service.ts        - CRUD materiais, reorder, utilitarios
captions.service.ts         - Gerar/listar/status/download/delete legendas (12 idiomas)
summaries.service.ts        - Gerar/listar/editar/deletar/download resumos
quizzes.service.ts          - Gerar/submeter/tentativas/estatisticas
chatbot.service.ts          - Conversas/mensagens/feedback/sugestoes/indexacao
library.service.ts          - Conversas/mensagens/feedback/quota/sugestoes
forum.service.ts            - Topicos/respostas/votos/solucao/denuncias
forum-categories.service.ts - CRUD categorias
users.service.ts            - Overview/detail alunos, update user
profile.service.ts          - Perfil/foto/senha
ai-text.service.ts          - Melhorar texto, gerar descricao, gerar thumbnail
index.ts                    - Exports centralizados
```

### 5.5 Zustand Stores (6)

| Store | Persistencia | Funcao |
|-------|-------------|--------|
| `auth-store` | localStorage (`auth-storage-firebase`) | Login/logout Firebase + backend sync |
| `gamification-store` | nenhuma | Profile, badges, leaderboard, challenges, eventos, modais |
| `notification-store` | nenhuma | Notificacoes de gamificacao, unread count |
| `sidebar-store` | localStorage (`sidebar-storage`) | Collapse/expand sidebar |
| `avatar-store` | localStorage (`user-avatar`) | URL da foto do usuario |
| `view-mode-store` | sessionStorage (`view-mode`) | Toggle admin/student view |

### 5.6 Hooks (7)

| Hook | Funcao |
|------|--------|
| `useGamification` | Profile de gamificacao, auto-fetch, level up, badge unlock, XP popup |
| `useBadges` | Badges do usuario, summary, auto-fetch |
| `useLeaderboard` | Ranking semanal/mensal, troca de periodo |
| `useChallenges` | Desafios ativos, claim reward |
| `useGamificationEvents` | Polling de eventos a cada 30s |
| `useXpAnimation` | Animacao de popup de XP ganho |
| `use-toast` | Wrapper Sonner para toasts |

---

## 6. MOBILE APP - ESTRUTURA COMPLETA

> **IMPORTANTE:** O mobile app NAO implementa a area administrativa (Admin). E exclusivamente para ALUNOS.

### 6.1 Rotas Implementadas

**Autenticacao:**
```
/(auth)/login             - Login com email/senha via Firebase
/(auth)/register          - Registro via rota secreta do backend
/(auth)/forgot-password   - Recuperacao de senha via backend
```

**Onboarding:**
```
/(onboarding)/profile-info     - Dados profissionais do usuario
/(onboarding)/specializations  - Especializacoes medicas veterinarias
```

**Tabs (Navegacao principal - 4 abas):**
```
/(tabs)/index        - Home: busca, cursos em andamento, cursos disponiveis
/(tabs)/forum        - Forum: listagem de categorias
/(tabs)/mentor-ia    - Mentor IA: PLACEHOLDER (nao implementado)
/(tabs)/profile      - Perfil: dados do usuario, logout
```

**Fluxo de Curso:**
```
/course/[id]/index                - Pagina do curso (lista de modulos)
/course/[id]/module/[moduleId]    - Detalhe do modulo (lista de videos)
/course/[id]/watch/[videoId]      - Player de video com:
                                    - Abas: Transcricao, Resumo IA, Materiais
                                    - Likes, barra de acao
                                    - Lista de aulas do modulo
```

**Forum (telas internas):**
```
/forum/category/[categoryId]/index   - Topicos da categoria
/forum/category/[categoryId]/new     - Criar topico
/forum/topic/[topicId]               - Topico com respostas, votacao
```

### 6.2 Services API Mobile (15 arquivos)

```
client.ts                   - Axios com interceptors, token refresh automatico, Firebase getIdToken
courses.service.ts          - Cursos (listagem, detalhes, matricula)
videos.service.ts           - Videos (detalhes, stream URL: R2 HLS 4K, Cloudflare, embed)
progress.service.ts         - Progresso (salvar, marcar completo, enrolled courses, last watched)
likes.service.ts            - Likes (toggle)
summaries.service.ts        - Resumos IA (gerar, listar, quota, deletar)
materials.service.ts        - Materiais (listar, formatFileSize, getTypeIcon)
notes.service.ts            - Notas CRUD com timestamps, contagem
quizzes.service.ts          - Quizzes (gerar IA, submeter, tentativas, stats)
chatbot.service.ts          - Chatbot IA (conversas, mensagens, sugestoes, feedback)
gamification.service.ts     - Gamificacao (profile, badges, eventos, polling, mark read)
forum.service.ts            - Forum CRUD, votos, denuncias
forum-categories.service.ts - Categorias do forum
profile.service.ts          - Perfil, alteracao de senha
```

### 6.3 Componentes Mobile

```
course/
  ├── CourseCard.tsx          - Card de curso (listagem)
  └── CourseCardHome.tsx      - Card compacto (home)

video/
  ├── VideoPlayer.tsx         - Player de video (Expo Video)
  ├── VideoActionBar.tsx      - Barra de acoes (like, etc.)
  ├── VideoLikeButton.tsx     - Botao de like
  ├── VideoLessonsList.tsx    - Lista de aulas do modulo
  ├── VideoTranscript.tsx     - Transcricao segmentada
  ├── VideoSummaries.tsx      - Resumos IA
  ├── VideoMaterials.tsx      - Materiais complementares
  ├── VideoNotes.tsx          - Notas com timestamps, CRUD, modal
  └── VideoQuiz.tsx           - Quiz (intro, play, resultado, stats)

chat/
  └── ChatScreen.tsx          - Chatbot IA completo (conversas, mensagens, sugestoes, feedback, fontes)

forum/
  ├── CategoryCard.tsx        - Card de categoria
  ├── TopicCard.tsx           - Card de topico
  ├── ReplyCard.tsx           - Card de resposta
  └── VoteButtons.tsx         - Botoes de upvote/downvote

ui/
  ├── CircularProgress.tsx    - Progresso circular
  ├── CustomTabView.tsx       - Tab view customizada
  ├── Skeleton.tsx            - Loading skeleton
  └── OfflineBanner.tsx       - Banner de rede offline (NetInfo)
```

### 6.4 Stores Mobile

- `auth-store.ts` - Login/registro/logout Firebase + AsyncStorage (persistido)
- `onboarding-store.ts` - Estado do fluxo de onboarding
- `gamification-store.ts` - Profile, badges, eventos, polling 30s, unread count

### 6.5 Design System Mobile

Arquivo `src/constants/colors.ts` define:
- Paleta navy/moderna (inspiracao Coursera)
- Spacing scale (base 4px), Typography scale
- Border radius, shadows, icon sizes
- Cores semanticas (success, danger, warning, info)
- Temas claro e escuro para react-navigation

---

## 7. SISTEMA DE AUTENTICACAO

### 7.1 Fluxo de Autenticacao (Web e Mobile)

```
1. REGISTRO:
   POST /aulas/92339018203 { email, password, name }
   → Backend cria usuario no Firebase Auth + PostgreSQL
   → Cliente faz login Firebase → obtem token
   → POST /auth/firebase-login { firebaseToken }
   → Backend valida token, retorna user com role

2. LOGIN:
   Firebase signInWithEmailAndPassword → obtem token
   → POST /auth/firebase-login { firebaseToken }
   → Backend valida token, sincroniza, retorna user

3. GUARD NO BACKEND:
   FirebaseAuthGuard extrai token do header Authorization: Bearer <token>
   → Valida com Firebase Admin SDK
   → Define request.user = { id, userId, email, name, role, firebaseUid, emailVerified }
   → IMPORTANTE: NAO define "uid" (usar "id" ou "userId")
```

### 7.2 Roles e Permissoes

| Role | Permissoes |
|------|-----------|
| `ADMIN` | Tudo: CRUD cursos/modulos/videos, gerenciar usuarios, moderacao forum, indexacao IA, ingestao de documentos |
| `INSTRUCTOR` | CRUD nos proprios cursos/modulos/videos |
| `STUDENT` | Assistir videos, progresso, likes, notas, forum, quizzes, chat IA, resumos IA, biblioteca IA, gamificacao |

---

## 8. INFRAESTRUTURA

### 8.1 Docker (Desenvolvimento Local)

3 servicos no `docker-compose.yml`:
- **PostgreSQL 15** (porta 5433) - DB `projeto_cirurgiao`, user `postgres/postgres`
- **Redis 7** (porta 6379) - Cache com senha `redis_dev_password`
- **pgAdmin 4** (porta 5050) - Interface web para DB

### 8.2 Producao

| Servico | Tecnologia | Detalhes |
|---------|-----------|----------|
| Backend API | Google Cloud Run | southamerica-east1, 2Gi RAM, VPC Connector |
| Banco de Dados | Cloud SQL PostgreSQL | IP privado 172.21.0.3 via VPC peering |
| Frontend Web | Vercel | Regiao gru1 (Sao Paulo), deploy automatico via git push |
| Storage | Cloudflare R2 | Bucket `s3-projeto-cirurgiao` |
| Video | Cloudflare R2 CDN (HLS 4K) | Adaptive bitrate via HLS.js (720p/1080p/4K) |
| Video (legado) | Cloudflare Stream | Fallback 1080p para videos nao migrados |
| Auth | Firebase Auth | Projeto `projeto-cirurgiao-e8df7` |
| IA | Google Vertex AI | Gemini 2.5 Flash |
| Container Registry | Artifact Registry | `cirurgiao-api` |

### 8.3 CI/CD

- **Frontend:** Git push → Vercel deploy automatico (3-5 min)
- **Backend:** `gcloud builds submit` → Cloud Build → Cloud Run deploy (7-12 min)
- **Mobile:** EAS Build (Expo) → APK/IPA para distribuicao interna ou lojas
  - Conta EAS: `@projetocirurgiao/projeto-cirurgiao` (ID: c048ea29-2617-43af-a299-059c5d53b016)
  - Build requer copiar `mobile-app/` para pasta temp fora do git (repo >10GB, limite EAS 2GB)
  - Perfis: development (emulador), preview (APK interno), production (lojas)
- **iOS Tests:** GitHub Actions → Xcode 15.2 → testes no iPhone 15 simulator

---

## 9. FASE ATUAL DE IMPLEMENTACAO

### 9.1 FRONTEND WEB - Status por Area

#### Area Admin - TODAS AS PAGINAS IMPLEMENTADAS

| Pagina | Status | Detalhes |
|--------|--------|---------|
| `/admin` (Dashboard) | ✅ Completo | KPIs, grafico matriculas, atividade recente, tabela de cursos |
| `/admin/courses` | ✅ Completo | Grid/list view, busca, drag-drop, publish toggle |
| `/admin/courses/new` | ✅ Completo | Formulario com thumbnails e geracao por IA |
| `/admin/courses/[id]/edit` | ✅ Completo | Info, modulos, videos, drag-drop, publish |
| `/admin/courses/[id]/modules/new` | ✅ Completo | Criacao de modulo |
| `/admin/courses/[id]/modules/[id]/edit` | ✅ Completo | Edicao de modulo |
| `/admin/modules` | ✅ Completo | Listagem global com filtro por curso, busca, acoes |
| `/admin/modules/[id]/videos` | ✅ Completo | Listagem de videos do modulo |
| `/admin/modules/[id]/videos/[id]/edit` | ✅ Completo | Edicao + transcricoes, legendas, materiais, quizzes |
| `/admin/videos` | ✅ Completo | Listagem global, filtro cascata curso→modulo, status upload |
| `/admin/students` | ✅ Completo | KPIs, tabela paginada, filtros, ativo/inativo |
| `/admin/students/[id]` | ✅ Completo | Info pessoal, KPIs, matriculas, historico quizzes |
| `/admin/settings` | ✅ Completo | 3 tabs: Perfil (read-only), Plataforma (localStorage), Notificacoes |

#### Area do Aluno (Web) - TODAS AS PAGINAS IMPLEMENTADAS

| Pagina | Status | Detalhes |
|--------|--------|---------|
| `/student/courses` | ✅ Completo | Hero banner, busca, stats, grid |
| `/student/my-courses` | ✅ Completo | Continue assistindo, matriculados, disponiveis |
| `/student/in-progress` | ✅ Completo | Stats, ordenado por ultimo acesso |
| `/student/completed` | ✅ Completo | Stats, banner, ordenado por conclusao |
| `/student/courses/[id]` | ✅ Completo | Pagina do curso |
| `/student/courses/[id]/modules/[id]` | ✅ Completo | Modulo com videos |
| `/student/courses/[id]/watch/[videoId]` | ✅ Completo | Player completo: transcricao, resumos IA, notas, materiais, likes, chat IA |
| `/student/courses/[id]/quiz/[quizId]` | ✅ Completo | Interface de quiz gamificado |
| `/student/forum` | ✅ Completo | Categorias com busca e stats |
| `/student/forum/[categoryId]` | ✅ Completo | Topicos por categoria |
| `/student/forum/[categoryId]/new` | ✅ Completo | Criar topico |
| `/student/forum/topic/[topicId]` | ✅ Completo | Topico com respostas e votacao |
| `/student/gamification` | ✅ Completo | 3 tabs: Overview (XP, level, challenges), Achievements, Leaderboard |
| `/student/gamification/badges` | ✅ Completo | Detalhes de badges |
| `/student/gamification/leaderboard` | ✅ Completo | Ranking detalhado |
| `/student/library` | ✅ Completo | Chat RAG, conversas, markdown, fontes, quota tokens |
| `/student/profile` | ✅ Completo | Foto, dados, senha, especializacoes |

#### Features Transversais (Web)

| Feature | Status |
|---------|--------|
| Autenticacao Firebase + JWT | ✅ Implementado |
| Role-based routing | ✅ Implementado |
| Dark Mode | ✅ Implementado |
| Sidebar collapsible | ✅ Implementado |
| Responsividade mobile web | ✅ Implementado |
| Chat IA Widget | ✅ Implementado |
| Onboarding (perfil/especializacoes) | ✅ Implementado |
| Landing page | ✅ Implementado |
| Gamificacao completa | ✅ Implementado |
| Notificacoes de gamificacao | ✅ Implementado |

---

### 9.2 MOBILE APP (React Native) - Status por Area

> **Lembrete:** Mobile NAO implementa area Admin.

| Tela | Status | Detalhes |
|------|--------|---------|
| Login | ✅ Implementado | Firebase Auth + sincronizacao backend |
| Registro | ✅ Implementado | Via rota secreta do backend |
| Recuperacao de Senha | ✅ Implementado | Via backend (Firebase Admin SDK) |
| Onboarding - Profile Info | ✅ Implementado | Profissao, dados pessoais |
| Onboarding - Especializacoes | ✅ Implementado | Selecao de especializacoes |
| Home (Tab) | ✅ Implementado | Busca, cursos em andamento, cursos disponiveis, badge de notificacoes |
| Forum (Tab) | ✅ Implementado | Listagem de categorias |
| Mentor IA (Tab) | ✅ Implementado | ChatScreen completo: conversas, mensagens, sugestoes, feedback, fontes |
| Perfil (Tab) | ✅ Implementado | Dados do usuario, gamificacao (level, XP, streak, badges), menu, logout |
| Pagina do Curso | ✅ Implementado | Lista de modulos |
| Detalhe do Modulo | ✅ Implementado | Lista de videos |
| Player de Video | ✅ Implementado | Expo Video HLS 4K + 5 abas: Aulas, Resumo IA, Materiais, Notas, Quiz |
| Forum - Topicos por Categoria | ✅ Implementado | Listagem com filtros |
| Forum - Criar Topico | ✅ Implementado | Formulario de criacao |
| Forum - Detalhe do Topico | ✅ Implementado | Respostas, votacao, denuncias |
| Notificacoes | ✅ Implementado | Historico de eventos de gamificacao, mark as read |

#### Services API Mobile (14 arquivos)

```
client.ts                   - Axios com interceptors (AsyncStorage token)
courses.service.ts          - Cursos (listagem, detalhes, matricula)
videos.service.ts           - Videos (detalhes, stream URL)
progress.service.ts         - Progresso (salvar, marcar completo, enrolled courses)
likes.service.ts            - Likes (toggle)
transcripts.service.ts      - Transcricoes
summaries.service.ts        - Resumos IA (gerar, listar, quota)
materials.service.ts        - Materiais
notes.service.ts            - Notas CRUD com timestamps
quizzes.service.ts          - Quizzes (gerar, submeter, tentativas, stats)
chatbot.service.ts          - Chatbot IA (conversas, mensagens, sugestoes, feedback)
gamification.service.ts     - Gamificacao (profile, badges, eventos, polling)
forum.service.ts            - Forum CRUD, votos, denuncias
forum-categories.service.ts - Categorias do forum
profile.service.ts          - Perfil, alteracao de senha
```

#### Stores Mobile (3)

- `auth-store.ts` - Login/registro/logout Firebase + AsyncStorage (persistido)
- `onboarding-store.ts` - Estado do fluxo de onboarding
- `gamification-store.ts` - Profile, badges, eventos, polling 30s, unread count

#### Features Mobile NAO Implementadas

| Feature | Status | Notas |
|---------|--------|-------|
| Biblioteca IA | ❌ Nao implementado | Sem service nem tela. Backend pronto (`/library/chat/*`) |
| Leaderboard dedicado | ❌ Nao implementado | Service nao tem endpoint. Backend pronto (`/gamification/leaderboard`) |
| Desafios (Challenges) | ❌ Nao implementado | Sem tela. Backend pronto (`/gamification/challenges`) |
| Notificacoes Push | ❌ Nao implementado | Nenhuma infraestrutura FCM/APNs |
| Modo Offline | ❌ Nao implementado | Download de videos para assistir offline |
| Deep Linking | ❌ Nao implementado | Scheme existe no app.json mas rotas nao configuradas |
| Biometria (Face ID/Touch ID) | ❌ Nao implementado | expo-secure-store ja instalado |
| Deteccao de rede offline | ✅ Implementado (07/04/2026) | NetInfo + OfflineBanner no layout raiz |

---

## 10. BUGS CONHECIDOS

| Bug | Status | Detalhes |
|-----|--------|---------|
| Progresso de cursos em producao | ✅ Corrigido e deployado (v64, 03/04/2026) | Fix: `updateEnrollmentProgress` conta apenas `completed: true`. Deploy inclui migration ai-library |
| Quiz mostrando dados de outro aluno | ✅ Corrigido | `req.user.uid` → `req.user.id` em 5 endpoints |
| Score de quiz 1600% | ✅ Corrigido | Removida dupla conversao de porcentagem |
| Dropdown cortado na tabela de alunos | ✅ Corrigido | Mudado para `position: fixed` |
| OOM na Biblioteca IA | ⚠️ Paliativo | Aumentado para 2Gi. Solucao real: pgvector |
| SVG text rendering no Docker | ✅ Corrigido (v71, 10/04/2026) | SVG nao renderizava fontes no Linux. Fix: usar Pango text input do Sharp |
| Cloud Run revisao nao recebia trafego | ✅ Corrigido (10/04/2026) | Deploy criava revisao mas trafego ficava na anterior. Fix: `--to-latest` |
| Rate limit 429 no watch page | ✅ Corrigido (10/04/2026) | getStreamUrl fazia findOne duplicado. Fix: getStreamDataFromVideo local + rate 20 req/s |

---

## 11. PROXIMAS TAREFAS PENDENTES

### 11.1 Frontend Web

A area admin e a area do aluno estao **100% implementadas** em termos de paginas. Melhorias possiveis:

1. **Dashboard Admin avancado** - Metricas reais em tempo real (alunos ativos, taxa de conclusao, receita)
2. **Moderacao de Forum no Admin** - Tela dedicada para gerenciar denuncias (endpoint `GET /forum/reports` ja existe)
3. **Gestao de Categorias de Forum no Admin** - Interface no admin para CRUD de categorias
4. **Settings avancado** - Dados persistidos no backend ao inves de localStorage

### 11.2 Mobile App - Tarefas Prioritarias

> **NOTA (07/04/2026):** Mentor IA, Quizzes, Notas e Gamificacao ja estao implementados com API real.
> O primeiro build Android APK foi gerado com sucesso via EAS Build e testado em dispositivo real.

**Features que faltam implementar:**
1. **Biblioteca IA** - Criar `library.service.ts` + tela de chat RAG para livros veterinarios
2. **Leaderboard dedicado** - Adicionar `getLeaderboard()` ao `gamification.service.ts` + tela
3. **Desafios (Challenges)** - Adicionar `getChallenges()`/`claimChallenge()` + tela
4. **Notificacoes Push** - Infraestrutura FCM/APNs com `expo-notifications`
5. **Deep Linking** - Configurar rotas (`projetocirurgiao://course/:id/watch/:videoId`)

**Melhorias para v1.1:**
6. **Modo Offline** - Download de videos com `expo-file-system`
7. **Login Biometrico** - Face ID/Touch ID com `expo-local-authentication`
8. **Expo Updates (OTA)** - Hotfixes sem re-submissao as lojas

**Infraestrutura de build (CONFIGURADA):**
- ✅ EAS Build configurado (`eas.json` com perfis dev/preview/production)
- ✅ Firebase config nativo (GoogleService-Info.plist + google-services.json)
- ✅ App icons e splash screen gerados
- ✅ Politica de Privacidade e Termos de Uso no perfil
- ✅ Token refresh automatico no interceptor HTTP
- ✅ Banner de rede offline (NetInfo + OfflineBanner)
- ✅ URL de producao configurada no EAS (perfis preview/production)
- ⚠️ Build EAS requer copiar mobile-app para pasta temp (repo >10GB, limite EAS 2GB)

### 11.3 Backend - Tarefas Pendentes

1. **Migrar embeddings para pgvector** - Resolver OOM na Biblioteca IA
2. **Sistema de pagamentos** - Infraestrutura pronta mas nao integrada
3. **Certificados** - Geracao de certificado ao concluir curso
4. ~~**Deploy do fix de progresso**~~ - ✅ Deployado em v64 (03/04/2026)
5. **Analytics avancado** - Metricas de engajamento, retention

---

## 12. VARIAVEIS DE AMBIENTE

### Backend (`backend-api/.env`)
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRES_IN=7d
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ENDPOINT=
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_LOCATION=
GOOGLE_APPLICATION_CREDENTIALS=
CORS_ORIGINS=http://localhost:3001
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### Frontend Web (`frontend-web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_APP_NAME=Projeto Cirurgiao
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID=
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENV=development
```

### Mobile App (`mobile-app/.env`)
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

---

## 13. COMANDOS UTEIS

```bash
# Backend
cd backend-api
npm run start:dev                    # Iniciar em dev mode (porta 3000)
npx prisma studio                    # Interface visual do banco
npx prisma migrate dev               # Rodar migracoes
npx prisma generate                  # Gerar Prisma Client

# Frontend Web
cd frontend-web
npm run dev                          # Iniciar em dev mode (porta 3001)
npm run build                        # Build de producao

# Mobile App
cd mobile-app
npx expo start                       # Iniciar Expo
npx expo start --android             # Android emulator
npx expo start --ios                 # iOS simulator

# Docker (desenvolvimento)
docker-compose up -d                 # Subir PostgreSQL + Redis + pgAdmin
docker-compose down                  # Derrubar containers

# Deploy Backend
cd backend-api
gcloud builds submit . --tag southamerica-east1-docker.pkg.dev/projeto-cirurgiao-e8df7/cirurgiao-api/projeto-cirurgiao-api:vXX
gcloud run deploy projeto-cirurgiao-api --image IMAGE --region southamerica-east1 --vpc-connector=cloud-run-connector --vpc-egress=private-ranges-only --memory=2Gi --allow-unauthenticated

# Deploy Frontend
git push origin main                 # Vercel faz deploy automatico

# Build Mobile (EAS) - requer copiar para pasta temp
cp -r mobile-app/* D:\dashboard\eas-build-temp/
cd D:\dashboard\eas-build-temp
rm -rf node_modules .git
npm install
eas build --platform android --profile preview   # APK para teste
eas build --platform ios --profile preview        # IPA para TestFlight
eas build --platform all --profile production     # Builds para as lojas

# Migrations em producao (via IP publico)
cd backend-api
DATABASE_URL="postgresql://app_cirurgiao:SENHA@35.199.87.196:5432/projeto_cirurgiao" npx prisma migrate deploy
```

---

## 14. NOTAS IMPORTANTES PARA DESENVOLVIMENTO

### Convencoes de Codigo

1. **Backend NestJS:**
   - Controllers decorados com `@Roles()` para controle de acesso
   - Guards: `FirebaseAuthGuard` + `RolesGuard`
   - `request.user` disponivel apos auth: usar `.id` ou `.userId` (NUNCA `.uid`)
   - Services retornam dados formatados, controllers sao magros
   - Prefixo global `/api/v1`

2. **Frontend Web (Next.js):**
   - App Router com layouts aninhados
   - Componentes `'use client'` onde necessario
   - shadcn/ui para componentes base
   - Dark mode via classes Tailwind `dark:`
   - Zustand para estado global (6 stores)

3. **Mobile (React Native):**
   - Expo Router para navegacao
   - Design system em `src/constants/colors.ts`
   - StyleSheet nativo (sem Tailwind)
   - AsyncStorage para persistencia de tokens
   - Zustand com persist para estado global

### Regras de Negocio Criticas

1. **Score de Quiz:** `QuizAttempt.score` JA e uma porcentagem (0-100). NUNCA fazer dupla conversao.
2. **Resumos IA:** Maximo 3 por video/aluno. `generationCount` nunca diminui ao deletar.
3. **Forum:** Replies suportam aninhamento (threaded). Um usuario so pode denunciar um topico uma vez.
4. **Thumbnails:** Campo `thumbnail` e deprecated. Usar `thumbnailHorizontal` e `thumbnailVertical`.
5. **Upload de Videos:** 8 metodos suportados. Status tracked via `VideoUploadStatus` enum.
6. **Rota de Registro:** Protegida em `/aulas/92339018203` (rota secreta).
7. **Biblioteca IA:** Quota diaria de tokens por aluno (`TokenUsageDaily`). Timeout de 120s para endpoints de IA.
8. **Gamificacao:** XP e append-only (XpLog). Badges definidos em `badge-catalog.ts`. Levels em `levels.ts`.
9. **Legendas:** Arquivos VTT no R2 CDN (`subtitles_pt.vtt`). Cloudflare Stream suporta 12 idiomas como fallback.
10. **Video HLS 4K:** Videos servidos via HLS do R2 CDN (playlist.m3u8). Player detecta automaticamente URLs .m3u8 no campo `externalUrl`. Campo `hlsUrl` disponivel para definicao explicita. Cloudflare Stream mantido como fallback (1080p max).
11. **Fonte de texto para IA:** VttTextService busca VTT do R2, parseia e cacheia (5min). Usado por ai-summaries, quizzes e ai-chat. VideoTranscript (DB) descontinuado como fonte primaria.
12. **Thumbnails com Sharp:** Background fixo do Projeto Cirurgiao + titulo via Pango text rendering. Sharp como external no webpack (`webpack.config.js`). Fontes `fonts-dejavu-core` e `fonts-liberation` instaladas no Docker. Arquivo base64 em `thumbnail-bg.base64.txt` copiado para `dist/` no Dockerfile.
13. **Webpack config:** `webpack: true` com `webpack.config.js` que marca `sharp`, `bcrypt`, `node-pre-gyp`, `aws-sdk`, `mock-aws-s3`, `nock` como externals (modulos nativos C++ nao podem ser bundlados).
14. **Cloud Run deploy:** Usar `--to-latest` no traffic routing para auto-rotear novas revisoes. Revisao atual: v71. Sempre forcar trafego apos deploy se a nova revisao nao receber 100%.

---

*Documentacao atualizada em 10/04/2026*
