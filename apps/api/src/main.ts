import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Add /api prefix so frontend can call /api/auth/login, /api/brands, etc.
  app.setGlobalPrefix('api');

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [frontendUrl, 'https://marketing-os-eight-virid.vercel.app', 'http://localhost:3000'],
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  // Bind to 0.0.0.0 for containerized platforms like Render / Docker / Railway
  await app.listen(port, '0.0.0.0');
  console.log(`[Marketing OS API] Running on: http://0.0.0.0:${port}/api`);
}
bootstrap();
