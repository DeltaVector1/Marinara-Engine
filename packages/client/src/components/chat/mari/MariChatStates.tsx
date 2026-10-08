import { useMariAppearancePack } from "../../../hooks/use-mari-appearance-pack";
import { MARI_ASSET_TIER, mariImgLoading } from "../../../lib/mari-work-animations";

import { TranscriptRow } from "../MariTranscriptRow";

export function LoadingHistoryState() {
  return (
    <div className="flex h-full flex-col justify-end gap-2 px-1 pb-2" aria-live="polite">
      <TranscriptRow layout="document" marker={null}>
        <div className="space-y-1.5 py-1">
          <div className="h-2 w-24 rounded-full bg-[var(--muted)]/45 animate-pulse" />
          <div className="h-2 w-full rounded-full bg-[var(--muted)]/35 animate-pulse" />
          <div className="h-2 w-3/4 rounded-full bg-[var(--muted)]/30 animate-pulse" />
        </div>
      </TranscriptRow>
    </div>
  );
}

export function ProfessorMariPixelScene({ active }: { active: boolean }) {
  const { poses } = useMariAppearancePack();
  return (
    <div className="mari-professor-pixel-scene" data-state={active ? "active" : "idle"} aria-hidden="true">
      <div data-part="glow" />
      <div data-part="desk" />
      <img
        src={poses.chibi}
        {...mariImgLoading(MARI_ASSET_TIER.poses.chibi)}
        width={94}
        height={128}
        alt=""
        data-part="sprite"
        draggable={false}
      />
      <div data-part="laptop">
        <div data-part="screen">
          <span />
          <span />
          <span />
        </div>
        <div data-part="base">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}
