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
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
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
