import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  flushStoreToRedis,
  resolveTeacherSession,
  syncStoreFromRedis,
} from "@/lib/server/repository";

export async function GET(request: Request) {
  await syncStoreFromRedis();

  const cookieStore = await cookies();
  const token = cookieStore.get("ks_teacher_token")?.value;
  const teacherIdHeader = request.headers.get("x-teacher-id");
  const teacherEmailHeader = request.headers.get("x-teacher-email");

  const session = resolveTeacherSession({
    token,
    teacherId: teacherIdHeader,
    email: teacherEmailHeader,
  });

  if (!session) {
    return NextResponse.json({ authenticated: false, teacher: null }, { status: 401 });
  }

  await flushStoreToRedis();

  const response = NextResponse.json({
    authenticated: true,
    teacher: {
      teacherId: session.teacherId,
      email: session.email,
      name: session.name,
      school: session.school,
    },
  });

  response.cookies.set("ks_teacher_token", session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
