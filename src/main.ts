// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    // ⭐️ 2. DEFINIR A ORIGEM DO SEU FRONTEND (React)
    origin: 'http://localhost:3000', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Tipos de métodos permitidos
    credentials: true, // Permitir o envio de cookies de autenticação (se usados)
  });
  
  // 1. Configuração Global (Validation Pipe)
  // Certifique-se de que os DTOs com class-validator funcionem corretamente
  app.useGlobalPipes(new ValidationPipe()); // Importe o ValidationPipe, se ainda não o fez.

  // 2. Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Imobiliária Backend API') // Título da documentação
    .setDescription('Documentação da API do sistema imobiliário multi-tenant (multi-empresa).')
    .setVersion('1.0')

    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Insira o token JWT (Bearer) para acessar rotas protegidas.',
        in: 'header',
      },
      'access-token', // Nome de segurança que será usado no @ApiBearerAuth()
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  // O Swagger estará acessível em http://localhost:5000/api-docs
  SwaggerModule.setup('api-docs', app, document);

  // 3. Inicia o servidor na porta 5000
  await app.listen(5000, '0.0.0.0', () => {
    console.log('Servidor rodando na porta 5000');
  });
}
bootstrap();