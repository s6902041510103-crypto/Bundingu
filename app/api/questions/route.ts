import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createQuestionRecord,
  listQuestions,
  verifyTeacherSessionToken,
} from "@/lib/server/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject") || undefined;
  const difficulty = searchParams.get("difficulty") || undefined;
  const search = searchParams.get("search") || undefined;

  const questions = listQuestions({ subject, difficulty, search });
  return NextResponse.json({ questions });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ks_teacher_token")?.value;
  const session = verifyTeacherSessionToken(token);
  if (!session) {
    return NextResponse.json(
      { error: "กรุณาเข้าสู่ระบบครูผู้สอนก่อนเพิ่มคำถาม" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const result = createQuestionRecord({
      prompt: body.prompt,
      subject: body.subject,
      difficulty: body.difficulty,
      options: body.options,
      correctIndex: Number(body.correctIndex),
      explanation: body.explanation,
      hint: body.hint,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, question: result.question }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "ข้อมูลคำถามไม่ถูกต้อง" },
      { status: 400 },
    );
  }
}
