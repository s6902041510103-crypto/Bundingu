"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TeacherProfile } from "@/components/teacher/TeacherSidebar";

export function useTeacherAuth(redirectOnUnauth = true) {
  const router = useRouter();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const checkAuth = async () => {
      let cachedTeacher: TeacherProfile | null = null;
      if (typeof window !== "undefined") {
        try {
          const raw =
            sessionStorage.getItem("ks-teacher") ||
            localStorage.getItem("ks-teacher-remember");
          if (raw) {
            cachedTeacher = JSON.parse(raw);
            if (cachedTeacher && active) {
              setTeacher(cachedTeacher);
            }
          }
        } catch {
          // ignore storage parse error
        }
      }

      try {
        const headers: Record<string, string> = {};
        if (cachedTeacher?.teacherId) {
          headers["x-teacher-id"] = cachedTeacher.teacherId;
        }
        if (cachedTeacher?.email) {
          headers["x-teacher-email"] = cachedTeacher.email;
        }

        const res = await fetch("/api/auth/session", {
          cache: "no-store",
          headers,
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated && data?.teacher) {
            if (active) {
              setTeacher(data.teacher);
              sessionStorage.setItem("ks-teacher", JSON.stringify(data.teacher));
              setLoading(false);
            }
            return;
          }
        }
      } catch {
        // fallback check below
      }

      if (active) {
        if (cachedTeacher) {
          setTeacher(cachedTeacher);
          setLoading(false);
          return;
        }
        setLoading(false);
        if (redirectOnUnauth) {
          router.replace("/teacher/login");
        }
      }
    };

    checkAuth();
    return () => {
      active = false;
    };
  }, [redirectOnUnauth, router]);

  return { teacher, loading };
}
