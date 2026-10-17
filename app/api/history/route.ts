import { NextResponse } from "next/server";
import { getGameHistoryByPinOrId, listGameHistory } from "@/lib/server/repository";

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

  const history = listGameHistory();
  return NextResponse.json({ history });
}
