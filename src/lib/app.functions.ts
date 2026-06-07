import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const nz = (n: number, min = 0, max = 9999) => z.number().min(min).max(max);

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

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_first_admin");
    if (error) throw error;
    return { claimed: !!data };
  });

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
        if (error) throw error;
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw error;
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
    if (error) throw error;
    return { ok: true };
  });

// ---------- TRAINER ----------
export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, trainer_id, created_at")
      .or(`trainer_id.eq.${userId},trainer_id.is.null`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    // Exclude trainer self
    return (data ?? []).filter((p) => p.id !== userId);
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
    if (error) throw error;
    return { ok: true };
  });

// ---------- EXERCISES ----------
export const listExercises = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("exercises")
      .select("*")
      .order("name");
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
    return row;
  });

export const addProgramExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      programId: z.string().uuid(),
      exerciseId: z.string().uuid(),
      target_sets: nz(3, 1, 30),
      target_reps: nz(10, 1, 100),
      rest_seconds: nz(90, 0, 1200),
      note: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: existing } = await supabase
      .from("program_exercises")
      .select("order_index")
      .eq("program_id", data.programId)
      .order("order_index", { ascending: false })
      .limit(1);
    const nextOrder = (existing?.[0]?.order_index ?? -1) + 1;
    const { error } = await supabase.from("program_exercises").insert({
      program_id: data.programId,
      exercise_id: data.exerciseId,
      order_index: nextOrder,
      target_sets: data.target_sets,
      target_reps: data.target_reps,
      rest_seconds: data.rest_seconds,
      note: data.note ?? "",
    });
    if (error) throw error;
    return { ok: true };
  });

export const removeProgramExercise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("program_exercises").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const assignProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ programId: z.string().uuid(), clientId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("program_assignments")
      .upsert({ program_id: data.programId, client_id: data.clientId });
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
    return { ok: true };
  });
