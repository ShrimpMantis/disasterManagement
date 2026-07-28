import { promises as fs } from "fs";
import path from "path";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";

export type User = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  resetTokenHash: string | null;
  resetTokenExpiresAt: string | null;
  createdAt: string;
};

type UserStore = {
  users: User[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function ensureStore(): Promise<UserStore> {
  try {
    const raw = await fs.readFile(USERS_FILE, "utf-8");
    return JSON.parse(raw) as UserStore;
  } catch {
    const empty: UserStore = { users: [] };
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(USERS_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function saveStore(store: UserStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(store, null, 2));
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const store = await ensureStore();
  return store.users.find(
    (user) => user.username.toLowerCase() === username.toLowerCase(),
  );
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const store = await ensureStore();
  return store.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export async function findUserById(id: string): Promise<User | undefined> {
  const store = await ensureStore();
  return store.users.find((user) => user.id === id);
}

export async function createUser(input: {
  username: string;
  email: string;
  password: string;
}): Promise<User> {
  const store = await ensureStore();
  const usernameTaken = store.users.some(
    (user) => user.username.toLowerCase() === input.username.toLowerCase(),
  );
  const emailTaken = store.users.some(
    (user) => user.email.toLowerCase() === input.email.toLowerCase(),
  );

  if (usernameTaken) {
    throw new Error("USERNAME_TAKEN");
  }
  if (emailTaken) {
    throw new Error("EMAIL_TAKEN");
  }

  const user: User = {
    id: randomBytes(16).toString("hex"),
    username: input.username.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(input.password, 10),
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    createdAt: new Date().toISOString(),
  };

  store.users.push(user);
  await saveStore(store);
  return user;
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function createPasswordResetToken(
  usernameOrEmail: string,
): Promise<{ token: string; user: User } | null> {
  const store = await ensureStore();
  const normalized = usernameOrEmail.trim().toLowerCase();
  const user = store.users.find(
    (entry) =>
      entry.username.toLowerCase() === normalized ||
      entry.email.toLowerCase() === normalized,
  );

  if (!user) {
    return null;
  }

  const token = randomBytes(32).toString("hex");
  user.resetTokenHash = hashToken(token);
  user.resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await saveStore(store);

  return { token, user };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<boolean> {
  const store = await ensureStore();
  const tokenHash = hashToken(token);
  const user = store.users.find((entry) => entry.resetTokenHash === tokenHash);

  if (!user || !user.resetTokenExpiresAt) {
    return false;
  }

  if (new Date(user.resetTokenExpiresAt).getTime() < Date.now()) {
    return false;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetTokenHash = null;
  user.resetTokenExpiresAt = null;
  await saveStore(store);
  return true;
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
}
