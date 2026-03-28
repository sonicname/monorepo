import {
  EMAIL_QUEUE_DEFAULT_JOB_OPTIONS,
  EMAIL_QUEUE_NAME,
  EMAIL_SEND_JOB_NAME,
  type EmailJobData,
} from '@monorepo/constants';
import {
  createEmailTransport,
  getEmailConfig,
  type SendEmailOptions,
} from '@monorepo/email';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: Transporter<SMTPTransport.SentMessageInfo>;
  private from!: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(EMAIL_QUEUE_NAME)
    private readonly emailQueue: Queue<EmailJobData>,
  ) {}

  onModuleInit() {
    const config = getEmailConfig({
      SMTP_HOST: this.configService.get<unknown>('SMTP_HOST'),
      SMTP_PORT: this.configService.get<unknown>('SMTP_PORT'),
      SMTP_SECURE: this.configService.get<unknown>('SMTP_SECURE'),
      SMTP_USER: this.configService.get<unknown>('SMTP_USER'),
      SMTP_PASS: this.configService.get<unknown>('SMTP_PASS'),
      SMTP_FROM: this.configService.get<unknown>('SMTP_FROM'),
    });

    this.from = config.from;
    this.transporter = createEmailTransport(config);
    this.logger.log(`Email transport configured: ${config.host}:${config.port}`);
  }

  /** Enqueue an email job for async processing with retries. */
  async send(options: SendEmailOptions): Promise<void> {
    await this.emailQueue.add(
      EMAIL_SEND_JOB_NAME,
      {
        to: options.to,
        subject: options.subject,
        html: options.html ?? '',
        text: options.text,
      },
      EMAIL_QUEUE_DEFAULT_JOB_OPTIONS,
    );

    this.logger.log(`Email queued for ${options.to}: ${options.subject}`);
  }

  /** Used by the queue processor to access the configured transporter. */
  getTransporter(): Transporter<SMTPTransport.SentMessageInfo> {
    return this.transporter;
  }

  /** Used by the queue processor to access the configured from address. */
  getFrom(): string {
    return this.from;
  }
}
