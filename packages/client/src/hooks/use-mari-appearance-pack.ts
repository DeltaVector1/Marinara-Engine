import { getMariAppearancePack } from "../lib/mari-work-animations";
import { useUIStore } from "../stores/ui.store";

export function useMariAppearancePack() {
  const id = useUIStore((state) => state.mariAppearancePackId);
  return getMariAppearancePack(id);
}
