import { create } from "zustand";

/** Chat-owned controls keep their React context while rendering in the Chat Settings slot. */
export const useChatControlDockStore = create<{
  element: HTMLDivElement | null;
  setElement: (element: HTMLDivElement | null) => void;
}>()((set) => ({ element: null, setElement: (element) => set({ element }) }));
