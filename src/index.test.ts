import { describe, it, expect } from 'vitest'
import { Response404, makeResponse } from './index.js'
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
    404: Response404
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

  it('returns 404 for malformed path params', async () => {
    const params: z.infer<typeof Params> = {
      thingId: 'xyz',
    }

    const request = new Request('http://localhost:3000/things/1', {
      method: 'post',
      headers: {
        'content-type': 'application/json',
      },
    })

    const response = await makeResponse(routeConfig, params, request, async ({body, respond}) => {
      return respond(body, 200)
    })
    expect(response.status).toEqual(404)
  })
})