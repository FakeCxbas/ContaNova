import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Authenticate caller ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "No autorizado" }, 401);

    // ── Verify admin role ──
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Se requiere rol de administrador" }, 403);

    // ── Get caller's company_id ──
    const { data: callerCompanyId } = await supabase.rpc("get_user_company_id", {
      _user_id: caller.id,
    });
    if (!callerCompanyId) return json({ error: "No se encontró empresa del usuario" }, 400);

    const { action, ...payload } = await req.json();

    // ── LIST: Only users from caller's company ──
    if (action === "list") {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", callerCompanyId);

      const userIds = (profiles || []).map((p: any) => p.id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("*")
        .in("user_id", userIds.length > 0 ? userIds : ["__none__"]);

      const users = (profiles || []).map((p: any) => ({
        ...p,
        role: roles?.find((r: any) => r.user_id === p.id)?.role || "empleado",
      }));

      return json({ users });
    }

    // ── CREATE: Assign new user to caller's company ──
    if (action === "create") {
      const { email, password, full_name, role } = payload;

      if (!email || !password || !full_name) {
        return json({ error: "Email, contraseña y nombre son requeridos" }, 400);
      }

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (createError) return json({ error: createError.message }, 400);

      // The handle_new_user trigger creates a new company + profile.
      // We need to reassign the user to the caller's company and clean up.

      // 1. Get the auto-created company from the new user's profile
      const { data: newProfile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", newUser.user.id)
        .single();

      const autoCreatedCompanyId = newProfile?.company_id;

      // 2. Move user profile to caller's company
      await supabase
        .from("profiles")
        .update({ company_id: callerCompanyId })
        .eq("id", newUser.user.id);

      // 3. Delete the auto-created empty company (if different)
      if (autoCreatedCompanyId && autoCreatedCompanyId !== callerCompanyId) {
        await supabase
          .from("companies")
          .delete()
          .eq("id", autoCreatedCompanyId);
      }

      // 4. Set the requested role
      if (role && role !== "empleado") {
        await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", newUser.user.id);
      }

      return json({ user: newUser.user });
    }

    // ── UPDATE ROLE: Only for users in same company ──
    if (action === "update_role") {
      const { user_id, role } = payload;

      // Verify target user belongs to caller's company
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user_id)
        .single();

      if (!targetProfile || targetProfile.company_id !== callerCompanyId) {
        return json({ error: "No tienes permiso para modificar este usuario" }, 403);
      }

      await supabase
        .from("user_roles")
        .update({ role })
        .eq("user_id", user_id);

      return json({ success: true });
    }

    // ── DELETE: Only for users in same company ──
    if (action === "delete") {
      const { user_id } = payload;

      // Prevent self-deletion
      if (user_id === caller.id) {
        return json({ error: "No puedes eliminar tu propia cuenta" }, 400);
      }

      // Verify target user belongs to caller's company
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user_id)
        .single();

      if (!targetProfile || targetProfile.company_id !== callerCompanyId) {
        return json({ error: "No tienes permiso para eliminar este usuario" }, 403);
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(user_id);
      if (deleteError) return json({ error: deleteError.message }, 400);

      return json({ success: true });
    }

    return json({ error: "Acción no válida" }, 400);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
