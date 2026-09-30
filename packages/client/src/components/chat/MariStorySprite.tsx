import { useState, type CSSProperties } from "react";
import { useMariAppearancePack } from "../../hooks/use-mari-appearance-pack";
import type { MariStoryState } from "../../lib/mari-work-animations";
import "./mari-appearance.css";

/**
 * One story, then a resting pose. The surrounding UI supplies the status text. With `settleTo`, the
 * story plays once and then that one takes over (a finished run: success, then idle).
 */
export function MariStorySprite({ state, settleTo }: { state: MariStoryState; settleTo?: MariStoryState }) {
  const pack = useMariAppearancePack();
  const [settled, setSettled] = useState(false);
  const shown = settled && settleTo ? settleTo : state;
  return (
    <span className="mari-story-sprite" data-state={shown} data-appearance-pack={pack.id} aria-hidden="true">
      <span
        key={`${pack.id}:${shown}`}
        style={{ "--mari-work-sprite": `url(${pack.stories[shown].src})` } as CSSProperties}
        onAnimationEnd={settleTo ? () => setSettled(true) : undefined}
      />
    </span>
  );
}
