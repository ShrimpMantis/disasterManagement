import { FirebaseError } from "firebase/app";

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
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
      return "Enter a valid phone number with country code (e.g. +919876543210).";
    case "auth/missing-phone-number":
      return "Phone number is required.";
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
  if (trimmed.startsWith("+")) return trimmed;
  return `+${trimmed}`;
}
