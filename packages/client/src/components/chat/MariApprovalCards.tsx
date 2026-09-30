import { type ReactNode, useCallback, useLayoutEffect, useRef, useState } from "react";
import { useTranslation as useUiTranslation } from "react-i18next";
import {
  Check,
  ChevronRight,
  Database,
  Eye,
  FileText,
  Loader2,
  PackagePlus,
  RefreshCw,
  Sparkles,
  Trash2,
  Undo2,
  UserRound,
} from "lucide-react";
import type {
  MariDbPendingApproval,
  MariDependencyInstallApproval,
  MariSensitiveFileApproval,
  MariWorkspacePendingApproval,
} from "@marinara-engine/shared";

import { useUIStore, type MariEditViewMode } from "../../stores/ui.store";
import { canRenderPrompt, MariEditEasyViewer, rowTitle } from "./MariEditEasyViewer";
import { computeFieldChanges, trackListChange, trackProseChange, type FieldChange } from "../../lib/mari-edit-diff";
import { buildCharacterPreviewModel } from "../../lib/character-preview";
import { MariCard, MariRecordAvatar } from "./mari-primitives";
import { MariPromptPreviewModal, type MariPromptRenderSide } from "./MariPromptPreviewModal";
import { TranscriptRow } from "./MariTranscriptRow";
import { cn } from "../../lib/utils";

/**
 * Professor Mari's approval gates and the summaries they are built from.
 *
 * These are what the user reads while deciding whether to allow a change, so
 * they sit above the composer rather than inside the transcript flow. They were
 * extracted from HomeProfessorMariChat when that surface became change-first.
 */
function summarizeTables(tables: Record<string, number>) {
  const entries = Object.entries(tables);
  if (entries.length === 0) return "No rows";
  return entries
    .slice(0, 3)
    .map(([table, count]) => `${count} ${table}`)
    .join(", ");
}

/**
 * The mockup's subtitle: `Character \u2022 Greeting`. The table names the entity; the field list
 * comes from computeFieldChanges, which already skips noise keys, flattens nested columns and
 * ranks the labels the way the Easy viewer shows them.
 */
function describeTable(table: string): string {
  return table
    .replace(/_/g, " ")
    .replace(/s$/, "")
    .replace(/^./, (first) => first.toUpperCase());
}

function describeApprovalSubject(approval: MariDbPendingApproval): string {
  const entity = describeTable(Object.keys(approval.affectedTables)[0] ?? approval.diffPreview[0]?.table ?? "");
  const labels = [
    ...new Set(approval.diffPreview.flatMap((change) => computeFieldChanges(change).map((f) => f.label))),
  ];
  return [entity, labels.slice(0, 3).join(", ")].filter(Boolean).join(" \u2022 ");
}

function summarizeDeletedRow(change: MariDbPendingApproval["diffPreview"][number]) {
  const name =
    typeof change.before?.name === "string"
      ? change.before.name
      : typeof change.before?.title === "string"
        ? change.before.title
        : null;
  return name ? `${change.table}: ${name}` : `${change.table}: ${change.id}`;
}

function summarizeCreatedRow(change: MariDbPendingApproval["diffPreview"][number]) {
  const data = change.after?.data;
  const dataName = data && typeof data === "object" ? (data as Record<string, unknown>).name : undefined;
  const name =
    typeof change.after?.name === "string"
      ? change.after.name
      : typeof change.after?.title === "string"
        ? change.after.title
        : typeof dataName === "string"
          ? dataName
          : null;
  return name ? `${change.table}: ${name}` : `${change.table}: ${change.id}`;
}

function formatRowPreview(row: Record<string, unknown> | null | undefined) {
  if (!row) return "No row snapshot available.";
  try {
    const text = JSON.stringify(row, null, 2);
    return text.length > 700 ? `${text.slice(0, 700)}\n...` : text;
  } catch {
    return "Row snapshot could not be displayed.";
  }
}

function getScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Direction A (I2): an applied edit of existing records (no inserts or deletes, no lorebook entries,
 * which keep their own layout until slice 13) reads as one summary line per record that opens to
 * tracked changes, with Undo and Keep.
 */
function isAppliedEdit(approval: MariDbPendingApproval) {
  return (
    approval.diffPreview.length > 0 &&
    approval.diffPreview.every(
      (change) => (change.action === "update" || change.action === "replace") && change.table !== "lorebook_entries",
    )
  );
}

function TrackedField({ field }: { field: FieldChange }) {
  const leaf = field.path.split(".").at(-1) ?? field.path;
  if (leaf === "tags") {
    return (
      <div className="mari-tags">
        {trackListChange(field.before, field.after).map((tag) => (
          <span
            key={`${tag.type}:${tag.value}`}
            className={cn(
              "mari-tag",
              tag.type === "removed" && "mari-tag--del",
              tag.type === "added" && "mari-tag--ins",
            )}
          >
            {tag.value}
          </span>
        ))}
      </div>
    );
  }
  return (
    <p className="mari-field__text">
      {trackProseChange(field.before, field.after).map((segment, index) =>
        segment.type === "removed" ? (
          <del key={index}>{segment.value}</del>
        ) : segment.type === "added" ? (
          <ins key={index}>{segment.value}</ins>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </p>
  );
}

function AppliedEditReview({
  approval,
  busy,
  disabled,
  onKeep,
  onRestore,
  onShowRaw,
  onRenderRow,
}: {
  approval: MariDbPendingApproval;
  busy: boolean;
  disabled: boolean;
  onKeep: (id: string) => void;
  onRestore: (id: string) => void;
  onShowRaw: () => void;
  onRenderRow?: (change: MariDbPendingApproval["diffPreview"][number], index: number) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const single = approval.diffPreview.length === 1;
  const actions = (
    <>
      <button type="button" onClick={onShowRaw} className="mari-link -ml-2">
        {localizeUi("ui.chat.mariappliededit.showRaw")}
      </button>
      <span className="flex-1" />
      <button type="button" onClick={() => onRestore(approval.id)} disabled={busy || disabled} className="mari-link">
        <Undo2 size="0.8rem" aria-hidden="true" />
        {localizeUi("ui.chat.mariappliededit.undo")}
      </button>
      <button type="button" onClick={() => onKeep(approval.id)} disabled={busy || disabled} className="mari-btn">
        {busy ? <Loader2 size="0.8rem" className="animate-spin" aria-hidden="true" /> : null}
        {busy ? localizeUi("ui.noodle.stageprofileform.saving") : localizeUi("ui.chat.mariappliededit.keep")}
      </button>
    </>
  );
  return (
    <section className="mari-edit mari-edit-review" aria-label={localizeUi("ui.chat.mariappliededit.label")}>
      {approval.diffPreview.map((change, index) => {
        const fields = computeFieldChanges(change);
        const character =
          change.table === "characters" ? buildCharacterPreviewModel(change.after ?? change.before) : null;
        const name = character?.name ?? rowTitle(change, localizeUi);
        const open = openIndex === index;
        return (
          <div key={`${index}:${change.table}:${change.id}`} className="mari-edit__row" data-open={open}>
            <button
              type="button"
              className="mari-edit__head"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : index)}
            >
              <MariRecordAvatar
                name={name}
                src={character?.avatarSrc}
                avatarCropStyle={character?.avatarCropStyle}
                icon={character ? UserRound : FileText}
              />
              <span className="mari-edit__text">
                <span className="mari-edit__title">{name}</span>
                <span className="mari-edit__meta">
                  {localizeUi("ui.chat.mariappliededit.meta", {
                    entity: describeTable(change.table).toLocaleLowerCase(),
                    fields: fields
                      .slice(0, 3)
                      .map((field) => field.label.toLocaleLowerCase())
                      .join(", "),
                  })}
                </span>
              </span>
              <span className="mari-edit__end">
                {localizeUi("ui.chat.mariappliededit.changes", { count: fields.length })}
                <ChevronRight size="0.75rem" aria-hidden="true" />
              </span>
            </button>
            <div className="mari-edit__expand">
              <div>
                <div className="mari-edit__body">
                  {index === 0 && approval.reason ? <p className="mari-edit__reason">{approval.reason}</p> : null}
                  {fields.map((field) => (
                    <div key={field.path} className="mari-field">
                      <span className="mari-field__label">{field.label}</span>
                      <TrackedField field={field} />
                    </div>
                  ))}
                  {onRenderRow && canRenderPrompt(change) ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => onRenderRow(change, index)}
                        disabled={busy || disabled}
                        title={localizeUi("ui.chat.mariediteasyviewer.viewAsPromptHint")}
                        className="mari-link -ml-2"
                      >
                        <Eye size="0.8rem" aria-hidden="true" />
                        {localizeUi("ui.chat.mariediteasyviewer.viewAsPrompt")}
                      </button>
                    </div>
                  ) : null}
                  {single ? <div className="mari-edit__actions">{actions}</div> : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {single ? null : <div className="mari-edit__footer">{actions}</div>}
      {approval.diffTruncated ? (
        <p className="mari-edit__reason border-t border-[var(--mari-divider)] px-[0.9rem] py-2">
          {localizeUi("ui.chat.databaseworkspaceapprovalcard.thisPreviewMayNotShowEveryAffectedRow")}
        </p>
      ) : null}
    </section>
  );
}

function DatabaseWorkspaceApprovalCard({
  approval,
  busy,
  disabled,
  onKeep,
  onKeepEnable,
  onRestore,
  onRejectRows,
  onRenderPrompt,
}: {
  approval: MariDbPendingApproval;
  busy: boolean;
  disabled: boolean;
  onKeep: (id: string) => void;
  onKeepEnable?: (id: string) => void;
  onRestore: (id: string) => void;
  onRejectRows?: (
    id: string,
    rows: Array<{ index: number; table: string; id: string; action: string }>,
  ) => Promise<boolean>;
  onRenderPrompt?: (
    id: string,
    row: { index: number; table: string; id: string; action: string },
  ) => Promise<{ before: MariPromptRenderSide; after: MariPromptRenderSide } | null>;
}) {
  const { t: localizeUi } = useUiTranslation();
  // #4931: synthetic prompt-preview modal state for a character/preset row.
  const [promptPreview, setPromptPreview] = useState<{
    loading: boolean;
    error: boolean;
    before: MariPromptRenderSide;
    after: MariPromptRenderSide;
  } | null>(null);
  // Each open/close bumps the token so a late render resolve can't re-open a modal the user closed.
  const renderTokenRef = useRef(0);
  const closePromptPreview = useCallback(() => {
    renderTokenRef.current += 1;
    setPromptPreview(null);
  }, []);
  const handleRenderRow = useCallback(
    async (change: MariDbPendingApproval["diffPreview"][number], index: number) => {
      if (!onRenderPrompt) return;
      const token = (renderTokenRef.current += 1);
      setPromptPreview({ loading: true, error: false, before: null, after: null });
      try {
        const result = await onRenderPrompt(approval.id, {
          index,
          table: change.table,
          id: change.id,
          action: change.action,
        });
        if (renderTokenRef.current !== token) return; // closed or superseded while assembling
        if (result) setPromptPreview({ loading: false, error: false, before: result.before, after: result.after });
        else setPromptPreview({ loading: false, error: true, before: null, after: null });
      } catch {
        if (renderTokenRef.current !== token) return;
        setPromptPreview({ loading: false, error: true, before: null, after: null });
      }
    },
    [onRenderPrompt, approval.id],
  );
  // Easy/Raw is toggled PER CARD (seeded from the saved default), so flipping one card no longer
  // flips the rest.
  const defaultViewMode = useUIStore((s) => s.mariEditViewMode);
  const setDefaultViewMode = useUIStore((s) => s.setMariEditViewMode);
  const [viewMode, setViewMode] = useState<MariEditViewMode>(defaultViewMode);
  // #4931: which rows are collapsed (folded to their name + status summary). Reversible — unlike the
  // old one-way Dismiss.
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(() => new Set());
  // The raw view lists the first few deleted/created rows; the rest are one click away rather than
  // permanently hidden.
  const [showAllRawRows, setShowAllRawRows] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const toggleAnchorRef = useRef<number | null>(null);
  // Keep this card anchored in the scroll viewport across a height change so the toggle doesn't
  // shove what the user is reading off-screen.
  const changeViewMode = useCallback(
    (mode: MariEditViewMode) => {
      toggleAnchorRef.current = cardRef.current?.getBoundingClientRect().top ?? null;
      setViewMode(mode);
      // Persist as the saved default so the choice survives this card remounting and new cards open
      // the same way. Already-mounted cards keep their own local state, so one card's toggle still
      // does not flip the others.
      setDefaultViewMode(mode);
    },
    [setDefaultViewMode],
  );
  useLayoutEffect(() => {
    const anchor = toggleAnchorRef.current;
    toggleAnchorRef.current = null;
    if (anchor === null || !cardRef.current) return;
    const delta = cardRef.current.getBoundingClientRect().top - anchor;
    if (Math.abs(delta) < 1) return;
    const scroller = getScrollableAncestor(cardRef.current);
    if (scroller) scroller.scrollTop += delta;
  }, [viewMode]);
  const approvalSubject = describeApprovalSubject(approval);
  const deletedRows = approval.diffPreview.filter((change) => change.action === "delete");
  const insertedRows = approval.diffPreview.filter((change) => change.action === "insert");
  // #4851: a saved memory lands disabled; offer "Keep & Enable" to keep AND switch it on.
  // Gated to mari_instructions inserts (matches the server-side guard), and only for
  // NON-persistent ones, because enabling a Persistent memory injects its full body every turn, a
  // heavier commitment, so route that through the Memories panel where Persistent is visible.
  const enableableMemoryInsert = insertedRows.some((change) => {
    if (change.table !== "mari_instructions") return false;
    const after = change.after as { enabled?: unknown; persistent?: unknown } | null;
    return Number(after?.enabled) !== 1 && Number(after?.persistent) !== 1;
  });

  const promptPreviewModal = promptPreview ? (
    <MariPromptPreviewModal
      title={localizeUi("ui.chat.maripromptpreviewmodal.title")}
      loading={promptPreview.loading}
      error={promptPreview.error}
      before={promptPreview.before}
      after={promptPreview.after}
      onClose={closePromptPreview}
    />
  ) : null;

  if (viewMode === "easy" && !enableableMemoryInsert && isAppliedEdit(approval)) {
    return (
      <TranscriptRow layout="document" marker={null}>
        <AppliedEditReview
          approval={approval}
          busy={busy}
          disabled={disabled}
          onKeep={onKeep}
          onRestore={onRestore}
          onShowRaw={() => changeViewMode("raw")}
          onRenderRow={onRenderPrompt ? handleRenderRow : undefined}
        />
        {promptPreviewModal}
      </TranscriptRow>
    );
  }

  return (
    <TranscriptRow layout="document" marker={null}>
      <div ref={cardRef} className="mari-decision-surface text-xs text-[var(--foreground)]">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles size="0.85rem" className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
          <span className="font-semibold">
            {localizeUi("ui.chat.databaseworkspaceapprovalcard.reviewMariSChanges")}
          </span>
          <div className="ml-auto flex shrink-0 items-center gap-0.5 rounded-md bg-[var(--background)]/60 p-0.5">
            <button
              type="button"
              onClick={() => changeViewMode("easy")}
              aria-pressed={viewMode === "easy"}
              className={cn(
                "rounded px-1.5 py-0.5 text-[0.625rem] font-medium transition-colors",
                viewMode === "easy"
                  ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              {localizeUi("ui.chat.databaseworkspaceapprovalcard.easyView")}
            </button>
            <button
              type="button"
              onClick={() => changeViewMode("raw")}
              aria-pressed={viewMode === "raw"}
              className={cn(
                "rounded px-1.5 py-0.5 text-[0.625rem] font-medium transition-colors",
                viewMode === "raw"
                  ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              {localizeUi("ui.chat.databaseworkspaceapprovalcard.rawView")}
            </button>
          </div>
        </div>
        {approvalSubject ? (
          <p className="mt-0.5 text-[0.6875rem] text-[var(--muted-foreground)]">{approvalSubject}</p>
        ) : null}
        <p className="mt-1 text-[0.6875rem] text-[var(--muted-foreground)]">
          {localizeUi("ui.chat.databaseworkspaceapprovalcard.mariAlreadyAppliedThisKeepItOrRestoreThe")}
        </p>
        {viewMode === "raw" && (
          <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--background)]/80 p-2 font-mono text-[0.6875rem] text-[var(--muted-foreground)]">
            {approval.command}
          </pre>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-[var(--muted-foreground)]">
          <span className="inline-flex items-center gap-1">
            <Database size="0.7rem" /> {summarizeTables(approval.affectedTables)}
          </span>
          <span>
            {approval.affectedRows} {localizeUi("ui.chat.databaseworkspaceapprovalcard.row")}
            {approval.affectedRows === 1 ? "" : localizeUi("ui.noodle.stageprofileview.s")}
          </span>
        </div>
        {approval.diffTruncated && (
          <p className="mt-1 text-[0.625rem] text-[var(--muted-foreground)]">
            {localizeUi("ui.chat.databaseworkspaceapprovalcard.thisPreviewMayNotShowEveryAffectedRow")}
          </p>
        )}
        {viewMode === "easy" && (
          <MariEditEasyViewer
            approval={approval}
            collapsed={collapsedRows}
            onToggleCollapse={(key) =>
              setCollapsedRows((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            }
            onRejectRow={
              onRejectRows
                ? (change, index) => {
                    void (async () => {
                      const reverted = await onRejectRows(approval.id, [
                        { index, table: change.table, id: change.id, action: change.action },
                      ]);
                      // A successful reject prunes the row, shifting every later index, so the
                      // positional collapse keys go stale — reset them then. On a no-op (state_changed
                      // / invalid_selection) diffPreview is unchanged, so keep the collapse state.
                      if (reverted) setCollapsedRows(new Set());
                    })();
                  }
                : undefined
            }
            onRenderRow={onRenderPrompt ? handleRenderRow : undefined}
            busy={busy || disabled}
          />
        )}
        {viewMode === "raw" && deletedRows.length > 0 && (
          <div className="mt-2 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-2 text-[0.6875rem] text-[var(--foreground)]">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--destructive)]">
              <Trash2 size="0.75rem" />
              {localizeUi("ui.chat.databaseworkspaceapprovalcard.mariDeleted")} {deletedRows.length}{" "}
              {localizeUi("ui.chat.databaseworkspaceapprovalcard.item")}
              {deletedRows.length === 1 ? "" : localizeUi("ui.noodle.stageprofileview.s")}.
            </div>
            <p className="mt-1 text-[var(--muted-foreground)]">
              {localizeUi("ui.chat.databaseworkspaceapprovalcard.restoreWillPutTheSavedRowSnapshotBack")}
            </p>
            <div className="mt-2 space-y-2">
              {(showAllRawRows ? deletedRows : deletedRows.slice(0, 3)).map((change, index) => (
                <details
                  key={`${change.table}:${change.id}:${index}`}
                  className="rounded-md bg-[var(--background)]/80 p-2"
                >
                  <summary className="cursor-pointer font-medium text-[var(--foreground)]">
                    {summarizeDeletedRow(change)}
                  </summary>
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-[0.625rem] text-[var(--muted-foreground)]">
                    {formatRowPreview(change.before)}
                  </pre>
                </details>
              ))}
              {!showAllRawRows && deletedRows.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllRawRows(true)}
                  className="text-[0.625rem] text-[var(--muted-foreground)] underline-offset-2 hover:underline"
                >
                  {localizeUi("ui.chat.databaseworkspaceapprovalcard.showAllRows", { total: deletedRows.length })}
                </button>
              )}
            </div>
          </div>
        )}
        {viewMode === "raw" && insertedRows.length > 0 && (
          <div className="mt-2 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-2 text-[0.6875rem] text-[var(--foreground)]">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--primary)]">
              <Sparkles size="0.75rem" />
              {localizeUi("ui.chat.databaseworkspaceapprovalcard.mariCreatedNewItems")}
            </div>
            <p className="mt-1 text-[var(--muted-foreground)]">
              {localizeUi("ui.chat.databaseworkspaceapprovalcard.keepSavesThemToYourLibraryRestoreRemovesEverything")}
            </p>
            <div className="mt-2 space-y-2">
              {(showAllRawRows ? insertedRows : insertedRows.slice(0, 3)).map((change, index) => (
                <details
                  key={`${change.table}:${change.id}:${index}`}
                  className="rounded-md bg-[var(--background)]/80 p-2"
                >
                  <summary className="cursor-pointer font-medium text-[var(--foreground)]">
                    {summarizeCreatedRow(change)}
                  </summary>
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-[0.625rem] text-[var(--muted-foreground)]">
                    {formatRowPreview(change.after)}
                  </pre>
                </details>
              ))}
              {!showAllRawRows && insertedRows.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllRawRows(true)}
                  className="text-[0.625rem] text-[var(--muted-foreground)] underline-offset-2 hover:underline"
                >
                  {localizeUi("ui.chat.databaseworkspaceapprovalcard.showAllRows", { total: insertedRows.length })}
                </button>
              )}
            </div>
          </div>
        )}
        {approval.reason ? (
          <p className="mt-3 max-w-[70ch] text-[0.6875rem] text-[var(--muted-foreground)]">{approval.reason}</p>
        ) : null}
        <div className="mari-decision-actions mt-4 flex flex-col gap-2 sm:flex-row sm:justify-start">
          {enableableMemoryInsert && onKeepEnable && (
            <button
              type="button"
              onClick={() => onKeepEnable(approval.id)}
              disabled={busy || disabled}
              className="rounded-md border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="inline-flex items-center gap-1">
                <Check size="0.7rem" />
                {localizeUi("ui.chat.databaseworkspaceapprovalcard.keepAndEnable")}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onKeep(approval.id)}
            disabled={busy || disabled}
            className="rounded-md bg-[var(--primary)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="inline-flex items-center gap-1">
              {busy ? <Loader2 size="0.7rem" className="animate-spin" /> : <Check size="0.7rem" />}
              {busy
                ? localizeUi("ui.noodle.stageprofileform.saving")
                : localizeUi("ui.chat.databaseworkspaceapprovalcard.keep")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onRestore(approval.id)}
            disabled={busy || disabled}
            className="rounded-md border border-[var(--border)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="inline-flex items-center gap-1">
              <RefreshCw size="0.7rem" />
              {localizeUi("ui.chat.databaseworkspaceapprovalcard.restore")}
            </span>
          </button>
        </div>
      </div>
      {promptPreviewModal}
    </TranscriptRow>
  );
}

/**
 * R42 (direction A): the prompt names what happens and why; the exact package, hash and file
 * contents sit behind one "Technical details" disclosure.
 */
function TechnicalDetails({ rows, children }: { rows: Array<[string, ReactNode]>; children?: ReactNode }) {
  const { t: localizeUi } = useUiTranslation();
  return (
    <details className="mari-tech">
      <summary className="mari-link -ml-2">
        <ChevronRight size="0.8rem" aria-hidden="true" />
        {localizeUi("ui.chat.mariapprovalcard.technicalDetails")}
      </summary>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </details>
  );
}

function DependencyWorkspaceApprovalCard({
  approval,
  busy,
  disabled,
  onApprove,
  onDiscard,
}: {
  approval: MariDependencyInstallApproval;
  busy: boolean;
  disabled: boolean;
  onApprove: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  const dependencies = approval.directDependencies;
  return (
    <MariCard
      media={<PackagePlus size="1rem" aria-hidden="true" />}
      title={localizeUi("ui.chat.dependencyworkspaceapprovalcard.title", { name: approval.packageName })}
      meta={localizeUi("ui.chat.dependencyworkspaceapprovalcard.meta", { version: approval.version })}
      actions={
        <>
          <button
            type="button"
            onClick={() => onDiscard(approval.id)}
            disabled={busy || disabled}
            className="mari-link"
          >
            {localizeUi("ui.chat.dependencyworkspaceapprovalcard.notNow")}
          </button>
          <button
            type="button"
            onClick={() => onApprove(approval.id)}
            disabled={busy || disabled}
            className="mari-btn mari-btn--solid"
          >
            {busy ? <Loader2 size="0.8rem" className="animate-spin" aria-hidden="true" /> : null}
            {busy
              ? localizeUi("ui.chat.dependencyworkspaceapprovalcard.installing")
              : localizeUi("ui.agents.agentcatalogview.install")}
          </button>
        </>
      }
    >
      <p>{[approval.reason, localizeUi("ui.chat.dependencyworkspaceapprovalcard.risk")].filter(Boolean).join(" ")}</p>
      <TechnicalDetails
        rows={[
          [
            localizeUi("ui.chat.dependencyworkspaceapprovalcard.package"),
            <code>
              {approval.packageName}@{approval.version}
            </code>,
          ],
          [
            localizeUi("ui.chat.dependencyworkspaceapprovalcard.target"),
            `${approval.target} · ${approval.dependencyType}`,
          ],
          [
            localizeUi("ui.chat.dependencyworkspaceapprovalcard.dependencies"),
            dependencies.length === 0
              ? localizeUi("ui.chat.dependencyworkspaceapprovalcard.none")
              : dependencies.map((dependency) => `${dependency.name} ${dependency.range}`).join(", "),
          ],
          [localizeUi("ui.chat.dependencyworkspaceapprovalcard.integrity"), <code>{approval.integrity}</code>],
          [localizeUi("ui.chat.dependencyworkspaceapprovalcard.source"), <code>{approval.tarballUrl}</code>],
        ]}
      />
    </MariCard>
  );
}

function SensitiveFileWorkspaceApprovalCard({
  approval,
  busy,
  disabled,
  onApprove,
  onDiscard,
}: {
  approval: MariSensitiveFileApproval;
  busy: boolean;
  disabled: boolean;
  onApprove: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  const file = approval.path.split(/[\\/]/u).at(-1) || approval.path;
  const created = approval.changeType === "create";
  return (
    <MariCard
      media={<FileText size="1rem" aria-hidden="true" />}
      title={localizeUi(
        created
          ? "ui.chat.sensitivefileworkspaceapprovalcard.titleCreate"
          : "ui.chat.sensitivefileworkspaceapprovalcard.titleUpdate",
        { file },
      )}
      meta={localizeUi(
        created
          ? "ui.chat.sensitivefileworkspaceapprovalcard.metaCreate"
          : "ui.chat.sensitivefileworkspaceapprovalcard.metaUpdate",
      )}
      actions={
        <>
          <button
            type="button"
            onClick={() => onDiscard(approval.id)}
            disabled={busy || disabled}
            className="mari-link"
          >
            {localizeUi("ui.chat.dependencyworkspaceapprovalcard.notNow")}
          </button>
          <button
            type="button"
            onClick={() => onApprove(approval.id)}
            disabled={busy || disabled}
            className="mari-btn mari-btn--solid"
          >
            {busy ? <Loader2 size="0.8rem" className="animate-spin" aria-hidden="true" /> : null}
            {busy
              ? localizeUi("ui.chat.sensitivefileworkspaceapprovalcard.applying")
              : localizeUi("ui.chat.sensitivefileworkspaceapprovalcard.applyChange")}
          </button>
        </>
      }
    >
      <p>
        {[
          approval.reason,
          localizeUi(
            "ui.chat.sensitivefileworkspaceapprovalcard.thisFileCanAffectDependenciesStartupInstallationOrAutomation",
          ),
        ]
          .filter(Boolean)
          .join(" ")}
      </p>
      <TechnicalDetails
        rows={[
          [localizeUi("ui.chat.sensitivefileworkspaceapprovalcard.path"), <code>{approval.path}</code>],
          [localizeUi("ui.chat.sensitivefileworkspaceapprovalcard.hash"), <code>{approval.afterHash}</code>],
        ]}
      >
        <pre>
          {approval.preview}
          {approval.previewTruncated
            ? `\n\n${localizeUi("ui.chat.sensitivefileworkspaceapprovalcard.previewTruncated")}`
            : ""}
        </pre>
      </TechnicalDetails>
    </MariCard>
  );
}

export function WorkspaceApprovalCard({
  approval,
  busy,
  disabled,
  onKeep,
  onKeepEnable,
  onRestore,
  onRejectRows,
  onRenderPrompt,
}: {
  approval: MariWorkspacePendingApproval;
  busy: boolean;
  disabled: boolean;
  onKeep: (id: string) => void;
  onKeepEnable?: (id: string) => void;
  onRestore: (id: string) => void;
  onRejectRows?: (
    id: string,
    rows: Array<{ index: number; table: string; id: string; action: string }>,
  ) => Promise<boolean>;
  onRenderPrompt?: (
    id: string,
    row: { index: number; table: string; id: string; action: string },
  ) => Promise<{ before: MariPromptRenderSide; after: MariPromptRenderSide } | null>;
}) {
  const { t: localizeUi } = useUiTranslation();
  let card: ReactNode;
  if (approval.kind === "dependency_install") {
    card = (
      <DependencyWorkspaceApprovalCard
        approval={approval}
        busy={busy}
        disabled={disabled}
        onApprove={onKeep}
        onDiscard={onRestore}
      />
    );
  } else if (approval.kind === "sensitive_file") {
    card = (
      <SensitiveFileWorkspaceApprovalCard
        approval={approval}
        busy={busy}
        disabled={disabled}
        onApprove={onKeep}
        onDiscard={onRestore}
      />
    );
  } else {
    card = (
      <DatabaseWorkspaceApprovalCard
        approval={approval}
        busy={busy}
        disabled={disabled}
        onKeep={onKeep}
        onKeepEnable={onKeepEnable}
        onRestore={onRestore}
        onRejectRows={onRejectRows}
        onRenderPrompt={onRenderPrompt}
      />
    );
  }
  return (
    <div
      id={`mari-workspace-review-${approval.id}`}
      data-review-id={approval.id}
      className="mari-inline-review"
      aria-label={localizeUi("commandCenter.completion.review")}
    >
      {card}
    </div>
  );
}
