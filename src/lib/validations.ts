import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim()
    .min(1, "El correo es requerido")
    .email("Ingresa un correo electrónico válido")
    .max(255, "El correo no debe superar 255 caracteres"),
  password: z.string()
    .min(1, "La contraseña es requerida")
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const registerSchema = z.object({
  name: z.string().trim()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no debe superar 100 caracteres"),
  email: z.string().trim()
    .min(1, "El correo es requerido")
    .email("Ingresa un correo electrónico válido")
    .max(255, "El correo no debe superar 255 caracteres"),
  password: z.string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(72, "La contraseña no debe superar 72 caracteres"),
  ruc: z.string().trim()
    .min(1, "El RUC es requerido")
    .length(13, "El RUC debe tener exactamente 13 dígitos")
    .regex(/^\d+$/, "El RUC solo debe contener números"),
});

export const clientSchema = z.object({
  name: z.string().trim()
    .min(1, "El nombre es requerido")
    .max(200, "El nombre no debe superar 200 caracteres"),
  identification: z.string().trim()
    .max(20, "La identificación no debe superar 20 caracteres")
    .optional().or(z.literal("")),
  email: z.string().trim()
    .email("Ingresa un correo electrónico válido")
    .max(255, "El correo no debe superar 255 caracteres")
    .optional().or(z.literal("")),
  phone: z.string().trim()
    .max(20, "El teléfono no debe superar 20 caracteres")
    .optional().or(z.literal("")),
  address: z.string().trim()
    .max(500, "La dirección no debe superar 500 caracteres")
    .optional().or(z.literal("")),
});

export const productSchema = z.object({
  name: z.string().trim()
    .min(1, "El nombre es requerido")
    .max(200, "El nombre no debe superar 200 caracteres"),
  price: z.number({ invalid_type_error: "El precio debe ser un número" })
    .min(0, "El precio no puede ser negativo"),
  iva: z.number(),
  type: z.string().min(1),
  stock: z.number().int("El stock debe ser un número entero").min(0, "El stock no puede ser negativo"),
  min_stock: z.number().int("El stock mínimo debe ser un número entero").min(0, "El stock mínimo no puede ser negativo"),
});

export const companySchema = z.object({
  name: z.string().trim()
    .min(1, "La razón social es requerida")
    .max(200, "La razón social no debe superar 200 caracteres"),
  ruc: z.string().trim()
    .length(13, "El RUC debe tener exactamente 13 dígitos")
    .regex(/^\d+$/, "El RUC solo debe contener números")
    .optional().or(z.literal("")),
  establecimiento: z.string()
    .regex(/^\d{1,3}$/, "Debe ser un código numérico de hasta 3 dígitos"),
  punto_emision: z.string()
    .regex(/^\d{1,3}$/, "Debe ser un código numérico de hasta 3 dígitos"),
  address: z.string().max(500).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("Correo inválido").max(255).optional().or(z.literal("")),
});

export type FieldErrors = Record<string, string>;

type ValidationSuccess<T> = { success: true; data: T; errors?: never };
type ValidationFailure = { success: false; errors: FieldErrors; data?: never };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors: FieldErrors = {};
  result.error.errors.forEach((err) => {
    const key = err.path.join(".");
    if (!errors[key]) errors[key] = err.message;
  });
  return { success: false, errors };
}
