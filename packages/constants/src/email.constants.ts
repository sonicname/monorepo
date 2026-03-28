export const EMAIL_QUEUE_NAME = 'email';
export const EMAIL_SEND_JOB_NAME = 'email.send';

export const EMAIL_QUEUE_DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 3_000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
} as const;

export type EmailJobData = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};
