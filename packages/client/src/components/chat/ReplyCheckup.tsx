// R2: the quiet line under a reply that went wrong ("Cut off · Check"), modeled on N1's
// "Failed · Retry", and the short facts list it opens. Facts come from diagnoseReply, no model call.
import { useId } from "react";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReplyCheckupFinding, ReplyCheckupLink } from "@marinara-engine/shared";
import { replyCheckupFact, replyCheckupLabel, replyCheckupLinkLabel, replyLineFindings } from "../../lib/reply-checkup";

interface ReplyCheckupProps {
  messageId: string;
  findings: ReplyCheckupFinding[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (link: ReplyCheckupLink) => void;
  onPeek: () => void;
}

export function ReplyCheckup({ messageId, findings, open, onOpenChange, onLink, onPeek }: ReplyCheckupProps) {
  const { t } = useTranslation();
  const panelId = `reply-checkup-${useId().replace(/:/gu, "")}`;
  const lead = replyLineFindings(findings)[0];
  if (!lead) return null;
  return (
    <div className="mari-reply-checkup" data-reply-checkup={messageId}>
      <p className="mari-send-failed">
        <Info size="0.8rem" aria-hidden="true" />
        <span className="mari-send-failed__text">{replyCheckupLabel(lead, t)}</span>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          className="mari-link"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onOpenChange(!open)}
        >
          {t("chat.replyCheckup.check", "Check")}
        </button>
      </p>
      {open && (
        <div id={panelId} className="mari-reply-checkup__panel">
          <ReplyCheckupFacts findings={findings} onLink={onLink} />
          <button type="button" className="mari-link" onClick={onPeek}>
            {t("chat.replyCheckup.peek", "Peek at the prompt")}
          </button>
        </div>
      )}
    </div>
  );
}

/** The facts list, shared with the Peek header. */
export function ReplyCheckupFacts({
  findings,
  onLink,
}: {
  findings: readonly ReplyCheckupFinding[];
  onLink?: (link: ReplyCheckupLink) => void;
}) {
  const { t } = useTranslation();
  return (
    <ul className="mari-reply-checkup__facts">
      {findings.map((finding) => (
        <li key={finding.code}>
          {replyCheckupFact(finding, t)}
          {finding.link && onLink && (
            <>
              {" "}
              <button type="button" className="mari-link" onClick={() => onLink(finding.link!)}>
                {replyCheckupLinkLabel(finding.link, t)}
              </button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
