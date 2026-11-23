import { sql } from "drizzle-orm";
import { db } from "../../database/connection.js";
import { users } from "../../database/schema/index.js";
import { AppError } from "../../errors/AppError.js";
import { signAccessToken, type UserRole } from "../../utils/jwt.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import type { LoginInput, RegisterInput } from "./auth.validation.js";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

function toSafeUser(row: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}): SafeUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
  };
}

export async function registerUser(input: RegisterInput): Promise<SafeUser> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`LOWER(${users.email}) = ${normalizedEmail}`)
    .limit(1);

  if (existing.length > 0) {
    throw AppError.conflict("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  try {
    // Public registration always assigns USER role; ADMIN is seeded only
    const [created] = await db
      .insert(users)
      .values({
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "USER",
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      });

    return toSafeUser(created);
  } catch (err: unknown) {
    const pgErr = err as { code?: string; cause?: { code?: string } };
    if (pgErr?.code === "23505" || pgErr?.cause?.code === "23505") {
      throw AppError.conflict("An account with this email already exists");
    }
    throw err;
  }
}

export async function loginUser(
  input: LoginInput,
): Promise<{ token: string; user: SafeUser }> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const [found] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`LOWER(${users.email}) = ${normalizedEmail}`)
    .limit(1);

  if (!found) {
    throw AppError.unauthenticated("Invalid email or password");
  }

  const isValid = await verifyPassword(found.passwordHash, input.password);
  if (!isValid) {
    throw AppError.unauthenticated("Invalid email or password");
  }

  const token = signAccessToken({
    sub: found.id,
    email: found.email,
    role: found.role,
  });

  return {
    token,
    user: toSafeUser(found),
  };
}

export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const [found] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(sql`${users.id} = ${userId}`)
    .limit(1);

  if (!found) {
    throw AppError.unauthenticated("User account no longer exists");
  }

  return toSafeUser(found);
}