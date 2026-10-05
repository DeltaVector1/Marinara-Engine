import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

/**
 * Small layout primitives shared by Professor Mari's workspace. Turns use
 * `TranscriptRow`, controls use `.mari-chrome-control`, resource identity
 * comes from `ResourceIdentityHeader`, and a risky prompt is a `MariCard`.
 *
 * Direction A (`docs/development/mockups/mari-v3/index.html`): text first,
 * chrome last. See `docs/development/omnibar-concept.md` R41-R48.
 */

/** R43: one muted line. Colour is its only variation. */
export function MariNote({
  tone = "muted",
  children,
  className,
  ...rest
}: {
  tone?: "muted" | "accent" | "danger";
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mari-note", className)} data-tone={tone} {...rest}>
      {children}
    </p>
  );
}

/**
 * R42: a risky prompt (delete, install, sensitive file). One neutral hairline,
 * never the accent; `media` is a small icon tile, red-tinted only for `danger`.
 * `actions` is a quiet `.mari-link` secondary, then one `.mari-btn` primary.
 */
export function MariCard({
  variant = "default",
  media,
  title,
  meta,
  actions,
  children,
  className,
  ...rest
}: {
  variant?: "default" | "danger";
  media?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "title">) {
  return (
    <section className={cn("mari-card", className)} data-variant={variant} {...rest}>
      <div className="mari-card__head">
        {media ? <span className="mari-card__media">{media}</span> : null}
        <div className="min-w-0">
          <p className="mari-card__title">{title}</p>
          {meta ? <p className="mari-card__meta">{meta}</p> : null}
        </div>
      </div>
      {children ? <div className="mari-card__body">{children}</div> : null}
      {actions ? <div className="mari-card__actions">{actions}</div> : null}
    </section>
  );
}
