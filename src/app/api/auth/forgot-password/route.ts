import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { usernameOrEmail?: string };
    const usernameOrEmail = body.usernameOrEmail?.trim() ?? "";

    if (!usernameOrEmail) {
      return NextResponse.json(
        { error: "Enter your username or email." },
        { status: 400 },
      );
    }

    const result = await createPasswordResetToken(usernameOrEmail);

    // Always return success to avoid account enumeration.
    // In production, email the link; for local demo we return it when found.
    if (!result) {
      return NextResponse.json({
        message:
          "If an account exists for that username or email, a reset link has been prepared.",
      });
    }

    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/reset-password?token=${result.token}`;

    return NextResponse.json({
      message:
        "Password reset link created. Use the link below to set a new password.",
      resetUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to start password reset right now." },
      { status: 500 },
    );
  }
}
