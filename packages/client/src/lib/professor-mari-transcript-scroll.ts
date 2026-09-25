export type ProfessorMariTranscriptScrollContainer = {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
};

/** Keep streaming output pinned only while the reader remains near the newest message. */
export function isProfessorMariTranscriptNearBottom(container: ProfessorMariTranscriptScrollContainer, threshold = 72) {
  return container.scrollHeight - container.clientHeight - container.scrollTop <= threshold;
}

/** Align a mounted Professor Mari transcript with its newest message. */
export function scrollProfessorMariTranscriptToBottom(container: ProfessorMariTranscriptScrollContainer) {
  container.scrollTop = container.scrollHeight;
}

/**
 * While the reader follows the newest output, keep the transcript pinned to the bottom on every size
 * change of its content, not only when state changes. Content that grows smoothly (Mari's live reply
 * animates its height) then pushes the older lines up smoothly too, instead of sliding out of view.
 * Returns the cleanup.
 */
export function followTranscriptGrowth(scroller: HTMLElement, stack: HTMLElement): () => void {
  const observer = new ResizeObserver(() => {
    if (scroller.dataset.following === "true") scrollProfessorMariTranscriptToBottom(scroller);
  });
  observer.observe(stack);
  return () => observer.disconnect();
}
