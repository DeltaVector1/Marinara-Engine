import { useId, type CSSProperties, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { HelpTooltip } from "./HelpTooltip";

interface DrawerProps {
  /** Stable id, exposed as `data-drawer` for themes and tests. */
  id?: string;
  title: ReactNode;
  icon?: ReactNode;
  count?: number;
  help?: string;
  /** Shown beside the title while the drawer is closed (a tracker's miniature display). */
  summary?: ReactNode;
  actions?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  style?: CSSProperties;
  /** Top spacing of the body; defaults to "pt-3". */
  bodyClassName?: string;
  rootAttributes?: Record<`data-${string}`, string | undefined>;
  children: ReactNode;
}

/** Shared collapsible section used by Chat Settings and tracker side panels. */
export function Drawer({
  id,
  title,
  icon,
  count,
  help,
  summary,
  actions,
  open,
  onOpenChange,
  className,
  style,
  bodyClassName,
  rootAttributes,
  children,
}: DrawerProps) {
  const bodyId = `mari-drawer-body-${useId().replace(/:/gu, "")}`;

  return (
    <div data-drawer={id} {...rootAttributes} className={cn("mari-drawer", className)} style={style}>
      <div className="mari-drawer__header flex w-full items-center gap-2 text-left transition-colors">
        <button
          type="button"
          data-drawer-toggle
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--marinara-chat-chrome-focus-ring)]"
          onClick={() => onOpenChange(!open)}
        >
          {icon && <span className="mari-drawer__icon">{icon}</span>}
          <span className="mari-drawer__title flex-1 text-xs font-semibold">{title}</span>
          <ChevronDown size="0.75rem" className={cn("mari-drawer__arrow transition-transform", open && "rotate-180")} />
        </button>
        {summary && !open && <span className="mari-drawer__summary flex shrink-0 items-center">{summary}</span>}
        {count != null && count > 0 && (
          <span className="mari-drawer__count rounded-full px-1.5 py-0.5 text-[0.625rem] font-medium">{count}</span>
        )}
        {help && (
          <span className="mari-drawer__help">
            <HelpTooltip text={help} side="left" />
          </span>
        )}
        {actions && <span className="mari-drawer__actions flex items-center">{actions}</span>}
      </div>
      {open && (
        <div id={bodyId} className={cn("mari-drawer__body", bodyClassName ?? "pt-3")}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Only render drawer content while the section is open. */
export function useDrawerContentVisible(_id: string, open: boolean): boolean {
  return open;
}
