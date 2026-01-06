# Frontend Web - Projeto Cirurgião

Plataforma web educacional para ensino de cirurgia desenvolvida com Next.js 14, React 18, TypeScript e Tailwind CSS.

## 🚀 Tecnologias

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript 5
- **UI Library**: React 18
- **Estilização**: Tailwind CSS 3 + shadcn/ui
- **Gerenciamento de Estado**: Zustand
- **Formulários**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Autenticação**: JWT (Access Token + Refresh Token)

## 📁 Estrutura do Projeto

```
frontend-web/
├── src/
│   ├── app/                      # App Router (Next.js 14)
│   │   ├── (auth)/              # Grupo de rotas de autenticação
│   │   │   ├── login/           # Página de login
│   │   │   ├── register/        # Página de registro
│   │   │   ├── forgot-password/ # Página de recuperação de senha
│   │   │   └── layout.tsx       # Layout das páginas de auth
│   │   ├── (dashboard)/         # Grupo de rotas protegidas
│   │   │   └── dashboard/       # Página de dashboard
│   │   ├── layout.tsx           # Layout raiz
│   │   └── globals.css          # Estilos globais
│   ├── components/              # Componentes React
│   │   ├── auth/               # Componentes de autenticação
│   │   │   ├── auth-provider.tsx
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   └── forgot-password-form.tsx
│   │   └── ui/                 # Componentes shadcn/ui
│   ├── lib/                    # Bibliotecas e utilitários
│   │   ├── api/               # Serviços de API
│   │   │   ├── client.ts      # Cliente HTTP configurado
│   │   │   └── auth.ts        # Serviço de autenticação
│   │   ├── stores/            # Stores Zustand
│   │   │   └── auth-store.ts  # Store de autenticação
│   │   ├── schemas/           # Schemas de validação Zod
│   │   │   └── auth-schemas.ts
│   │   └── utils.ts           # Funções utilitárias
│   └── middleware.ts          # Middleware de proteção de rotas
├── .env.local                 # Variáveis de ambiente
├── components.json            # Configuração shadcn/ui
├── tailwind.config.ts         # Configuração Tailwind
├── tsconfig.json             # Configuração TypeScript
└── package.json              # Dependências do projeto
```

## 🔧 Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:3001`

## 🔐 Autenticação

### Fluxo de Autenticação

1. **Login/Registro**: Usuário faz login ou cria uma conta
2. **Tokens JWT**: API retorna `accessToken` e `refreshToken`
3. **Armazenamento**: Tokens são salvos no `localStorage`
4. **Requisições**: `accessToken` é enviado no header `Authorization`
5. **Refresh**: Quando `accessToken` expira, usa `refreshToken` para renovar
6. **Logout**: Remove tokens e redireciona para login

### Proteção de Rotas

O middleware (`src/middleware.ts`) protege rotas automaticamente:

- **Rotas Públicas**: `/login`, `/register`, `/forgot-password`
- **Rotas Protegidas**: `/dashboard` e outras rotas autenticadas

### Store de Autenticação

```typescript
import { useAuthStore } from '@/lib/stores/auth-store';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuthStore();
  
  // Usar funções de autenticação
}
```

## 📝 Formulários

### Validação com Zod

Todos os formulários usam React Hook Form + Zod para validação:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/schemas/auth-schemas';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(loginSchema),
});
```

### Schemas Disponíveis

- `loginSchema`: Validação de login (email + senha)
- `registerSchema`: Validação de registro (nome, email, senha, confirmação)
- `forgotPasswordSchema`: Validação de recuperação de senha (email)

## 🎨 Componentes UI

### shadcn/ui

Componentes pré-configurados e estilizados:

```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
```

### Adicionar Novos Componentes

```bash
npx shadcn@latest add [component-name]
```

Exemplo:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

## 🌐 API Client

### Cliente HTTP Configurado

O cliente HTTP (`lib/api/client.ts`) já está configurado com:

- Base URL da API
- Interceptors para adicionar token
- Refresh token automático
- Tratamento de erros

### Fazer Requisições

```typescript
import { apiClient } from '@/lib/api/client';

// GET
const response = await apiClient.get('/endpoint');

// POST
const response = await apiClient.post('/endpoint', data);

// PUT
const response = await apiClient.put('/endpoint', data);

// DELETE
const response = await apiClient.delete('/endpoint');
```

### Serviço de Autenticação

```typescript
import { authService } from '@/lib/api/auth';

// Login
await authService.login({ email, password });

// Registro
await authService.register({ name, email, password });

// Obter perfil
const user = await authService.getProfile();

// Logout
await authService.logout();
```

## 🧪 Testes

### Executar Testes

```bash
# Testes unitários
npm test

# Testes E2E
npm run test:e2e

# Cobertura
npm run test:coverage
```

## 📦 Build e Deploy

### Build de Produção

```bash
npm run build
```

### Iniciar em Produção

```bash
npm start
```

### Deploy

O projeto está configurado para deploy em:

- **Vercel** (recomendado para Next.js)
- **Cloud Run** (GCP)
- **Qualquer plataforma que suporte Node.js**

## 🔍 Lint e Formatação

### ESLint

```bash
npm run lint
```

### Prettier (se configurado)

```bash
npm run format
```

## 📚 Recursos Adicionais

### Documentação

- [Next.js 14](https://nextjs.org/docs)
- [React 18](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

### Padrões de Código

Consulte `docs/standards/coding-standards.md` para padrões de código do projeto.

## 🐛 Troubleshooting

### Erro de CORS

Se encontrar erros de CORS, verifique se o backend está configurado para aceitar requisições de `http://localhost:3001`.

### Tokens Expirados

Se os tokens expirarem constantemente, verifique:
1. Configuração do tempo de expiração no backend
2. Sincronização de relógio entre cliente e servidor

### Erros de TypeScript

Execute para limpar cache:
```bash
rm -rf .next
npm run dev
```

## 👥 Equipe

- **Frontend Developer**: Juliana (FRONTEND-01)
- **Backend Developer**: Rafael (BACKEND-SENIOR-01)
- **Tech Lead**: Ricardo (TECH-LEAD-01)

## 📄 Licença

Projeto Cirurgião - Todos os direitos reservados © 2025
