// ──────────────────────────────────────────────
// Tracker Panel visibility
//
// Chat Settings remembers which tracker surface a chat uses. Closing that surface
// only hides it; the Trackers button opens it again without changing the choice.
// ──────────────────────────────────────────────
import { useUIStore } from "../stores/ui.store";

/** Close the panel while preserving the chat's Tracker Panel preference. */
export function closeTrackerPanel() {
  useUIStore.getState().setTrackerPanelOpen(false);
}
