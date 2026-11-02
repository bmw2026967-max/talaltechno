import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request & { user?: { sub?: string } }>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = exception instanceof HttpException
      ? exception.getResponse()
      : { message: 'حدث خطأ غير متوقع. تم تسجيل التفاصيل للمراجعة.' };

    const message = typeof body === 'string'
      ? body
      : (body as { message?: string | string[] }).message || 'حدث خطأ غير متوقع.';

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} — ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined
      );
    }

    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status] || 'ERROR',
      message,
      requestId: request.headers['x-request-id'] || null,
      path: request.url,
      timestamp: new Date().toISOString()
    });
  }
}
