import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  deleteQuestionRecord,
  updateQuestionRecord,
  verifyTeacherSessionToken,
} from "@/lib/server/repository";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ks_teacher_token")?.value;
  const session = verifyTeacherSessionToken(token);
  if (!session) {
    return NextResponse.json(
      { error: "กรุณาเข้าสู่ระบบครูผู้สอนก่อนแก้ไขคำถาม" },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = updateQuestionRecord(id, {
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

    return NextResponse.json({ ok: true, question: result.question });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถบันทึกการแก้ไขคำถามได้" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ks_teacher_token")?.value;
  const session = verifyTeacherSessionToken(token);
  if (!session) {
    return NextResponse.json(
      { error: "กรุณาเข้าสู่ระบบครูผู้สอนก่อนลบคำถาม" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const result = deleteQuestionRecord(id);
  if (!result.deleted) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
