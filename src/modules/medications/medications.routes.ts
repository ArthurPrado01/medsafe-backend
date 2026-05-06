import { FastifyPluginAsync } from 'fastify'
import { createMedicationSchema, updateMedicationSchema } from './medications.schema'
import {
  listarMedicamentos,
  buscarMedicamento,
  criarMedicamento,
  atualizarMedicamento,
  removerMedicamento,
  confirmarDose,
  atualizarEstoque,
  buscarHistorico,
} from './medications.service'

export const medicationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)

  // GET /medications
  fastify.get('/', async (request, reply) => {
    const medicamentos = await listarMedicamentos(fastify.prisma, request.user.sub)
    return reply.send(medicamentos)
  })

  // GET /medications/:id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const med = await buscarMedicamento(fastify.prisma, id, request.user.sub)
      return reply.send(med)
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // POST /medications
  fastify.post('/', { schema: createMedicationSchema }, async (request, reply) => {
    const corpo = request.body as any
    try {
      const med = await criarMedicamento(fastify.prisma, request.user.sub, {
        nome: corpo.name,
        dose: corpo.dose,
        horario: corpo.time,
        frequencia: corpo.frequency,
        intervaloAlerta: corpo.alertInterval,
        maximoTentativas: corpo.maxAttempts,
        nomeCuidador: corpo.caregiverName,
        telefoneCuidador: corpo.caregiverPhone,
        estoqueRestante: corpo.stockRemaining,
      })
      return reply.status(201).send(med)
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // PUT /medications/:id
  fastify.put('/:id', { schema: updateMedicationSchema }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const corpo = request.body as any
    try {
      const med = await atualizarMedicamento(fastify.prisma, id, request.user.sub, {
        nome: corpo.name,
        dose: corpo.dose,
        horario: corpo.time,
        frequencia: corpo.frequency,
        intervaloAlerta: corpo.alertInterval,
        maximoTentativas: corpo.maxAttempts,
        nomeCuidador: corpo.caregiverName,
        telefoneCuidador: corpo.caregiverPhone,
        estoqueRestante: corpo.stockRemaining,
      })
      return reply.send(med)
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // DELETE /medications/:id
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await removerMedicamento(fastify.prisma, id, request.user.sub)
      return reply.status(204).send()
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // PATCH /medications/:id/confirm — confirma dose tomada
  fastify.patch('/:id/confirm', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const evento = await confirmarDose(fastify.prisma, id, request.user.sub)
      return reply.send(evento)
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // PATCH /medications/:id/stock — atualiza estoque manualmente
  fastify.patch('/:id/stock', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { stockRemaining } = request.body as { stockRemaining: number }
    try {
      const med = await atualizarEstoque(fastify.prisma, id, request.user.sub, stockRemaining)
      return reply.send(med)
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message })
    }
  })

  // GET /medications/history?medicationId=&startDate=&endDate=
  fastify.get('/history', async (request, reply) => {
    const { medicationId, startDate, endDate } = request.query as any
    const historico = await buscarHistorico(
      fastify.prisma,
      request.user.sub,
      medicationId,
      startDate,
      endDate,
    )
    return reply.send(historico)
  })
}
