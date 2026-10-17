import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createRoomOnServer,
  deleteServerRoom,
  listActiveServerRooms,
  toPublicGameState,
} from "@/lib/server/game-engine";
import {
  listGameHistory,
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

  if (!session) {
    return NextResponse.json({
      activeRooms: [],
      history: [],
      questionsCount: 0,
    });
  }

  const questions = listQuestions({ teacherId: session.teacherId });
  const activeRooms = listActiveServerRooms(session.teacherId).map((r) =>
    toPublicGameState(r),
  );
  const history = listGameHistory(session.teacherId);

  const response = NextResponse.json({
    activeRooms,
    history,
    questionsCount: questions.length,
  });
  response.cookies.set("ks_teacher_token", session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
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
      { error: "กรุณาเข้าสู่ระบบครูผู้สอนก่อนสร้างห้องเกม" },
      { status: 401 },
    );
  }

  try {
    const result = createRoomOnServer({
      title: String(body.title ?? ""),
      subject: String(body.subject ?? "คณิตศาสตร์"),
      grade: String(body.grade ?? "มัธยมศึกษาปีที่ 1"),
      totalRounds: Number(body.totalRounds ?? 5),
      questionTimeLimit: Number(body.questionTimeLimit ?? 20),
      maxPlayers: Number(body.maxPlayers ?? 40),
      questionIds: Array.isArray(body.questionIds) ? body.questionIds : undefined,
      enabledSpecials: Array.isArray(body.enabledSpecials)
        ? body.enabledSpecials
        : ["star", "gift", "boost"],
      teacherId: session.teacherId,
      hostName: session.name,
      seedDemoPlayers: Boolean(body.seedDemoPlayers),
    });

    if (result.error || !result.room) {
      return NextResponse.json({ error: result.error || "สร้างเกมไม่สำเร็จ" }, { status: 400 });
    }

    const response = NextResponse.json(
      {
        ok: true,
        pin: result.room.pin,
        state: toPublicGameState(result.room),
      },
      { status: 201 },
    );
    response.cookies.set("ks_teacher_token", session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: "ข้อมูลการสร้างเกมไม่ถูกต้อง" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
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
    return NextResponse.json(
      { error: "กรุณาเข้าสู่ระบบครูผู้สอนก่อนลบห้องเกม" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const pinOrId = searchParams.get("pin") || searchParams.get("id");
  if (!pinOrId) {
    return NextResponse.json(
      { error: "กรุณาระบุรหัสห้อง (PIN หรือ ID) ที่ต้องการลบ" },
      { status: 400 },
    );
  }

  const deleted = deleteServerRoom(pinOrId, session.teacherId);
  if (!deleted) {
    return NextResponse.json(
      { error: "ไม่พบห้องเกมที่ต้องการลบ หรือไม่มีสิทธิ์ลบห้องนี้" },
      { status: 404 },
    );
  }

  const response = NextResponse.json({ success: true, ok: true, deleted: true });
  response.cookies.set("ks_teacher_token", session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
