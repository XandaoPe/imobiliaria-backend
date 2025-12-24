// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const PORT = process.env.PORT || 5000;
  const app = await NestFactory.create(AppModule);

  // Configure CORS corretamente
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir todas as origens durante o desenvolvimento
      // Em produção, você pode restringir
      const allowedOrigins = [
        'https://imobiliaria-frontend-six.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-HTTP-Method-Override',
      'Cache-Control', // ← ADICIONE ESTE
      'Pragma',        // ← ADICIONE ESTE
      'Expires',       // ← ADICIONE ESTE
      'Access-Control-Allow-Headers', // ← ADICIONE ESTE
    ],
    exposedHeaders: ['Authorization'], // Headers que o frontend pode acessar
  });

  // Adicione um middleware global para lidar com preflight OPTIONS
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma, Expires');
      res.status(200).end();
      return;
    }
    next();
  });

  // 1. Configuração Global (Validation Pipe)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,       // Remove campos que não estão no DTO
    transform: true,       // Converte tipos automaticamente (ex: string '1' para number 1)
    forbidNonWhitelisted: false,
  }));

  // 2. Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Imobiliária Backend API')
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
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // 3. Inicia o servidor
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`CORS configurado para: ${['https://imobiliaria-frontend-six.vercel.app', 'http://localhost:3000'].join(', ')}`);
  });
}

bootstrap();