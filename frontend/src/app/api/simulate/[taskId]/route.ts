/**
 * Day 6: Polls Celery task status from Dev B's FastAPI backend.
 */
import { NextResponse, NextRequest } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    const response = await fetch(`${API_URL}/api/v1/task/${taskId}`)

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error }, { status: response.status })
    }

    return NextResponse.json(await response.json())
  } catch (error) {
    console.error('Task poll error:', error)
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}
