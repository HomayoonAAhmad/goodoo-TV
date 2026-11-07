import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hashToken, sessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(sessionCookie);
  return response;
}
