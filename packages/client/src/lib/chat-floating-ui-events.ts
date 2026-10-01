export const CHAT_FLOATING_UI_DISMISS_EVENT = "marinara:chat-floating-ui-dismiss";
export const CHAT_SUMMARY_OPEN_REQUEST_EVENT = "marinara:chat-summary-open-request";
export const CHAT_LOREBOOK_ENTRIES_OPEN_REQUEST_EVENT = "marinara:chat-lorebook-entries-open-request";
export const CHAT_SEARCH_OPEN_REQUEST_EVENT = "marinara:chat-search-open-request";
export const CHAT_PEEK_PROMPT_REQUEST_EVENT = "marinara:chat-peek-prompt-request";
export const CHAT_REGENERATE_REQUEST_EVENT = "marinara:chat-regenerate-request";

export function announceChatFloatingUiDismiss() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHAT_FLOATING_UI_DISMISS_EVENT));
}

export function requestChatSummaryOpen(chatId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_SUMMARY_OPEN_REQUEST_EVENT, { detail: { chatId } }));
}

export function requestChatLorebookEntriesOpen(chatId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_LOREBOOK_ENTRIES_OPEN_REQUEST_EVENT, { detail: { chatId } }));
}

export function requestChatSearchOpen(chatId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_SEARCH_OPEN_REQUEST_EVENT, { detail: { chatId } }));
}

export function requestChatPeekPrompt(chatId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_PEEK_PROMPT_REQUEST_EVENT, { detail: { chatId } }));
}

export function requestChatRegenerate(chatId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_REGENERATE_REQUEST_EVENT, { detail: { chatId } }));
}

export function blurActiveChatFloatingUiControl() {
  if (typeof document === "undefined") return;
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return;
  if (!activeElement.closest("[data-chat-floating-panel]")) return;
  activeElement.blur();
}

export function isDesktopShellNavigationTarget(target: EventTarget | null) {
  if (typeof window === "undefined" || window.matchMedia("(max-width: 767px)").matches) return false;
  const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return Boolean(element?.closest('[data-component="TopBar"]'));
}
