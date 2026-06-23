'use client'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import type { PontoSemana, UsoFuncionalidade } from '@/lib/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

export function InscricoesChart({ pontos }: { pontos: PontoSemana[] }) {
  return (
    <Line
      aria-label="Inscrições por semana"
      data={{
        labels: pontos.map((p) => p.semana),
        datasets: [{ label: 'Inscrições', data: pontos.map((p) => p.total), borderColor: '#0369a1' }],
      }}
    />
  )
}

export function UsoChart({ itens }: { itens: UsoFuncionalidade[] }) {
  return (
    <Bar
      aria-label="Uso por funcionalidade"
      data={{
        labels: itens.map((i) => i.funcionalidade),
        datasets: [{ label: 'Total', data: itens.map((i) => i.total), backgroundColor: '#0369a1' }],
      }}
    />
  )
}
