import { FastifyPluginAsync } from 'fastify'
import { buscarMetricas, listarUsuarios, atualizarUsuario, desativarUsuario } from './admin.service'

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Verifica autenticação + perfil admin em todas as rotas do módulo
  fastify.addHook('preHandler', async (request, reply) => {
    await fastify.authenticate(request, reply)
    if (request.user?.perfil !== 'admin') {
      return reply.status(403).send({ message: 'Acesso restrito a administradores' })
    }
  })

  // GET /admin/metrics
  fastify.get('/metrics', async (_request, reply) => {
    const metricas = await buscarMetricas(fastify.prisma)
    return reply.send(metricas)
  })

  // GET /admin/users?perfil=&pagina=&limite=
  fastify.get('/users', async (request, reply) => {
    const { perfil, pagina, limite } = request.query as any
    const resultado = await listarUsuarios(
      fastify.prisma,
      perfil,
      parseInt(pagina || '1'),
      parseInt(limite || '20'),
    )
    return reply.send(resultado)
  })

  // PATCH /admin/users/:id
  fastify.patch('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const usuario = await atualizarUsuario(fastify.prisma, id, request.body as any)
      return reply.send(usuario)
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // DELETE /admin/users/:id — soft delete
  fastify.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await desativarUsuario(fastify.prisma, id)
      return reply.status(204).send()
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })
}
