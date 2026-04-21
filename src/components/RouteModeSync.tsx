"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function RouteModeSync() {
  const pathname = usePathname();

  useEffect(() => {
    const isReader = /\/[a-z]{2}-[a-z]{2}\/read\/[^/]+$/i.test(pathname);
    document.body.dataset.readerRoute = isReader ? "true" : "false";
    return () => {
      document.body.dataset.readerRoute = "false";
    };
  }, [pathname]);

  return null;
}
