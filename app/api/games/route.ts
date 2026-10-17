import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createRoomOnServer,
  listActiveServerRooms,
  toPublicGameState,
} from "@/lib/server/game-engine";
import {
  listGameHistory,
  listQuestions,
  verifyTeacherSessionToken,
} from "@/lib/server/repository";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ks_teacher_token")?.value;
  const session = verifyTeacherSessionToken(token);

  const questions = listQuestions();

  if (!session) {
    return NextResponse.json({
      activeRooms: [],
      history: [],
      questionsCount: questions.length,
    });
  }

  const activeRooms = listActiveServerRooms(session.teacherId).map((r) =>
    toPublicGameState(r),
  );
  const history = listGameHistory(session.teacherId);

  return NextResponse.json({
    activeRooms,
    history,
    questionsCount: questions.length,
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ks_teacher_token")?.value;
  const session = verifyTeacherSessionToken(token);

  if (!session) {
    return NextResponse.json(
      { error: "กรุณาเข้าสู่ระบบครูผู้สอนก่อนสร้างห้องเกม" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
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

    return NextResponse.json(
      {
        ok: true,
        pin: result.room.pin,
        state: toPublicGameState(result.room),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "ข้อมูลการสร้างเกมไม่ถูกต้อง" },
      { status: 400 },
    );
  }
}
