import type { Env } from '../types'

export function createResponse(data: any, status: number = 200, headers: any = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

export function createErrorResponse(message: string, status: number = 400, headers: any = {}) {
  return createResponse({ error: message }, status, headers)
}

export function createSuccessResponse(data: any, headers: any = {}) {
  return createResponse({ success: true, data }, 200, headers)
}

export function handleCors(request: Request, headers: any) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: {
        ...headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  }
  return null
}
