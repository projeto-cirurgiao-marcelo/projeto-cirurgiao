# Guia: Conectar App Mobile ao Backend Local

## 🎯 Objetivo
Conectar o app mobile React Native ao backend NestJS rodando localmente via Docker.

---

## 📋 Pré-requisitos

- ✅ Docker Desktop instalado e rodando
- ✅ Backend configurado (`backend-api/`)
- ✅ Android Studio Emulator ou dispositivo físico
- ✅ Node.js instalado

---

## 🚀 Passo a Passo

### 1. Iniciar Docker Desktop

Abra o Docker Desktop e aguarde inicializar completamente.

### 2. Iniciar Backend com Docker

```bash
# Navegar para o backend
cd backend-api

# Iniciar containers (PostgreSQL + Backend)
docker-compose up -d

# Verificar se está rodando
docker ps

# Você deve ver algo como:
# CONTAINER ID   IMAGE                    STATUS
# abc123...      backend-api              Up
# def456...      postgres:15              Up
```

### 3. Verificar Backend Funcionando

Abra o navegador e acesse:
```
http://localhost:3000/api/v1/health
```

Deve retornar algo como:
```json
{
  "status": "ok",
  "timestamp": "2026-02-03T18:00:00.000Z"
}
```

### 4. Configurar URL no App Mobile

#### Opção A: Android Emulator (Padrão)

O app já está configurado para usar `http://10.0.2.2:3000/api/v1`

**Por quê 10.0.2.2?**
- No Android Emulator, `localhost` aponta para o próprio emulador
- `10.0.2.2` é o IP especial que aponta para a máquina host (seu PC)

#### Opção B: Dispositivo Físico Android

Se estiver testando em um celular físico conectado via USB ou Wi-Fi:

1. Descubra o IP da sua máquina:
```bash
# Windows
ipconfig
# Procure por "IPv4 Address" na sua rede Wi-Fi
# Exemplo: 192.168.1.100

# Mac/Linux
ifconfig
# Procure por "inet" na sua rede Wi-Fi
```

2. Crie/edite o arquivo `.env`:
```bash
cd mobile-app
```

Crie `.env`:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api/v1
```
(Substitua `192.168.1.100` pelo seu IP real)

#### Opção C: Expo Go (Celular)

Se usar Expo Go, use o IP da sua máquina (mesmo processo da Opção B).

### 5. Iniciar App Mobile

```bash
cd mobile-app

# Para Android Emulator
npx expo run:android

# Para Expo Go (celular)
npx expo start
# Escaneie o QR code com Expo Go
```

---

## 🧪 Testar Conexão

### Teste 1: Login

1. Abra o app
2. Tente fazer login com credenciais reais do banco
3. Se conectar, verá a lista de cursos

### Teste 2: Carregar Cursos

1. Na tela inicial, puxe para baixo (pull-to-refresh)
2. Deve carregar cursos do banco de dados
3. Verifique os logs no terminal do backend

### Teste 3: Ver Logs do Backend

```bash
# Ver logs em tempo real
cd backend-api
docker-compose logs -f backend-api

# Você verá requisições do app:
# [Nest] INFO [GET] /api/v1/courses
# [Nest] INFO [POST] /api/v1/auth/firebase-login
```

---

## 🔧 Troubleshooting

### Problema: "Network request failed"

**Causa:** App não consegue conectar ao backend

**Soluções:**
1. Verifique se o backend está rodando: `docker ps`
2. Teste no navegador: `http://localhost:3000/api/v1/health`
3. Verifique o IP correto (10.0.2.2 para emulador, IP da máquina para físico)
4. Desative firewall temporariamente para testar

### Problema: "Connection refused"

**Causa:** Backend não está escutando na porta correta

**Solução:**
```bash
# Verificar porta do backend
cd backend-api
docker-compose ps

# Deve mostrar: 0.0.0.0:3000->3000/tcp
```

### Problema: "CORS error"

**Causa:** Backend bloqueando requisições do app

**Solução:**
Verifique `backend-api/src/main.ts`:
```typescript
app.enableCors({
  origin: '*', // Permitir todas as origens em dev
  credentials: true,
});
```

### Problema: "Unauthorized" (401)

**Causa:** Token Firebase inválido ou expirado

**Solução:**
1. Faça logout no app
2. Faça login novamente
3. Verifique se Firebase está configurado corretamente

---

## 📊 Monitoramento

### Ver Logs do Backend
```bash
cd backend-api
docker-compose logs -f backend-api
```

### Ver Logs do PostgreSQL
```bash
cd backend-api
docker-compose logs -f postgres
```

### Acessar Banco de Dados
```bash
# Conectar ao PostgreSQL
docker exec -it backend-api-postgres-1 psql -U postgres -d cirurgiao_db

# Listar tabelas
\dt

# Ver cursos
SELECT id, title FROM "Course";

# Sair
\q
```

---

## 🎯 URLs Importantes

| Serviço | URL | Descrição |
|---------|-----|-----------|
| Backend API | http://localhost:3000/api/v1 | API REST |
| Health Check | http://localhost:3000/api/v1/health | Status do backend |
| Swagger Docs | http://localhost:3000/api/docs | Documentação da API |
| PostgreSQL | localhost:5432 | Banco de dados |

---

## 💰 Custos

### Backend Local (Docker)
- ✅ **Custo: R$ 0,00**
- Roda na sua máquina
- Sem custos de cloud

### Backend em Produção (GCP)
- ⚠️ **Custos variáveis:**
  - Cloud Run: ~R$ 0,10/hora (se ativo)
  - Cloud SQL: ~R$ 50/mês (sempre ativo)
  - Vertex AI: ~R$ 0,50 por 1000 requisições
  - Cloud Storage: ~R$ 0,02/GB/mês

**Recomendação:** Use backend local para desenvolvimento!

---

## ✅ Checklist de Configuração

- [ ] Docker Desktop instalado e rodando
- [ ] Backend iniciado com `docker-compose up`
- [ ] Health check respondendo (http://localhost:3000/api/v1/health)
- [ ] URL configurada no mobile (10.0.2.2 para emulador)
- [ ] App mobile rodando
- [ ] Teste de login funcionando
- [ ] Cursos carregando do banco

---

## 🚀 Próximos Passos

Após conectar com sucesso:

1. **Testar todas as telas:**
   - Login/Registro
   - Lista de cursos
   - Detalhes do curso
   - Lista de vídeos
   - Player (quando integrado)

2. **Testar funcionalidades:**
   - Marcar vídeo como concluído
   - Salvar progresso
   - Navegação entre vídeos

3. **Desenvolver novas features:**
   - Integração Cloudflare Stream
   - Sistema de quiz
   - Chatbot IA

---

**Data:** 03/02/2026  
**Status:** ✅ Guia Completo