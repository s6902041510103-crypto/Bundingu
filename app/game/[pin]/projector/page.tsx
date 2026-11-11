import { redirect } from "next/navigation";

export default async function ProjectorRedirectPage(context: {
  params: Promise<{ pin: string }>;
}) {
  const { pin } = await context.params;
  const cleanPin = String(pin || "").toUpperCase();
  redirect(`/teacher/games/${cleanPin}`);
}
