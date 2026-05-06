import { FastifyPluginAsync } from 'fastify'
import {
  updateProfileSchema,
  changePasswordSchema,
  changeEmailSchema,
  updateFcmTokenSchema,
} from './users.schema'
import { atualizarPerfil, alterarSenha, alterarEmail, atualizarTokenFcm } from './users.service'

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // PATCH /users/me — atualiza nome e telefone
  fastify.patch('/me', { schema: updateProfileSchema }, async (request, reply) => {
    const corpo = request.body as { name?: string; phone?: string }
    const usuario = await atualizarPerfil(fastify.prisma, request.user.sub, {
      nome: corpo.name,
      telefone: corpo.phone,
    })
    return reply.send(usuario)
  })

  // PATCH /users/me/password
  fastify.patch('/me/password', { schema: changePasswordSchema }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as {
      currentPassword: string
      newPassword: string
    }
    try {
      await alterarSenha(fastify.prisma, request.user.sub, currentPassword, newPassword)
      return reply.send({ message: 'Senha alterada com sucesso.' })
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // PATCH /users/me/email
  fastify.patch('/me/email', { schema: changeEmailSchema }, async (request, reply) => {
    const { newEmail, password } = request.body as { newEmail: string; password: string }
    try {
      const usuario = await alterarEmail(fastify.prisma, request.user.sub, newEmail, password)
      return reply.send(usuario)
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // PATCH /users/me/fcm-token
  fastify.patch('/me/fcm-token', { schema: updateFcmTokenSchema }, async (request, reply) => {
    const { fcmToken } = request.body as { fcmToken: string }
    await atualizarTokenFcm(fastify.prisma, request.user.sub, fcmToken)
    return reply.send({ message: 'Token FCM atualizado.' })
  })
}
