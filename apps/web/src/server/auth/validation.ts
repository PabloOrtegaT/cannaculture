import { z } from "zod";

const passwordErrorMessage =
  "Password must be at least 12 characters and contain uppercase, lowercase, and numeric characters";

const passwordSchema = z
  .string()
  .min(12, passwordErrorMessage)
  .max(128, passwordErrorMessage)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, passwordErrorMessage);

export const registerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: passwordSchema,
});

export const forgotPasswordInputSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const resetPasswordInputSchema = z.object({
  token: z.string().trim().min(20),
  password: passwordSchema,
});

