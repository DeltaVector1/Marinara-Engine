import { type ReactNode, useCallback, useRef, useState } from "react";
import { useTranslation as useUiTranslation } from "react-i18next";
import { Check, ChevronRight, FileText, Loader2, Minus, PackagePlus, Trash2, Undo2 } from "lucide-react";
import type {
  MariDbPendingApproval,
  MariDependencyInstallApproval,
  MariSensitiveFileApproval,
  MariWorkspacePendingApproval,
} from "@marinara-engine/shared";

import { describeTable, replyFixChat } from "../../lib/mari-edit-diff";
import { summarizeDeleteReview } from "../../lib/professor-mari-presentation";
import { cn } from "../../lib/utils";
import { useUIStore } from "../../stores/ui.store";
import { MariEditEasyViewer, rowTitle } from "./MariEditEasyViewer";
import { MariCard, MariNote } from "./mari-primitives";
import { MariPromptPreviewModal, type MariPromptRenderSide } from "./MariPromptPreviewModal";
import { TranscriptRow } from "./MariTranscriptRow";

/**
 * Professor Mari's approval gates and the summaries they are built from.
 *
 * These are what the user reads while deciding whether to allow a change. Each
 * one renders inside the turn that asked for it (`assignReviewsToTurns`).
 */
function summarizeTables(tables: Record<string, number>) {
  const entries = Object.entries(tables);
  if (entries.length === 0) return "No rows";
  return entries
    .slice(0, 3)
    .map(([table, count]) => `${count} ${table}`)
    .join(", ");
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

/** Raw is one disclosure: the command Mari ran, then the snapshot of every row she created or removed. */
function RawDetails({
  approval,
  open,
  onToggle,
}: {
  approval: MariDbPendingApproval;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  const snapshots = approval.diffPreview
    .filter((change) => change.action === "insert" || change.action === "delete")
    .map(
      (change) =>
        `${change.action} ${change.table} ${change.id}\n${formatRowPreview(change.action === "delete" ? change.before : change.after)}`,
    );
  return (
    <TechnicalDetails
      label={localizeUi("ui.chat.databaseworkspaceapprovalcard.rawView")}
      open={open}
      onToggle={onToggle}
      rows={[
        [localizeUi("ui.chat.mariapprovalcard.tables"), summarizeTables(approval.affectedTables)],
        [localizeUi("ui.chat.mariapprovalcard.rows"), String(approval.affectedRows)],
      ]}
    >
      <pre>{[approval.command, ...snapshots].join("\n\n")}</pre>
    </TechnicalDetails>
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
  // "Edit review opens in: Raw" opens the Raw disclosure; toggling one saves the choice for the next
  // card without flipping the cards already on screen.
  const defaultViewMode = useUIStore((s) => s.mariEditViewMode);
  const setDefaultViewMode = useUIStore((s) => s.setMariEditViewMode);
  const [rawOpen] = useState(defaultViewMode === "raw");
  const raw = (
    <RawDetails approval={approval} open={rawOpen} onToggle={(open) => setDefaultViewMode(open ? "raw" : "easy")} />
  );
  const deleteReview = summarizeDeleteReview(approval);
  // #4851: a saved memory lands disabled; offer "Keep & Enable" to keep AND switch it on.
  // Gated to mari_instructions inserts (matches the server-side guard), and only for
  // NON-persistent ones, because enabling a Persistent memory injects its full body every turn, a
  // heavier commitment, so route that through the Memories panel where Persistent is visible.
  const enableableMemoryInsert = approval.diffPreview.some((change) => {
    if (change.action !== "insert" || change.table !== "mari_instructions") return false;
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

  // R42: a delete is a risky prompt. Mari already removed the rows; Delete keeps them gone.
  // ponytail: a preset section or group delete also edits the preset (and orphans the group's
  // sections); those automatic side-effect updates show only in Raw's command and table counts, not
  // as rows here. Split the card if Mari ever mixes deletes with edits the user should judge.
  if (deleteReview) {
    const { parent, selected, count, linkedCount } = deleteReview;
    const names = selected.map((change) => rowTitle(change, localizeUi));
    return (
      <TranscriptRow layout="document" marker={null}>
        <MariCard
          variant="danger"
          media={<Trash2 size="1rem" aria-hidden="true" />}
          title={
            selected.length === 1
              ? localizeUi("ui.chat.marideleteprompt.title", { name: names[0] })
              : localizeUi("ui.chat.marideleteprompt.titleMany", { count })
          }
          meta={
            selected.length === 1
              ? linkedCount > 0
                ? localizeUi("ui.chat.marideleteprompt.metaLinked", {
                    type: describeTable(parent.table),
                    count: linkedCount,
                  })
                : describeTable(parent.table)
              : `${names.slice(0, 3).join(", ")}${selected.length > 3 ? ", …" : ""}`
          }
          actions={
            <>
              <button
                type="button"
                onClick={() => onRestore(approval.id)}
                disabled={busy || disabled}
                className="mari-link"
              >
                {localizeUi("ui.chat.marideleteprompt.restore", { count })}
              </button>
              <button
                type="button"
                onClick={() => onKeep(approval.id)}
                disabled={busy || disabled}
                className="mari-btn mari-btn--danger"
              >
                {busy ? <Loader2 size="0.8rem" className="animate-spin" aria-hidden="true" /> : null}
                {busy ? localizeUi("ui.chat.marideleteprompt.deleting") : localizeUi("ui.chat.marideleteprompt.delete")}
              </button>
            </>
          }
        >
          <p>{[approval.reason, localizeUi("ui.chat.marideleteprompt.risk", { count })].filter(Boolean).join(" ")}</p>
          {approval.diffTruncated ? (
            <p>{localizeUi("ui.chat.databaseworkspaceapprovalcard.thisPreviewMayNotShowEveryAffectedRow")}</p>
          ) : null}
          {raw}
        </MariCard>
      </TranscriptRow>
    );
  }

  return (
    <TranscriptRow layout="document" marker={null}>
      <MariEditEasyViewer
        approval={approval}
        raw={raw}
        busy={busy || disabled}
        onRenderRow={onRenderPrompt ? handleRenderRow : undefined}
        onRejectRow={
          onRejectRows
            ? (change, index) =>
                void onRejectRows(approval.id, [{ index, table: change.table, id: change.id, action: change.action }])
            : undefined
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => onRestore(approval.id)}
              disabled={busy || disabled}
              className="mari-link"
            >
              <Undo2 size="0.8rem" aria-hidden="true" />
              {localizeUi(
                approval.diffPreview.some((change) => replyFixChat(change))
                  ? "ui.chat.mariappliededit.restoreReply"
                  : "ui.chat.mariappliededit.undo",
              )}
            </button>
            {enableableMemoryInsert && onKeepEnable ? (
              <button
                type="button"
                onClick={() => onKeepEnable(approval.id)}
                disabled={busy || disabled}
                className="mari-btn"
              >
                {localizeUi("ui.chat.databaseworkspaceapprovalcard.keepAndEnable")}
              </button>
            ) : null}
            <button type="button" onClick={() => onKeep(approval.id)} disabled={busy || disabled} className="mari-btn">
              {busy ? <Loader2 size="0.8rem" className="animate-spin" aria-hidden="true" /> : null}
              {busy ? localizeUi("ui.noodle.stageprofileform.saving") : localizeUi("ui.chat.mariappliededit.keep")}
            </button>
          </>
        }
      />
      {promptPreviewModal}
    </TranscriptRow>
  );
}

/**
 * R42 (direction A): the prompt names what happens and why; the exact package, hash and file
 * contents sit behind one "Technical details" disclosure.
 */
function TechnicalDetails({
  rows,
  children,
  label,
  open,
  onToggle,
}: {
  rows: Array<[string, ReactNode]>;
  children?: ReactNode;
  label?: string;
  open?: boolean;
  onToggle?: (open: boolean) => void;
}) {
  const { t: localizeUi } = useUiTranslation();
  return (
    <details
      className="mari-tech"
      open={open}
      onToggle={onToggle ? (event) => onToggle(event.currentTarget.open) : undefined}
    >
      <summary className="mari-link -ml-2">
        <ChevronRight size="0.8rem" aria-hidden="true" />
        {label ?? localizeUi("ui.chat.mariapprovalcard.technicalDetails")}
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

/** Direction A: once answered, an install or sensitive-file prompt folds to one quiet line. */
export function ResolvedPromptLine({
  approval,
  outcome,
}: {
  approval: MariDependencyInstallApproval | MariSensitiveFileApproval;
  outcome: "applied" | "discarded";
}) {
  const { t: localizeUi } = useUiTranslation();
  const install = approval.kind === "dependency_install";
  const name = install ? approval.packageName : approval.path.split(/[\\/]/u).at(-1) || approval.path;
  const title = install
    ? localizeUi("ui.chat.dependencyworkspaceapprovalcard.title", { name })
    : localizeUi(
        approval.changeType === "create"
          ? "ui.chat.sensitivefileworkspaceapprovalcard.titleCreate"
          : "ui.chat.sensitivefileworkspaceapprovalcard.titleUpdate",
        { file: name },
      );
  const Icon = outcome === "discarded" ? Minus : Check;
  return (
    <MariNote role="status" className="flex items-center gap-1.5">
      <Icon size="0.8rem" aria-hidden="true" />
      {outcome === "discarded"
        ? localizeUi("ui.chat.mariresolvedprompt.skipped", { title })
        : localizeUi(install ? "ui.chat.mariresolvedprompt.installed" : "ui.chat.mariresolvedprompt.saved", { name })}
    </MariNote>
  );
}

export function WorkspaceApprovalCard({
  approval,
  busy,
  disabled,
  highlighted = false,
  onKeep,
  onKeepEnable,
  onRestore,
  onRejectRows,
  onRenderPrompt,
}: {
  approval: MariWorkspacePendingApproval;
  busy: boolean;
  disabled: boolean;
  /** R9: a brief highlight when the omnibar jumped straight to this review. */
  highlighted?: boolean;
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
      className={cn("mari-inline-review", highlighted && "mari-inline-review--jump")}
      aria-label={localizeUi("commandCenter.completion.review")}
    >
      {card}
    </div>
  );
}
