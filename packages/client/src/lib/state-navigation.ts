import { useChatStore } from "../stores/chat.store";
import { isMobileShellViewport, useUIStore } from "../stores/ui.store";
import { requestProfessorMariOpen } from "./professor-mari-open";
import type { ProfessorMariNavigationTarget } from "./professor-mari-navigation";

export interface StateNavigationHandlers {
  home?: () => void;
  professor?: () => void;
  window?: (target: Extract<ProfessorMariNavigationTarget, { kind: "window" }>["window"]) => void;
  package?: (packageId: string) => void;
}

export function executeStateNavigation(
  target: ProfessorMariNavigationTarget,
  handlers: StateNavigationHandlers = {},
): boolean {
  const ui = useUIStore.getState();
  if (target.kind === "home") {
    if (handlers.home) handlers.home();
    else {
      useChatStore.getState().setActiveChatId(null);
      ui.closeAllDetails();
      ui.closeRightPanel();
    }
  } else if (target.kind === "professor") {
    if (handlers.professor) handlers.professor();
    else {
      useChatStore.getState().setActiveChatId(null);
      ui.closeAllDetails();
      ui.closeRightPanel();
      requestProfessorMariOpen();
    }
  } else if (target.kind === "chats") {
    ui.setSidebarOpen(true);
    ui.closeRightPanel();
  } else if (target.kind === "chat") {
    // On the phone shell the sidebar is a full-screen sheet, so opening it here
    // would cover the chat we just navigated to (F3, slice 41).
    if (!isMobileShellViewport()) ui.setSidebarOpen(true);
    ui.closeRightPanel();
    useChatStore.getState().setActiveChatId(target.chatId);
  } else if (target.kind === "panel") {
    ui.openRightPanel(target.panel);
  } else if (target.kind === "settings") {
    ui.setSettingsTab(target.tab);
    ui.setSettingsTargetControlId(target.controlId ?? null);
    ui.setSettingsTargetSectionId(target.sectionId ?? null);
    ui.openRightPanel("settings");
  } else if (target.kind === "surface") {
    if (target.surface === "card-downloads") ui.openBotBrowser();
    else if (target.surface === "character-library") ui.openCharacterLibrary();
    else if (target.surface === "persona-library") ui.openPersonaLibrary();
    else if (target.surface === "agent-catalog") ui.openAgentCatalog();
    else ui.openGameAssetsBrowser();
  } else if (target.kind === "resource") {
    if (target.resource === "character") ui.openCharacterDetail(target.id);
    else if (target.resource === "persona") ui.openPersonaDetail(target.id);
    else if (target.resource === "preset") ui.openPresetDetail(target.id);
    else if (target.resource === "lorebook")
      ui.openLorebookDetail(target.id, target.entryId ? { initialTab: "entries", entryId: target.entryId } : undefined);
    else ui.openAgentDetail(target.id);
  } else if (target.kind === "window") {
    if (target.window === "documentation") ui.openModal("docs-viewer");
    else if (target.window === "tutorial") ui.setHasCompletedOnboarding(false);
    else if (handlers.window) handlers.window(target.window);
    else return false;
  } else if (handlers.package) handlers.package(target.packageId);
  else return false;
  // Close only after a handler accepts the target. Package and host-specific
  // targets may be unhandled; hiding the omnibar in that case loses the query
  // without taking the user anywhere.
  ui.setOmnibarOpen(false);
  return true;
}
