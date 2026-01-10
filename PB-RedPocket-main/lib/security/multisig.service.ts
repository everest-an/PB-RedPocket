/**
 * @fileoverview Multi-Signature Service
 * @description Multi-signature wallet management for enterprises
 * @module lib/security/multisig
 */

import {
  MultiSigWallet,
  MultiSigTransaction,
  MultiSigSignature,
} from './types';

// ============================================================================
// Mock Data Store
// ============================================================================

interface MultiSigStore {
  wallets: Map<string, MultiSigWallet>;
  transactions: Map<string, MultiSigTransaction>;
}

const store: MultiSigStore = {
  wallets: new Map(),
  transactions: new Map(),
};

// ============================================================================
// Multi-Signature Service
// ============================================================================

export class MultiSigService {
  /**
   * Create a new multi-sig wallet
   * @param enterpriseId - Enterprise ID
   * @param signers - Array of signer addresses
   * @param threshold - Required signatures
   * @returns Created wallet
   */
  async createWallet(
    enterpriseId: string,
    signers: string[],
    threshold: number
  ): Promise<MultiSigWallet> {
    // Validate inputs
    if (signers.length < 2) {
      throw new Error('At least 2 signers required');
    }

    if (threshold < 1 || threshold > signers.length) {
      throw new Error('Invalid threshold');
    }

    // Check for duplicate signers
    const uniqueSigners = new Set(signers);
    if (uniqueSigners.size !== signers.length) {
      throw new Error('Duplicate signers not allowed');
    }

    const wallet: MultiSigWallet = {
      id: this.generateWalletId(),
      enterpriseId,
      address: this.generateAddress(),
      signers: [...signers],
      threshold,
      createdAt: new Date(),
    };

    store.wallets.set(wallet.id, wallet);
    return wallet;
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string): Promise<MultiSigWallet | null> {
    return store.wallets.get(walletId) || null;
  }

  /**
   * Add signer to wallet
   */
  async addSigner(walletId: string, newSigner: string): Promise<MultiSigWallet> {
    const wallet = store.wallets.get(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.signers.includes(newSigner)) {
      throw new Error('Signer already exists');
    }

    wallet.signers.push(newSigner);
    return wallet;
  }

  /**
   * Remove signer from wallet
   */
  async removeSigner(walletId: string, signer: string): Promise<MultiSigWallet> {
    const wallet = store.wallets.get(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const index = wallet.signers.indexOf(signer);
    if (index === -1) {
      throw new Error('Signer not found');
    }

    // Ensure we maintain minimum signers for threshold
    if (wallet.signers.length - 1 < wallet.threshold) {
      throw new Error('Cannot remove signer: would violate threshold');
    }

    wallet.signers.splice(index, 1);
    return wallet;
  }

  /**
   * Update threshold
   */
  async updateThreshold(walletId: string, newThreshold: number): Promise<MultiSigWallet> {
    const wallet = store.wallets.get(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (newThreshold < 1 || newThreshold > wallet.signers.length) {
      throw new Error('Invalid threshold');
    }

    wallet.threshold = newThreshold;
    return wallet;
  }


  // ==========================================================================
  // Transaction Management
  // ==========================================================================

  /**
   * Create a new transaction
   */
  async createTransaction(
    walletId: string,
    to: string,
    value: string,
    data: string = '0x'
  ): Promise<MultiSigTransaction> {
    const wallet = store.wallets.get(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Get next nonce
    const existingTxs = Array.from(store.transactions.values())
      .filter(tx => tx.walletId === walletId);
    const nonce = existingTxs.length;

    const transaction: MultiSigTransaction = {
      id: this.generateTxId(),
      walletId,
      to,
      value,
      data,
      nonce,
      signatures: [],
      status: 'pending',
      createdAt: new Date(),
    };

    store.transactions.set(transaction.id, transaction);
    return transaction;
  }

  /**
   * Sign a transaction
   */
  async signTransaction(
    txId: string,
    signer: string,
    signature: string
  ): Promise<MultiSigTransaction> {
    const transaction = store.transactions.get(txId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not pending');
    }

    const wallet = store.wallets.get(transaction.walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Verify signer is authorized
    if (!wallet.signers.includes(signer)) {
      throw new Error('Unauthorized signer');
    }

    // Check if already signed
    if (transaction.signatures.some(s => s.signer === signer)) {
      throw new Error('Already signed by this signer');
    }

    // Add signature
    const sig: MultiSigSignature = {
      signer,
      signature,
      signedAt: new Date(),
    };
    transaction.signatures.push(sig);

    return transaction;
  }

  /**
   * Execute a transaction if threshold is met
   */
  async executeTransaction(txId: string): Promise<MultiSigTransaction> {
    const transaction = store.transactions.get(txId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not pending');
    }

    const wallet = store.wallets.get(transaction.walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Check threshold
    if (transaction.signatures.length < wallet.threshold) {
      throw new Error(`Insufficient signatures: ${transaction.signatures.length}/${wallet.threshold}`);
    }

    // Execute transaction (mock)
    transaction.status = 'executed';
    transaction.executedAt = new Date();

    return transaction;
  }

  /**
   * Cancel a pending transaction
   */
  async cancelTransaction(txId: string): Promise<MultiSigTransaction> {
    const transaction = store.transactions.get(txId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not pending');
    }

    transaction.status = 'cancelled';
    return transaction;
  }

  /**
   * Get pending transactions for wallet
   */
  async getPendingTransactions(walletId: string): Promise<MultiSigTransaction[]> {
    return Array.from(store.transactions.values())
      .filter(tx => tx.walletId === walletId && tx.status === 'pending');
  }

  /**
   * Check if transaction can be executed
   */
  canExecute(transaction: MultiSigTransaction, wallet: MultiSigWallet): boolean {
    return transaction.status === 'pending' && 
           transaction.signatures.length >= wallet.threshold;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private generateWalletId(): string {
    return `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTxId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAddress(): string {
    return '0x' + Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  /**
   * Clear store (for testing only)
   */
  clearStore(): void {
    store.wallets.clear();
    store.transactions.clear();
  }
}

// Export singleton instance
export const multiSigService = new MultiSigService();
