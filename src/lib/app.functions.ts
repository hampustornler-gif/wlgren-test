import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const nz = (n: number, min = 0, max = 9999) => z.number().min(min).max(max);

function dbError(error: unknown, msg = "Database operation failed"): never {
  console.error("[db]", error);
  throw new Error(msg);
}

async function assertTrainer(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) dbError(error);
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.includes("trainer") && !roles.includes("admin")) {
    throw new Error("Forbidden: trainer role required");
  }
}


export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const roleList = (roles ?? []).map((r) => r.role);
    const isTrainer = roleList.includes("trainer");
    const isAdmin = roleList.includes("admin");
    return { userId, profile, isTrainer, isAdmin, roles: roleList };
  });

// ---------- ADMIN ----------
async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin role required");
}


export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const rolesByUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role);
      rolesByUser.set(r.user_id, list);
    });
    return (profiles ?? []).map((p) => ({ ...p, roles: rolesByUser.get(p.id) ?? [] }));
  });

const roleEnum = z.enum(["admin", "trainer", "client"]);

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      role: roleEnum,
      enabled: z.boolean(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.enabled) {
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", data.userId)
        .eq("role", data.role)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: data.userId, role: data.role });
        if (error) dbError(error);
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) dbError(error);
    }
    return { ok: true };
  });

export const assignClientToTrainer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      clientId: z.string().uuid(),
      trainerId: z.string().uuid().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("profiles")
      .update({ trainer_id: data.trainerId })
      .eq("id", data.clientId);
    if (error) dbError(error);
    return { ok: true };
  });

// ---------- TRAINER ----------
export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, display_name, trainer_id, created_at")
      .or(`trainer_id.eq.${userId},trainer_id.is.null`)
      .order("created_at", { ascending: false });
    if (error) dbError(error);
    const clients = (profiles ?? []).filter((p) => p.id !== userId);
    const ids = clients.map((c) => c.id);
    if (ids.length === 0) {
      return [] as Array<(typeof clients)[number] & { last_session_at: string | null; program_count: number; last_weight_kg: number | null }>;
    }

    const [{ data: sessions }, { data: assignments }, { data: measurements }] = await Promise.all([
      supabase.from("workout_sessions").select("client_id, started_at").in("client_id", ids),
      supabase.from("program_assignments").select("client_id").in("client_id", ids),
      supabase.from("body_measurements").select("client_id, weight_kg, measured_at").in("client_id", ids),
    ]);

    const lastSession = new Map<string, string>();
    (sessions ?? []).forEach((s: any) => {
      const cur = lastSession.get(s.client_id);
      if (!cur || s.started_at > cur) lastSession.set(s.client_id, s.started_at);
    });
    const programCount = new Map<string, number>();
    (assignments ?? []).forEach((a: any) => {
      programCount.set(a.client_id, (programCount.get(a.client_id) ?? 0) + 1);
    });
    const lastWeight = new Map<string, { at: string; w: number | null }>();
    (measurements ?? []).forEach((m: any) => {
      const cur = lastWeight.get(m.client_id);
      if (!cur || m.measured_at > cur.at) lastWeight.set(m.client_id, { at: m.measured_at, w: m.weight_kg });
    });

    return clients.map((c) => ({
      ...c,
      last_session_at: lastSession.get(c.id) ?? null,
      program_count: programCount.get(c.id) ?? 0,
      last_weight_kg: lastWeight.get(c.id)?.w ?? null,
    }));
  });

export const claimClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ clientId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ trainer_id: userId })
      .eq("id", data.clientId);
    if (error) dbError(error);
    return { ok: true };
  });

export const releaseClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ clientId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ trainer_id: null })
      .eq("id", data.clientId)
      .eq("trainer_id", userId);
    if (error) dbError(error);
    return { ok: true };
  });

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const listInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("client_invites")
      .select("*")
      .eq("trainer_id", userId)
      .order("created_at", { ascending: false });
    if (error) dbError(error);
    return data ?? [];
  });

export const createClientInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      email: z.union([z.string().trim().email().max(255), z.literal("")]).optional(),
      name: z.union([z.string().trim().max(80), z.literal("")]).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertTrainer(supabase, userId);
    const token = randomToken();

    const { data: row, error } = await supabase
      .from("client_invites")
      .insert({
        trainer_id: userId,
        email: data.email || null,
        name: data.name || null,
        token,
      })
      .select()
      .single();
    if (error) dbError(error);
    return row;
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("client_invites")
      .delete()
      .eq("id", data.id)
      .eq("trainer_id", userId);
    if (error) dbError(error);
    return { ok: true };
  });

export const getInviteByToken = createServerFn({ method: "GET" })
  .inputValidator(z.object({ token: z.string().min(8).max(128) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("client_invites")
      .select("id, trainer_id, name, email, expires_at, accepted_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) return { ok: false as const, reason: "not_found" as const };
    if (invite.accepted_at) return { ok: false as const, reason: "accepted" as const };
    if (new Date(invite.expires_at) < new Date()) return { ok: false as const, reason: "expired" as const };
    const { data: trainer } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", invite.trainer_id)
      .maybeSingle();
    return {
      ok: true as const,
      invite: {
        id: invite.id,
        trainerName: trainer?.display_name ?? "Din tränare",
        email: invite.email,
        name: invite.name,
      },
    };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ token: z.string().min(8).max(128) }))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("client_invites")
      .select("id, trainer_id, expires_at, accepted_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) throw new Error("Inbjudan hittades inte");
    if (invite.accepted_at) throw new Error("Inbjudan är redan använd");
    if (new Date(invite.expires_at) < new Date()) throw new Error("Inbjudan har gått ut");
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ trainer_id: invite.trainer_id })
      .eq("id", userId);
    if (upErr) dbError(upErr);
    await supabaseAdmin
      .from("client_invites")
      .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq("id", invite.id);
    return { ok: true };
  });

// ---------- EXERCISES ----------
export const listExercises = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("global_exercises")
      .select("id,name,primary_muscle,equipment,level")
      .order("name")
      .limit(2000);
    if (error) dbError(error);
    return data ?? [];
  });


export const createExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ name: z.string().trim().min(1).max(80), notes: z.string().max(500).optional() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("exercises")
      .insert({ name: data.name, notes: data.notes ?? "", trainer_id: userId })
      .select()
      .single();
    if (error) dbError(error);
    return row;
  });

// ---------- PROGRAMS ----------
export const listPrograms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("programs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) dbError(error);
    return data ?? [];
  });

export const getProgram = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ programId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const [{ data: program }, { data: items }, { data: assignments }] = await Promise.all([
      supabase.from("programs").select("*").eq("id", data.programId).maybeSingle(),
      supabase
        .from("program_exercises")
        .select("*, exercises(name)")
        .eq("program_id", data.programId)
        .order("order_index"),
      supabase.from("program_assignments").select("*").eq("program_id", data.programId),
    ]);
    return { program, items: items ?? [], assignments: assignments ?? [] };
  });

export const createProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ name: z.string().trim().min(1).max(80), description: z.string().max(500).optional() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("programs")
      .insert({ name: data.name, description: data.description ?? "", trainer_id: userId })
      .select()
      .single();
    if (error) dbError(error);
    return row;
  });

export const addProgramExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      programId: z.string().uuid(),
      exerciseId: z.string().min(1),
      target_sets: nz(3, 1, 30),
      target_reps: nz(10, 1, 100),
      rest_seconds: nz(90, 0, 1200),
      note: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.exerciseId);
    let exerciseUuid = data.exerciseId;
    if (!isUuid) {
      const { data: ge } = await (supabase as any)
        .from("global_exercises")
        .select("name")
        .eq("id", data.exerciseId)
        .maybeSingle();
      if (!ge?.name) throw new Error("Övning finns inte");
      const { data: existing } = await supabase
        .from("exercises")
        .select("id")
        .eq("trainer_id", userId)
        .eq("name", ge.name)
        .maybeSingle();
      if (existing?.id) {
        exerciseUuid = existing.id;
      } else {
        const { data: created, error: cErr } = await supabase
          .from("exercises")
          .insert({ name: ge.name, notes: "", trainer_id: userId })
          .select("id")
          .single();
        if (cErr) dbError(cErr);
        exerciseUuid = created.id;
      }
    }
    const { data: prev } = await supabase
      .from("program_exercises")
      .select("order_index")
      .eq("program_id", data.programId)
      .order("order_index", { ascending: false })
      .limit(1);
    const nextOrder = (prev?.[0]?.order_index ?? -1) + 1;
    const { error } = await supabase.from("program_exercises").insert({
      program_id: data.programId,
      exercise_id: exerciseUuid,
      order_index: nextOrder,
      target_sets: data.target_sets,
      target_reps: data.target_reps,
      rest_seconds: data.rest_seconds,
      note: data.note ?? "",
    });
    if (error) dbError(error);
    return { ok: true };
  });


export const removeProgramExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("program_exercises").delete().eq("id", data.id);
    if (error) dbError(error);
    return { ok: true };
  });

export const assignProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ programId: z.string().uuid(), clientId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("program_assignments")
      .upsert({ program_id: data.programId, client_id: data.clientId });
    if (error) dbError(error);
    return { ok: true };
  });

export const unassignProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ programId: z.string().uuid(), clientId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("program_assignments")
      .delete()
      .eq("program_id", data.programId)
      .eq("client_id", data.clientId);
    if (error) dbError(error);
    return { ok: true };
  });

// ---------- CLIENT: PROGRAMS / SESSIONS ----------
export const myPrograms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: assigns } = await supabase
      .from("program_assignments")
      .select("program_id, programs(*)")
      .eq("client_id", userId);
    return (assigns ?? []).map((a) => a.programs).filter(Boolean);
  });

export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ programId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("workout_sessions")
      .insert({ client_id: userId, program_id: data.programId })
      .select()
      .single();
    if (error) dbError(error);
    return row;
  });

export const getSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ sessionId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: session } = await supabase
      .from("workout_sessions")
      .select("*, programs(name)")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) return { session: null, items: [], logs: [] };
    const [{ data: items }, { data: logs }] = await Promise.all([
      session.program_id
        ? supabase
            .from("program_exercises")
            .select("*, exercises(id, name)")
            .eq("program_id", session.program_id)
            .order("order_index")
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("set_logs").select("*").eq("session_id", data.sessionId).order("created_at"),
    ]);
    return { session, items: items ?? [], logs: logs ?? [] };
  });

export const logSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      sessionId: z.string().uuid(),
      exerciseId: z.string().uuid(),
      set_index: nz(1, 1, 50),
      weight_kg: nz(0, 0, 999),
      reps: nz(0, 0, 999),
      rpe: z.number().min(0).max(10).optional().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("set_logs").insert({
      session_id: data.sessionId,
      exercise_id: data.exerciseId,
      set_index: data.set_index,
      weight_kg: data.weight_kg,
      reps: data.reps,
      rpe: data.rpe ?? null,
    });
    if (error) dbError(error);
    return { ok: true };
  });

export const completeSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ sessionId: z.string().uuid(), notes: z.string().max(500).optional() }))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("workout_sessions")
      .update({ completed_at: new Date().toISOString(), notes: data.notes ?? "" })
      .eq("id", data.sessionId);
    if (error) dbError(error);
    return { ok: true };
  });

export const listSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ clientId: z.string().uuid().optional() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const cid = data.clientId ?? userId;
    const { data: rows, error } = await supabase
      .from("workout_sessions")
      .select("*, programs(name)")
      .eq("client_id", cid)
      .order("started_at", { ascending: false });
    if (error) dbError(error);
    return rows ?? [];
  });

// ---------- PROGRESS ----------
export const exerciseProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ clientId: z.string().uuid().optional() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const cid = data.clientId ?? userId;
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("id, started_at")
      .eq("client_id", cid);
    const sessionIds = (sessions ?? []).map((s) => s.id);
    if (sessionIds.length === 0) return [];
    const { data: logs } = await supabase
      .from("set_logs")
      .select("session_id, exercise_id, weight_kg, reps, exercises(name)")
      .in("session_id", sessionIds);
    const dateById = new Map(sessions!.map((s) => [s.id, s.started_at]));
    type Row = {
      exerciseId: string;
      exerciseName: string;
      date: string;
      maxWeight: number;
      volume: number;
    };
    const grouped = new Map<string, Row>();
    (logs ?? []).forEach((l: any) => {
      const date = dateById.get(l.session_id)!;
      const key = `${l.exercise_id}|${date.slice(0, 10)}`;
      const cur = grouped.get(key) ?? {
        exerciseId: l.exercise_id,
        exerciseName: l.exercises?.name ?? "Övning",
        date: date.slice(0, 10),
        maxWeight: 0,
        volume: 0,
      };
      cur.maxWeight = Math.max(cur.maxWeight, Number(l.weight_kg));
      cur.volume += Number(l.weight_kg) * Number(l.reps);
      grouped.set(key, cur);
    });
    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
  });

// ---------- MEASUREMENTS ----------
export const listMeasurements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ clientId: z.string().uuid().optional() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const cid = data.clientId ?? userId;
    const { data: rows, error } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("client_id", cid)
      .order("measured_at", { ascending: true });
    if (error) dbError(error);
    return rows ?? [];
  });

export const addMeasurement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      weight_kg: z.number().min(0).max(500).optional().nullable(),
      waist_cm: z.number().min(0).max(300).optional().nullable(),
      chest_cm: z.number().min(0).max(300).optional().nullable(),
      arm_cm: z.number().min(0).max(150).optional().nullable(),
      thigh_cm: z.number().min(0).max(200).optional().nullable(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("body_measurements").insert({
      client_id: userId,
      weight_kg: data.weight_kg ?? null,
      waist_cm: data.waist_cm ?? null,
      chest_cm: data.chest_cm ?? null,
      arm_cm: data.arm_cm ?? null,
      thigh_cm: data.thigh_cm ?? null,
    });
    if (error) dbError(error);
    return { ok: true };
  });
