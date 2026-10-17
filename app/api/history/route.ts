import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteServerRoom } from "@/lib/server/game-engine";
import {
  getGameHistoryByPinOrId,
  listGameHistory,
  verifyTeacherSessionToken,
} from "@/lib/server/repository";

export async function GET(request: Request) {
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
  const session = verifyTeacherSessionToken(token);

  if (!session) {
    return NextResponse.json({ history: [] });
  }

  const history = listGameHistory(session.teacherId);
  return NextResponse.json({ history });
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ks_teacher_token")?.value;
  const session = verifyTeacherSessionToken(token);

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

  return NextResponse.json({ ok: true, deleted: true });
}
