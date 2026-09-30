import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

/**
 * Small layout primitives shared by Professor Mari's workspace. Turns use
 * `TranscriptRow`, controls use `.mari-chrome-control`, resource identity
 * comes from `ResourceIdentityHeader`, and anything that touches your data is a
 * `MariCard`.
 *
 * See `docs/development/omnibar-concept.md` R41-R48.
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
 * R42: the Card. One accent frame on a solid card surface; only for things that
 * touch your data (reviews, created resources, installs, deletions). `media` is
 * an icon or avatar; `actions` is secondary first, primary last.
 */
export function MariCard({
  variant = "review",
  media,
  title,
  meta,
  actions,
  children,
  className,
  ...rest
}: {
  variant?: "review" | "created" | "install" | "danger";
  media?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "title">) {
  return (
    <section className={cn("mari-card mari-chrome-accent-frame", className)} data-variant={variant} {...rest}>
      <div className="mari-card__head">
        {media ? <span className="mari-card__media mari-chrome-accent-tile">{media}</span> : null}
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

/**
 * A grouped row of controls. It wraps when space is available; dense grouped
 * strips may opt into two horizontal lanes on phones with `--stacked`.
 */
export function MariStrip({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mari-strip", className)} {...rest}>
      {children}
    </div>
  );
}
