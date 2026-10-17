import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyTeacherSessionToken } from "@/lib/server/repository";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ks_teacher_token")?.value;
  const session = verifyTeacherSessionToken(token);

  if (!session) {
    return NextResponse.json({ authenticated: false, teacher: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    teacher: {
      teacherId: session.teacherId,
      email: session.email,
      name: session.name,
      school: session.school,
    },
  });
}
