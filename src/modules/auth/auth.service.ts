import { PrismaClient, Perfil } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'
import { sendPasswordResetEmail } from '../../utils/email'

function gerarCodigo(): string {
  return randomInt(100000, 1000000).toString()
}

function usuarioPublico(usuario: any) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone ?? null,
    perfil: usuario.perfil,
    urlFoto: usuario.urlFoto ?? null,
  }
}

export async function loginService(prisma: PrismaClient, email: string, senha: string) {
  const usuario = await prisma.usuario.findFirst({ where: { email, deletadoEm: null } })
  if (!usuario) throw { statusCode: 401, message: 'Credenciais inválidas' }

  const valida = await bcrypt.compare(senha, usuario.senhaHash)
  if (!valida) throw { statusCode: 401, message: 'Credenciais inválidas' }

  return usuarioPublico(usuario)
}

export async function registrarService(
  prisma: PrismaClient,
  dados: { nome: string; email: string; senha: string; telefone?: string; perfil: Perfil },
) {
  const existente = await prisma.usuario.findUnique({ where: { email: dados.email } })
  if (existente) throw { statusCode: 409, message: 'Email já cadastrado' }

  const senhaHash = await bcrypt.hash(dados.senha, 12)

  const usuario = await prisma.usuario.create({
    data: {
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone,
      perfil: dados.perfil,
      senhaHash,
    },
  })

  return usuarioPublico(usuario)
}

export async function esqueceuSenhaService(prisma: PrismaClient, email: string) {
  const usuario = await prisma.usuario.findFirst({ where: { email, deletadoEm: null } })
  if (!usuario) return // Não revela se o email existe

  const codigo = gerarCodigo()
  const expiraEm = new Date(Date.now() + 15 * 60 * 1000)

  await prisma.redefinicaoSenha.create({
    data: { usuarioId: usuario.id, codigo, expiraEm },
  })

  await sendPasswordResetEmail(email, usuario.nome, codigo)
}

export async function verificarCodigoService(prisma: PrismaClient, email: string, codigo: string) {
  const usuario = await prisma.usuario.findFirst({ where: { email, deletadoEm: null } })
  if (!usuario) throw { statusCode: 400, message: 'Código inválido ou expirado' }

  const redefinicao = await prisma.redefinicaoSenha.findFirst({
    where: {
      usuarioId: usuario.id,
      codigo,
      usadoEm: null,
      expiraEm: { gt: new Date() },
    },
    orderBy: { criadoEm: 'desc' },
  })

  if (!redefinicao) throw { statusCode: 400, message: 'Código inválido ou expirado' }
}

export async function redefinirSenhaService(
  prisma: PrismaClient,
  email: string,
  codigo: string,
  novaSenha: string,
) {
  const usuario = await prisma.usuario.findFirst({ where: { email, deletadoEm: null } })
  if (!usuario) throw { statusCode: 400, message: 'Código inválido ou expirado' }

  const redefinicao = await prisma.redefinicaoSenha.findFirst({
    where: {
      usuarioId: usuario.id,
      codigo,
      usadoEm: null,
      expiraEm: { gt: new Date() },
    },
    orderBy: { criadoEm: 'desc' },
  })

  if (!redefinicao) throw { statusCode: 400, message: 'Código inválido ou expirado' }

  const senhaHash = await bcrypt.hash(novaSenha, 12)

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: usuario.id }, data: { senhaHash } }),
    prisma.redefinicaoSenha.update({ where: { id: redefinicao.id }, data: { usadoEm: new Date() } }),
  ])
}
