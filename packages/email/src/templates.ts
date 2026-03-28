import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'src', 'templates');

const templateCache = new Map<string, HandlebarsTemplateDelegate>();

function loadTemplate(name: string): HandlebarsTemplateDelegate {
  const cached = templateCache.get(name);
  if (cached) return cached;

  const source = readFileSync(join(TEMPLATES_DIR, `${name}.hbs`), 'utf-8');
  const compiled = Handlebars.compile(source);
  templateCache.set(name, compiled);
  return compiled;
}

function renderWithLayout(
  templateName: string,
  data: Record<string, unknown>,
): string {
  const layout = loadTemplate('layout');
  const body = loadTemplate(templateName);
  return layout({ ...data, body: body(data) });
}

// -- Types --

export interface TemplateData {
  appName?: string;
}

export interface VerifyEmailData extends TemplateData {
  username: string;
  token: string;
  verifyUrl?: string;
  expiryHours: number;
}

export interface PasswordResetData extends TemplateData {
  username: string;
  token: string;
  resetUrl?: string;
  expiryHours: number;
}

export interface WelcomeData extends TemplateData {
  username: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// -- Template renderers --

export function verifyEmailTemplate(data: VerifyEmailData): RenderedEmail {
  const appName = data.appName ?? 'Monorepo';
  const html = renderWithLayout('verify-email', { ...data, appName });
  const text = `Hi ${data.username},\n\nVerify your email with this code: ${data.token}\n\nExpires in ${data.expiryHours} hour(s).`;

  return { subject: `Verify your email — ${appName}`, html, text };
}

export function passwordResetTemplate(data: PasswordResetData): RenderedEmail {
  const appName = data.appName ?? 'Monorepo';
  const html = renderWithLayout('password-reset', { ...data, appName });
  const text = `Hi ${data.username},\n\nReset your password with this code: ${data.token}\n\nExpires in ${data.expiryHours} hour(s).\n\nIf you didn't request this, ignore this email.`;

  return { subject: `Reset your password — ${appName}`, html, text };
}

export function welcomeTemplate(data: WelcomeData): RenderedEmail {
  const appName = data.appName ?? 'Monorepo';
  const html = renderWithLayout('welcome', { ...data, appName });
  const text = `Hi ${data.username},\n\nWelcome to ${appName}! Your account is verified and ready to use.`;

  return { subject: `Welcome to ${appName}!`, html, text };
}
