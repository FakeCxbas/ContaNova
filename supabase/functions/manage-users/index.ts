import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ProfileRow = {
  id: string;
  company_id: string | null;
  full_name: string;
  email: string;
  created_at: string;
};

type CompanyRow = {
  id: string;
  name: string;
  ruc: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
};

type UserRoleRow = {
  id?: string;
  user_id: string;
  role: string;
};

type AuthUserRow = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

async function cleanupProvision(
  supabase: ReturnType<typeof createClient>,
  userId?: string,
  companyId?: string,
  extraCompanyId?: string | null,
) {
  if (userId) {
    await supabase.auth.admin.deleteUser(userId);
  }
  if (companyId) {
    await supabase.from("companies").delete().eq("id", companyId);
  }
  if (extraCompanyId && extraCompanyId !== companyId) {
    await supabase.from("companies").delete().eq("id", extraCompanyId);
  }
}

async function findUserByEmail(supabase: ReturnType<typeof createClient>, email: string) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return (data.users || []).find((user: AuthUserRow) => user.email?.toLowerCase() === email.toLowerCase()) || null;
}

async function removeStoragePrefix(supabase: ReturnType<typeof createClient>, bucket: string, prefix: string) {
  const filesToRemove: string[] = [];

  async function collect(path: string) {
    const { data, error } = await supabase.storage.from(bucket).list(path, { limit: 1000 });
    if (error) return;

    for (const item of data || []) {
      const itemPath = path ? `${path}/${item.name}` : item.name;
      if ((item as { id?: string | null }).id) {
        filesToRemove.push(itemPath);
      } else {
        await collect(itemPath);
      }
    }
  }

  await collect(prefix);
  if (filesToRemove.length > 0) {
    await supabase.storage.from(bucket).remove(filesToRemove);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const {
      data: { user: caller },
      error: callerError,
    } = await supabase.auth.getUser(token);
    if (callerError || !caller) {
      return json({ error: callerError?.message || "No autorizado" }, 401);
    }

    const { data: callerRole } = await supabase.rpc("get_user_role", { _user_id: caller.id });
    const isSuperadmin = callerRole === "superadmin";
    const isAdmin = callerRole === "admin";

    if (!isSuperadmin && !isAdmin) {
      return json({ error: "No tienes permisos para esta accion" }, 403);
    }

    const body = await req.json();
    const action = body.action as string;

    if (isSuperadmin) {
      return await handleSuperadminAction(supabase, caller.id, action, body);
    }

    return await handleAdminAction(supabase, caller.id, action, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    return json({ error: message }, 500);
  }
});

async function handleSuperadminAction(supabase: ReturnType<typeof createClient>, callerId: string, action: string, payload: Record<string, unknown>) {
  if (action === "list_companies") {
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });
    if (companiesError) return json({ error: companiesError.message }, 400);

    const companyIds = (companies || []).map((company: CompanyRow) => company.id);
    if (companyIds.length === 0) {
      return json({ companies: [] });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .in("company_id", companyIds);
    if (profilesError) return json({ error: profilesError.message }, 400);

    const userIds = (profiles || []).map((profile: ProfileRow) => profile.id);

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*")
      .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    if (rolesError) return json({ error: rolesError.message }, 400);

    const { data: authUsersData, error: authUsersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authUsersError) return json({ error: authUsersError.message }, 400);

    const authUsers = new Map((authUsersData.users || []).map((user: AuthUserRow) => [user.id, user]));

    const result = (companies || []).map((company: CompanyRow) => {
      const adminProfile = (profiles || []).find((profile: ProfileRow) => {
        const role = (roles || []).find((item: UserRoleRow) => item.user_id === profile.id)?.role;
        return profile.company_id === company.id && role === "admin";
      });
      const adminAuth = adminProfile ? authUsers.get(adminProfile.id) : null;

      return {
        ...company,
        admin_user_id: adminProfile?.id || "",
        admin_name: adminProfile?.full_name || "",
        admin_email: adminProfile?.email || "",
        admin_last_sign_in_at: adminAuth?.last_sign_in_at || null,
      };
    });

    return json({ companies: result });
  }

  if (action === "create_company") {
    const name = String(payload.name || "").trim();
    const ruc = String(payload.ruc || "").trim();
    const email = String(payload.email || "").trim();
    const phone = String(payload.phone || "").trim();
    const address = String(payload.address || "").trim();
    const adminFullName = String(payload.admin_full_name || "").trim();
    const adminEmail = String(payload.admin_email || "").trim();
    const adminPassword = String(payload.admin_password || "").trim();

    if (!name || !adminFullName || !adminEmail || !adminPassword) {
      return json({ error: "Faltan datos para crear la empresa" }, 400);
    }
    if (email && !isValidEmail(email)) {
      return json({ error: "El correo de la empresa no es valido" }, 400);
    }
    if (!isValidEmail(adminEmail)) {
      return json({ error: "El correo del admin inicial no es valido" }, 400);
    }
    if (adminPassword.length < 6) {
      return json({ error: "La clave temporal debe tener al menos 6 caracteres" }, 400);
    }

    const existingUser = await findUserByEmail(supabase, adminEmail);
    if (existingUser) {
      return json({ error: "Ese correo admin ya esta registrado. Usa otro correo o elimina ese usuario primero." }, 400);
    }

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminFullName },
    });
    if (createError || !newUser.user) return json({ error: createError?.message || "No se pudo crear el admin" }, 400);

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({ name, ruc, email, phone, address })
      .select("*")
      .single();
    if (companyError || !company) {
      const { data: autoProfile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", newUser.user.id)
        .single();
      await cleanupProvision(supabase, newUser.user.id, undefined, autoProfile?.company_id);
      return json({ error: companyError?.message || "No se pudo crear la empresa" }, 400);
    }

    const { data: autoProfile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", newUser.user.id)
      .single();

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: newUser.user.id,
      company_id: company.id,
      full_name: adminFullName,
      email: adminEmail,
      must_change_password: true,
      password_changed_at: null,
    }, { onConflict: "id" });
    if (profileError) {
      await cleanupProvision(supabase, newUser.user.id, company.id, autoProfile?.company_id);
      return json({ error: profileError.message }, 400);
    }

    const { error: deleteRoleError } = await supabase.from("user_roles").delete().eq("user_id", newUser.user.id);
    if (deleteRoleError) {
      await cleanupProvision(supabase, newUser.user.id, company.id, autoProfile?.company_id);
      return json({ error: deleteRoleError.message }, 400);
    }

    const { error: roleError } = await supabase.from("user_roles").insert({ user_id: newUser.user.id, role: "admin" });
    if (roleError) {
      await cleanupProvision(supabase, newUser.user.id, company.id, autoProfile?.company_id);
      return json({ error: roleError.message }, 400);
    }

    if (autoProfile?.company_id && autoProfile.company_id !== company.id) {
      await supabase.from("companies").delete().eq("id", autoProfile.company_id);
    }

    return json({
      company: {
        ...company,
        admin_user_id: newUser.user.id,
        admin_name: adminFullName,
        admin_email: adminEmail,
        admin_last_sign_in_at: null,
      },
      credentials: { email: adminEmail, password: adminPassword },
    });
  }

  if (action === "update_company") {
    const companyId = String(payload.company_id || "").trim();
    const adminUserId = String(payload.admin_user_id || "").trim();
    const name = String(payload.name || "").trim();
    const ruc = String(payload.ruc || "").trim();
    const email = String(payload.email || "").trim();
    const phone = String(payload.phone || "").trim();
    const address = String(payload.address || "").trim();
    const adminFullName = String(payload.admin_full_name || "").trim();
    const adminEmail = String(payload.admin_email || "").trim();

    if (!companyId || !adminUserId || !name || !adminFullName || !adminEmail) {
      return json({ error: "Faltan datos para actualizar la empresa" }, 400);
    }
    if (email && !isValidEmail(email)) {
      return json({ error: "El correo de la empresa no es valido" }, 400);
    }
    if (!isValidEmail(adminEmail)) {
      return json({ error: "El correo del admin no es valido" }, 400);
    }

    const existingUser = await findUserByEmail(supabase, adminEmail);
    if (existingUser && existingUser.id !== adminUserId) {
      return json({ error: "Ese correo admin ya pertenece a otro usuario" }, 400);
    }

    const { error: companyError } = await supabase
      .from("companies")
      .update({ name, ruc, email, phone, address })
      .eq("id", companyId);
    if (companyError) return json({ error: companyError.message }, 400);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: adminFullName, email: adminEmail, must_change_password: true, password_changed_at: null })
      .eq("id", adminUserId);
    if (profileError) return json({ error: profileError.message }, 400);

    const { error: authError } = await supabase.auth.admin.updateUserById(adminUserId, {
      email: adminEmail,
      user_metadata: { full_name: adminFullName },
    });
    if (authError) return json({ error: authError.message }, 400);

    return json({ success: true });
  }

  if (action === "reset_company_admin_password") {
    const companyId = String(payload.company_id || "").trim();
    const adminUserId = String(payload.admin_user_id || "").trim();
    const adminEmail = String(payload.admin_email || "").trim();
    const adminFullName = String(payload.admin_full_name || "").trim();
    const password = String(payload.password || "").trim();

    if (!companyId || !adminUserId || !adminEmail || !adminFullName || !password) {
      return json({ error: "Faltan datos para regenerar credenciales" }, 400);
    }
    if (!isValidEmail(adminEmail)) {
      return json({ error: "El correo del admin no es valido" }, 400);
    }
    if (password.length < 6) {
      return json({ error: "La nueva clave debe tener al menos 6 caracteres" }, 400);
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(adminUserId, {
      email: adminEmail,
      password,
      user_metadata: { full_name: adminFullName },
    });
    if (authError) return json({ error: authError.message }, 400);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: adminFullName, email: adminEmail })
      .eq("id", adminUserId);
    if (profileError) return json({ error: profileError.message }, 400);

    return json({
      success: true,
      credentials: { email: adminEmail, password },
    });
  }

  if (action === "delete_company") {
    const companyId = String(payload.company_id || "").trim();
    const confirmName = String(payload.confirm_name || "").trim();

    if (!companyId || !confirmName) {
      return json({ error: "Faltan datos para eliminar la empresa" }, 400);
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id,name")
      .eq("id", companyId)
      .single();
    if (companyError || !company) {
      return json({ error: "Empresa no encontrada" }, 404);
    }

    if (String(company.name).trim() !== confirmName) {
      return json({ error: "El nombre de confirmacion no coincide" }, 400);
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .eq("company_id", companyId);
    if (profilesError) return json({ error: profilesError.message }, 400);

    for (const profile of profiles || []) {
      const { error } = await supabase.auth.admin.deleteUser(profile.id);
      if (error) return json({ error: error.message }, 400);
    }

    await removeStoragePrefix(supabase, "company-logos", companyId);
    await removeStoragePrefix(supabase, "sri-certificates", companyId);

    const { error: deleteError } = await supabase
      .from("companies")
      .delete()
      .eq("id", companyId);
    if (deleteError) return json({ error: deleteError.message }, 400);

    return json({ success: true });
  }

  return json({ error: "Accion invalida" }, 400);
}

async function handleAdminAction(supabase: ReturnType<typeof createClient>, callerId: string, action: string, payload: Record<string, unknown>) {
  const { data: callerCompanyId } = await supabase.rpc("get_user_company_id", { _user_id: callerId });
  if (!callerCompanyId) return json({ error: "No se encontro empresa del usuario" }, 400);

  if (action === "list") {
    const { data: profiles } = await supabase.from("profiles").select("*").eq("company_id", callerCompanyId);
    const userIds = (profiles || []).map((profile: ProfileRow) => profile.id);
    const { data: roles } = await supabase.from("user_roles").select("*").in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const { data: authUsersData, error: authUsersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authUsersError) return json({ error: authUsersError.message }, 400);

    const authUsers = new Map((authUsersData.users || []).map((user: AuthUserRow) => [user.id, user]));
    const users = (profiles || []).map((profile: ProfileRow) => ({
      ...profile,
      role: (roles || []).find((item: UserRoleRow) => item.user_id === profile.id)?.role || "empleado",
      email_confirmed: !!authUsers.get(profile.id)?.email_confirmed_at,
      last_sign_in_at: authUsers.get(profile.id)?.last_sign_in_at || null,
    }));

    return json({ users });
  }

  if (action === "create") {
    const email = String(payload.email || "").trim();
    const password = String(payload.password || "").trim();
    const fullName = String(payload.full_name || "").trim();
    const role = String(payload.role || "empleado");
    if (!email || !password || !fullName) {
      return json({ error: "Email, contrasena y nombre son requeridos" }, 400);
    }
    if (!isValidEmail(email)) {
      return json({ error: "El correo del usuario no es valido" }, 400);
    }
    if (password.length < 6) {
      return json({ error: "La clave temporal debe tener al menos 6 caracteres" }, 400);
    }

    const existingUser = await findUserByEmail(supabase, email);
    if (existingUser) {
      return json({ error: "Ese correo ya esta registrado. Usa otro correo o elimina ese usuario primero." }, 400);
    }

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError || !newUser.user) return json({ error: createError?.message || "No se pudo crear el usuario" }, 400);

    const { data: autoProfile } = await supabase.from("profiles").select("company_id").eq("id", newUser.user.id).single();
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: newUser.user.id,
      company_id: callerCompanyId,
      full_name: fullName,
      email,
      must_change_password: true,
      password_changed_at: null,
    }, { onConflict: "id" });
    if (profileError) {
      await cleanupProvision(supabase, newUser.user.id, undefined, autoProfile?.company_id);
      return json({ error: profileError.message }, 400);
    }

    await supabase.from("user_roles").delete().eq("user_id", newUser.user.id);
    const { error: roleError } = await supabase.from("user_roles").insert({ user_id: newUser.user.id, role });
    if (roleError) {
      await cleanupProvision(supabase, newUser.user.id, undefined, autoProfile?.company_id);
      return json({ error: roleError.message }, 400);
    }

    if (autoProfile?.company_id && autoProfile.company_id !== callerCompanyId) {
      await supabase.from("companies").delete().eq("id", autoProfile.company_id);
    }

    return json({ user: newUser.user, credentials: { email, password } });
  }

  if (action === "update_role") {
    const userId = String(payload.user_id || "");
    const role = String(payload.role || "");
    const { data: targetProfile } = await supabase.from("profiles").select("company_id").eq("id", userId).single();
    if (!targetProfile || targetProfile.company_id !== callerCompanyId) {
      return json({ error: "No tienes permiso para modificar este usuario" }, 403);
    }
    await supabase.from("user_roles").update({ role }).eq("user_id", userId);
    return json({ success: true });
  }

  if (action === "delete") {
    const userId = String(payload.user_id || "");
    if (userId === callerId) return json({ error: "No puedes eliminar tu propia cuenta" }, 400);
    const { data: targetProfile } = await supabase.from("profiles").select("company_id").eq("id", userId).single();
    if (!targetProfile || targetProfile.company_id !== callerCompanyId) {
      return json({ error: "No tienes permiso para eliminar este usuario" }, 403);
    }
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) return json({ error: error.message }, 400);
    return json({ success: true });
  }

  return json({ error: "Accion invalida" }, 400);
}
