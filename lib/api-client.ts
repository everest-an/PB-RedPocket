import { API_CONFIG, BACKEND_ENDPOINTS } from "@/app/api/config"

class ApiClient {
  private baseURL: string
  private timeout: number

  constructor() {
    this.baseURL = API_CONFIG.baseURL
    this.timeout = API_CONFIG.timeout
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          ...API_CONFIG.headers,
          ...options.headers,
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout")
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" })
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }

  // RedPocket specific methods
  async createRedPocket(data: {
    amount: number
    token: string
    platform: string
    message: string
    totalCount: number
    isLuckyDraw: boolean
  }) {
    return this.post(BACKEND_ENDPOINTS.createRedPocket, data)
  }

  async claimRedPocket(id: string, userId: string) {
    return this.post(BACKEND_ENDPOINTS.claimRedPocket, { id, userId })
  }

  async getRedPocket(id: string) {
    return this.get(BACKEND_ENDPOINTS.getRedPocket(id))
  }

  async getUserWallet(userId: string) {
    return this.get(BACKEND_ENDPOINTS.getUserWallet(userId))
  }

  async requestWithdrawal(data: { userId: string; amount: number; address: string }) {
    return this.post(BACKEND_ENDPOINTS.requestWithdrawal, data)
  }

  async getCampaigns(params?: { page?: number; limit?: number }) {
    const query = params ? `?page=${params.page || 1}&limit=${params.limit || 10}` : ""
    return this.get(BACKEND_ENDPOINTS.getCampaigns + query)
  }

  async getClaims(params?: { page?: number; limit?: number }) {
    const query = params ? `?page=${params.page || 1}&limit=${params.limit || 10}` : ""
    return this.get(BACKEND_ENDPOINTS.getClaims + query)
  }

  async healthCheck() {
    return this.get(BACKEND_ENDPOINTS.health)
  }
}

export const apiClient = new ApiClient()
