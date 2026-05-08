import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

const PASSWORD_RESET_EXPIRY_MINUTES = 60;
const SECURITY_CODE_EXPIRY_MINUTES = 10;

function hashCode(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

function generateSixDigitCode(): string {
  const num = randomBytes(3).readUIntBE(0, 3) % 1_000_000;
  return num.toString().padStart(6, "0");
}

// ─── PASSWORD RESET ───────────────────────────────────────────────────────────

export async function createPasswordResetToken(userId: string, email: string): Promise<string> {
  // Invalidar tokens anteriores del mismo usuario
  await prisma.emailVerification.deleteMany({
    where: { userId, type: "PASSWORD_RESET" },
  });

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

  await prisma.emailVerification.create({
    data: {
      userId,
      email,
      codeHash: hashCode(token),
      type: "PASSWORD_RESET",
      expiresAt,
    },
  });

  return token;
}

export async function validatePasswordResetToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  const record = await prisma.emailVerification.findFirst({
    where: {
      codeHash: hashCode(token),
      type: "PASSWORD_RESET",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) return null;
  return { userId: record.userId, email: record.email };
}

export async function consumePasswordResetToken(token: string): Promise<boolean> {
  const record = await prisma.emailVerification.findFirst({
    where: {
      codeHash: hashCode(token),
      type: "PASSWORD_RESET",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) return false;

  await prisma.emailVerification.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return true;
}

// ─── SECURITY CODE ────────────────────────────────────────────────────────────

export async function createSecurityCode(userId: string, email: string): Promise<string> {
  // Invalidar códigos anteriores del mismo usuario
  await prisma.emailVerification.deleteMany({
    where: { userId, type: "SECURITY_CODE" },
  });

  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + SECURITY_CODE_EXPIRY_MINUTES * 60 * 1000);

  await prisma.emailVerification.create({
    data: {
      userId,
      email,
      codeHash: hashCode(code),
      type: "SECURITY_CODE",
      expiresAt,
    },
  });

  return code;
}

export async function validateAndConsumeSecurityCode(
  userId: string,
  code: string
): Promise<boolean> {
  const record = await prisma.emailVerification.findFirst({
    where: {
      userId,
      codeHash: hashCode(code),
      type: "SECURITY_CODE",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) return false;

  await prisma.emailVerification.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return true;
}
