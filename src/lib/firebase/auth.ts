"use client";

import {
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
  updateProfile,
  confirmPasswordReset,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";
import { toE164Phone } from "./errors";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

export async function registerWithEmail(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(
    auth,
    input.email.trim(),
    input.password,
  );

  if (input.displayName.trim()) {
    await updateProfile(credential.user, {
      displayName: input.displayName.trim(),
    });
  }

  return credential.user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export function ensureRecaptcha(containerId = "recaptcha-container"): RecaptchaVerifier {
  const auth = getFirebaseAuth();

  if (typeof window === "undefined") {
    throw new Error("reCAPTCHA can only be initialized in the browser.");
  }

  if (window.recaptchaVerifier) {
    return window.recaptchaVerifier;
  }

  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => undefined,
    "expired-callback": () => {
      clearRecaptcha();
    },
  });

  return window.recaptchaVerifier;
}

export function clearRecaptcha() {
  if (typeof window === "undefined") return;
  try {
    window.recaptchaVerifier?.clear();
  } catch {
    // ignore cleanup errors
  }
  window.recaptchaVerifier = undefined;
}

export async function sendPhoneOtp(phoneNumber: string): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  const verifier = ensureRecaptcha();
  const e164 = toE164Phone(phoneNumber);

  try {
    return await signInWithPhoneNumber(auth, e164, verifier);
  } catch (error) {
    clearRecaptcha();
    throw error;
  }
}

export async function confirmPhoneOtp(
  confirmation: ConfirmationResult,
  code: string,
): Promise<User> {
  const credential = await confirmation.confirm(code.trim());
  return credential.user;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  const continueUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/reset-password`
      : undefined;

  await sendPasswordResetEmail(
    auth,
    email.trim(),
    continueUrl
      ? {
          url: continueUrl,
          handleCodeInApp: false,
        }
      : undefined,
  );
}

export async function confirmPasswordUpdate(
  oobCode: string,
  newPassword: string,
): Promise<void> {
  const auth = getFirebaseAuth();
  await confirmPasswordReset(auth, oobCode, newPassword);
}

export async function logoutFirebase(): Promise<void> {
  clearRecaptcha();
  await signOut(getFirebaseAuth());
}

export function getUserLabel(user: User | null): string {
  if (!user) return "";
  return user.displayName || user.email || user.phoneNumber || "User";
}

export function getUserSecondary(user: User | null): string {
  if (!user) return "";
  if (user.email && user.phoneNumber) {
    return `${user.email} · ${user.phoneNumber}`;
  }
  return user.email || user.phoneNumber || user.uid;
}
