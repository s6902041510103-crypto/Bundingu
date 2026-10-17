import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createQuestionRecord,
  listQuestions,
  resolveTeacherSession,
} from "@/lib/server/repository";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ks_teacher_token")?.value;
  const teacherIdHeader = request.headers.get("x-teacher-id");
  const teacherEmailHeader = request.headers.get("x-teacher-email");

  const session = resolveTeacherSession({
    token,
    teacherId: teacherIdHeader,
    email: teacherEmailHeader,
  });

  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject") || undefined;
  const difficulty = searchParams.get("difficulty") || undefined;
  const search = searchParams.get("search") || undefined;

  const questions = listQuestions({
    subject,
    difficulty,
    search,
    teacherId: session?.teacherId,
  });

  const response = NextResponse.json({ questions });
  if (session) {
    response.cookies.set("ks_teacher_token", session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return response;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ks_teacher_token")?.value;
  const teacherIdHeader = request.headers.get("x-teacher-id");
  const teacherEmailHeader = request.headers.get("x-teacher-email");

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const session = resolveTeacherSession({
    token,
    teacherId: teacherIdHeader || body?.teacherId,
    email: teacherEmailHeader || body?.teacherEmail,
  });

  if (!session) {
    return NextResponse.json(
      { error: "กรุณาเข้าสู่ระบบครูผู้สอนก่อนเพิ่มคำถาม" },
      { status: 401 },
    );
  }

  try {
    const result = createQuestionRecord({
      prompt: body.prompt,
      subject: body.subject,
      difficulty: body.difficulty,
      options: body.options,
      correctIndex: Number(body.correctIndex),
      explanation: body.explanation,
      hint: body.hint,
      teacherId: session.teacherId,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const response = NextResponse.json(
      { ok: true, question: result.question },
      { status: 201 },
    );
    response.cookies.set("ks_teacher_token", session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "ข้อมูลคำถามไม่ถูกต้อง" },
      { status: 400 },
    );
  }
}
