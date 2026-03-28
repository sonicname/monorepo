import {
  createEmailTransport,
  getEmailConfig,
  sendEmail,
  type SendEmailOptions,
} from '@monorepo/email';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: Transporter<SMTPTransport.SentMessageInfo>;
  private from!: string;

  constructor(private readonly configService: ConfigService) {}

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

  async send(options: SendEmailOptions): Promise<void> {
    try {
      await sendEmail(this.transporter, this.from, options);
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
