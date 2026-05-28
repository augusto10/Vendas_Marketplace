import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export function SectionPage({ title, description, items }: { title: string; description: string; items: string[] }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item} className="metric-card">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>{item}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-24 rounded-md border border-dashed bg-muted/35" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
