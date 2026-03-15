export const EMAIL_VERIFICATION_WINDOW_MS = 1000 * 60 * 60 * 24;
export const PASSWORD_RESET_WINDOW_MS = 1000 * 60 * 30;

export const AUTH_REDIRECTS = {
  login: "/login",
  register: "/register",
  verifySuccess: "/login?verified=1",
  verifyFailed: "/verify-email?error=invalid_token",
  resetRequestSuccess: "/forgot-password?sent=1",
  resetSuccess: "/login?reset=1",
} as const;

