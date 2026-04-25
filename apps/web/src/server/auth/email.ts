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
  if (process.env.NEXTJS_ENV === "production" && !env.RESEND_FROM_EMAIL) {
    throw new Error("RESEND_FROM_EMAIL is required in production");
  }
  return env.RESEND_FROM_EMAIL ?? "Cannaculture <noreply@cannaculture.com.mx>";
}

export async function sendVerificationEmail(to: string, verificationUrl: string) {
  const client = getEmailClient();
  if (!client) {
    console.info(`[auth] RESEND_API_KEY not configured. Skipping verification email for ${to}.`);
    return;
  }

  await client.emails.send({
    from: getFromAddress(),
    to,
    subject: "Verifica tu cuenta de Cannaculture",
    html: `<p>Click to verify your account:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const client = getEmailClient();
  if (!client) {
    console.info(`[auth] RESEND_API_KEY not configured. Skipping password reset email for ${to}.`);
    return;
  }

  await client.emails.send({
    from: getFromAddress(),
    to,
    subject: "Restablece tu contraseña de Cannaculture",
    html: `<p>Click to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}
