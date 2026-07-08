import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  href?: string;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-foreground",
    warning: "text-amber-600",
    danger: "text-red-600",
  }[tone];

  const body = (
    <Card className={cn(href && "transition-colors hover:border-primary/40")}>
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={cn("mt-1 text-2xl font-semibold tabular-nums", toneClass)}>{value}</div>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
