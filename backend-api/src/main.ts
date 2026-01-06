
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : process.env.CORS_ORIGIN || '*';

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

bootstrap();
