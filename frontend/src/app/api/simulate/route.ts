/**
 * Day 6: Proxies simulation requests to Dev B's real FastAPI backend.
 * POST enqueues a Celery task, GET polls for the result.
 */
import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await fetch(`${API_URL}/api/v1/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: response.status })
    }

    return NextResponse.json(await response.json())
  } catch (error) {
    console.error('Simulate proxy error:', error)
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}
