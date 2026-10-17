import { NextResponse } from "next/server";
import { authenticateTeacherAccount } from "@/lib/server/repository";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" },
        { status: 400 },
      );
    }

    // Optional strict password check if TEACHER_ADMIN_PASSWORD env var is set
    const requiredPassword = process.env.TEACHER_ADMIN_PASSWORD;
    if (requiredPassword && password !== requiredPassword) {
      return NextResponse.json(
        { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }

    const authResult = authenticateTeacherAccount(email, password);
    if (authResult.error || !authResult.session) {
      return NextResponse.json(
        { error: authResult.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }

    const session = authResult.session;

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
      { error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 },
    );
  }
}
