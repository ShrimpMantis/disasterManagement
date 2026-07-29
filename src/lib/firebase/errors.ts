import { FirebaseError } from "firebase/app";

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return "Something went wrong. Try again.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again.";
    case "auth/invalid-phone-number":
      return "Invalid phone number. Country code is required — use a leading + (e.g. +919876543210).";
    case "auth/missing-phone-number":
      return "Phone number is required, including country code (e.g. +919876543210).";
    case "auth/quota-exceeded":
      return "SMS quota exceeded. Try again later.";
    case "auth/code-expired":
      return "The verification code has expired. Request a new one.";
    case "auth/invalid-verification-code":
      return "Invalid verification code.";
    case "auth/missing-verification-code":
      return "Enter the verification code sent to your phone.";
    case "auth/captcha-check-failed":
      return "reCAPTCHA verification failed. Refresh and try again.";
    case "auth/invalid-app-credential":
      return "Phone verification failed. On local dev, add a test phone number in Firebase Console → Authentication → Phone, or try the deployed app.";
    case "auth/invalid-action-code":
      return "This password reset link is invalid or has expired.";
    case "auth/expired-action-code":
      return "This password reset link has expired. Request a new one.";
    case "auth/missing-email":
      return "Email address is required.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in Firebase.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return error.message || "Unable to complete authentication.";
  }
}

export function toE164Phone(input: string): string {
  const trimmed = input.trim().replace(/[\s()-]/g, "");
  if (!trimmed) return "";
  // Require an explicit country code; do not invent one by prefixing "+".
  if (trimmed.startsWith("+")) return trimmed;
  return "";
}

export function phoneMissingCountryCode(input: string): boolean {
  const trimmed = input.trim().replace(/[\s()-]/g, "");
  return Boolean(trimmed) && !trimmed.startsWith("+");
}
