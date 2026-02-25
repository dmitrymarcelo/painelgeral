"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PreventiveRegistrationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/web/preventive-items");
  }, [router]);

  return null;
}
