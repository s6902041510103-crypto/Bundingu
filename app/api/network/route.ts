import { NextResponse } from "next/server";
import os from "os";

export async function GET(request: Request) {
  const nets = os.networkInterfaces();
  let ip = "localhost";
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (
        net.family === "IPv4" &&
        !net.internal &&
        (net.address.startsWith("192.168.") ||
          net.address.startsWith("10.") ||
          net.address.startsWith("172."))
      ) {
        ip = net.address;
        break;
      }
    }
  }
  const url = new URL(request.url);
  const port = url.port ? `:${url.port}` : "";
  const lanUrl = ip !== "localhost" ? `${url.protocol}//${ip}${port}` : url.origin;
  return NextResponse.json({ ip, lanUrl });
}
