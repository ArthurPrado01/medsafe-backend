import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwtPlugin from '@fastify/jwt'
import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import { authRoutes } from './modules/auth/auth.routes'
import { medicationRoutes } from './modules/medications/medications.routes'
import { userRoutes } from './modules/users/users.routes'
import { caregiverRoutes } from './modules/caregiver/caregiver.routes'
import { adminRoutes } from './modules/admin/admin.routes'

const server = Fastify({ logger: true })

// Prisma
server.register(
  fp(async (fastify) => {
    const prisma = new PrismaClient()
    await prisma.$connect()
    fastify.decorate('prisma', prisma)
    fastify.addHook('onClose', async () => prisma.$disconnect())
  }),
)

// JWT
server.register(jwtPlugin, {
  secret: process.env.JWT_SECRET || 'medsafe-dev-secret-troque-em-producao',
})

// CORS
server.register(cors, { origin: true })

// Decorator de autenticação reutilizado em todas as rotas protegidas
server.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

// Health check
server.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}))

// Rotas
server.register(authRoutes, { prefix: '/auth' })
server.register(medicationRoutes, { prefix: '/medications' })
server.register(userRoutes, { prefix: '/users' })
server.register(caregiverRoutes, { prefix: '/caregiver' })
server.register(adminRoutes, { prefix: '/admin' })

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000')
    await server.listen({ port, host: '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
