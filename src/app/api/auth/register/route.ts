import { NextResponse } from "next/server";
import { createUser, toPublicUser } from "@/lib/users";
import { createSession } from "@/lib/session";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      email?: string;
      password?: string;
    };

    const username = body.username?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const user = await createUser({ username, email, password });
    await createSession(user.id);

    return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USERNAME_TAKEN") {
        return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
      }
      if (error.message === "EMAIL_TAKEN") {
        return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
      }
    }

    return NextResponse.json({ error: "Unable to register right now." }, { status: 500 });
  }
}
