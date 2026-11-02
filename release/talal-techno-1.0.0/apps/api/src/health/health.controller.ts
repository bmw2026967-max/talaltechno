import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    const started = Date.now();
    let database = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }

    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      service: 'talaltechno-api',
      version: '1.0.0',
      database,
      latencyMs: Date.now() - started,
      environment: process.env.NODE_ENV || 'development',
      integrations: {
        payments: process.env.PAYMENTS_MODE || 'mock',
        delivery: process.env.DELIVERY_MODE || 'mock',
        printer: process.env.PRINTER_MODE || 'mock',
        zatca: process.env.ZATCA_ENVIRONMENT || 'sandbox'
      },
      disclaimer: 'ZATCA/payment/delivery integrations are sandbox/mock and not certified.',
      timestamp: new Date().toISOString()
    };
  }
}
