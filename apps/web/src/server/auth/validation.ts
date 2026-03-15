import { z } from "zod";

export const registerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export const forgotPasswordInputSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const resetPasswordInputSchema = z.object({
  token: z.string().trim().min(20),
  password: z.string().min(8).max(128),
});

