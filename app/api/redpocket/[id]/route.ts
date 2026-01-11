import { type NextRequest, NextResponse } from "next/server"
import { API_CONFIG, BACKEND_ENDPOINTS } from "@/app/api/config"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params

    // Proxy to Go backend
    const response = await fetch(`${API_CONFIG.baseURL}${BACKEND_ENDPOINTS.getRedPocket(id)}`, {
      method: "GET",
      headers: API_CONFIG.headers,
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Get redpocket proxy error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to connect to backend service",
    }, { status: 500 })
  }
}
