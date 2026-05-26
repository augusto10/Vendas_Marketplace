import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SectionPage({ title, description, items }: { title: string; description: string; items: string[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item}>
            <CardHeader>
              <CardTitle>{item}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-24 rounded-md border bg-muted/40" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
