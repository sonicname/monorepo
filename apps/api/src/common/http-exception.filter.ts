import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionEnvelopeFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string | string[] })?.message ??
          'Internal server error';

    const details =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as { errors?: unknown }).errors
        : undefined;

    response.status(statusCode).json({
      ok: false,
      error: {
        statusCode,
        message: Array.isArray(message) ? message.join('; ') : message,
        ...(details !== undefined && { details }),
      },
    });
  }
}
