import { useState, type CSSProperties } from "react";
import { useMariAppearancePack } from "../../hooks/use-mari-appearance-pack";
import type { MariStoryState } from "../../lib/mari-work-animations";
import "./mari-appearance.css";

/**
 * One story, then a resting pose. The surrounding UI supplies the status text. With `settleTo`, the
 * story plays once and then that one takes over (a finished run: success, then idle). She is also where
 * the slice 15 pull-to-open circle lands (`data-mari-pull-target`): only one story sprite is on screen.
 */
export function MariStorySprite({ state, settleTo }: { state: MariStoryState; settleTo?: MariStoryState }) {
  const pack = useMariAppearancePack();
  const [settled, setSettled] = useState(false);
  const shown = settled && settleTo ? settleTo : state;
  return (
    <span
      className="mari-story-sprite"
      data-state={shown}
      data-appearance-pack={pack.id}
      data-mari-pull-target="mari"
      aria-hidden="true"
    >
      <span
        key={`${pack.id}:${shown}`}
        style={{ "--mari-work-sprite": `url(${pack.stories[shown].src})` } as CSSProperties}
        onAnimationEnd={settleTo ? () => setSettled(true) : undefined}
      />
    </span>
  );
}
