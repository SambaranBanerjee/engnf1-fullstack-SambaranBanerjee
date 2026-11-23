import argon2 from "argon2";

export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

export async function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, {
    type: argon2.argon2id,
  });
}

export async function verifyPassword(
  passwordHash: string,
  plainPassword: string,
): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, plainPassword);
  } catch {
    return false;
  }
}