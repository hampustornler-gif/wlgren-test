import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { claimClient, listClients } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { ArrowRight, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trainer/clients/")({
  component: ClientsPage,
});

function ClientsPage() {
  const qc = useQueryClient();
  const fList = useServerFn(listClients);
  const fClaim = useServerFn(claimClient);
  const { data } = useQuery({ queryKey: ["clients"], queryFn: () => fList() });
  const claim = useMutation({
    mutationFn: (clientId: string) => fClaim({ data: { clientId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Kund tillagd");
    },
  });

  const mine = (data ?? []).filter((c) => c.trainer_id);
  const others = (data ?? []).filter((c) => !c.trainer_id);

  return (
    <AppShell title="Kunder">
      <Section title="Dina kunder">
        {mine.length === 0 ? <Empty text="Inga kunder än." /> : (
          <List items={mine.map((c) => ({
            key: c.id,
            primary: c.display_name || "Namnlös",
            secondary: "Tilldelad",
            right: (
              <Link to="/trainer/clients/$clientId" params={{ clientId: c.id }} className="text-sm text-primary flex items-center gap-1">
                Visa <ArrowRight className="size-3" />
              </Link>
            ),
          }))} />
        )}
      </Section>
      <Section title="Otilldelade konton">
        {others.length === 0 ? <Empty text="Inga väntande konton." /> : (
          <List items={others.map((c) => ({
            key: c.id,
            primary: c.display_name || "Namnlös",
            secondary: "Inte tilldelad",
            right: (
              <Button size="sm" variant="outline" onClick={() => claim.mutate(c.id)} disabled={claim.isPending}>
                <UserPlus className="size-3.5" /> Lägg till
              </Button>
            ),
          }))} />
        )}
      </Section>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-muted-foreground mb-3">{title}</h2>
      {children}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">{text}</div>;
}
function List({ items }: { items: { key: string; primary: string; secondary?: string; right?: React.ReactNode }[] }) {
  return (
    <div className="bg-card border border-border rounded-xl divide-y divide-border">
      {items.map((i) => (
        <div key={i.key} className="flex items-center justify-between p-4">
          <div>
            <div className="font-medium">{i.primary}</div>
            {i.secondary && <div className="text-xs text-muted-foreground">{i.secondary}</div>}
          </div>
          {i.right}
        </div>
      ))}
    </div>
  );
}
