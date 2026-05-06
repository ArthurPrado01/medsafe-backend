import { FastifyPluginAsync } from 'fastify'
import { linkElderlySchema } from './caregiver.schema'
import {
  listarIdosos,
  vincularIdoso,
  desvincularIdoso,
  buscarMedicamentosIdoso,
  buscarHistoricoIdoso,
  buscarAlertasCuidador,
} from './caregiver.service'

export const caregiverRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /caregiver/elderlies — lista idosos com stats do dia
  fastify.get('/elderlies', async (request, reply) => {
    const idosos = await listarIdosos(fastify.prisma, request.user.sub)
    return reply.send(idosos)
  })

  // POST /caregiver/link — vincula paciente pelo email
  fastify.post('/link', { schema: linkElderlySchema }, async (request, reply) => {
    const { elderlyEmail } = request.body as { elderlyEmail: string }
    try {
      const relacao = await vincularIdoso(fastify.prisma, request.user.sub, elderlyEmail)
      return reply.status(201).send(relacao)
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // DELETE /caregiver/elderlies/:relacaoId — desvincula paciente
  fastify.delete('/elderlies/:relacaoId', async (request, reply) => {
    const { relacaoId } = request.params as { relacaoId: string }
    try {
      await desvincularIdoso(fastify.prisma, request.user.sub, relacaoId)
      return reply.status(204).send()
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // GET /caregiver/elderlies/:idosoId/medications
  fastify.get('/elderlies/:idosoId/medications', async (request, reply) => {
    const { idosoId } = request.params as { idosoId: string }
    try {
      const medicamentos = await buscarMedicamentosIdoso(fastify.prisma, request.user.sub, idosoId)
      return reply.send(medicamentos)
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // GET /caregiver/elderlies/:idosoId/history?startDate=&endDate=
  fastify.get('/elderlies/:idosoId/history', async (request, reply) => {
    const { idosoId } = request.params as { idosoId: string }
    const { startDate, endDate } = request.query as any
    try {
      const historico = await buscarHistoricoIdoso(
        fastify.prisma,
        request.user.sub,
        idosoId,
        startDate,
        endDate,
      )
      return reply.send(historico)
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // GET /caregiver/alerts — doses atrasadas nas últimas 24h
  fastify.get('/alerts', async (request, reply) => {
    const alertas = await buscarAlertasCuidador(fastify.prisma, request.user.sub)
    return reply.send(alertas)
  })
}
