import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Add /api prefix so frontend can call /api/auth/login, /api/brands, etc.
  app.setGlobalPrefix('api');

  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`[Marketing OS API] Running on: http://localhost:${port}/api`);
}
bootstrap();
