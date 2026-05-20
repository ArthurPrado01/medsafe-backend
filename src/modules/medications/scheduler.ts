import { PrismaClient } from '@prisma/client'

// Mapeia frequência → dia da semana (0=Dom, 1=Seg, ... 6=Sab)
const FREQUENCIA_DIA: Record<string, number> = {
  semanalDom: 0,
  semanalSeg: 1,
  semanalTer: 2,
  semanalQua: 3,
  semanalQui: 4,
  semanalSex: 5,
  semanalSab: 6,
}

function deveTomarHoje(frequencia: string, diaDaSemana: number, agora: Date, criadoEm: Date): boolean {
  if (['diario', 'duasVezesDia', 'tresVezesDia'].includes(frequencia)) return true

  if (frequencia in FREQUENCIA_DIA) {
    return diaDaSemana === FREQUENCIA_DIA[frequencia]
  }

  if (frequencia === 'quinzenal') {
    const diffDias = Math.floor((agora.getTime() - criadoEm.getTime()) / (1000 * 60 * 60 * 24))
    return diffDias % 15 === 0
  }

  if (frequencia === 'mensal') {
    return agora.getDate() === criadoEm.getDate()
  }

  return true
}

export async function processarEventosDia(prisma: PrismaClient) {
  const agora = new Date()
  const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0)
  const fimDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59)
  const diaDaSemana = agora.getDay()

  const medicamentos = await prisma.medicamento.findMany({
    where: { ativo: true },
  })

  for (const med of medicamentos) {
    if (!deveTomarHoje(med.frequencia, diaDaSemana, agora, med.criadoEm)) continue

    const [h, m] = med.horario.split(':').map(Number)
    const agendadoEm = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), h, m, 0)

    // Verifica se já existe evento para esse medicamento hoje
    const eventoExistente = await prisma.eventoMedicamento.findFirst({
      where: {
        medicamentoId: med.id,
        agendadoEm: { gte: inicioDia, lte: fimDia },
      },
    })

    if (!eventoExistente) {
      // Cria evento com status baseado em se o horário já passou
      const passou = agora > agendadoEm
      await prisma.eventoMedicamento.create({
        data: {
          medicamentoId: med.id,
          usuarioId: med.usuarioId,
          agendadoEm,
          status: passou ? 'atrasado' : 'pendente',
        },
      })
    } else if (eventoExistente.status === 'pendente' && agora > agendadoEm) {
      // Era pendente mas o horário já passou — marca como atrasado
      await prisma.eventoMedicamento.update({
        where: { id: eventoExistente.id },
        data: { status: 'atrasado' },
      })
    }
    // Se já for 'tomado', não mexe
  }
}

export function iniciarScheduler(prisma: PrismaClient) {
  console.log('[Scheduler] Iniciando processamento de eventos...')

  // Roda imediatamente ao iniciar o servidor
  processarEventosDia(prisma).catch((err) =>
    console.error('[Scheduler] Erro na execução inicial:', err),
  )

  // Roda a cada 5 minutos
  setInterval(() => {
    processarEventosDia(prisma).catch((err) =>
      console.error('[Scheduler] Erro:', err),
    )
  }, 5 * 60 * 1000)
}
