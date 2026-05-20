import { PrismaClient, FrequenciaMedicamento, IntervaloAlerta, MaximoTentativas } from '@prisma/client'

type DadosMedicamento = {
  nome: string
  dose: string
  horario: string
  frequencia: string
  intervaloAlerta: string
  maximoTentativas: string
  nomeCuidador?: string | null
  telefoneCuidador?: string | null
  estoqueRestante?: number | null
}

export async function listarMedicamentos(prisma: PrismaClient, usuarioId: string) {
  return prisma.medicamento.findMany({
    where: { usuarioId, ativo: true },
    orderBy: { horario: 'asc' },
  })
}

export async function buscarMedicamento(prisma: PrismaClient, id: string, usuarioId: string) {
  const med = await prisma.medicamento.findFirst({ where: { id, usuarioId, ativo: true } })
  if (!med) throw { statusCode: 404, message: 'Medicamento não encontrado' }
  return med
}

export async function criarMedicamento(
  prisma: PrismaClient,
  usuarioId: string,
  dados: DadosMedicamento,
) {
  return prisma.medicamento.create({
    data: {
      usuarioId,
      nome: dados.nome,
      dose: dados.dose,
      horario: dados.horario,
      frequencia: dados.frequencia as FrequenciaMedicamento,
      intervaloAlerta: dados.intervaloAlerta as IntervaloAlerta,
      maximoTentativas: dados.maximoTentativas as MaximoTentativas,
      nomeCuidador: dados.nomeCuidador ?? null,
      telefoneCuidador: dados.telefoneCuidador ?? null,
      estoqueRestante: dados.estoqueRestante ?? null,
    },
  })
}

export async function atualizarMedicamento(
  prisma: PrismaClient,
  id: string,
  usuarioId: string,
  dados: Partial<DadosMedicamento>,
) {
  const med = await prisma.medicamento.findFirst({ where: { id, usuarioId, ativo: true } })
  if (!med) throw { statusCode: 404, message: 'Medicamento não encontrado' }

  return prisma.medicamento.update({
    where: { id },
    data: {
      ...(dados.nome && { nome: dados.nome }),
      ...(dados.dose && { dose: dados.dose }),
      ...(dados.horario && { horario: dados.horario }),
      ...(dados.frequencia && { frequencia: dados.frequencia as FrequenciaMedicamento }),
      ...(dados.intervaloAlerta && { intervaloAlerta: dados.intervaloAlerta as IntervaloAlerta }),
      ...(dados.maximoTentativas && { maximoTentativas: dados.maximoTentativas as MaximoTentativas }),
      ...('nomeCuidador' in dados && { nomeCuidador: dados.nomeCuidador ?? null }),
      ...('telefoneCuidador' in dados && { telefoneCuidador: dados.telefoneCuidador ?? null }),
      ...('estoqueRestante' in dados && { estoqueRestante: dados.estoqueRestante ?? null }),
    },
  })
}

export async function removerMedicamento(prisma: PrismaClient, id: string, usuarioId: string) {
  const med = await prisma.medicamento.findFirst({ where: { id, usuarioId, ativo: true } })
  if (!med) throw { statusCode: 404, message: 'Medicamento não encontrado' }

  return prisma.medicamento.update({ where: { id }, data: { ativo: false } })
}

export async function confirmarDose(prisma: PrismaClient, id: string, usuarioId: string) {
  const med = await prisma.medicamento.findFirst({ where: { id, usuarioId, ativo: true } })
  if (!med) throw { statusCode: 404, message: 'Medicamento não encontrado' }

  const agora = new Date()
  const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const fimDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1)

  // Verifica se já foi confirmado hoje
  const jaConfirmado = await prisma.eventoMedicamento.findFirst({
    where: {
      medicamentoId: id,
      usuarioId,
      status: 'tomado',
      agendadoEm: { gte: inicioDia, lt: fimDia },
    },
  })
  if (jaConfirmado) throw { statusCode: 409, message: 'Dose já confirmada hoje' }

  // Decrementa estoque se houver
  if (med.estoqueRestante !== null && med.estoqueRestante > 0) {
    await prisma.medicamento.update({
      where: { id },
      data: { estoqueRestante: { decrement: 1 } },
    })
  }

  // Tenta atualizar evento pendente/atrasado existente de hoje
  const eventoHoje = await prisma.eventoMedicamento.findFirst({
    where: {
      medicamentoId: id,
      usuarioId,
      status: { in: ['pendente', 'atrasado'] },
      agendadoEm: { gte: inicioDia, lt: fimDia },
    },
  })

  if (eventoHoje) {
    return prisma.eventoMedicamento.update({
      where: { id: eventoHoje.id },
      data: { status: 'tomado', confirmadoEm: agora },
    })
  }

  // Fallback: cria evento (caso o scheduler ainda não tenha rodado)
  const [h, m] = med.horario.split(':').map(Number)
  const agendadoEm = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), h, m)

  return prisma.eventoMedicamento.create({
    data: {
      medicamentoId: id,
      usuarioId,
      agendadoEm,
      confirmadoEm: agora,
      status: 'tomado',
    },
  })
}

export async function atualizarEstoque(
  prisma: PrismaClient,
  id: string,
  usuarioId: string,
  estoqueRestante: number,
) {
  const med = await prisma.medicamento.findFirst({ where: { id, usuarioId, ativo: true } })
  if (!med) throw { statusCode: 404, message: 'Medicamento não encontrado' }

  return prisma.medicamento.update({ where: { id }, data: { estoqueRestante } })
}

export async function buscarHistorico(
  prisma: PrismaClient,
  usuarioId: string,
  medicamentoId?: string,
  dataInicio?: string,
  dataFim?: string,
) {
  const filtro: any = { usuarioId }

  if (medicamentoId) filtro.medicamentoId = medicamentoId

  if (dataInicio || dataFim) {
    filtro.agendadoEm = {}
    if (dataInicio) filtro.agendadoEm.gte = new Date(dataInicio)
    if (dataFim) filtro.agendadoEm.lte = new Date(dataFim)
  }

  return prisma.eventoMedicamento.findMany({
    where: filtro,
    include: { medicamento: { select: { nome: true, dose: true } } },
    orderBy: { agendadoEm: 'desc' },
    take: 100,
  })
}
