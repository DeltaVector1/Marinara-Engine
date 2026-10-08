// Slice 74: what Professor Mari changed, as a receipt under her answer. Built only from the record on her
// message (`mariWorkspaceActionResults`), so the card reads the same live, after Keep / Undo and after a
// reload: face and name, what changed in words, one before/after pair, her reason, and Keep / Undo while
// the undo record lasts. Opened, it lists every field. Calm on purpose: what needs you is slice 71's card.

import { useState, type ReactNode } from "react";
import { useTranslation as useUiTranslation } from "react-i18next";
import { Check, ChevronRight, Undo2 } from "lucide-react";
import {
  mariReceiptReviewIds,
  mariReceiptState,
  type MariChangeExcerpt,
  type MariReceiptState,
  type MariWorkspaceActionResult,
  type MariWorkspacePendingApproval,
} from "@marinara-engine/shared";

import { fieldLabel } from "../../lib/mari-edit-diff";
import { cn } from "../../lib/utils";

type Localize = (key: string, options?: Record<string, unknown>) => string;

/** The turn's Keep / Undo wiring. Absent where the transcript cannot answer reviews. */
export interface MariReceiptControls {
  /** Reviews of this chat still waiting for Keep / Undo, by id. */
  pending: ReadonlyMap<string, MariWorkspacePendingApproval>;
  /** Reviews answered in this session before the message caught up. */
  answered: ReadonlyMap<string, "kept" | "undone">;
  busy: boolean;
  /** The omnibar just jumped to this review. */
  isHighlighted?: (reviewId: string) => boolean;
  onAnswer: (approvals: MariWorkspacePendingApproval[], keep: boolean) => void;
  /** The full review (exact diff, prompt preview, raw) behind "Technical details". */
  renderDetails?: (approval: MariWorkspacePendingApproval) => ReactNode;
}

const LIST_NOUNS: Record<string, string> = {
  entries: "nounEntries",
  character_book: "nounEntries",
  sections: "nounSections",
  groups: "nounGroups",
  choices: "nounChoices",
  alternate_greetings: "nounGreetings",
  tags: "nounTags",
};

const label = (field: string) => fieldLabel(field);

function words(text: string) {
  return text.split(/\s+/u).filter(Boolean);
}

/** The trackProseChange rule: most old words kept is an edit, else a rewrite. */
function textVerb(change: Extract<MariChangeExcerpt, { kind: "text" | "value" }>) {
  if (!change.before) return "verbAdded";
  if (!change.after) return "verbCleared";
  if (change.kind === "value") return "verbChanged";
  const kept = words(change.before).filter((word) => change.after.includes(word)).length;
  return kept >= 0.4 * words(change.before).length ? "verbEdited" : "verbRewrote";
}

function listParts(change: Extract<MariChangeExcerpt, { kind: "list" }>, t: Localize) {
  const nounKey = LIST_NOUNS[change.field] ?? "nounItems";
  return (["added", "edited", "removed"] as const)
    .filter((part) => change.count[part] > 0)
    .map((part) => {
      const count = change.count[part];
      const noun = t(`ui.chat.marichangereceipt.${nounKey}`, { count });
      return t(`ui.chat.marichangereceipt.list${part[0]!.toUpperCase()}${part.slice(1)}`, { count, noun });
    });
}

// An old message saved every column a row write touched, ids and timestamps too; they say nothing.
const OLD_NOISE = /^(?:id|.+Id|.+_id|(?:created|updated)(?:At|_at)|embedding)$/u;
const oldFields = (result: MariWorkspaceActionResult) => result.changedFields.filter((field) => !OLD_NOISE.test(field));

/** "Rewrote description and personality · Added scenario · Added 2 entries", at most two parts and "+N". */
function receiptSummary(result: MariWorkspaceActionResult, t: Localize, lang: string): string {
  const list = (items: string[]) => new Intl.ListFormat(lang, { type: "conjunction" }).format(items);
  if (!result.changes) {
    const fields = oldFields(result).map((field) => label(field).toLocaleLowerCase(lang));
    return fields.length > 3
      ? t("ui.chat.marichangereceipt.oldFieldsMore", { fields: list(fields.slice(0, 3)), count: fields.length - 3 })
      : t("ui.chat.homeprofessormarichat.changedFields", { fields: list(fields) });
  }
  const groups = new Map<string, string[]>();
  const parts: string[] = [];
  for (const change of result.changes) {
    if (change.kind === "list") {
      parts.push(...listParts(change, t));
      continue;
    }
    const verb = textVerb(change);
    groups.set(verb, [...(groups.get(verb) ?? []), label(change.field).toLocaleLowerCase(lang)]);
  }
  const all = [
    ...[...groups].map(([verb, fields]) => t(`ui.chat.marichangereceipt.${verb}`, { fields: list(fields) })),
    ...parts,
  ];
  const extra = all.length - 2 + (result.moreChanges ?? 0);
  return [...all.slice(0, 2), ...(extra > 0 ? [t("ui.chat.marichangereceipt.more", { count: extra })] : [])].join(
    " · ",
  );
}

function ListChips({ change }: { change: Extract<MariChangeExcerpt, { kind: "list" }> }) {
  const { t } = useUiTranslation();
  const hidden =
    change.count.added +
    change.count.edited +
    change.count.removed -
    (change.added.length + change.edited.length + change.removed.length);
  return (
    <div className="mari-tags">
      {change.added.map((name) => (
        <span key={`+${name}`} className="mari-tag mari-tag--ins">
          {name}
        </span>
      ))}
      {change.edited.map((name) => (
        <span key={`~${name}`} className="mari-tag mari-receipt__tag--edit">
          {name}
        </span>
      ))}
      {change.removed.map((name) => (
        <span key={`-${name}`} className="mari-tag mari-tag--del">
          {name}
        </span>
      ))}
      {hidden > 0 ? (
        <span className="mari-receipt__muted">{t("ui.chat.marichangereceipt.more", { count: hidden })}</span>
      ) : null}
    </div>
  );
}

/** Folded: the first rewritten field as − / + lines, else the first list as chips. */
function Preview({ result }: { result: MariWorkspaceActionResult }) {
  const change =
    result.changes?.find((item) => item.kind === "text" && item.before && item.after) ?? result.changes?.[0];
  if (!change) return null;
  if (change.kind === "list") {
    return (
      <div className="mari-receipt__preview">
        <ListChips change={change} />
      </div>
    );
  }
  return (
    <div className="mari-receipt__preview">
      <span className="mari-receipt__label">{label(change.field)}</span>
      {change.before ? (
        <span className="mari-receipt__line mari-receipt__line--del">
          <span className="mari-receipt__sign" aria-hidden="true">
            −
          </span>
          <del>{change.before}</del>
        </span>
      ) : null}
      {change.after ? (
        <span className="mari-receipt__line mari-receipt__line--ins">
          <span className="mari-receipt__sign" aria-hidden="true">
            +
          </span>
          <ins>{change.after}</ins>
        </span>
      ) : null}
    </div>
  );
}

/** Opened: every field. */
function Fields({ result }: { result: MariWorkspaceActionResult }) {
  const { t } = useUiTranslation();
  if (!result.changes) {
    return (
      <>
        <p className="mari-receipt__muted">{t("ui.chat.marichangereceipt.oldNote")}</p>
        <div className="mari-tags">
          {oldFields(result).map((field) => (
            <span key={field} className="mari-tag">
              {label(field)}
            </span>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      {result.changes.map((change) => (
        <div key={`${change.kind}:${change.field}`} className="mari-field">
          <span className="mari-field__label">{label(change.field)}</span>
          {change.kind === "list" ? (
            <ListChips change={change} />
          ) : change.kind === "value" ? (
            <div className="mari-tags">
              {change.before ? <span className="mari-tag mari-tag--del">{change.before}</span> : null}
              {change.after ? <span className="mari-tag mari-tag--ins">{change.after}</span> : null}
            </div>
          ) : (
            <p className="mari-field__text">
              {change.before ? <del>{change.before}</del> : null}
              {change.before && change.after ? <span> </span> : null}
              {change.after ? <ins>{change.after}</ins> : null}
            </p>
          )}
        </div>
      ))}
      {result.moreChanges ? (
        <p className="mari-receipt__muted">
          {t("ui.chat.marichangereceipt.moreFields", { count: result.moreChanges })}
        </p>
      ) : null}
    </>
  );
}

function StateMark({ state }: { state: MariReceiptState }) {
  const { t } = useUiTranslation();
  if (state === "old") return null;
  if (state === "undone") {
    return (
      <span className="mari-receipt__state" data-state="undone">
        <Undo2 aria-hidden="true" />
        {t("ui.chat.mariappliededit.undone")}
      </span>
    );
  }
  return (
    <span className="mari-receipt__state">
      <Check aria-hidden="true" />
      {t(state === "kept" ? "ui.chat.mariappliededit.kept" : "ui.chat.marichangereceipt.saved")}
    </span>
  );
}

export function MariChangeReceipt({
  results,
  faceOf,
  nameOf,
  fallbackWhy,
  controls,
  onOpen,
}: {
  results: readonly MariWorkspaceActionResult[];
  faceOf: (result: MariWorkspaceActionResult) => ReactNode;
  /** The record's current name (it may have been renamed since). */
  nameOf: (result: MariWorkspaceActionResult) => string;
  /** Her answer's first "Why" point, used when a change carries no reason. */
  fallbackWhy?: string;
  controls?: MariReceiptControls;
  onOpen: (result: MariWorkspaceActionResult) => void;
}) {
  const { t, i18n } = useUiTranslation();
  const lang = i18n.resolvedLanguage ?? "en";
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const pendingIds = new Set(controls?.pending.keys() ?? []);
  const states = results.map((result) => mariReceiptState(result, pendingIds, controls?.answered));
  const ids = results.flatMap(mariReceiptReviewIds);
  const pending = ids.flatMap((id) => {
    const approval = controls?.pending.get(id);
    return approval ? [approval] : [];
  });
  const state = states.includes("open")
    ? "open"
    : states.every((value) => value === states[0])
      ? states[0]!
      : states.includes("undone")
        ? "undone"
        : "kept";
  const multi = results.length > 1;
  const why = (multi ? results.find((result) => result.reason)?.reason : results[0]?.reason) ?? fallbackWhy;
  const date = (iso?: string) =>
    iso && Number.isFinite(Date.parse(iso))
      ? new Intl.DateTimeFormat(lang, { month: "short", day: "numeric" }).format(new Date(iso))
      : null;
  const undoUntil = results
    .map((result) => result.undoUntil)
    .filter(Boolean)
    .sort()[0];
  const answer = (keep: boolean, approvals = pending) =>
    controls?.onAnswer(
      // Undo newest first, so each restore finds the rows as the next-newer change left them.
      keep ? approvals : [...approvals].sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt)),
      keep,
    );
  const busy = controls?.busy ?? false;
  const name = nameOf;
  const [firstId, ...otherIds] = pending.map((approval) => approval.id);

  return (
    <section
      id={firstId ? `mari-workspace-review-${firstId}` : undefined}
      data-review-id={firstId}
      className={cn(
        "mari-list mari-receipt",
        ids.some((id) => controls?.isHighlighted?.(id)) && "mari-inline-review--jump",
      )}
      data-state={state}
      data-multi={multi || undefined}
      aria-label={
        multi
          ? t("ui.chat.marichangereceipt.labelMany", { count: results.length })
          : t("ui.chat.marichangereceipt.label", { name: name(results[0]!) })
      }
    >
      {/* The omnibar jumps to a review by id; a merged record answers for all of its reviews. */}
      {otherIds.map((id) => (
        <span key={id} id={`mari-workspace-review-${id}`} data-review-id={id} hidden />
      ))}
      {results.map((result, index) => {
        const open = openIndex === index;
        const recordPending = mariReceiptReviewIds(result).flatMap((id) => {
          const approval = controls?.pending.get(id);
          return approval ? [approval] : [];
        });
        return (
          <div key={`${result.resource.kind}:${result.resource.id}`} className="mari-receipt__record" data-open={open}>
            <button
              type="button"
              className="mari-receipt__head"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : index)}
            >
              <span className="mari-receipt__face">{faceOf(result)}</span>
              <span className="mari-receipt__text">
                <span className="mari-receipt__name">
                  <span>{name(result)}</span>
                  {result.status === "created" ? (
                    <span className="mari-new-badge">{t("ui.chat.mariediteasyviewer.actionNew")}</span>
                  ) : null}
                </span>
                <span className="mari-receipt__what">{receiptSummary(result, t, lang)}</span>
              </span>
              {index === 0 ? <StateMark state={state} /> : null}
              <ChevronRight className="mari-receipt__chevron" aria-hidden="true" />
            </button>
            {open ? (
              <div className="mari-receipt__body">
                <Fields result={result} />
                {multi && result.reason && result.reason !== why ? (
                  <p className="mari-receipt__why">
                    <b>{t("ui.chat.homeprofessormarichat.why")}</b> {result.reason}
                  </p>
                ) : null}
                <div className="mari-receipt__links">
                  <button type="button" className="mari-link" onClick={() => onOpen(result)}>
                    {t("ui.chat.marichangereceipt.open", { name: name(result) })}
                    <ChevronRight aria-hidden="true" />
                  </button>
                  {multi && recordPending.length > 0 ? (
                    <button
                      type="button"
                      className="mari-link"
                      disabled={busy}
                      onClick={() => answer(false, recordPending)}
                    >
                      <Undo2 aria-hidden="true" />
                      {t("ui.chat.marichangereceipt.undoOnly", { name: name(result) })}
                    </button>
                  ) : null}
                  {controls?.renderDetails && recordPending.length > 0 ? (
                    <details className="mari-receipt__details">
                      <summary className="mari-link">{t("ui.chat.mariapprovalcard.technicalDetails")}</summary>
                      {recordPending.map((approval) => (
                        <div key={approval.id}>{controls.renderDetails?.(approval)}</div>
                      ))}
                    </details>
                  ) : null}
                </div>
              </div>
            ) : multi ? null : (
              <Preview result={result} />
            )}
          </div>
        );
      })}
      <div className="mari-receipt__foot">
        {why && state !== "old" ? (
          <p className="mari-receipt__why">
            <b>{t("ui.chat.homeprofessormarichat.why")}</b> {why}
          </p>
        ) : null}
        <span className="mari-receipt__actions">
          {state === "open" ? (
            <>
              {date(undoUntil) ? (
                <span className="mari-receipt__muted">
                  {t("ui.chat.marichangereceipt.undoUntil", { date: date(undoUntil) })}
                </span>
              ) : null}
              <button type="button" className="mari-link" disabled={busy} onClick={() => answer(false)}>
                <Undo2 aria-hidden="true" />
                {t(multi ? "ui.chat.marichangereceipt.undoAll" : "ui.chat.mariappliededit.undo")}
              </button>
              <button type="button" className="mari-btn" disabled={busy} onClick={() => answer(true)}>
                {t(multi ? "ui.chat.marichangereceipt.keepAll" : "ui.chat.mariappliededit.keep")}
              </button>
            </>
          ) : state === "closed" ? (
            <span className="mari-receipt__muted">
              {undoUntil && Date.parse(undoUntil) < Date.now()
                ? t("ui.chat.marichangereceipt.undoClosedOn", { date: date(undoUntil) })
                : t("ui.chat.marichangereceipt.undoClosed")}
            </span>
          ) : state === "undone" ? (
            <span className="mari-receipt__muted">{t("ui.chat.marichangereceipt.restored")}</span>
          ) : state === "old" && !multi ? (
            <button type="button" className="mari-link" onClick={() => onOpen(results[0]!)}>
              {t("ui.chat.marichangereceipt.open", { name: name(results[0]!) })}
              <ChevronRight aria-hidden="true" />
            </button>
          ) : null}
        </span>
      </div>
    </section>
  );
}
