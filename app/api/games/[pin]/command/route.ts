import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { executeServerGameCommand, syncRoomWithRedis } from "@/lib/server/game-engine";
import { saveRoomToRedis } from "@/lib/server/redis";
import { resolveTeacherSession } from "@/lib/server/repository";
import type { ServerGameCommand } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ pin: string }> },
) {
  const { pin } = await context.params;
  const cookieStore = await cookies();
  const token = cookieStore.get("ks_teacher_token")?.value;
  const teacherIdHeader = request.headers.get("x-teacher-id");
  const teacherEmailHeader = request.headers.get("x-teacher-email");

  const session = resolveTeacherSession({
    token,
    teacherId: teacherIdHeader,
    email: teacherEmailHeader,
  });

  try {
    await syncRoomWithRedis(pin);
    const command = (await request.json()) as ServerGameCommand;
    const result = executeServerGameCommand(pin, command, {
      isTeacherAuthenticated: Boolean(session),
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    } 

    if (result.room) {
      await saveRoomToRedis(result.room);
    }

    const response = NextResponse.json({
      ok: true,
      state: result.publicState,
      joinedPlayer: result.joinedPlayer,
    });

    if (session) {
      response.cookies.set("ks_teacher_token", session.token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: "รูปแบบคำสั่งไม่ถูกต้อง" },
      { status: 400 },
    );
  }
}
