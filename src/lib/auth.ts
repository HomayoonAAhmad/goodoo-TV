import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const sessionCookie = "kinema_session";
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function getUser() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
}
