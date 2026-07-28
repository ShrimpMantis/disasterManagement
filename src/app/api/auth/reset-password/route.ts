import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      password?: string;
    };

    const token = body.token?.trim() ?? "";
    const password = body.password ?? "";

    if (!token) {
      return NextResponse.json({ error: "Reset token is missing." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const ok = await resetPasswordWithToken(token, password);
    if (!ok) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Password updated. You can log in now." });
  } catch {
    return NextResponse.json(
      { error: "Unable to reset password right now." },
      { status: 500 },
    );
  }
}
