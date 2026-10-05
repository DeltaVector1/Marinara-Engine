import { AlertTriangle, MessageSquare, Pencil, Settings2, Sparkles, Wand2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  professorMariFacetSendsContentLater,
  type ProfessorMariContextFacet,
  type ProfessorMariContextFacetKind,
} from "../../lib/professor-mari-presentation";
import { cn } from "../../lib/utils";

export const FACET_ICON: Record<ProfessorMariContextFacetKind, typeof Sparkles> = {
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
 * the user can see exactly what Mari received. With `onRemove` they are the
 * composer's (M7): an "Aware of" label, an X per facet, and a facet whose
 * content only leaves on Send is outlined.
 */
export function MariContextFacetChips({
  facets,
  className,
  onRemove,
}: {
  facets: readonly ProfessorMariContextFacet[];
  className?: string;
  onRemove?: (facet: ProfessorMariContextFacet) => void;
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
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {onRemove ? (
        <span className="mr-0.5 text-[0.6875rem] text-[var(--muted-foreground)]">
          {t("ui.chat.homeprofessormarichat.awareOfChipsLabel")}
        </span>
      ) : null}
      {facets.map((facet) => {
        const Icon = FACET_ICON[facet.kind];
        const later = Boolean(onRemove) && professorMariFacetSendsContentLater(facet.kind);
        const values = { label: facetLabel[facet.kind], text: facet.text };
        return (
          <span
            key={facet.kind}
            data-facet={facet.kind}
            data-later={later ? "true" : undefined}
            title={t(
              later
                ? "ui.chat.homeprofessormarichat.awareOfFacetLaterTitle"
                : "ui.chat.homeprofessormarichat.contextFacetTitle",
              values,
            )}
            className={cn(
              "mari-workspace-context-chip inline-flex min-w-0 max-w-[10rem] shrink items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.625rem] text-[var(--foreground)]",
              later
                ? "border-dashed border-[var(--muted-foreground)]/50"
                : "border-[var(--primary)]/25 bg-[var(--primary)]/8",
              onRemove && "pr-0.5",
            )}
          >
            <Icon
              size="0.625rem"
              className={cn("shrink-0", later ? "text-[var(--muted-foreground)]" : "text-[var(--primary)]")}
              aria-hidden="true"
            />
            <span className="min-w-0 truncate">{facet.text}</span>
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(facet)}
                className="mari-workspace-context-chip__remove"
                aria-label={t("ui.chat.homeprofessormarichat.awareOfRemoveFacet", values)}
              >
                <X size="0.625rem" aria-hidden="true" />
              </button>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
