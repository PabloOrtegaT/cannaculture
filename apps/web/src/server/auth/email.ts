import { Resend } from "resend";
import { getRuntimeEnvironment } from "@/server/config/runtime-env";

function getEmailClient() {
  const env = getRuntimeEnvironment();
  if (!env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(env.RESEND_API_KEY);
}

function getFromAddress() {
  const env = getRuntimeEnvironment();
  return env.RESEND_FROM_EMAIL ?? "Base Ecommerce <noreply@example.com>";
}

export async function sendVerificationEmail(to: string, verificationUrl: string) {
  const client = getEmailClient();
  if (!client) {
    console.info(`[auth] RESEND_API_KEY not configured. Verification link for ${to}: ${verificationUrl}`);
    return;
  }

  await client.emails.send({
    from: getFromAddress(),
    to,
    subject: "Verify your Base Ecommerce account",
    html: `<p>Click to verify your account:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const client = getEmailClient();
  if (!client) {
    console.info(`[auth] RESEND_API_KEY not configured. Reset link for ${to}: ${resetUrl}`);
    return;
  }

  await client.emails.send({
    from: getFromAddress(),
    to,
    subject: "Reset your Base Ecommerce password",
    html: `<p>Click to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}

