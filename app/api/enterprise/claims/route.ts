import { type NextRequest, NextResponse } from "next/server"
import { API_CONFIG, BACKEND_ENDPOINTS } from "@/app/api/config"

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "10"
    const campaignId = searchParams.get("campaignId") || ""

    const authHeader = request.headers.get("Authorization") || ""

    // Proxy to Go backend
    const response = await fetch(
      `${API_CONFIG.baseURL}${BACKEND_ENDPOINTS.getClaims}?page=${page}&limit=${limit}&campaignId=${campaignId}`,
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
    console.error("Get claims proxy error:", error)
    return NextResponse.json({
      success: false,
      claims: [],
      total: 0,
      error: "Failed to connect to backend service",
    })
  }
}
