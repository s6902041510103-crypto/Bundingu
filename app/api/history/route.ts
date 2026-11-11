import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteServerRoom } from "@/lib/server/game-engine";
import { deleteRoomFromRedis } from "@/lib/server/redis";
import {
  flushStoreToRedis,
  getGameHistoryByPinOrId,
  listGameHistory,
  overwriteLocalStoreFromRedis,
  resolveTeacherSession,
  syncStoreFromRedis,
} from "@/lib/server/repository";

export async function GET(request: Request) {
  await syncStoreFromRedis();

  const { searchParams } = new URL(request.url);
  const pinOrId = searchParams.get("id") || searchParams.get("pin");

  if (pinOrId) {
    const item = getGameHistoryByPinOrId(pinOrId);
    if (!item) {
      return NextResponse.json({ error: "ไม่พบข้อมูลห้องเกมที่บันทึกไว้" }, { status: 404 });
    }
    return NextResponse.json({ record: item });
  }

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
    return NextResponse.json({ history: [] });
  }

  const history = listGameHistory(session.teacherId);
  const response = NextResponse.json({ history });
  response.cookies.set("ks_teacher_token", session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE(request: Request) {
  await overwriteLocalStoreFromRedis();

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
  await Promise.all([
    deleteRoomFromRedis(pinOrId),
    flushStoreToRedis(),
  ]);

  if (!deleted) {
    return NextResponse.json(
      { error: "ไม่พบห้องเกมที่ต้องการลบ หรือไม่มีสิทธิ์ลบห้องนี้" },
      { status: 404 },
    );
  }

  const response = NextResponse.json({ ok: true, deleted: true });
  response.cookies.set("ks_teacher_token", session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
