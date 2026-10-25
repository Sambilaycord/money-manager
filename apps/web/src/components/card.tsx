import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  description?: string;
  /** Sits opposite the title, e.g. a "View all" link. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, description, action, children, className = "" }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6 ${className}`.trim()}
    >
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {action && <div className="-my-1 shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** A quiet text link for a card header, e.g. "View all". */
export const cardLinkClassName =
  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-primary " +
  "hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary";
