import { cn } from "@/lib/utils";

type SectionIntroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionIntro({ eyebrow, title, description, align = "left" }: SectionIntroProps) {
  return (
    <header className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      {eyebrow ? <p className="text-xs font-medium text-primary">{eyebrow}</p> : null}
      <h2
        className={cn(
          "exp-display text-3xl tracking-tight sm:text-4xl",
          eyebrow && "mt-2",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
      ) : null}
    </header>
  );
}
