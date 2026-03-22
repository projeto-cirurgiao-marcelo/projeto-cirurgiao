
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

console.log('🔄 Starting application...');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT || 3000}`);
console.log(`DATABASE_URL defined: ${!!process.env.DATABASE_URL}`);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Aumentar limite de tamanho do body para 50MB (para uploads de transcrições grandes)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS — requer configuração explícita, sem fallback wildcard
  const corsOriginsEnv = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN;
  if (!corsOriginsEnv) {
    console.warn('⚠️  CORS_ORIGINS não configurado! Usando localhost como fallback para desenvolvimento.');
  }
  const corsOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map((origin) => origin.trim())
    : ['http://localhost:3001', 'http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Projeto Cirurgião API')
    .setDescription('API de autenticação e gestão de usuários para o Projeto Cirurgião')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Endpoints de autenticação')
    .addTag('users', 'Endpoints de gestão de usuários')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Aplicação rodando na porta: ${port}`);
  console.log(`📚 Documentação Swagger: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});
