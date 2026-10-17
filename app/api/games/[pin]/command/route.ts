import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { executeServerGameCommand } from "@/lib/server/game-engine";
import { verifyTeacherSessionToken } from "@/lib/server/repository";
import type { ServerGameCommand } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ pin: string }> },
) {
  const { pin } = await context.params;
  const cookieStore = await cookies();
  const token = cookieStore.get("ks_teacher_token")?.value;
  const session = verifyTeacherSessionToken(token);

  try {
    const command = (await request.json()) as ServerGameCommand;
    const result = executeServerGameCommand(pin, command, {
      isTeacherAuthenticated: Boolean(session),
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      state: result.publicState,
      joinedPlayer: result.joinedPlayer,
    });
  } catch {
    return NextResponse.json(
      { error: "รูปแบบคำสั่งไม่ถูกต้อง" },
      { status: 400 },
    );
  }
}
