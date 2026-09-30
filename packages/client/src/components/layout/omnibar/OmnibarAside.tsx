import { useMariAppearancePack } from "../../../hooks/use-mari-appearance-pack";
import { useTranslation } from "react-i18next";

import { MariStorySprite } from "../../chat/MariStorySprite";
import type { OmnibarAsideState } from "../../../hooks/use-omnibar-aside";
import { stripStrayMarkdown } from "../../../lib/omnibar-aside-text";

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
  /** Things the answer names, which a click opens like their own rows. */
  links: readonly { id: string; title: string }[];
  onOpenLink: (id: string) => void;
}

/**
 * The cheap answer, pinned to the bottom of the omnibar panel.
 *
 * It is never a row: not ranked, not in the arrow-key cycle, never the target of
 * Enter. It sits below the list so that rows above it never move while it
 * streams - the same reason the pending-change dock sits above Mari's composer.
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
  links,
  onOpenLink,
}: OmnibarAsideProps) {
  const appearance = useMariAppearancePack();
  const { t } = useTranslation();
  const failed = state.status === "error";
  const tierLabel =
    state.tier === "local"
      ? t("omnibar.aside.tierLocal", "Local")
      : (connectionName ?? t("omnibar.aside.tierRemote", "Your connection"));

  const announcement =
    state.status === "complete"
      ? stripStrayMarkdown(state.answer)
      : state.status === "error"
        ? (state.error ?? "")
        : "";

  return (
    <>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      {state.status === "unavailable" ? (
        <p
          data-component="GlobalOmnibar.Aside"
          className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--border)] px-3 py-2 text-[0.625rem] text-[var(--muted-foreground)]"
        >
          <span>
            {t("omnibar.aside.needsModel", "Professor Mari can answer searches like this once she has a model.")}
          </span>
          <button type="button" onClick={onChooseModel} className="font-semibold underline underline-offset-2">
            {t("omnibar.aside.chooseModel", "Choose a model")}
          </button>
          <button type="button" onClick={onDisable} className="font-semibold underline underline-offset-2">
            {t("omnibar.aside.turnOff", "Turn this off")}
          </button>
        </p>
      ) : state.status === "thinking" ? (
        <div
          data-component="GlobalOmnibar.Aside"
          className="flex shrink-0 items-center gap-2 border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)]"
        >
          <MariStorySprite state="thinking" />
          <span>{t("omnibar.aside.thinking", "Professor Mari is thinking…")}</span>
        </div>
      ) : state.status !== "idle" && state.status !== "waiting" ? (
        <section
          data-component="GlobalOmnibar.Aside"
          className="shrink-0 border-t border-[var(--border)] px-3 py-2"
          aria-label={t("omnibar.aside.label", "Professor Mari's answer")}
        >
          <div className="flex min-w-0 items-start gap-2">
            <span className="mari-workspace-portrait" data-state={failed ? "shrug" : "explaining"} aria-hidden="true">
              <img
                src={failed ? appearance.portraits.shrug : appearance.portraits.idle}
                alt=""
                draggable={false}
                data-part="idle"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`max-h-24 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed ${
                  failed ? "text-[var(--muted-foreground)]" : "text-[var(--foreground)]"
                }`}
              >
                {failed ? state.error : stripStrayMarkdown(state.answer)}
              </p>
              {!failed && links.length > 0 ? (
                <div
                  className="mt-1.5 flex flex-wrap gap-1.5"
                  aria-label={t("omnibar.aside.links", "Open from this answer")}
                >
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
                </div>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.625rem] text-[var(--muted-foreground)]">
                {failed ? (
                  <>
                    <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
                      {t("omnibar.aside.retry", "Try again")}
                    </button>
                    <button
                      type="button"
                      onClick={onChooseModel}
                      className="font-semibold underline underline-offset-2"
                    >
                      {t("omnibar.aside.chooseModel", "Choose a model")}
                    </button>
                  </>
                ) : (
                  <>
                    <span>{tierLabel}</span>
                    <button type="button" onClick={onEscalate} className="underline-offset-2 hover:underline">
                      {t("omnibar.aside.escalate", "⌘↵ Continue with Professor Mari")}
                    </button>
                  </>
                )}
              </div>
              {!disclosed && state.status === "complete" ? (
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-[var(--secondary)] px-2 py-1 text-[0.625rem] text-[var(--muted-foreground)]">
                  <span>
                    {t(
                      "omnibar.aside.disclosure",
                      "Professor Mari answered this because nothing matched what you typed.",
                    )}
                  </span>
                  <button type="button" onClick={onDisable} className="font-semibold underline underline-offset-2">
                    {t("omnibar.aside.turnOff", "Turn this off")}
                  </button>
                  <button type="button" onClick={onDisclose} className="font-semibold underline underline-offset-2">
                    {t("omnibar.aside.gotIt", "Got it")}
                  </button>
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
