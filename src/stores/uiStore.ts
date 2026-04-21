import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const COOKIE_NAME = "bethel_ui";

const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(
      new RegExp(`(^|; )${key}=([^;]+)`)
    );
    return match?.[2] ? decodeURIComponent(match[2]) : null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof document === "undefined") return;
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${oneYear}; SameSite=Lax`;
  },
  removeItem: (key: string): void => {
    if (typeof document === "undefined") return;
    document.cookie = `${key}=; path=/; max-age=0`;
  },
};

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: COOKIE_NAME,
      storage: createJSONStorage(() => cookieStorage),
    }
  )
);
