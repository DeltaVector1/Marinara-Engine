import { useEffect, type KeyboardEvent, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Focus for a view or popover that lives inside the omnibar dialog instead of being its own `Modal`:
 * focus moves in when it opens and back to the opener when it closes, Tab cycles inside it, and Escape
 * closes only it. Handled keys are marked with `preventDefault`, which the omnibar's own key handling
 * (Escape leaves the pane or closes the dialog, Tab cycles the whole panel) skips, so a second Escape
 * is needed to reach the dialog.
 */
export function useInDialogFocusScope(scopeRef: RefObject<HTMLElement | null>, onClose: () => void, open = true) {
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scope = scopeRef.current;
    scope?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => {
      // Closed by a click somewhere else: leave focus where that click put it.
      const active = document.activeElement;
      if (!active || active === document.body || scope?.contains(active)) opener?.focus();
    };
  }, [open, scopeRef]);

  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(scopeRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (focusable.length === 0) return;
    const index = focusable.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey
      ? index <= 0
        ? focusable.length - 1
        : index - 1
      : index === focusable.length - 1
        ? 0
        : index + 1;
    event.preventDefault();
    focusable[next]?.focus();
  };
}
