/**
 * @fileoverview Withdrawal Service
 * @description Handle user withdrawals to wallets and fiat off-ramps
 * @module lib/portal/withdrawal
 */

import {
  WithdrawalType,
  WithdrawalStatus,
  WithdrawalRequest,
  WithdrawalOptions,
  WithdrawalFeeEstimate,
  FiatProvider,
  FiatQuote,
} from './types';

// ============================================================================
// Mock Data Store
// ============================================================================

interface WithdrawalStore {
  requests: Map<string, WithdrawalRequest>;
  userBalances: Map<string, Map<string, number>>; // userId -> tokenSymbol -> balance
}

const store: WithdrawalStore = {
  requests: new Map(),
  userBalances: new Map(),
};

// Mock fiat providers
const fiatProviders: FiatProvider[] = [
  {
    id: 'moonpay',
    name: 'MoonPay',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CNY'],
    supportedTokens: ['USDT', 'USDC', 'ETH'],
    minAmount: 20,
    maxAmount: 50000,
    feePercentage: 1.5,
    estimatedTime: '1-3 business days',
  },
  {
    id: 'transak',
    name: 'Transak',
    supportedCurrencies: ['USD', 'EUR', 'INR', 'CNY'],
    supportedTokens: ['USDT', 'USDC', 'ETH', 'DOT'],
    minAmount: 10,
    maxAmount: 25000,
    feePercentage: 2.0,
    estimatedTime: '1-2 business days',
  },
];

// ============================================================================
// Withdrawal Service
// ============================================================================

export class WithdrawalService {
  /**
   * Estimate withdrawal fees
   * @param options - Withdrawal options
   * @returns Fee estimate
   */
  async estimateFees(options: WithdrawalOptions): Promise<WithdrawalFeeEstimate> {
    let gasFee = 0;
    let platformFee = 0;
    let bridgeFee = 0;
    let estimatedTime = '5-10 minutes';

    switch (options.type) {
      case WithdrawalType.WALLET:
        // Gas fee depends on chain
        gasFee = this.estimateGasFee(options.chainId || 1);
        platformFee = options.amount * 0.001; // 0.1% platform fee
        estimatedTime = '5-10 minutes';
        break;

      case WithdrawalType.FIAT:
        // Fiat off-ramp fees
        const provider = fiatProviders.find(p => 
          p.supportedTokens.includes(options.tokenSymbol) &&
          p.supportedCurrencies.includes(options.fiatCurrency || 'USD')
        );
        if (provider) {
          platformFee = options.amount * (provider.feePercentage / 100);
          estimatedTime = provider.estimatedTime;
        } else {
          platformFee = options.amount * 0.02; // Default 2%
          estimatedTime = '2-5 business days';
        }
        break;

      case WithdrawalType.INTERNAL:
        // Internal transfers are free
        platformFee = 0;
        estimatedTime = 'Instant';
        break;
    }

    const totalFee = gasFee + platformFee + bridgeFee;

    return {
      gasFee,
      platformFee,
      bridgeFee,
      totalFee,
      netAmount: options.amount - totalFee,
      estimatedTime,
    };
  }


  /**
   * Create withdrawal request
   * @param userId - User ID
   * @param options - Withdrawal options
   * @returns Withdrawal request
   */
  async createWithdrawal(userId: string, options: WithdrawalOptions): Promise<WithdrawalRequest> {
    // Validate balance
    const balance = this.getUserBalance(userId, options.tokenSymbol);
    if (balance < options.amount) {
      throw new Error('Insufficient balance');
    }

    // Validate minimum amount
    if (options.amount < 1) {
      throw new Error('Amount below minimum');
    }

    // Estimate fees
    const feeEstimate = await this.estimateFees(options);

    if (feeEstimate.netAmount <= 0) {
      throw new Error('Amount too small to cover fees');
    }

    // Create request
    const request: WithdrawalRequest = {
      id: this.generateRequestId(),
      userId,
      type: options.type,
      amount: options.amount,
      tokenSymbol: options.tokenSymbol,
      chainId: options.chainId || 1,
      destination: options.destination,
      status: WithdrawalStatus.PENDING,
      fee: feeEstimate.totalFee,
      netAmount: feeEstimate.netAmount,
      createdAt: new Date(),
    };

    // Deduct from balance
    this.deductBalance(userId, options.tokenSymbol, options.amount);

    store.requests.set(request.id, request);

    // Process withdrawal asynchronously
    this.processWithdrawal(request.id);

    return request;
  }

  /**
   * Get withdrawal request by ID
   */
  async getWithdrawal(requestId: string): Promise<WithdrawalRequest | null> {
    return store.requests.get(requestId) || null;
  }

  /**
   * Get user's withdrawal history
   */
  async getUserWithdrawals(
    userId: string,
    options?: { status?: WithdrawalStatus; limit?: number; offset?: number }
  ): Promise<{ requests: WithdrawalRequest[]; total: number }> {
    let requests = Array.from(store.requests.values())
      .filter(r => r.userId === userId);

    if (options?.status) {
      requests = requests.filter(r => r.status === options.status);
    }

    const total = requests.length;

    // Sort by date descending
    requests = requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    requests = requests.slice(offset, offset + limit);

    return { requests, total };
  }

  /**
   * Cancel pending withdrawal
   */
  async cancelWithdrawal(requestId: string, userId: string): Promise<WithdrawalRequest> {
    const request = store.requests.get(requestId);
    if (!request) {
      throw new Error('Withdrawal request not found');
    }

    if (request.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (request.status !== WithdrawalStatus.PENDING) {
      throw new Error('Can only cancel pending withdrawals');
    }

    // Refund balance
    this.addBalance(userId, request.tokenSymbol, request.amount);

    request.status = WithdrawalStatus.CANCELLED;

    return request;
  }

  // ==========================================================================
  // Fiat Off-Ramp
  // ==========================================================================

  /**
   * Get available fiat providers
   */
  async getFiatProviders(tokenSymbol: string, fiatCurrency: string): Promise<FiatProvider[]> {
    return fiatProviders.filter(p =>
      p.supportedTokens.includes(tokenSymbol) &&
      p.supportedCurrencies.includes(fiatCurrency)
    );
  }

  /**
   * Get fiat quote from provider
   */
  async getFiatQuote(
    providerId: string,
    tokenAmount: number,
    tokenSymbol: string,
    fiatCurrency: string
  ): Promise<FiatQuote> {
    const provider = fiatProviders.find(p => p.id === providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    if (!provider.supportedTokens.includes(tokenSymbol)) {
      throw new Error('Token not supported by provider');
    }

    if (!provider.supportedCurrencies.includes(fiatCurrency)) {
      throw new Error('Currency not supported by provider');
    }

    // Mock exchange rates
    const tokenPrices: Record<string, number> = {
      USDT: 1.0,
      USDC: 1.0,
      ETH: 1800,
      DOT: 4.5,
    };

    const fiatRates: Record<string, number> = {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.79,
      CNY: 7.2,
      INR: 83.0,
    };

    const tokenPrice = tokenPrices[tokenSymbol] || 1;
    const fiatRate = fiatRates[fiatCurrency] || 1;
    const exchangeRate = tokenPrice * fiatRate;

    const grossAmount = tokenAmount * exchangeRate;
    const fee = grossAmount * (provider.feePercentage / 100);

    return {
      providerId,
      tokenAmount,
      tokenSymbol,
      fiatAmount: grossAmount - fee,
      fiatCurrency,
      exchangeRate,
      fee,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };
  }


  // ==========================================================================
  // Balance Management
  // ==========================================================================

  /**
   * Get user balance for token
   */
  getUserBalance(userId: string, tokenSymbol: string): number {
    const userBalances = store.userBalances.get(userId);
    if (!userBalances) return 0;
    return userBalances.get(tokenSymbol) || 0;
  }

  /**
   * Add balance to user
   */
  addBalance(userId: string, tokenSymbol: string, amount: number): void {
    let userBalances = store.userBalances.get(userId);
    if (!userBalances) {
      userBalances = new Map();
      store.userBalances.set(userId, userBalances);
    }

    const current = userBalances.get(tokenSymbol) || 0;
    userBalances.set(tokenSymbol, current + amount);
  }

  /**
   * Deduct balance from user
   */
  private deductBalance(userId: string, tokenSymbol: string, amount: number): void {
    const userBalances = store.userBalances.get(userId);
    if (!userBalances) {
      throw new Error('No balance found');
    }

    const current = userBalances.get(tokenSymbol) || 0;
    if (current < amount) {
      throw new Error('Insufficient balance');
    }

    userBalances.set(tokenSymbol, current - amount);
  }

  // ==========================================================================
  // Withdrawal Processing
  // ==========================================================================

  /**
   * Process withdrawal (async)
   */
  private async processWithdrawal(requestId: string): Promise<void> {
    const request = store.requests.get(requestId);
    if (!request) return;

    // Update status to processing
    request.status = WithdrawalStatus.PROCESSING;

    try {
      // Simulate processing delay
      await this.delay(100);

      switch (request.type) {
        case WithdrawalType.WALLET:
          await this.processWalletWithdrawal(request);
          break;
        case WithdrawalType.FIAT:
          await this.processFiatWithdrawal(request);
          break;
        case WithdrawalType.INTERNAL:
          await this.processInternalTransfer(request);
          break;
      }

      request.status = WithdrawalStatus.COMPLETED;
      request.processedAt = new Date();
      request.txHash = this.generateTxHash();

    } catch (error) {
      request.status = WithdrawalStatus.FAILED;
      request.failureReason = error instanceof Error ? error.message : 'Unknown error';

      // Refund balance on failure
      this.addBalance(request.userId, request.tokenSymbol, request.amount);
    }
  }

  /**
   * Process wallet withdrawal
   */
  private async processWalletWithdrawal(request: WithdrawalRequest): Promise<void> {
    // TODO: Implement actual blockchain transaction
    // 1. Get user's AA wallet
    // 2. Create UserOperation for transfer
    // 3. Submit to bundler
    // 4. Wait for confirmation
    console.log(`Processing wallet withdrawal ${request.id} to ${request.destination}`);
  }

  /**
   * Process fiat off-ramp
   */
  private async processFiatWithdrawal(request: WithdrawalRequest): Promise<void> {
    // TODO: Implement actual fiat off-ramp
    // 1. Call provider API to initiate withdrawal
    // 2. Transfer tokens to provider's address
    // 3. Track fiat transfer status
    console.log(`Processing fiat withdrawal ${request.id} to ${request.destination}`);
  }

  /**
   * Process internal transfer
   */
  private async processInternalTransfer(request: WithdrawalRequest): Promise<void> {
    // Add balance to recipient
    this.addBalance(request.destination, request.tokenSymbol, request.netAmount);
    console.log(`Processing internal transfer ${request.id} to user ${request.destination}`);
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private estimateGasFee(chainId: number): number {
    // Mock gas fees by chain
    const gasFees: Record<number, number> = {
      1: 5,      // Ethereum mainnet
      137: 0.1,  // Polygon
      42161: 0.5, // Arbitrum
      10: 0.3,   // Optimism
    };
    return gasFees[chainId] || 1;
  }

  private generateRequestId(): string {
    return `wd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTxHash(): string {
    return '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear store (for testing only)
   */
  clearStore(): void {
    store.requests.clear();
    store.userBalances.clear();
  }
}

// Export singleton instance
export const withdrawalService = new WithdrawalService();
