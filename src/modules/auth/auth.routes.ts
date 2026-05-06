import { FastifyPluginAsync } from 'fastify'
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  verifyCodeSchema,
  resetPasswordSchema,
} from './auth.schema'
import {
  loginService,
  registrarService,
  esqueceuSenhaService,
  verificarCodigoService,
  redefinirSenhaService,
} from './auth.service'

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/login
  fastify.post('/login', { schema: loginSchema }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }
    try {
      const usuario = await loginService(fastify.prisma, email, password)
      const token = fastify.jwt.sign({ sub: usuario.id, perfil: usuario.perfil }, { expiresIn: '7d' })
      return reply.send({ token, usuario })
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // POST /auth/register
  fastify.post('/register', { schema: registerSchema }, async (request, reply) => {
    const corpo = request.body as any
    try {
      const usuario = await registrarService(fastify.prisma, {
        nome: corpo.name,
        email: corpo.email,
        senha: corpo.password,
        telefone: corpo.phone,
        perfil: corpo.role,
      })
      const token = fastify.jwt.sign({ sub: usuario.id, perfil: usuario.perfil }, { expiresIn: '7d' })
      return reply.status(201).send({ token, usuario })
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // GET /auth/me
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const usuario = await fastify.prisma.usuario.findFirst({
      where: { id: request.user.sub, deletadoEm: null },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        perfil: true,
        urlFoto: true,
        criadoEm: true,
      },
    })
    if (!usuario) return reply.status(404).send({ message: 'Usuário não encontrado' })
    return reply.send(usuario)
  })

  // POST /auth/forgot-password
  fastify.post('/forgot-password', { schema: forgotPasswordSchema }, async (request, reply) => {
    const { email } = request.body as { email: string }
    await esqueceuSenhaService(fastify.prisma, email)
    return reply.send({ message: 'Se o email existir, você receberá um código em breve.' })
  })

  // POST /auth/verify-code
  fastify.post('/verify-code', { schema: verifyCodeSchema }, async (request, reply) => {
    const { email, code } = request.body as { email: string; code: string }
    try {
      await verificarCodigoService(fastify.prisma, email, code)
      return reply.send({ valido: true })
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // POST /auth/reset-password
  fastify.post('/reset-password', { schema: resetPasswordSchema }, async (request, reply) => {
    const { email, code, newPassword } = request.body as {
      email: string
      code: string
      newPassword: string
    }
    try {
      await redefinirSenhaService(fastify.prisma, email, code, newPassword)
      return reply.send({ message: 'Senha redefinida com sucesso.' })
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })
}
