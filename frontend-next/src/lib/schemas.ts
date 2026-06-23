import { z } from 'zod'
import type { Role } from './types'

export const loginSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe sua senha'),
})

export const cadastroSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(4),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
})

export const perfilSchema = cadastroSchema.partial().omit({ password: true, username: true, email: true })

export const resetRequestSchema = z.object({ email: z.string().email() })
export const resetConfirmSchema = z.object({
  token: z.string().min(1),
  nova_senha: z.string().min(4, 'Mínimo de 4 caracteres'),
})

export const atividadeFormSchema = z.object({
  titulo: z.string().min(1).max(200),
  hora: z.string().min(1).max(50),
  data: z.string().min(1).max(120),
  imagem_url: z.string().max(500),
  vagas: z.coerce.number().int().min(1).optional(),
})

export const cardapioFormSchema = z.object({
  dia: z.string().min(1).max(60),
  ordem_dia: z.coerce.number().int().min(0),
  ordem_refeicao: z.coerce.number().int().min(0),
  refeicao: z.string().min(1).max(40),
  titulo: z.string().min(1).max(200),
  descricao: z.string().max(600),
  imagem_url: z.string().max(500),
})

export const noticiaFormSchema = z.object({
  titulo: z.string().min(1).max(300),
  descricao: z.string().max(2000),
  fonte: z.string().max(800),
})

const STAFF_ROLES: Role[] = ['funcionario', 'admin']
export function isStaff(role: string, isStaffFlag: boolean): boolean {
  return isStaffFlag || STAFF_ROLES.includes(role as Role)
}
