type LegalDocumentLayoutProps = {
  title: string;
  updatedLine: string;
  children: React.ReactNode;
};

export function LegalDocumentLayout({ title, updatedLine, children }: LegalDocumentLayoutProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header className="border-b border-border pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{updatedLine}</p>
      </header>
      <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-foreground">{children}</div>
    </article>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="space-y-3 text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export function LegalParagraph({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
