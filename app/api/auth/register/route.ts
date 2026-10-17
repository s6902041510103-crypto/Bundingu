import { NextResponse } from "next/server";
import { registerTeacherAccount } from "@/lib/server/repository";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");
    const confirmPassword = String(body?.confirmPassword ?? password);
    const school = String(body?.school ?? "").trim();

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน" },
        { status: 400 },
      );
    }

    const result = registerTeacherAccount({
      name,
      email,
      password,
      school,
    });

    if (result.error || !result.session) {
      return NextResponse.json(
        { error: result.error || "ไม่สามารถสร้างบัญชีได้ กรุณาตรวจสอบข้อมูลอีกครั้ง" },
        { status: 400 },
      );
    }

    const { session } = result;
    const response = NextResponse.json({
      ok: true,
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
  } catch {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการสร้างบัญชีครูผู้สอน กรุณาลองใหม่อีกครั้ง" },
      { status: 500 },
    );
  }
}
