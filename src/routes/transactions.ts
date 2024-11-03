import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'

export async function transactionRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    const transactions = await knex('transactions').select()
    return { transactions }
  })

  app.get('/:id', async (request) => {
    const getTransactionParamSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = getTransactionParamSchema.parse(request.params)

    const transaction = await knex('transactions').where('id', id).first()

    return { transaction }
  })

  app.post('/', async (request, replu) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit'])
    })

    const { amount, title, type } = createTransactionBodySchema.parse(request.body)

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,

    })

    return replu.status(201).send()
  })
}