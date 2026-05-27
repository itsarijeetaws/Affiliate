import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function createTransport() {
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,   // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
}

export interface BroadcastResult {
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Send a broadcast email to a list of addresses.
 * Uses BCC batching (50 per send) to avoid exposing addresses to each other.
 */
export async function sendBroadcast(
  recipients: string[],
  subject: string,
  htmlBody: string,
  textBody: string,
): Promise<BroadcastResult> {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    throw new Error("SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env");
  }

  const transport = createTransport();
  const BATCH = 50;
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    try {
      await transport.sendMail({
        from: `"BestBuysIndia" <${env.smtpUser}>`,
        bcc: batch,
        subject,
        html: htmlBody,
        text: textBody,
      });
      sent += batch.length;
    } catch (err) {
      failed += batch.length;
      errors.push(String(err));
    }
  }

  return { sent, failed, errors };
}

/**
 * Send a single transactional email (e.g. new subscriber notification).
 */
export async function sendNotification(to: string, subject: string, html: string): Promise<void> {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) return; // silently skip if not configured

  const transport = createTransport();
  await transport.sendMail({
    from: `"BestBuysIndia" <${env.smtpUser}>`,
    to,
    subject,
    html,
  });
}
