import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: (config.get<string>('APP_URL') || 'http://localhost:3000').split(',').map((value) => value.trim()),
    credentials: true
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true }
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('', { exclude: ['health'] });

  const swagger = new DocumentBuilder()
    .setTitle('طلال تكنو API')
    .setDescription('Restaurant ERP + POS API — all ZATCA/payment/delivery integrations are sandbox/mock.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(config.get('PORT') || 4000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`Talal Techno API listening on http://0.0.0.0:${port}`, 'Bootstrap');
}

bootstrap();
