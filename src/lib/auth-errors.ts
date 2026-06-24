const authErrorTranslations: Array<[RegExp, string]> = [
  [/new password should be different from the old password/i, "La nueva contrasena debe ser diferente a la anterior."],
  [/invalid login credentials/i, "Correo o contrasena incorrectos. Verifica tus datos."],
  [/email not confirmed/i, "Tu correo no ha sido confirmado. Revisa tu bandeja de entrada."],
  [/user already registered/i, "Ya existe un usuario registrado con ese correo."],
  [/user not found/i, "No se encontro un usuario con ese correo."],
  [/password should be at least (\d+) characters/i, "La contrasena debe tener al menos $1 caracteres."],
  [/password is too weak/i, "La contrasena es demasiado debil. Usa una combinacion mas segura."],
  [/same password/i, "La nueva contrasena debe ser diferente a la anterior."],
  [/signup is disabled/i, "El registro publico esta desactivado."],
  [/email rate limit exceeded/i, "Se alcanzo el limite de envios. Intenta de nuevo mas tarde."],
  [/rate limit/i, "Se alcanzo el limite de intentos. Intenta de nuevo mas tarde."],
  [/invalid email/i, "Ingresa un correo electronico valido."],
  [/unable to validate email address/i, "No se pudo validar el correo electronico."],
  [/session.*missing|no session/i, "Tu sesion no esta activa. Inicia sesion nuevamente."],
  [/jwt expired/i, "Tu sesion expiro. Inicia sesion nuevamente."],
];

export const translateAuthError = (message: string, fallback = "No se pudo completar la accion.") => {
  const cleanMessage = message.trim();
  if (!cleanMessage) return fallback;

  for (const [pattern, translation] of authErrorTranslations) {
    const match = cleanMessage.match(pattern);
    if (match) {
      return translation.replace("$1", match[1] || "");
    }
  }

  return cleanMessage;
};

export const getAuthErrorMessage = (error: unknown, fallback = "No se pudo completar la accion.") => {
  if (error instanceof Error) {
    return translateAuthError(error.message, fallback);
  }

  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return translateAuthError(error.message, fallback);
  }

  return fallback;
};
