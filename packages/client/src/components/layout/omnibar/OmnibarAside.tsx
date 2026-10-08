import { useMemo, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { MariStorySprite } from "../../chat/MariStorySprite";
import { useMariAppearancePack } from "../../../hooks/use-mari-appearance-pack";
import type { OmnibarAsideState } from "../../../hooks/use-omnibar-aside";
import { renderCompactInline, renderMarkdownBlocks } from "../../../lib/markdown";
import { stripStrayMarkdown } from "../../../lib/omnibar-aside-text";
import { copyToClipboard } from "../../../lib/utils";

export interface OmnibarAsideProps {
  state: OmnibarAsideState;
  /** Name of the connection answering, when it is not the local model. */
  connectionName?: string | null;
  /** False until the aside has explained itself once (R19). */
  disclosed: boolean;
  onDisclose: () => void;
  onDisable: () => void;
  onEscalate: () => void;
  /** Opens the omnibar settings, where the answering model is chosen. */
  onChooseModel: () => void;
  /** Re-fires the call after an error (R24: plain error, never a toast). */
  onRetry: () => void;
  /** Asks the same question again, past the answer cache. */
  onAnswerAgain: () => void;
  /** The follow-up line. Every follow-up goes to Mari's window with this answer attached. */
  onFollowUp: (question: string) => void;
  /** Things the answer names, which a click opens like their own rows. */
  links: readonly { id: string; title: string }[];
  onOpenLink: (id: string) => void;
  /** The query named a capability a real official Agent covers (K4). */
  showDownloadAgents: boolean;
  onOpenDownloadAgents: () => void;
}

// Small text actions (direction A); a full 44px target on touch.
const textAction = "font-semibold underline-offset-2 hover:underline [@media(pointer:coarse)]:min-h-11";

/** Bold, lists and inline code through the app's message renderer; nothing heavier is asked for. */
function AnswerText({ text, muted }: { text: string; muted?: boolean }) {
  // Blank lines collapse: a three-sentence answer reads tighter without paragraph gaps.
  const rendered = useMemo(
    () => renderMarkdownBlocks(text.trim().replace(/\n{2,}/g, "\n"), renderCompactInline, "omnibar-answer"),
    [text],
  );
  return (
    <div
      // The shared inline-code style is tuned for dark chat surfaces; the omnibar follows the theme.
      className={`mari-message-content text-[0.8125rem] leading-[1.45] [&_.mari-md-inline-code]:border-[var(--border)]! [&_.mari-md-inline-code]:bg-[var(--secondary)]! [&_.mari-md-inline-code]:text-[var(--foreground)]! [&_.mari-md-ol]:my-1 [&_.mari-md-ul]:my-1 ${
        muted ? "text-[var(--muted-foreground)]!" : ""
      }`}
    >
      {rendered}
    </div>
  );
}

/**
 * The cheap answer, grown inside the promoted "Ask Mari" row (R9).
 *
 * It renders as that row's expansion, so it only ever pushes rows below the
 * selection: nothing above the Ask row moves while it streams. It is not a row
 * of its own - not ranked, not in the arrow-key cycle.
 */
export function OmnibarAside({
  state,
  connectionName,
  disclosed,
  onDisclose,
  onDisable,
  onEscalate,
  onChooseModel,
  onRetry,
  onAnswerAgain,
  onFollowUp,
  links,
  onOpenLink,
  showDownloadAgents,
  onOpenDownloadAgents,
}: OmnibarAsideProps) {
  const { t } = useTranslation();
  const appearance = useMariAppearancePack();
  // Keyed to the answer, so a new answer never shows the last one's "Copied".
  const [copiedAnswer, setCopiedAnswer] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState("");
  const failed = state.status === "error";
  const complete = state.status === "complete";
  const tierLabel =
    state.tier === "local"
      ? t("omnibar.aside.tierLocal", "Local")
      : (connectionName ?? t("omnibar.aside.tierRemote", "Your connection"));

  const announcement = complete ? stripStrayMarkdown(state.answer) : failed ? (state.error ?? "") : "";

  const onFollowUpKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      // Handled here, so the omnibar's Escape (close) does not run from inside the row.
      event.preventDefault();
      event.currentTarget.blur();
      document.querySelector<HTMLInputElement>('[data-component="GlobalOmnibar.Panel"] input')?.focus();
      return;
    }
    if (event.key !== "Enter" || !followUp.trim()) return;
    event.preventDefault();
    onFollowUp(followUp.trim());
    setFollowUp("");
  };

  if (state.status === "unavailable") {
    return (
      <p
        data-component="GlobalOmnibar.Aside"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]"
      >
        <span>{t("omnibar.aside.needsModel", "Choose a model so Professor Mari can answer searches like this.")}</span>
        <button type="button" onClick={onChooseModel} className={textAction}>
          {t("omnibar.aside.chooseModel", "Choose a model")}
        </button>
        <button type="button" onClick={onDisable} className={textAction}>
          {t("omnibar.aside.turnOff", "Turn this off")}
        </button>
      </p>
    );
  }

  return (
    <section data-component="GlobalOmnibar.Aside" aria-label={t("omnibar.aside.label", "Professor Mari's answer")}>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      {state.status === "thinking" ? (
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <MariStorySprite state="thinking" />
          <span>{t("omnibar.aside.thinking", "Professor Mari is thinking…")}</span>
        </div>
      ) : failed ? (
        <div className="flex items-start gap-2">
          <span className="mari-workspace-portrait" data-state="shrug" aria-hidden="true">
            <img src={appearance.portraits.shrug} alt="" draggable={false} data-part="idle" />
          </span>
          <p className="min-w-0 text-xs text-[var(--muted-foreground)]">{state.error}</p>
        </div>
      ) : (
        <AnswerText text={state.answer} />
      )}
      {complete && (links.length > 0 || showDownloadAgents) ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label={t("omnibar.aside.links", "Open from this answer")}>
          {links.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => onOpenLink(link.id)}
              className="mari-chrome-control mari-chrome-control--compact"
            >
              {link.title}
            </button>
          ))}
          {showDownloadAgents ? (
            <button
              type="button"
              onClick={onOpenDownloadAgents}
              className="mari-chrome-control mari-chrome-control--compact"
            >
              {t("omnibar.aside.downloadAgents", "Download Agents")}
            </button>
          ) : null}
        </div>
      ) : null}
      {state.status === "thinking" ? null : (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-[var(--muted-foreground)]">
          {failed ? (
            <>
              <button type="button" onClick={onRetry} className={textAction}>
                {t("omnibar.aside.retry", "Try again")}
              </button>
              <button type="button" onClick={onChooseModel} className={textAction}>
                {t("omnibar.aside.chooseModel", "Choose a model")}
              </button>
            </>
          ) : (
            <>
              <span>{tierLabel}</span>
              {complete ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      void copyToClipboard(state.answer).then((ok) =>
                        ok ? setCopiedAnswer(state.answer) : toast.error(t("markdown.copyFailed", "Copy failed")),
                      )
                    }
                    className={textAction}
                  >
                    {copiedAnswer === state.answer ? t("omnibar.aside.copied", "Copied") : t("markdown.copy", "Copy")}
                  </button>
                  <button type="button" onClick={onAnswerAgain} className={textAction}>
                    {t("omnibar.aside.answerAgain", "Answer again")}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={onEscalate}
                className={textAction}
                title={t("commandCenter.keyboard.continueMari", "Ctrl/⌘+Enter Continue with Mari")}
              >
                {t("omnibar.aside.escalate", "Continue with Mari")}
              </button>
            </>
          )}
        </div>
      )}
      {!disclosed && complete ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] text-[var(--muted-foreground)]">
          <span>{t("omnibar.aside.disclosure", "No results matched, so Professor Mari answered.")}</span>
          <button type="button" onClick={onDisable} className={textAction}>
            {t("omnibar.aside.turnOff", "Turn this off")}
          </button>
          <button type="button" onClick={onDisclose} className={textAction}>
            {t("omnibar.aside.gotIt", "Got it")}
          </button>
        </p>
      ) : null}
      {complete ? (
        <input
          type="text"
          value={followUp}
          onChange={(event) => setFollowUp(event.target.value)}
          onKeyDown={onFollowUpKeyDown}
          maxLength={500}
          aria-label={t("omnibar.aside.followUp.label", "Follow-up question")}
          placeholder={t("omnibar.aside.followUp.placeholder", "Ask Mari more…")}
          className="mt-2 h-11 w-full min-w-0 border-0 border-t border-[var(--border)] bg-transparent px-0 text-base text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--ring)] sm:h-8 sm:text-xs"
        />
      ) : null}
    </section>
  );
}
