import { useId } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { PULL_ICON_SIZE, type PullDropVisuals } from "../../hooks/use-pull-to-open-omnibar";
import { useMariAppearancePack } from "../../hooks/use-mari-appearance-pack";

/**
 * The pull-to-open sheet, its circle and small bar. Decorative only: the gesture
 * lives on the top bar and the opened dialog takes focus. The hook paints every
 * frame straight into these elements through `visuals.els`.
 */
export function OmnibarPullDrop({ visuals }: { visuals: PullDropVisuals }) {
  const { t } = useTranslation();
  const appearance = useMariAppearancePack();
  const id = useId();
  const { els, target, armed } = visuals;
  if (!visuals.shown) return null;
  const label =
    target === "mari"
      ? armed
        ? t("omnibar.pull.releaseToAskMari", "Release to ask Mari")
        : t("omnibar.pull.askMari", "Ask Mari")
      : armed
        ? t("omnibar.pull.releaseToSearch", "Release to search")
        : t("omnibar.pull.search", "Search");

  if (visuals.labelOnly) {
    return createPortal(
      <div aria-hidden="true" className="mari-pull-overlay">
        <div ref={(el) => void (els.chip = el)} className="mari-pull-lay mari-pull-chip">
          {target === "mari" ? (
            <img src={appearance.portraits.idle} alt="" draggable={false} className="mari-pull-chip-portrait" />
          ) : (
            <Search size={16} />
          )}
          <span>{label}</span>
        </div>
      </div>,
      document.body,
    );
  }

  const tagLabel = (side: "search" | "mari") =>
    side === "mari"
      ? [t("omnibar.pull.askMari", "Ask Mari"), t("omnibar.pull.releaseToAskMari", "Release to ask Mari")]
      : [t("omnibar.pull.search", "Search"), t("omnibar.pull.releaseToSearch", "Release to search")];

  return createPortal(
    <div aria-hidden="true" className="mari-pull-overlay" data-armed={armed ? "true" : "false"}>
      <div ref={(el) => void (els.shadow = el)} className="mari-pull-shadow" />
      <div ref={(el) => void (els.glass = el)} className="mari-pull-glass" />
      <svg ref={(el) => void (els.rim = el)} className="mari-pull-rim">
        <defs>
          <clipPath id={`${id}clip`}>
            <path ref={(el) => void (els.rimClip = el)} />
          </clipPath>
          {/* The shimmer takes the app's accent, so it follows a theme change. */}
          <linearGradient ref={(el) => void (els.rimGrad = el)} id={`${id}rim`} gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: "var(--marinara-app-accent-solid)" }} stopOpacity="0.2" />
            <stop offset="0.45" style={{ stopColor: "var(--marinara-app-accent-solid)" }} stopOpacity="0.75" />
            <stop offset="0.7" style={{ stopColor: "var(--marinara-app-accent-solid)" }} stopOpacity="0.15" />
            <stop offset="1" style={{ stopColor: "var(--marinara-app-accent-solid)" }} stopOpacity="0.45" />
          </linearGradient>
          {/* The rim fades in below the bar, so the sheet leaves the bar without a seam. */}
          <linearGradient
            ref={(el) => void (els.edgeGrad = el)}
            id={`${id}fade`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="0"
          >
            <stop offset="0" stopColor="#000" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
          <mask id={`${id}mask`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="4000" height="4000">
            <rect x="-20" y="-20" width="4000" height="4000" fill={`url(#${id}fade)`} />
          </mask>
        </defs>
        <g mask={`url(#${id}mask)`}>
          <path ref={(el) => void (els.rimEdge = el)} className="mari-pull-rim-edge" />
          <path
            ref={(el) => void (els.rimHair = el)}
            clipPath={`url(#${id}clip)`}
            stroke={`url(#${id}rim)`}
            className="mari-pull-rim-hair"
          />
          <ellipse ref={(el) => void (els.ring = el)} className="mari-pull-rim-ring" />
        </g>
      </svg>
      <div ref={(el) => void (els.icon = el)} className="mari-pull-lay mari-pull-icon">
        <Search size={PULL_ICON_SIZE} strokeWidth={2.2} />
      </div>
      <div ref={(el) => void (els.portrait = el)} className="mari-pull-lay mari-pull-portrait">
        <img src={appearance.portraits.idle} alt="" draggable={false} />
      </div>
      {/* M17: on landing her head grows into her sprite where she is in the pane (sized and moved by the hook). */}
      <div ref={(el) => void (els.morph = el)} className="mari-pull-lay mari-pull-morph">
        <span ref={(el) => void (els.morphSprite = el)} className="mari-pull-morph__sprite" />
        <span ref={(el) => void (els.morphPortrait = el)} className="mari-pull-morph__portrait">
          <img src={appearance.portraits.idle} alt="" draggable={false} />
        </span>
      </div>
      <div ref={(el) => void (els.tag = el)} className="mari-pull-lay mari-pull-tag">
        {(["search", "mari"] as const).map((side) => {
          const [idle, release] = tagLabel(side);
          return (
            <span
              key={side}
              ref={(el) => void (side === "mari" ? (els.tagMari = el) : (els.tagSearch = el))}
              className="mari-pull-tag-side"
            >
              <span data-part="idle">{idle}</span>
              <span data-part="armed">{release}</span>
            </span>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
