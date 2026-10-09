// ──────────────────────────────────────────────
// Layout: top bar
// ──────────────────────────────────────────────
import {
  MessageSquareText,
  Home,
  Settings,
  Link,
  BookOpen,
  Users,
  Sparkles,
  FileText,
  VenetianMask,
  Menu,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useUIStore } from "../../stores/ui.store";
import { useChatStore } from "../../stores/chat.store";
import { cn } from "../../lib/utils";
import { useLocalizedUiText } from "../../localization/use-localized-ui-text";
import {
  activatePersonalExtensionContribution,
  usePersonalExtensionContributions,
} from "../../lib/personal-extension-contributions";
import { PersonalExtensionContributionIcon } from "../extensions/PersonalExtensionContributionIcon";
import {
  PersonalExtensionContributionsMenu,
  PersonalExtensionTopbarButtons,
} from "./PersonalExtensionContributionsMenu";

type RightPanelButtonPanel = "lorebooks" | "presets" | "connections" | "agents" | "personas";

type RightPanelButtonConfig = {
  panel: RightPanelButtonPanel;
  icon: LucideIcon;
  label: string;
};

const RIGHT_PANEL_BUTTONS: readonly RightPanelButtonConfig[] = [
  {
    panel: "personas" as const,
    icon: VenetianMask,
    label: "Personas",
  },
  {
    panel: "lorebooks" as const,
    icon: BookOpen,
    label: "Lorebooks",
  },
  {
    panel: "presets" as const,
    icon: FileText,
    label: "Presets",
  },
  {
    panel: "connections" as const,
    icon: Link,
    label: "Connections",
  },
  {
    panel: "agents" as const,
    icon: Sparkles,
    label: "Agents",
  },
] as const;

const PHONE_TOPBAR_QUERY = "(max-width: 639px)";
const PHONE_OVERFLOW_HIDDEN_CLASS = "max-sm:hidden";
const TOPBAR_BUTTON_CLASS =
  "mari-topbar-action inline-flex min-h-8 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] [@media(pointer:coarse)]:min-h-11";
const TOPBAR_PANEL_BUTTON_CLASS = `${TOPBAR_BUTTON_CLASS} shrink-0`;
const TOPBAR_ACTIVE_BUTTON_CLASS = "bg-[var(--accent)] text-[var(--foreground)]";

export function TopBar({ mobileTopbarNavigation }: { mobileTopbarNavigation: boolean }) {
  const localize = useLocalizedUiText();
  const { contributions } = usePersonalExtensionContributions();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const closeRightPanel = useUIStore((s) => s.closeRightPanel);
  const rightPanel = useUIStore((s) => s.rightPanel);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const setActiveChatId = useChatStore((s) => s.setActiveChatId);
  const closeAllDetails = useUIStore((s) => s.closeAllDetails);
  const characterDetailId = useUIStore((s) => s.characterDetailId);
  const lorebookDetailId = useUIStore((s) => s.lorebookDetailId);
  const presetDetailId = useUIStore((s) => s.presetDetailId);
  const connectionDetailId = useUIStore((s) => s.connectionDetailId);
  const agentDetailId = useUIStore((s) => s.agentDetailId);
  const toolDetailId = useUIStore((s) => s.toolDetailId);
  const personaDetailId = useUIStore((s) => s.personaDetailId);
  const regexDetailId = useUIStore((s) => s.regexDetailId);
  const characterLibraryOpen = useUIStore((s) => s.characterLibraryOpen);
  const cardLibraryKind = useUIStore((s) => s.cardLibraryKind);
  const headerRef = useRef<HTMLElement | null>(null);

  const isCharactersPanelActive =
    (rightPanelOpen && rightPanel === "characters") ||
    Boolean(characterDetailId) ||
    (characterLibraryOpen && cardLibraryKind === "characters");
  const panelContextActive: Record<RightPanelButtonPanel, boolean> = {
    lorebooks: (rightPanelOpen && rightPanel === "lorebooks") || Boolean(lorebookDetailId),
    presets:
      (rightPanelOpen && rightPanel === "presets") ||
      Boolean(presetDetailId) ||
      Boolean(regexDetailId) ||
      Boolean(toolDetailId),
    connections: (rightPanelOpen && rightPanel === "connections") || Boolean(connectionDetailId),
    agents: (rightPanelOpen && rightPanel === "agents") || Boolean(agentDetailId),
    personas:
      (rightPanelOpen && rightPanel === "personas") ||
      Boolean(personaDetailId) ||
      (characterLibraryOpen && cardLibraryKind === "personas"),
  };
  const isMobileOverlayActive = mobileTopbarNavigation && (sidebarOpen || rightPanelOpen);
  const isHomeActive =
    !activeChatId &&
    !isMobileOverlayActive &&
    !characterDetailId &&
    !lorebookDetailId &&
    !presetDetailId &&
    !connectionDetailId &&
    !agentDetailId &&
    !toolDetailId &&
    !personaDetailId &&
    !regexDetailId &&
    !characterLibraryOpen;

  const phoneTopbar = usePhoneTopbar();

  const prepareMobileTopbarNavigation = useCallback(() => {
    if (!mobileTopbarNavigation) return;
    closeAllDetails();
  }, [closeAllDetails, mobileTopbarNavigation]);

  const handleSidebarClick = useCallback(() => {
    prepareMobileTopbarNavigation();
    toggleSidebar();
  }, [prepareMobileTopbarNavigation, toggleSidebar]);

  const handleRightPanelClick = useCallback(
    (panel: Parameters<typeof toggleRightPanel>[0]) => {
      prepareMobileTopbarNavigation();
      toggleRightPanel(panel);
    },
    [prepareMobileTopbarNavigation, toggleRightPanel],
  );

  const handleHomeClick = useCallback(() => {
    window.dispatchEvent(new Event("marinara:home-professor-mari-close"));
    setActiveChatId(null);
    closeAllDetails();
    if (!mobileTopbarNavigation) return;
    setSidebarOpen(false);
    closeRightPanel();
  }, [closeAllDetails, closeRightPanel, mobileTopbarNavigation, setActiveChatId, setSidebarOpen]);

  const overflowItems: TopbarOverflowItem[] = [
    {
      key: "characters",
      icon: <Users size={16} />,
      label: localize("Characters"),
      active: isCharactersPanelActive,
      onSelect: () => handleRightPanelClick("characters"),
    },
    ...RIGHT_PANEL_BUTTONS.map(({ panel, icon: Icon, label }) => ({
      key: panel,
      icon: <Icon size={16} />,
      label: localize(label),
      active: panelContextActive[panel],
      onSelect: () => handleRightPanelClick(panel),
    })),
    ...contributions
      .filter((contribution) => contribution.kind === "button" && (contribution.surface ?? "top-bar") === "top-bar")
      .slice(0, 2)
      .map((contribution) => ({
        key: `extension:${contribution.key}`,
        icon: <PersonalExtensionContributionIcon icon={contribution.icon} size={16} />,
        label: contribution.label,
        hint: contribution.extensionName,
        onSelect: () => activatePersonalExtensionContribution(contribution.key),
      })),
    {
      key: "settings",
      icon: <Settings size={16} />,
      label: localize("Settings"),
      active: rightPanelOpen && rightPanel === "settings",
      onSelect: () => handleRightPanelClick("settings"),
    },
  ];

  const chatsActive = sidebarOpen && (!mobileTopbarNavigation || !rightPanelOpen);
  const chatsButton = (
    <button
      key="chats"
      onClick={handleSidebarClick}
      aria-pressed={chatsActive}
      aria-label={localize("Chats")}
      data-tour="sidebar-toggle"
      data-topbar-key="chats"
      className={cn(TOPBAR_BUTTON_CLASS, chatsActive && TOPBAR_ACTIVE_BUTTON_CLASS)}
      title={localize("Chats")}
    >
      <MessageSquareText aria-hidden="true" size={16} />
      <span className="hidden xl:inline">{localize("Chats")}</span>
    </button>
  );

  const homeButton = (
    <button
      key="home"
      onClick={handleHomeClick}
      aria-pressed={isHomeActive}
      aria-label={localize("Home")}
      data-topbar-key="home"
      className={cn(TOPBAR_BUTTON_CLASS, isHomeActive && TOPBAR_ACTIVE_BUTTON_CLASS)}
      title={localize("Home")}
    >
      <Home aria-hidden="true" size={16} />
      <span className="hidden xl:inline">{localize("Home")}</span>
    </button>
  );

  return (
    <header
      ref={headerRef}
      data-component="TopBar"
      className="mari-topbar relative z-10 flex h-12 flex-shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-3"
    >
      <div className="mari-topbar-left flex min-w-0 flex-1 items-center gap-2">
        <div className="mari-topbar-left-controls flex shrink-0 items-center gap-1">
          {mobileTopbarNavigation ? [homeButton, chatsButton] : [chatsButton, homeButton]}
        </div>
      </div>

      <nav
        data-tour="panel-buttons"
        aria-label={localize("Panel navigation")}
        className="mari-topbar-panel-nav flex shrink-0 items-center justify-end gap-1"
      >
        <button
          onClick={() => handleRightPanelClick("characters")}
          aria-pressed={isCharactersPanelActive}
          aria-label={localize("Characters")}
          data-tour="panel-characters"
          data-topbar-key="characters"
          className={cn(
            TOPBAR_PANEL_BUTTON_CLASS,
            PHONE_OVERFLOW_HIDDEN_CLASS,
            isCharactersPanelActive && TOPBAR_ACTIVE_BUTTON_CLASS,
          )}
          title={localize("Characters")}
        >
          <Users aria-hidden="true" size={16} />
          <span className="hidden xl:inline">{localize("Characters")}</span>
        </button>

        {RIGHT_PANEL_BUTTONS.map(({ panel, icon: Icon, label }) => {
          const isActive = panelContextActive[panel];
          return (
            <button
              key={panel}
              onClick={() => handleRightPanelClick(panel)}
              aria-pressed={isActive}
              aria-label={localize(label)}
              data-tour={`panel-${panel}`}
              data-topbar-key={panel}
              className={cn(
                TOPBAR_PANEL_BUTTON_CLASS,
                PHONE_OVERFLOW_HIDDEN_CLASS,
                isActive && TOPBAR_ACTIVE_BUTTON_CLASS,
              )}
              title={localize(label)}
            >
              <Icon aria-hidden="true" size={16} />
              <span className="hidden xl:inline">{localize(label)}</span>
            </button>
          );
        })}

        {/* Settings */}
        <button
          onClick={() => handleRightPanelClick("settings")}
          aria-label={localize("Settings")}
          data-tour="panel-settings"
          data-topbar-key="settings"
          aria-pressed={rightPanelOpen && rightPanel === "settings"}
          className={cn(
            TOPBAR_PANEL_BUTTON_CLASS,
            PHONE_OVERFLOW_HIDDEN_CLASS,
            rightPanelOpen && rightPanel === "settings" && TOPBAR_ACTIVE_BUTTON_CLASS,
          )}
          title={localize("Settings")}
        >
          <Settings aria-hidden="true" size={16} />
          <span className="hidden xl:inline">{localize("Settings")}</span>
        </button>

        <PersonalExtensionTopbarButtons className={PHONE_OVERFLOW_HIDDEN_CLASS} />
        <PersonalExtensionContributionsMenu />
        <TopbarMoreMenu items={overflowItems} headerRef={headerRef} phoneTopbar={phoneTopbar} />
      </nav>
    </header>
  );
}

function subscribePhoneTopbar(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(PHONE_TOPBAR_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readPhoneTopbar() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(PHONE_TOPBAR_QUERY).matches
    : false;
}

function usePhoneTopbar() {
  return useSyncExternalStore(subscribePhoneTopbar, readPhoneTopbar, () => false);
}

type TopbarOverflowItem = {
  key: string;
  icon: ReactNode;
  label: string;
  hint?: string;
  active?: boolean;
  onSelect: () => void;
};

function TopbarMoreMenu({
  items,
  headerRef,
  phoneTopbar,
}: {
  items: TopbarOverflowItem[];
  headerRef: RefObject<HTMLElement | null>;
  phoneTopbar: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(48);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const initialFocusRef = useRef<"first" | "last" | null>(null);
  const menuId = useId();
  const label = t("navigation.topbar.more");

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const openMenu = (focus: "first" | "last" | null) => {
    setMenuTop(Math.round(headerRef.current?.getBoundingClientRect().bottom ?? 48));
    initialFocusRef.current = focus;
    setOpen(true);
  };

  useEffect(() => {
    if (!phoneTopbar) setOpen(false);
  }, [phoneTopbar]);

  useEffect(() => {
    if (!open) return;
    const rows = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const target = initialFocusRef.current;
    initialFocusRef.current = null;
    const activeRow = rows.find((row) => row.dataset.active === "true");
    (target === "last" ? rows.at(-1) : target === "first" ? rows[0] : (activeRow ?? rows[0]))?.focus();

    const closeOnOutsidePress = (event: PointerEvent) => {
      const node = event.target;
      if (!(node instanceof Node)) return;
      if (triggerRef.current?.contains(node) || menuRef.current?.contains(node)) return;
      setOpen(false);
    };
    const closeOnViewportChange = () => setOpen(false);
    document.addEventListener("pointerdown", closeOnOutsidePress);
    window.addEventListener("orientationchange", closeOnViewportChange);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      window.removeEventListener("orientationchange", closeOnViewportChange);
    };
  }, [open]);

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    openMenu(event.key === "ArrowDown" ? "first" : "last");
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const index = rows.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => rows[(next + rows.length) % rows.length]?.focus();
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(rows.length - 1);
        break;
      case "Escape":
        if (event.nativeEvent.isComposing) return;
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      case "Tab":
        // Let native traversal continue from the trigger after the portal closes.
        triggerRef.current?.focus();
        close(false);
        break;
    }
  };

  const select = (item: TopbarOverflowItem) => {
    if (!item.key.startsWith("extension:")) triggerRef.current?.focus({ preventScroll: true });
    close(false);
    item.onSelect();
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) triggerRef.current?.focus({ preventScroll: true });
    });
  };

  const menu = open ? (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label={t("navigation.topbar.moreMenu")}
      data-component="TopbarMoreMenu"
      onKeyDown={handleMenuKeyDown}
      style={{
        top: menuTop + 4,
        maxHeight: `calc(100dvh - ${menuTop + 12}px)`,
      }}
      className="fixed right-[max(0.5rem,env(safe-area-inset-right))] z-[9000] w-[min(16.5rem,calc(100vw-1rem))] overflow-y-auto overscroll-contain rounded-lg border border-[var(--border)] bg-[var(--popover)] p-1.5 text-[var(--popover-foreground)] shadow-lg"
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          data-topbar-panel={item.key.startsWith("extension:") ? undefined : item.key}
          data-active={item.active ? "true" : undefined}
          aria-current={item.active ? "true" : undefined}
          onClick={() => select(item)}
          className={cn(
            "flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-[var(--accent)] focus-visible:bg-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
            item.active && "bg-[var(--accent)] font-semibold",
          )}
        >
          <span
            aria-hidden="true"
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--secondary)] text-[var(--muted-foreground)]"
          >
            {item.icon}
          </span>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.hint ? (
            <span className="max-w-[40%] shrink-0 truncate text-[0.6875rem] text-[var(--muted-foreground)]">
              {item.hint}
            </span>
          ) : null}
          {item.active ? <Check aria-hidden="true" size={15} className="shrink-0 text-[var(--primary)]" /> : null}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-topbar-more=""
        onClick={() => (open ? close(false) : openMenu(null))}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        title={label}
        data-topbar-key="more"
        className={cn(TOPBAR_PANEL_BUTTON_CLASS, "ml-auto sm:hidden", open && TOPBAR_ACTIVE_BUTTON_CLASS)}
      >
        <Menu aria-hidden="true" size={16} />
      </button>
      {typeof document === "undefined" ? null : createPortal(menu, document.body)}
    </>
  );
}
