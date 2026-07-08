import { Card, CardContent } from "@/components/ui/card";

/**
 * Honest placeholder for routes that belong to a later build phase. Not mock
 * data — it clearly states what's coming and when.
 */
export function ComingSoon({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="rounded-full border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground">
            {phase}
          </span>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
