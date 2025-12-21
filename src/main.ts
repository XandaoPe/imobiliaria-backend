// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const PORT = process.env.PORT || 5000;
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    // Permitir tanto o seu localhost quanto a URL da Vercel
    // Ou simplesmente coloque origin: true para permitir qualquer uma
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
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
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}
bootstrap();