"use client";

import { useEffect } from "react";
import { useBreadcrumbStore } from "@/stores/breadcrumbStore";

interface BreadcrumbLabelProps {
  path: string;
  label: string;
}

export function BreadcrumbLabel({ path, label }: BreadcrumbLabelProps) {
  useEffect(() => {
    useBreadcrumbStore.getState().setLabel(path, label);
    return () => useBreadcrumbStore.getState().clearLabel(path);
  }, [path, label]);

  return null;
}
