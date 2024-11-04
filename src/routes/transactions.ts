import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { checkSessionExists } from '../middlewares/check-session-id-exists'

export async function transactionRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [checkSessionExists] }, async (request) => {
    const { sessionId } = request.cookies
    const transactions = await knex('transactions').where('session_id', sessionId).select()
    return { transactions }
  })

  app.get('/:id', { preHandler: [checkSessionExists] }, async (request) => {
    const getTransactionParamSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = getTransactionParamSchema.parse(request.params)

    const { sessionId } = request.cookies

    const transaction = await knex('transactions').where({
      session_id: sessionId,
      id
    }).first()

    return { transaction }
  })

  app.get('/summary', { preHandler: [checkSessionExists] }, async (request) => {
    const { sessionId } = request.cookies
    const summary = await knex('transactions').where('session_id', sessionId).sum('amount', { as: 'amount' }).first()
    console.log(summary?.amount)
    return { summary }
  })

  app.post('/', async (request, replu) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit'])
    })

    const { amount, title, type } = createTransactionBodySchema.parse(request.body)

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      replu.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId
    })

    return replu.status(201).send()
  })
}