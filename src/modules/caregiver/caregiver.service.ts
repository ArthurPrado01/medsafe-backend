import { PrismaClient } from '@prisma/client'

export async function listarIdosos(prisma: PrismaClient, cuidadorId: string) {
  const relacoes = await prisma.cuidadorIdoso.findMany({
    where: { cuidadorId, ativo: true },
    include: {
      idoso: {
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          urlFoto: true,
          medicamentos: {
            where: { ativo: true },
            select: { id: true, nome: true, horario: true, estoqueRestante: true },
          },
          eventos: {
            where: {
              agendadoEm: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lt: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
            select: { status: true },
          },
        },
      },
    },
  })

  return relacoes.map((r) => {
    const eventos = r.idoso.eventos
    const total = eventos.length
    const tomados = eventos.filter((e) => e.status === 'tomado').length
    const atrasados = eventos.filter((e) => e.status === 'atrasado').length
    const adesao = total > 0 ? Math.round((tomados / total) * 100) : 100

    let situacao = 'Normal'
    if (total > 0) {
      if (adesao < 50) situacao = 'Crítico'
      else if (adesao < 80) situacao = 'Atenção'
    }

    return {
      relacaoId: r.id,
      idoso: {
        id: r.idoso.id,
        nome: r.idoso.nome,
        email: r.idoso.email,
        telefone: r.idoso.telefone,
        urlFoto: r.idoso.urlFoto,
        quantidadeMedicamentos: r.idoso.medicamentos.length,
        medicamentos: r.idoso.medicamentos,
        hoje: { total, tomados, atrasados, pendentes: Math.max(0, total - tomados - atrasados) },
        adesao,
        situacao,
      },
    }
  })
}

export async function vincularIdoso(prisma: PrismaClient, cuidadorId: string, emailIdoso: string) {
  const idoso = await prisma.usuario.findFirst({
    where: { email: emailIdoso, perfil: 'usuario', deletadoEm: null },
  })
  if (!idoso) throw { statusCode: 404, message: 'Paciente não encontrado com esse email' }
  if (idoso.id === cuidadorId) throw { statusCode: 400, message: 'Não é possível vincular a si mesmo' }

  const existente = await prisma.cuidadorIdoso.findFirst({
    where: { cuidadorId, idosoId: idoso.id },
  })

  if (existente) {
    if (existente.ativo) throw { statusCode: 409, message: 'Paciente já vinculado' }
    return prisma.cuidadorIdoso.update({ where: { id: existente.id }, data: { ativo: true } })
  }

  return prisma.cuidadorIdoso.create({ data: { cuidadorId, idosoId: idoso.id } })
}

export async function desvincularIdoso(
  prisma: PrismaClient,
  cuidadorId: string,
  relacaoId: string,
) {
  const relacao = await prisma.cuidadorIdoso.findFirst({
    where: { id: relacaoId, cuidadorId, ativo: true },
  })
  if (!relacao) throw { statusCode: 404, message: 'Vínculo não encontrado' }

  return prisma.cuidadorIdoso.update({ where: { id: relacaoId }, data: { ativo: false } })
}

export async function buscarMedicamentosIdoso(
  prisma: PrismaClient,
  cuidadorId: string,
  idosoId: string,
) {
  const relacao = await prisma.cuidadorIdoso.findFirst({
    where: { cuidadorId, idosoId, ativo: true },
  })
  if (!relacao) throw { statusCode: 403, message: 'Acesso negado' }

  return prisma.medicamento.findMany({
    where: { usuarioId: idosoId, ativo: true },
    orderBy: { horario: 'asc' },
  })
}

export async function buscarHistoricoIdoso(
  prisma: PrismaClient,
  cuidadorId: string,
  idosoId: string,
  dataInicio?: string,
  dataFim?: string,
) {
  const relacao = await prisma.cuidadorIdoso.findFirst({
    where: { cuidadorId, idosoId, ativo: true },
  })
  if (!relacao) throw { statusCode: 403, message: 'Acesso negado' }

  const filtro: any = { usuarioId: idosoId }
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

export async function buscarAlertasCuidador(prisma: PrismaClient, cuidadorId: string) {
  const relacoes = await prisma.cuidadorIdoso.findMany({
    where: { cuidadorId, ativo: true },
    select: { idosoId: true },
  })

  const idosoIds = relacoes.map((r) => r.idosoId)
  if (idosoIds.length === 0) return []

  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const eventos = await prisma.eventoMedicamento.findMany({
    where: {
      usuarioId: { in: idosoIds },
      status: 'atrasado',
      agendadoEm: { gte: desde },
    },
    include: {
      medicamento: { select: { nome: true, dose: true } },
      usuario: { select: { nome: true } },
    },
    orderBy: { agendadoEm: 'desc' },
  })

  return eventos.map((e) => ({
    id: e.id,
    nomeIdoso: e.usuario.nome,
    nomeMedicamento: e.medicamento.nome,
    dose: e.medicamento.dose,
    agendadoEm: e.agendadoEm,
    status: e.status,
  }))
}
