"use client";

import React from "react";
import { TeacherLayoutShell } from "@/components/teacher/TeacherSidebar";
import { useTeacherAuth } from "@/lib/hooks/useTeacherAuth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Loading } from "@/components/ui/Loading";
import { SNAKES, LADDERS, SPECIAL_CELLS, GAME_SETTINGS } from "@/lib/game-data";

export default function TeacherSettingsPage() {
  const { teacher, loading } = useTeacherAuth(true);

  if (loading) {
    return <Loading fullScreen label="กำลังโหลดหน้าตั้งค่า..." />;
  }

  return (
    <TeacherLayoutShell
      teacher={teacher}
      title="ตั้งค่าระบบและกติกามาตรฐาน"
      subtitle="ข้อมูลบัญชีครูผู้สอนและการกำหนดค่ากระดานมาตรฐานของ Knowledge Snake"
    >
      <div className="grid md:grid-cols-2 gap-6">
        <Card variant="default" padding="lg" className="space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0f2547]">
            ข้อมูลบัญชีครูผู้สอน
          </h2>
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <strong>ชื่อผู้สอน:</strong> {teacher?.name || "ครูสมชาย ใจดี"}
            </p>
            <p>
              <strong>อีเมล:</strong> {teacher?.email || "teacher@school.ac.th"}
            </p>
            <p>
              <strong>สถานศึกษา:</strong>{" "}
              {teacher?.school || "โรงเรียนสาธิตพิชิตความรู้"}
            </p>
          </div>
          <Badge variant="success" size="sm">
            ยืนยันตัวตนผ่าน Server Session แล้ว
          </Badge>
        </Card>

        <Card variant="default" padding="lg" className="space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0f2547]">
            กติกากระดานมาตรฐาน (Board Configuration)
          </h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>
              <strong>ขนาดกระดาน:</strong> 10×10 (100 ช่อง) เริ่มที่ 1 เส้นชัยที่ 100
            </li>
            <li>
              <strong>ตำแหน่งงู (Snakes):</strong>{" "}
              {SNAKES.map((s) => `${s.from}→${s.to}`).join(", ")}
            </li>
            <li>
              <strong>ตำแหน่งบันได (Ladders):</strong>{" "}
              {LADDERS.map((l) => `${l.from}→${l.to}`).join(", ")}
            </li>
            <li>
              <strong>ช่องพิเศษ (Special Squares):</strong>{" "}
              {SPECIAL_CELLS.map((c) => `${c.at} (${c.label})`).join(", ")}
            </li>
            <li>
              <strong>สูตรคำนวณคะแนน:</strong> {GAME_SETTINGS.scoreRule}
            </li>
          </ul>
        </Card>
      </div>
    </TeacherLayoutShell>
  );
}
