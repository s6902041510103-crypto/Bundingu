import { NextResponse } from "next/server";
import { getServerRoom, toPublicGameState } from "@/lib/server/game-engine";

export async function GET(
  request: Request,
  context: { params: Promise<{ pin: string }> },
) {
  const { pin } = await context.params;
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");

  const room = getServerRoom(pin);
  if (!room) {
    return NextResponse.json(
      { error: `ไม่พบห้องเกมรหัส PIN ${pin}` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    state: toPublicGameState(room, playerId),
  });
}
