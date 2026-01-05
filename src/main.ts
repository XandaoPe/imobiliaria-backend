// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const PORT = process.env.PORT || 5000;
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true, // Permite qualquer origem (*)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Permite cookies/headers de autorização
  });

  // Remova aquele middleware manual de OPTIONS, pois o app.enableCors já cuida disso.

  // 1. Configuração Global (Validation Pipe)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
  }));

  // 2. Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Imobiliária Backend API')
    .setDescription('Documentação da API do sistema imobiliário multi-tenant.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Insira o token JWT',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // 3. Inicia o servidor
  await app.listen(PORT, '0.0.0.0');
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📝 Swagger: http://localhost:${PORT}/api-docs`);
}

bootstrap();