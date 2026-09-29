import type { CSSProperties } from "react";
import { useMariAppearancePack } from "../../hooks/use-mari-appearance-pack";
import type { MariStoryState } from "../../lib/mari-work-animations";
import "./mari-appearance.css";

/** One story, then a resting pose. The surrounding UI supplies the status text. */
export function MariStorySprite({ state }: { state: MariStoryState }) {
  const pack = useMariAppearancePack();
  return (
    <span className="mari-story-sprite" data-state={state} data-appearance-pack={pack.id} aria-hidden="true">
      <span
        key={`${pack.id}:${state}`}
        style={{ "--mari-work-sprite": `url(${pack.stories[state].src})` } as CSSProperties}
      />
    </span>
  );
}
