// The omnibar's own settings, in the omnibar. These preferences already existed in `ui.store` with
// no UI at all: `omnibarSuggestionsEnabled` was read in six places and could never be turned off,
// and `omnibarAsideEnabled` could only ever be turned OFF, from the aside's own dismiss link.
//
// Scope rule: only preferences that change how this panel behaves belong here. Anything wider stays
// in the Settings panel, which the omnibar already reaches by search.
//
// A view inside the omnibar card, like Mari's: it covers the list with its own back arrow, and
// Escape or the arrow returns to where you were. It is not a separate `Modal`, so the omnibar's
// dialog, focus and Escape handling stay in one place.

import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Settings2 } from "lucide-react";
import { LOCAL_SIDECAR_CONNECTION_ID } from "@marinara-engine/shared";

import { useSidecarStore } from "../../../stores/sidecar.store";
import { useUIStore } from "../../../stores/ui.store";
import { MARI_APPEARANCE_PACKS } from "../../../lib/mari-work-animations";
import { cn } from "../../../lib/utils";
import "../../chat/mari-appearance.css";

function SettingRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="omnibar-settings-menu__row">
      <span className="min-w-0">
        <span className="omnibar-settings-menu__label">{label}</span>
        <span className="omnibar-settings-menu__description">{description}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

/** Appearance packs are exclusive: portraits and stories always switch together. */
function AppearancePacks() {
  const { t } = useTranslation();
  const selected = useUIStore((state) => state.mariAppearancePackId);
  const selectPack = useUIStore((state) => state.setMariAppearancePack);
  return (
    <div className="omnibar-settings-menu__packs" role="radiogroup" aria-label={t("mari.appearancePacks.heading")}>
      {MARI_APPEARANCE_PACKS.map((pack) => (
        <label
          key={pack.id}
          className="omnibar-settings-menu__pack"
          data-enabled={selected === pack.id ? "true" : "false"}
        >
          <span
            className="omnibar-settings-menu__pack-sprite"
            aria-hidden="true"
            style={{ "--mari-work-sprite": `url(${pack.stories.idle.src})` } as CSSProperties}
          />
          <span className="min-w-0">
            <span className="omnibar-settings-menu__label">
              {t(`mari.appearancePacks.${pack.id}.label`, pack.label)}
            </span>
            <span className="omnibar-settings-menu__description">
              {t(`mari.appearancePacks.${pack.id}.description`, pack.description)}
            </span>
          </span>
          <input
            type="radio"
            name="mari-appearance-pack"
            checked={selected === pack.id}
            onChange={() => selectPack(pack.id)}
          />
        </label>
      ))}
    </div>
  );
}

export function OmnibarSettingsButton({ open, onOpen }: { open: boolean; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={open}
      aria-label={t("omnibar.settings.label", "Omnibar settings")}
      title={t("omnibar.settings.label", "Omnibar settings")}
      className={cn("omnibar-settings-menu__trigger", open && "omnibar-settings-menu__trigger--open")}
    >
      <Settings2 size={14} />
    </button>
  );
}

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function OmnibarSettingsSheet({
  onClose,
  connections,
  onSetUpLocalModel,
}: {
  onClose: () => void;
  /** Language connections that can answer a quick question. */
  connections: readonly { id: string; name: string }[];
  /** Opens the local model setup. Absent where no local model can run. */
  onSetUpLocalModel?: () => void;
}) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);

  const mariEnabled = useUIStore((state) => state.commandCenterMariEnabled);
  const setMariEnabled = useUIStore((state) => state.setCommandCenterMariEnabled);
  const suggestionsEnabled = useUIStore((state) => state.omnibarSuggestionsEnabled);
  const setSuggestionsEnabled = useUIStore((state) => state.setOmnibarSuggestionsEnabled);
  const asideEnabled = useUIStore((state) => state.omnibarAsideEnabled);
  const setAsideEnabled = useUIStore((state) => state.setOmnibarAsideEnabled);
  const asideConnectionId = useUIStore((state) => state.omnibarAsideConnectionId);
  const setAsideConnectionId = useUIStore((state) => state.setOmnibarAsideConnectionId);
  const editViewMode = useUIStore((state) => state.mariEditViewMode);
  const setEditViewMode = useUIStore((state) => state.setMariEditViewMode);
  const localModelDownloaded = useSidecarStore((state) => state.modelDownloaded);

  const usesLocalModel = asideConnectionId === LOCAL_SIDECAR_CONNECTION_ID;
  const knownConnection = usesLocalModel || connections.some((connection) => connection.id === asideConnectionId);

  // Focus moves in on open and back to whatever opened the sheet on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cardRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener?.focus();
  }, []);

  // Handled here and marked handled, so the omnibar's own key handling below it
  // (Escape closes the omnibar, Tab cycles its whole panel) skips these keys.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (focusable.length === 0) return;
    const index = focusable.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey
      ? index <= 0
        ? focusable.length - 1
        : index - 1
      : index === focusable.length - 1
        ? 0
        : index + 1;
    event.preventDefault();
    focusable[next]?.focus();
  };

  return (
    <div className="omnibar-settings-sheet" data-component="GlobalOmnibar.Settings" onKeyDown={onKeyDown}>
      <div
        ref={cardRef}
        role="region"
        aria-labelledby="omnibar-settings-title"
        className="omnibar-settings-sheet__card"
      >
        <header className="omnibar-settings-sheet__header">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("omnibar.settings.back", "Back")}
            className="omnibar-settings-menu__trigger"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 id="omnibar-settings-title">{t("omnibar.settings.label", "Omnibar settings")}</h2>
        </header>

        <p className="omnibar-settings-menu__heading">{t("omnibar.settings.quickAnswers.heading", "Quick answers")}</p>
        <SettingRow
          label={t("omnibar.settings.aside.label", "Quick answers")}
          description={t("omnibar.settings.aside.description", "Answer a search that finds nothing.")}
          checked={asideEnabled}
          onChange={setAsideEnabled}
        />
        <label className="omnibar-settings-menu__row omnibar-settings-menu__row--stacked">
          <span className="min-w-0">
            <span className="omnibar-settings-menu__label">
              {t("omnibar.settings.aside.connection.label", "Answers come from")}
            </span>
            <span className="omnibar-settings-menu__description">
              {t(
                "omnibar.settings.aside.connection.description",
                "Your search text is sent to this model, never your memories or the field you are editing.",
              )}
            </span>
          </span>
          <select
            className="mari-chrome-field omnibar-settings-sheet__select"
            value={asideConnectionId}
            disabled={!asideEnabled}
            onChange={(event) => setAsideConnectionId(event.target.value)}
          >
            <option value={LOCAL_SIDECAR_CONNECTION_ID}>
              {localModelDownloaded
                ? t("omnibar.settings.aside.connection.local", "Local model (free)")
                : t("omnibar.settings.aside.connection.localMissing", "Local model (not set up)")}
            </option>
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.name}
              </option>
            ))}
            {knownConnection ? null : (
              <option value={asideConnectionId} disabled>
                {t("omnibar.settings.aside.connection.missing", "Deleted connection")}
              </option>
            )}
          </select>
        </label>
        {asideEnabled && usesLocalModel && !localModelDownloaded ? (
          <p className="omnibar-settings-sheet__note">
            {t(
              "omnibar.settings.aside.localMissingNote",
              "No local model is downloaded yet, so quick answers stay silent. Download one, or choose a connection.",
            )}
            {onSetUpLocalModel ? (
              <button type="button" onClick={onSetUpLocalModel} className="font-semibold underline underline-offset-2">
                {t("omnibar.aside.setUpLocalModel", "Set up a local model")}
              </button>
            ) : null}
          </p>
        ) : null}
        {asideEnabled && !usesLocalModel ? (
          <p className="omnibar-settings-sheet__note">
            {t(
              "omnibar.settings.aside.remoteNote",
              "Each quick answer is one request to this connection and may cost money.",
            )}
          </p>
        ) : null}

        <div role="separator" />
        <p className="omnibar-settings-menu__heading">{t("omnibar.settings.mari.heading", "Professor Mari")}</p>
        <SettingRow
          label={t("omnibar.settings.mari.label", "Professor Mari")}
          description={t("omnibar.settings.mari.description", "Ask Mari from the search field.")}
          checked={mariEnabled}
          onChange={setMariEnabled}
        />
        <SettingRow
          label={t("omnibar.settings.suggestions.label", "Proactive suggestions")}
          description={t("omnibar.settings.suggestions.description", "Offer context and edits before you ask.")}
          checked={suggestionsEnabled}
          onChange={setSuggestionsEnabled}
        />
        <div className="omnibar-settings-menu__row">
          <span className="min-w-0">
            <span className="omnibar-settings-menu__label">
              {t("omnibar.settings.editView.label", "Edit review opens in")}
            </span>
            <span className="omnibar-settings-menu__description">
              {t("omnibar.settings.editView.description", "The default view for Mari's change cards.")}
            </span>
          </span>
          <span className="omnibar-settings-menu__segmented">
            {(["easy", "raw"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={editViewMode === mode}
                onClick={() => setEditViewMode(mode)}
              >
                {mode === "easy"
                  ? t("ui.chat.databaseworkspaceapprovalcard.easyView")
                  : t("ui.chat.databaseworkspaceapprovalcard.rawView")}
              </button>
            ))}
          </span>
        </div>

        <div role="separator" />
        <p className="omnibar-settings-menu__heading">{t("mari.appearancePacks.heading")}</p>
        <AppearancePacks />
      </div>
    </div>
  );
}
