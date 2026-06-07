import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { z } from "zod";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  claimClient,
  createClientInvite,
  listClients,
  listInvites,
  releaseClient,
  revokeInvite,
} from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowRight, Copy, Mail, Search, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  q: z.string().catch(""),
  tab: z.enum(["all", "mine", "unassigned"]).catch("mine"),
});

export const Route = createFileRoute("/_authenticated/trainer/clients/")({
  validateSearch: searchSchema,
  component: ClientsPage,
});

function ClientsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { q, tab } = Route.useSearch();
  const qc = useQueryClient();

  const fList = useServerFn(listClients);
  const fInvites = useServerFn(listInvites);
  const fClaim = useServerFn(claimClient);
  const fRelease = useServerFn(releaseClient);
  const fRevoke = useServerFn(revokeInvite);

  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => fList() });
  const { data: invites } = useQuery({ queryKey: ["invites"], queryFn: () => fInvites() });

  const claim = useMutation({
    mutationFn: (clientId: string) => fClaim({ data: { clientId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Kund tillagd");
    },
  });
  const release = useMutation({
    mutationFn: (clientId: string) => fRelease({ data: { clientId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Kund frikopplad");
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => fRevoke({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Inbjudan borttagen");
    },
  });

  const filtered = useMemo(() => {
    const list = clients ?? [];
    const term = q.trim().toLowerCase();
    return list
      .filter((c) => {
        if (tab === "mine") return !!c.trainer_id;
        if (tab === "unassigned") return !c.trainer_id;
        return true;
      })
      .filter((c) => (term ? (c.display_name ?? "").toLowerCase().includes(term) : true));
  }, [clients, q, tab]);

  const pendingInvites = (invites ?? []).filter((i) => !i.accepted_at);

  const updateSearch = (patch: Partial<{ q: string; tab: "all" | "mine" | "unassigned" }>) => {
    navigate({ search: (prev: { q: string; tab: "all" | "mine" | "unassigned" }) => ({ ...prev, ...patch }) });
  };

  return (
    <AppShell title="Kunder">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => updateSearch({ q: e.target.value })}
            placeholder="Sök på namn…"
            className="pl-9"
          />
        </div>
        <InviteDialog />
      </div>

      <div className="flex gap-1 mb-6 bg-muted p-1 rounded-lg w-fit">
        {(
          [
            { id: "mine", label: "Mina" },
            { id: "unassigned", label: "Otilldelade" },
            { id: "all", label: "Alla" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => updateSearch({ tab: t.id })}
            className={`px-3 py-1.5 text-sm rounded-md transition ${
              tab === t.id ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pendingInvites.length > 0 && (
        <Section title="Väntande inbjudningar">
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {pendingInvites.map((inv) => (
              <PendingInviteRow
                key={inv.id}
                inv={inv}
                onRevoke={() => revoke.mutate(inv.id)}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title={`${filtered.length} ${filtered.length === 1 ? "kund" : "kunder"}`}>
        {filtered.length === 0 ? (
          <Empty text="Inga kunder matchar." />
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {filtered.map((c) => (
              <ClientRow
                key={c.id}
                client={c}
                onClaim={() => claim.mutate(c.id)}
                onRelease={() => release.mutate(c.id)}
              />
            ))}
          </div>
        )}
      </Section>
    </AppShell>
  );
}

function ClientRow({
  client,
  onClaim,
  onRelease,
}: {
  client: {
    id: string;
    display_name: string;
    trainer_id: string | null;
    last_session_at: string | null;
    program_count: number;
    last_weight_kg: number | null;
  };
  onClaim: () => void;
  onRelease: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isMine = !!client.trainer_id;
  return (
    <div className="flex items-center justify-between p-4 gap-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{client.display_name || "Namnlös"}</div>
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          <span>
            {client.last_session_at
              ? `Senaste pass: ${formatDate(client.last_session_at)}`
              : "Inga pass"}
          </span>
          <span>
            {client.program_count} {client.program_count === 1 ? "program" : "program"}
          </span>
          {client.last_weight_kg != null && <span>{Number(client.last_weight_kg)} kg</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isMine ? (
          <>
            <Link
              to="/trainer/clients/$clientId"
              params={{ clientId: client.id }}
              className="text-sm text-primary flex items-center gap-1"
            >
              Visa <ArrowRight className="size-3" />
            </Link>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setConfirmOpen(true)}
              aria-label="Frikoppla kund"
            >
              <Trash2 className="size-4" />
            </Button>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Frikoppla kund?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {client.display_name || "Kunden"} kopplas bort från ditt konto. Kontot finns
                    kvar och kan kopplas tillbaka senare.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={onRelease}>Frikoppla</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={onClaim}>
            <UserPlus className="size-3.5" /> Lägg till
          </Button>
        )}
      </div>
    </div>
  );
}

function PendingInviteRow({
  inv,
  onRevoke,
}: {
  inv: { id: string; email: string | null; name: string | null; token: string; expires_at: string };
  onRevoke: () => void;
}) {
  const link = inviteLink(inv.token);
  return (
    <div className="flex items-center justify-between p-4 gap-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">
          {inv.name || inv.email || "Inbjudan"}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {inv.email ? `${inv.email} · ` : ""}Gäller t.o.m. {formatDate(inv.expires_at)}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(link);
            toast.success("Länk kopierad");
          }}
        >
          <Copy className="size-3.5" /> Kopiera länk
        </Button>
        {inv.email && (
          <a
            href={`mailto:${inv.email}?subject=${encodeURIComponent("Inbjudan")}&body=${encodeURIComponent(`Hej!\n\nAnvänd länken nedan för att koppla ditt konto till mig:\n${link}\n`)}`}
            className="inline-flex items-center justify-center size-9 rounded-md hover:bg-muted"
            aria-label="Skicka via e-post"
          >
            <Mail className="size-4" />
          </a>
        )}
        <Button size="icon" variant="ghost" onClick={onRevoke} aria-label="Ta bort inbjudan">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function InviteDialog() {
  const qc = useQueryClient();
  const fCreate = useServerFn(createClientInvite);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => fCreate({ data: { email: email.trim(), name: name.trim() } }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["invites"] });
      setCreatedLink(inviteLink(row.token));
      setEmail("");
      setName("");
      toast.success("Inbjudan skapad");
    },
    onError: (e: any) => toast.error(e?.message ?? "Kunde inte skapa inbjudan"),
  });

  const close = () => {
    setOpen(false);
    setCreatedLink(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" /> Bjud in
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bjud in klient</DialogTitle>
          <DialogDescription>
            Skapa en personlig inbjudningslänk. När klienten registrerar sig och öppnar länken
            kopplas de automatiskt till dig.
          </DialogDescription>
        </DialogHeader>

        {createdLink ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Inbjudningslänk:</div>
            <div className="flex gap-2">
              <Input readOnly value={createdLink} onFocus={(e) => e.currentTarget.select()} />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(createdLink);
                  toast.success("Länk kopierad");
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                Klar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Namn (valfritt)</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Anna" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">E-post (valfritt)</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="anna@exempel.se"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                Avbryt
              </Button>
              <Button onClick={() => create.mutate()} disabled={create.isPending}>
                Skapa länk
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
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
  return (
    <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function inviteLink(token: string) {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("sv-SE");
  } catch {
    return iso.slice(0, 10);
  }
}
