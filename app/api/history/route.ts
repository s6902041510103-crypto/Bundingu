import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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
      return NextResponse.json({ error: "ไม่พบข้อมูลประวัติเกม" }, { status: 404 });
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
