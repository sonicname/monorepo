export * from './templates.js';

import { createTransport, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export function getEmailConfig(env: Record<string, unknown>): EmailConfig {
  return {
    host: String(env.SMTP_HOST ?? 'localhost'),
    port: Number(env.SMTP_PORT ?? 587),
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER ? String(env.SMTP_USER) : undefined,
    pass: env.SMTP_PASS ? String(env.SMTP_PASS) : undefined,
    from: String(env.SMTP_FROM ?? 'noreply@localhost'),
  };
}

export function createEmailTransport(
  config: EmailConfig,
): Transporter<SMTPTransport.SentMessageInfo> {
  return createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth:
      config.user && config.pass
        ? { user: config.user, pass: config.pass }
        : undefined,
  });
}

export async function sendEmail(
  transporter: Transporter<SMTPTransport.SentMessageInfo>,
  from: string,
  options: SendEmailOptions,
): Promise<SMTPTransport.SentMessageInfo> {
  return transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

export async function verifyEmailTransport(
  transporter: Transporter<SMTPTransport.SentMessageInfo>,
): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
