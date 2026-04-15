# Projeto Cirurgião - App Mobile

Aplicativo mobile React Native (Expo) para a plataforma de cursos de cirurgia veterinária.

## 🚀 Tecnologias

- **React Native** com **Expo SDK 52**
- **Expo Router** para navegação
- **TypeScript** para tipagem
- **Zustand** para gerenciamento de estado
- **Axios** para requisições HTTP
- **Expo Secure Store** para armazenamento seguro

## 📁 Estrutura do Projeto

```
mobile-app/
├── app/                    # Rotas (Expo Router)
│   ├── (auth)/            # Telas de autenticação
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/            # Navegação por tabs
│   │   ├── index.tsx      # Meus Cursos
│   │   ├── forum.tsx      # Fórum
│   │   └── profile.tsx    # Perfil
│   ├── course/            # Telas de curso
│   │   └── [id]/
│   │       └── index.tsx  # Detalhes do curso
│   ├── _layout.tsx        # Layout raiz
│   └── index.tsx          # Tela inicial (redirect)
├── src/
│   ├── components/        # Componentes reutilizáveis
│   │   └── course/
│   │       └── CourseCard.tsx
│   ├── constants/         # Constantes (cores, etc)
│   │   └── colors.ts
│   ├── services/          # Serviços de API
│   │   └── api/
│   │       ├── client.ts
│   │       ├── courses.service.ts
│   │       └── progress.service.ts
│   ├── stores/            # Estado global (Zustand)
│   │   └── auth-store.ts
│   └── types/             # Tipos TypeScript
│       ├── auth.types.ts
│       ├── course.types.ts
│       ├── student.types.ts
│       └── index.ts
├── assets/                # Imagens e ícones
├── app.json              # Configuração Expo
├── package.json
└── tsconfig.json
```

## 🛠️ Instalação

```bash
# Navegar para a pasta do app
cd mobile-app

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npx expo start
```

## 📱 Executando

### No Expo Go (desenvolvimento)
```bash
npx expo start
```

### Build de desenvolvimento
```bash
# Android
npx expo run:android

# iOS (requer macOS)
npx expo run:ios
```

### Build de produção
```bash
# Criar build EAS
npx eas build --platform android
npx eas build --platform ios
```

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
EXPO_PUBLIC_API_URL=https://sua-api.com
```

### Firebase (opcional)

Para habilitar autenticação Firebase:
1. Crie um projeto no Firebase Console
2. Adicione os arquivos de configuração:
   - `google-services.json` (Android)
   - `GoogleService-Info.plist` (iOS)
3. Configure no `app.json`

## 🎨 Funcionalidades Implementadas

### ✅ Fase 1 - Setup Inicial
- [x] Projeto Expo criado
- [x] Dependências instaladas
- [x] Navegação configurada (Expo Router)
- [x] Cliente HTTP (Axios)
- [x] Estado global (Zustand)
- [x] Estrutura de pastas

### ✅ Fase 2 - Autenticação
- [x] Tela de Login
- [x] Tela de Registro
- [x] Tela de Recuperação de Senha
- [x] Persistência de sessão

### ✅ Fase 3 - Catálogo de Cursos
- [x] Tela Meus Cursos (Home)
- [x] Componente CourseCard
- [x] Tela Detalhes do Curso

### 🔄 Fase 4 - Player de Vídeo (Pendente)
- [ ] Integração com Cloudflare Stream
- [ ] Controles de reprodução
- [ ] Progresso de vídeo

### 🔄 Fase 5 - Quiz (Pendente)
- [ ] Tela de Quiz
- [ ] Submissão de respostas
- [ ] Resultados

### ✅ Fase 8 - Fórum
- [x] Lista de categorias (básico)

### ✅ Perfil
- [x] Tela de perfil do usuário
- [x] Logout

## 📝 Próximos Passos

1. **Player de Vídeo**: Integrar expo-av ou react-native-video com Cloudflare Stream
2. **Quiz**: Implementar telas de quiz com submissão
3. **Chatbot IA**: Integrar chat com IA
4. **Notificações Push**: Configurar expo-notifications
5. **Modo Offline**: Cache de conteúdo para acesso offline

## 🔗 Links Úteis

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native](https://reactnative.dev/)
- [Zustand](https://github.com/pmndrs/zustand)

## 📄 Licença

Projeto privado - Todos os direitos reservados.