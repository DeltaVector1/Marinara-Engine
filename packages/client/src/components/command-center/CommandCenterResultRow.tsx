import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { CornerDownLeft, Settings2, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { CommandCenterMedia, type CommandCenterMediaKind } from "./CommandCenterMedia";

export interface CommandCenterResultRowProps {
  id?: string;
  dataResultId?: string;
  title: string;
  metadata: string | null;
  tertiaryMetadata?: ReactNode;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
  mediaSrc?: string | null;
  mediaKind?: CommandCenterMediaKind;
  avatarCropStyle?: CSSProperties;
  groupClassName?: string;
  accent?: string | null;
  control?: ReactNode;
  /**
   * Content revealed beneath the row itself. The row grows to fit it, so nothing
   * above it moves - which is what lets a preview expand in place instead of
   * taking over the panel.
   */
  expanded?: ReactNode;
  currentChoice?: string;
  enterHint?: string;
  setupStatus?: string;
  onMouseEnter?: MouseEventHandler<HTMLLIElement>;
  onMouseMove?: MouseEventHandler<HTMLLIElement>;
  onMouseLeave?: MouseEventHandler<HTMLLIElement>;
  className?: string;
  style?: CSSProperties;
}

export function CommandCenterResultRow({
  id,
  dataResultId,
  title,
  metadata,
  tertiaryMetadata,
  icon,
  selected,
  onSelect,
  mediaSrc,
  mediaKind,
  avatarCropStyle,
  groupClassName,
  accent,
  control,
  expanded,
  currentChoice,
  enterHint,
  setupStatus,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  className,
  style,
}: CommandCenterResultRowProps) {
  return (
    <li
      data-result-id={dataResultId}
      data-command-center-result-row
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={style}
      className={cn(
        "group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center rounded-xl transition-colors",
        expanded ? "min-h-14 py-1" : "min-h-14 sm:h-[3.25rem]",
        selected ? "bg-[var(--primary)]/12 ring-1 ring-inset ring-[var(--primary)]/20" : "hover:bg-[var(--accent)]/60",
        groupClassName,
        className,
      )}
    >
      <button
        id={id}
        type="button"
        data-selected={selected || undefined}
        onClick={onSelect}
        aria-label={[title, metadata].filter(Boolean).join(" ")}
        className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl px-2.5 text-left text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
      >
        <CommandCenterMedia
          size="row"
          icon={icon}
          src={mediaSrc}
          kind={mediaKind}
          avatarCropStyle={avatarCropStyle}
          accent={accent}
        />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-semibold">{title}</span>
          {metadata ? (
            <span className="mt-0.5 block truncate text-xs text-[var(--muted-foreground)]">{metadata}</span>
          ) : null}
        </span>
        <span className="flex min-w-0 max-w-36 items-center justify-end gap-2 truncate text-xs text-[var(--muted-foreground)] sm:max-w-48">
          {tertiaryMetadata}
          {currentChoice ? <span className="truncate font-medium">{currentChoice}</span> : null}
          {!control && setupStatus ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <Settings2 className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{setupStatus}</span>
            </span>
          ) : null}
        </span>
      </button>

      {control || enterHint ? (
        <div className="col-start-2 flex min-w-0 max-w-[min(48vw,16rem)] shrink-0 items-center justify-end gap-1 pr-1">
          {!control && enterHint ? (
            <span className="hidden items-center gap-1 text-xs text-[var(--muted-foreground)] sm:inline-flex">
              <span className="truncate">{enterHint}</span>
              <CornerDownLeft className="size-3.5 shrink-0" aria-hidden="true" />
            </span>
          ) : null}
          {control}
        </div>
      ) : null}
      {expanded ? <div className="col-span-2 min-w-0 px-1 pb-1">{expanded}</div> : null}
    </li>
  );
}
