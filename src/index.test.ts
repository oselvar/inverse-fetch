import { describe, it, expect } from 'vitest'
import { makeResponse } from './index.js'
import { RouteConfig } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

const Params = z.object({
  thingId: z.string().regex(/[\d]+/),
})

const Thing = z.object({
  name: z.string(),
  description: z.string(),
})

const routeConfig: RouteConfig = {
  method: 'post',
  path: '/things/{thingId}',
  request: {
    params: Params,
    body: {
      content: {
        'application/json': {
          schema: Thing,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Create a thing',
      content: {
        'application/json': {
          schema: Thing,
        },
      },
    },
  },
}

describe('makeResponse', () => {
  it('validates request and response', async () => {
    const params: z.infer<typeof Params> = {
      thingId: '1',
    }

    const thing: z.infer<typeof Thing> = {
      name: 'My thing',
      description: 'The best thing ever',
    }

    const request = new Request('http://localhost:3000/things/1', {
      method: 'post',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(thing),
    })

    const response = await makeResponse(routeConfig, params, request, async ({body, respond}) => {
      return respond(body, 200)
    })
    const responseBody = await response.json()
    expect(responseBody).toEqual(thing)
  })
})