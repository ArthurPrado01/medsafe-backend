import { PrismaClient } from '@prisma/client'

export async function buscarMetricas(prisma: PrismaClient) {
  const [totalUsuarios, totalCuidadores, totalMedicamentos] = await prisma.$transaction([
    prisma.usuario.count({ where: { perfil: 'usuario', deletadoEm: null } }),
    prisma.usuario.count({ where: { perfil: 'cuidador', deletadoEm: null } }),
    prisma.medicamento.count({ where: { ativo: true } }),
  ])

  const inicioDia = new Date(new Date().setHours(0, 0, 0, 0))
  const fimDia = new Date(new Date().setHours(23, 59, 59, 999))

  const eventosDia = await prisma.eventoMedicamento.groupBy({
    by: ['status'],
    where: { agendadoEm: { gte: inicioDia, lte: fimDia } },
    _count: true,
  })

  const tomados = eventosDia.find((e) => e.status === 'tomado')?._count ?? 0
  const totalHoje = eventosDia.reduce((soma, e) => soma + e._count, 0)
  const mediaAdesao = totalHoje > 0 ? Math.round((tomados / totalHoje) * 100) : 0

  const alertasHoje = await prisma.eventoMedicamento.count({
    where: { status: 'atrasado', agendadoEm: { gte: inicioDia, lte: fimDia } },
  })

  return { totalUsuarios, totalCuidadores, totalMedicamentos, mediaAdesao, alertasHoje }
}

export async function listarUsuarios(
  prisma: PrismaClient,
  perfil?: string,
  pagina = 1,
  limite = 20,
) {
  const filtro: any = { deletadoEm: null }
  if (perfil) filtro.perfil = perfil

  const [usuarios, total] = await prisma.$transaction([
    prisma.usuario.findMany({
      where: filtro,
      select: { id: true, nome: true, email: true, telefone: true, perfil: true, criadoEm: true },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { criadoEm: 'desc' },
    }),
    prisma.usuario.count({ where: filtro }),
  ])

  return { usuarios, total, pagina, paginas: Math.ceil(total / limite) }
}

export async function atualizarUsuario(
  prisma: PrismaClient,
  id: string,
  dados: { nome?: string; perfil?: string; telefone?: string },
) {
  const usuario = await prisma.usuario.findFirst({ where: { id, deletadoEm: null } })
  if (!usuario) throw { statusCode: 404, message: 'Usuário não encontrado' }

  return prisma.usuario.update({
    where: { id },
    data: dados as any,
    select: { id: true, nome: true, email: true, telefone: true, perfil: true },
  })
}

export async function desativarUsuario(prisma: PrismaClient, id: string) {
  const usuario = await prisma.usuario.findFirst({ where: { id, deletadoEm: null } })
  if (!usuario) throw { statusCode: 404, message: 'Usuário não encontrado' }

  return prisma.usuario.update({ where: { id }, data: { deletadoEm: new Date() } })
}
