export type Role = 'idoso' | 'funcionario' | 'admin'

export interface UserPublic {
  id: number
  username: string
  email: string
  is_staff: boolean
  role: Role
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  birth_date?: string | null
  gender?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
}

export interface Token {
  access_token: string
  token_type: string
  refresh_token?: string
}

export interface AtividadeOut {
  id: number
  titulo: string
  hora: string
  data: string
  imagem_url: string
  vagas?: number | null
  inscritos?: number | null
  vagas_disponiveis?: number | null
}

export interface InscricaoOut { id: number; status: string; atividade: AtividadeOut }
export interface CardapioItemOut {
  id: number; dia: string; ordem_dia: number; refeicao: string
  titulo: string; descricao: string; imagem_url: string
}
export interface NoticiaOut {
  id: number; titulo: string; descricao: string; fonte: string; imagem_url?: string | null
}
export interface DashboardIndicadores {
  total_idosos: number; total_funcionarios: number; total_atividades: number
  total_inscricoes_confirmadas: number; total_noticias: number
  total_itens_cardapio: number; total_presencas: number
}
export interface PontoSemana { semana: string; total: number }
export interface UsoFuncionalidade { funcionalidade: string; total: number }
export interface AlertaAtividade {
  activity_id: number; titulo: string; capacidade: number; inscritos: number; percentual: number
}
export interface HomeResumo {
  atividades: { id: number; titulo: string; hora: string; data: string; imagem_url: string }[]
  noticias: { id: number; titulo: string; descricao: string; fonte: string; imagem_url?: string | null }[]
  cardapio: { id: number; dia: string; refeicao: string; titulo: string; descricao: string }[]
}
