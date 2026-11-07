import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد شوید." }, { status: 401 });
  const { firstName, lastName, username, avatar } = await request.json();
  if (
    typeof firstName !== "string" ||
    firstName.trim().length < 2 ||
    firstName.trim().length > 40 ||
    typeof lastName !== "string" ||
    lastName.trim().length > 40 ||
    typeof username !== "string" ||
    !/^[a-zA-Z0-9_]{3,24}$/.test(username)
  )
    return NextResponse.json({ error: "نام و نام کاربری معتبر وارد کن." }, { status: 400 });
  if (
    avatar !== null &&
    avatar !== undefined &&
    (typeof avatar !== "string" ||
      (avatar &&
        (!/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(avatar) ||
          avatar.length > 350_000)))
  )
    return NextResponse.json(
      { error: "عکس معتبر با حجم کمتر از ۲۵۰ کیلوبایت انتخاب کن." },
      { status: 400 },
    );
  const taken = await prisma.user.findFirst({
    where: { username, NOT: { id: user.id } },
    select: { id: true },
  });
  if (taken)
    return NextResponse.json({ error: "این نام کاربری قبلاً گرفته شده است." }, { status: 409 });
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim() || null,
      username,
      avatar: avatar || null,
    },
  });
  return NextResponse.json({
    firstName: updated.firstName,
    lastName: updated.lastName,
    username: updated.username,
    avatar: updated.avatar,
  });
}
