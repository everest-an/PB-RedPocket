import { type NextRequest, NextResponse } from "next/server"
import { API_CONFIG, BACKEND_ENDPOINTS } from "@/app/api/config"

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()

    // Proxy to Go backend
    const response = await fetch(`${API_CONFIG.baseURL}${BACKEND_ENDPOINTS.createRedPocket}`, {
      method: "POST",
      headers: API_CONFIG.headers,
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Create proxy error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to connect to backend service",
    }, { status: 500 })
  }
}
