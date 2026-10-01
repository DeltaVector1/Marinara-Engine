import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { PullDropVisuals } from "../../hooks/use-pull-to-open-omnibar";

/**
 * The pull-to-open drop and the layer it morphs into. Decorative only: the
 * gesture lives on the top bar and the omnibar takes focus when it opens.
 */
export function OmnibarPullDrop({ visuals }: { visuals: PullDropVisuals }) {
  return createPortal(
    <>
      {visuals.dropShown && (
        <motion.svg
          aria-hidden="true"
          data-pull-drop
          className="pointer-events-none fixed left-0 z-[90] h-[100dvh] w-full overflow-hidden"
          style={{ top: visuals.originY }}
        >
          <motion.path d={visuals.path} className="fill-[var(--primary)]" />
          <motion.path d={visuals.highlight} className="fill-white/30" />
        </motion.svg>
      )}
      {visuals.morphing && (
        <motion.div
          aria-hidden="true"
          data-pull-morph
          className="pointer-events-none fixed inset-0 z-[95]"
          style={{ opacity: visuals.overlayOpacity }}
        >
          <motion.div className="absolute inset-0 bg-black/55" style={{ opacity: visuals.dim }} />
          <motion.div className="absolute inset-0 bg-[var(--card)]" style={{ clipPath: visuals.clip }}>
            <motion.div className="absolute inset-0 bg-[var(--primary)]" style={{ opacity: visuals.accent }} />
          </motion.div>
        </motion.div>
      )}
    </>,
    document.body,
  );
}
