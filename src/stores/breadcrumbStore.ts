"use client";

import { create } from "zustand";

interface BreadcrumbState {
  labels: Record<string, string>;
  setLabel: (path: string, label: string) => void;
  clearLabel: (path: string) => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  labels: {},
  setLabel: (path, label) =>
    set((state) =>
      state.labels[path] === label
        ? state
        : { labels: { ...state.labels, [path]: label } }
    ),
  clearLabel: (path) =>
    set((state) => {
      if (!(path in state.labels)) return state;
      const next = { ...state.labels };
      delete next[path];
      return { labels: next };
    }),
}));
