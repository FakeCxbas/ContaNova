import { supabase } from "@/integrations/supabase/client";

type UploadResult = {
  success: boolean;
  certificate?: {
    filename: string;
    uploadedAt: string;
  };
  error?: string;
};

const getFunctionUrl = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sri-certificate-manager`;

const getSessionToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Tu sesion expiro. Vuelve a iniciar sesion.");
  }
  return session.access_token;
};

const functionKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const sriCertificateService = {
  async upload(file: File, password: string) {
    const token = await getSessionToken();
    const formData = new FormData();
    formData.append("certificate", file);
    formData.append("password", password);

    const response = await fetch(getFunctionUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: functionKey,
      },
      body: formData,
    });

    const data = (await response.json().catch(() => ({}))) as UploadResult;
    if (!response.ok || data.error) {
      throw new Error(data.error || "No se pudo guardar la firma electronica.");
    }
    return data;
  },

  async remove() {
    const token = await getSessionToken();
    const response = await fetch(getFunctionUrl(), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: functionKey,
      },
    });

    const data = (await response.json().catch(() => ({}))) as UploadResult;
    if (!response.ok || data.error) {
      throw new Error(data.error || "No se pudo eliminar la firma electronica.");
    }
    return data;
  },
};
