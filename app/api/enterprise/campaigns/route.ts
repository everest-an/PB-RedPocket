import { type NextRequest, NextResponse } from "next/server"
import { API_CONFIG, BACKEND_ENDPOINTS } from "@/app/api/config"

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "10"

    // Get auth token from request headers
    const authHeader = request.headers.get("Authorization") || ""

    // Proxy to Go backend
    const response = await fetch(
      `${API_CONFIG.baseURL}${BACKEND_ENDPOINTS.getCampaigns}?page=${page}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          ...API_CONFIG.headers,
          Authorization: authHeader,
        },
      }
    )

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Get campaigns proxy error:", error)
    return NextResponse.json({
      success: false,
      campaigns: [],
      total: 0,
      error: "Failed to connect to backend service",
    })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const authHeader = request.headers.get("Authorization") || ""

    // Proxy to Go backend
    const response = await fetch(`${API_CONFIG.baseURL}${BACKEND_ENDPOINTS.getCampaigns}`, {
      method: "POST",
      headers: {
        ...API_CONFIG.headers,
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Create campaign proxy error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to connect to backend service",
    }, { status: 500 })
  }
}
