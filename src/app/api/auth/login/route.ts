import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { hashToken, sessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { phone, code } = await request.json();
  const normalized = String(phone || "").replace(/[۰-۹]/g, (n) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(n))).replace(/[٠-٩]/g, (n) => String("٠١٢٣٤٥٦٧٨٩".indexOf(n))).replace(/\D/g, "").replace(/^0098/, "0").replace(/^98/, "0");
  if (!/^09\d{9}$/.test(normalized) || code !== "123456")
    return NextResponse.json({ error: "شماره تلفن یا کد نادرست است." }, { status: 400 });
  const user = await prisma.user.upsert({
    where: { phone: normalized },
    update: {},
    create: { phone: normalized },
  });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId: user.id, expiresAt },
  });
  const response = NextResponse.json({ ok: true });
  const secure =
    request.headers.get("x-forwarded-proto") === "https" ||
    new URL(request.url).protocol === "https:";
  response.cookies.set(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: expiresAt,
  });
  return response;
}
