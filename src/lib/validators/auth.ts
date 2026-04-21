import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu email")
  .max(255, "Email muito longo")
  .email("Email inválido");

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(72, "Máximo 72 caracteres");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordChangeSchema = z
  .object({
    current_password: passwordSchema,
    new_password: passwordSchema,
  })
  .refine((value) => value.current_password !== value.new_password, {
    message: "A nova senha precisa ser diferente da atual",
    path: ["new_password"],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
