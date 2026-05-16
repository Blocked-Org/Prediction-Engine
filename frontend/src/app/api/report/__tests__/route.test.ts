/**
 * @jest-environment node
 */
import { POST } from '../route'

jest.mock('ai', () => ({
  streamText: jest.fn(() => ({
    toTextStreamResponse: jest.fn(() => new Response('mocked-stream', { status: 200 }))
  }))
}))

// Mock Google Provider
jest.mock('@ai-sdk/google', () => ({
  google: jest.fn()
}))

// Mock @ai-sdk/openai-compatible (Ollama provider)
jest.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: jest.fn(() => jest.fn())
}))

// Mock LlamaIndex
jest.mock('llamaindex', () => ({
  Document: class {
    text: string;
    constructor({ text }: { text: string }) {
      this.text = text;
    }
  }
}))

describe('Executive Report API Route', () => {
  it('should return a valid stream response for cloud provider', async () => {
    const mockRequest = new Request('http://localhost:3000/api/report', {
      method: 'POST',
      body: JSON.stringify({
        simulationData: { revenue: 1000 },
        locale: 'en',
        provider: 'cloud'
      })
    })

    const response = await POST(mockRequest)
    
    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)
  })

  it('should handle offline provider properly', async () => {
    const mockRequest = new Request('http://localhost:3000/api/report', {
      method: 'POST',
      body: JSON.stringify({
        simulationData: { revenue: 5000 },
        locale: 'bn',
        provider: 'offline'
      })
    })

    const response = await POST(mockRequest)
    
    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)
  })
})
