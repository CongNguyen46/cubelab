import { create } from 'zustand'
import type { CubeViewHandle } from '../renderer/CubeModel.tsx'

type UiStore = {
  /** The 3D view, once loaded. Input uses it to read the view orientation. */
  view: CubeViewHandle | null
  setView: (view: CubeViewHandle | null) => void
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
  toast: { text: string; id: number } | null
  showToast: (text: string) => void
  hideToast: () => void
}

export const useUiStore = create<UiStore>()((set) => ({
  view: null,
  setView: (view) => set({ view }),
  menuOpen: false,
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  toast: null,
  showToast: (text) => set({ toast: { text, id: Date.now() } }),
  hideToast: () => set({ toast: null }),
}))
