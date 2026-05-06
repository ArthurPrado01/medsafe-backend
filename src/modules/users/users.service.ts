import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const camposPublicos = {
  id: true,
  nome: true,
  email: true,
  telefone: true,
  perfil: true,
  urlFoto: true,
  criadoEm: true,
}

export async function atualizarPerfil(
  prisma: PrismaClient,
  usuarioId: string,
  dados: { nome?: string; telefone?: string },
) {
  return prisma.usuario.update({ where: { id: usuarioId }, data: dados, select: camposPublicos })
}

export async function alterarSenha(
  prisma: PrismaClient,
  usuarioId: string,
  senhaAtual: string,
  novaSenha: string,
) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!usuario) throw { statusCode: 404, message: 'Usuário não encontrado' }

  const valida = await bcrypt.compare(senhaAtual, usuario.senhaHash)
  if (!valida) throw { statusCode: 401, message: 'Senha atual incorreta' }

  const senhaHash = await bcrypt.hash(novaSenha, 12)
  await prisma.usuario.update({ where: { id: usuarioId }, data: { senhaHash } })
}

export async function alterarEmail(
  prisma: PrismaClient,
  usuarioId: string,
  novoEmail: string,
  senha: string,
) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
  if (!usuario) throw { statusCode: 404, message: 'Usuário não encontrado' }

  const valida = await bcrypt.compare(senha, usuario.senhaHash)
  if (!valida) throw { statusCode: 401, message: 'Senha incorreta' }

  const emUso = await prisma.usuario.findFirst({ where: { email: novoEmail, NOT: { id: usuarioId } } })
  if (emUso) throw { statusCode: 409, message: 'Email já em uso' }

  return prisma.usuario.update({ where: { id: usuarioId }, data: { email: novoEmail }, select: camposPublicos })
}

export async function atualizarTokenFcm(prisma: PrismaClient, usuarioId: string, tokenFcm: string) {
  await prisma.usuario.update({ where: { id: usuarioId }, data: { tokenFcm } })
}
