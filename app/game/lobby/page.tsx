"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loading } from "@/components/ui/Loading";

function LobbyRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pin = (searchParams.get("pin") || "KS4829").toUpperCase();

  useEffect(() => {
    router.replace(`/game/${encodeURIComponent(pin)}`);
  }, [pin, router]);

  return <Loading fullScreen label="กำลังเข้าสู่ห้องรอเริ่มเกม..." />;
}

export default function LegacyLobbyPage() {
  return (
    <Suspense fallback={<Loading fullScreen />}>
      <LobbyRedirectContent />
    </Suspense>
  );
}
