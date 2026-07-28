import { NextResponse } from "next/server";
import { findUserByUsername, toPublicUser, verifyPassword } from "@/lib/users";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 },
      );
    }

    const user = await findUserByUsername(username);
    if (!user || !(await verifyPassword(user, password))) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ user: toPublicUser(user) });
  } catch {
    return NextResponse.json({ error: "Unable to log in right now." }, { status: 500 });
  }
}
