import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu email")
  .max(255, "Email muito longo")
  .email("Email inválido");

export const loginSchema = z.object({
  email: emailSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
