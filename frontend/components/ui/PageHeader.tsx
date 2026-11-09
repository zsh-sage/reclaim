import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="font-headline text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-on-surface md:text-[34px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[15px] leading-relaxed text-on-surface-variant">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Consistent page gutter + max width for authenticated app pages. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-6 sm:px-6 md:pt-8 lg:px-10 lg:pt-10">
      {children}
    </div>
  );
}
