import { AlertTriangle, MessageSquare, Pencil, Settings2, Sparkles, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProfessorMariContextFacet, ProfessorMariContextFacetKind } from "../../lib/professor-mari-presentation";
import { cn } from "../../lib/utils";

const FACET_ICON: Record<ProfessorMariContextFacetKind, typeof Sparkles> = {
  resource: Sparkles,
  chat: MessageSquare,
  field: Pencil,
  settings: Settings2,
  error: AlertTriangle,
  asideAnswer: Wand2,
};

/**
 * The facets a handoff context carries (resource, chat, field, settings
 * location, error, aside answer), each as its own small pill. Used both in
 * the composer before sending and, unchanged, on the sent message (C2) so
 * the user can see exactly what Mari received.
 */
export function MariContextFacetChips({
  facets,
  className,
}: {
  facets: readonly ProfessorMariContextFacet[];
  className?: string;
}) {
  const { t } = useTranslation();
  if (facets.length === 0) return null;
  const facetLabel: Record<ProfessorMariContextFacetKind, string> = {
    resource: t("ui.chat.homeprofessormarichat.contextFacetResource"),
    chat: t("ui.chat.homeprofessormarichat.contextFacetChat"),
    field: t("ui.chat.homeprofessormarichat.contextFacetField"),
    settings: t("ui.chat.homeprofessormarichat.contextFacetSettings"),
    error: t("ui.chat.homeprofessormarichat.contextFacetError"),
    asideAnswer: t("ui.chat.homeprofessormarichat.contextFacetAsideAnswer"),
  };
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {facets.map((facet) => {
        const Icon = FACET_ICON[facet.kind];
        return (
          <span
            key={facet.kind}
            title={t("ui.chat.quickreplymenu.value1Value2", { value1: facetLabel[facet.kind], value2: facet.text })}
            className="mari-workspace-context-chip inline-flex min-w-0 max-w-[10rem] shrink items-center gap-1 rounded-md border border-[var(--primary)]/25 bg-[var(--primary)]/8 px-1.5 py-0.5 text-[0.625rem] text-[var(--foreground)]"
          >
            <Icon size="0.625rem" className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
            <span className="min-w-0 truncate">{facet.text}</span>
          </span>
        );
      })}
    </div>
  );
}
