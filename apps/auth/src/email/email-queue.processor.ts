import { EMAIL_SEND_JOB_NAME, type EmailJobData } from '@monorepo/constants';
import { sendEmail } from '@monorepo/email';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from './email.service';

@Processor('email')
export class EmailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    if (job.name !== EMAIL_SEND_JOB_NAME) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return;
    }

    const { to, subject, html, text } = job.data;

    await sendEmail(this.emailService.getTransporter(), this.emailService.getFrom(), {
      to,
      subject,
      html,
      text,
    });

    this.logger.log(`Email sent to ${to}: ${subject} (job ${job.id})`);
  }
}
