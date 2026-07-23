import { NestFactory } from '@nestjs/core';
import { AppModule } from '../apps/api/src/app.module';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';

const server = express();
let app: any;

async function createNestApp(expressInstance: express.Express) {
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );
  nestApp.setGlobalPrefix('api');
  nestApp.enableCors({ origin: '*', credentials: true });
  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await nestApp.init();
  return nestApp;
}

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await createNestApp(server);
  }
  server(req, res);
}
