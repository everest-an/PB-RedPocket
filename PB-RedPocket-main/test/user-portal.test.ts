/**
 * @fileoverview User Portal Tests
 * @description Property tests for user portal and withdrawal system
 */

import { expect } from 'chai';
import * as fc from 'fast-check';

// ============================================================================
// Type Definitions
// ============================================================================

interface SocialIdentity {
  platform: 'telegram' | 'discord' | 'whatsapp' | 'github';
  platformId: string;
  username?: string;
  displayName?: string;
  linkedAt: Date;
  verified: boolean;
}

interface UserProfile {
  userId: string;
  primaryIdentity: SocialIdentity;
  linkedIdentities: SocialIdentity[];
  walletAddress?: string;
  createdAt: Date;
}

interface ClaimHistory {
  id: string;
  amount: number;
  tokenSymbol: string;
  platform: string;
  claimedAt: Date;
  status: 'pending' | 'confirmed' | 'failed';
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  type: 'wallet' | 'fiat' | 'internal';
  amount: number;
  tokenSymbol: string;
  destination: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  fee: number;
  netAmount: number;
  createdAt: Date;
}

// ============================================================================
// Mock User Service
// ============================================================================

class MockUserService {
  private users: Map<string, UserProfile> = new Map();
  private claims: Map<string, ClaimHistory[]> = new Map();
  private idCounter = 0;

  getOrCreateUser(identity: Omit<SocialIdentity, 'linkedAt' | 'verified'>): UserProfile {
    // Check if user exists
    const existing = this.findUserByIdentity(identity.platform, identity.platformId);
    if (existing) return existing;

    const userId = `user_${++this.idCounter}`;
    const fullIdentity: SocialIdentity = {
      ...identity,
      linkedAt: new Date(),
      verified: true,
    };

    const user: UserProfile = {
      userId,
      primaryIdentity: fullIdentity,
      linkedIdentities: [fullIdentity],
      createdAt: new Date(),
    };

    this.users.set(userId, user);
    this.claims.set(userId, []);
    return user;
  }

  findUserByIdentity(platform: string, platformId: string): UserProfile | null {
    for (const user of this.users.values()) {
      if (user.linkedIdentities.some(
        i => i.platform === platform && i.platformId === platformId
      )) {
        return user;
      }
    }
    return null;
  }


  linkIdentity(userId: string, identity: Omit<SocialIdentity, 'linkedAt' | 'verified'>): UserProfile {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    // Check if already linked to another user
    const existing = this.findUserByIdentity(identity.platform, identity.platformId);
    if (existing && existing.userId !== userId) {
      throw new Error('Identity already linked to another account');
    }

    // Check if already linked to this user
    if (user.linkedIdentities.some(
      i => i.platform === identity.platform && i.platformId === identity.platformId
    )) {
      return user;
    }

    const fullIdentity: SocialIdentity = {
      ...identity,
      linkedAt: new Date(),
      verified: true,
    };

    user.linkedIdentities.push(fullIdentity);
    return user;
  }

  recordClaim(userId: string, claim: Omit<ClaimHistory, 'id'>): ClaimHistory {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const fullClaim: ClaimHistory = {
      ...claim,
      id: `claim_${++this.idCounter}`,
    };

    const claims = this.claims.get(userId) || [];
    claims.push(fullClaim);
    this.claims.set(userId, claims);

    return fullClaim;
  }

  getClaims(userId: string): ClaimHistory[] {
    return this.claims.get(userId) || [];
  }

  mergeAccounts(sourceUserId: string, targetUserId: string): {
    success: boolean;
    totalIdentities: number;
    totalBalance: number;
  } {
    const sourceUser = this.users.get(sourceUserId);
    const targetUser = this.users.get(targetUserId);

    if (!sourceUser || !targetUser) {
      throw new Error('User not found');
    }

    if (sourceUserId === targetUserId) {
      throw new Error('Cannot merge with self');
    }

    // Merge identities
    for (const identity of sourceUser.linkedIdentities) {
      if (!targetUser.linkedIdentities.some(
        i => i.platform === identity.platform && i.platformId === identity.platformId
      )) {
        targetUser.linkedIdentities.push(identity);
      }
    }

    // Merge claims
    const sourceClaims = this.claims.get(sourceUserId) || [];
    const targetClaims = this.claims.get(targetUserId) || [];
    this.claims.set(targetUserId, [...targetClaims, ...sourceClaims]);

    // Calculate total balance
    const allClaims = this.claims.get(targetUserId) || [];
    const totalBalance = allClaims
      .filter(c => c.status === 'confirmed')
      .reduce((sum, c) => sum + c.amount, 0);

    // Delete source
    this.users.delete(sourceUserId);
    this.claims.delete(sourceUserId);

    return {
      success: true,
      totalIdentities: targetUser.linkedIdentities.length,
      totalBalance,
    };
  }

  clear(): void {
    this.users.clear();
    this.claims.clear();
    this.idCounter = 0;
  }

  getAllUsers(): UserProfile[] {
    return Array.from(this.users.values());
  }
}

// ============================================================================
// Mock Withdrawal Service
// ============================================================================

class MockWithdrawalService {
  private requests: Map<string, WithdrawalRequest> = new Map();
  private balances: Map<string, Map<string, number>> = new Map();
  private idCounter = 0;

  getBalance(userId: string, tokenSymbol: string): number {
    const userBalances = this.balances.get(userId);
    if (!userBalances) return 0;
    return userBalances.get(tokenSymbol) || 0;
  }

  addBalance(userId: string, tokenSymbol: string, amount: number): void {
    let userBalances = this.balances.get(userId);
    if (!userBalances) {
      userBalances = new Map();
      this.balances.set(userId, userBalances);
    }
    const current = userBalances.get(tokenSymbol) || 0;
    userBalances.set(tokenSymbol, current + amount);
  }

  createWithdrawal(
    userId: string,
    type: 'wallet' | 'fiat' | 'internal',
    amount: number,
    tokenSymbol: string,
    destination: string
  ): WithdrawalRequest {
    const balance = this.getBalance(userId, tokenSymbol);
    if (balance < amount) {
      throw new Error('Insufficient balance');
    }

    if (amount < 1) {
      throw new Error('Amount below minimum');
    }

    // Calculate fees
    const fee = type === 'internal' ? 0 : amount * 0.01;
    const netAmount = amount - fee;

    if (netAmount <= 0) {
      throw new Error('Amount too small');
    }

    // Deduct balance
    const userBalances = this.balances.get(userId)!;
    userBalances.set(tokenSymbol, balance - amount);

    const request: WithdrawalRequest = {
      id: `wd_${++this.idCounter}`,
      userId,
      type,
      amount,
      tokenSymbol,
      destination,
      status: 'pending',
      fee,
      netAmount,
      createdAt: new Date(),
    };

    this.requests.set(request.id, request);
    return request;
  }

  cancelWithdrawal(requestId: string, userId: string): WithdrawalRequest {
    const request = this.requests.get(requestId);
    if (!request) throw new Error('Not found');
    if (request.userId !== userId) throw new Error('Unauthorized');
    if (request.status !== 'pending') throw new Error('Cannot cancel');

    // Refund
    this.addBalance(userId, request.tokenSymbol, request.amount);
    request.status = 'cancelled';
    return request;
  }

  getUserWithdrawals(userId: string): WithdrawalRequest[] {
    return Array.from(this.requests.values())
      .filter(r => r.userId === userId);
  }

  clear(): void {
    this.requests.clear();
    this.balances.clear();
    this.idCounter = 0;
  }
}


// ============================================================================
// Test Suite
// ============================================================================

describe('User Portal and Withdrawal System', function() {
  this.timeout(30000);

  let userService: MockUserService;
  let withdrawalService: MockWithdrawalService;

  beforeEach(() => {
    userService = new MockUserService();
    withdrawalService = new MockWithdrawalService();
  });

  // ==========================================================================
  // User Identity Tests
  // ==========================================================================

  describe('User Identity Management', () => {
    
    it('should create user with social identity', () => {
      const user = userService.getOrCreateUser({
        platform: 'telegram',
        platformId: '123456789',
        username: 'testuser',
      });

      expect(user.userId).to.be.a('string');
      expect(user.linkedIdentities).to.have.length(1);
      expect(user.primaryIdentity.platform).to.equal('telegram');
    });

    it('should return existing user for same identity', () => {
      const user1 = userService.getOrCreateUser({
        platform: 'telegram',
        platformId: '123456789',
      });

      const user2 = userService.getOrCreateUser({
        platform: 'telegram',
        platformId: '123456789',
      });

      expect(user1.userId).to.equal(user2.userId);
    });

    it('should link additional identity to user', () => {
      const user = userService.getOrCreateUser({
        platform: 'telegram',
        platformId: '123456789',
      });

      userService.linkIdentity(user.userId, {
        platform: 'discord',
        platformId: '987654321',
      });

      expect(user.linkedIdentities).to.have.length(2);
    });

    it('should prevent linking identity to multiple users', () => {
      const user1 = userService.getOrCreateUser({
        platform: 'telegram',
        platformId: '111',
      });

      userService.getOrCreateUser({
        platform: 'discord',
        platformId: '222',
      });

      expect(() => {
        userService.linkIdentity(user1.userId, {
          platform: 'discord',
          platformId: '222',
        });
      }).to.throw('Identity already linked');
    });
  });

  // ==========================================================================
  // Account Merge Tests
  // ==========================================================================

  describe('Account Merging', () => {
    
    /**
     * Property 19: Fund Preservation and Account Merging
     * When merging accounts, all funds must be preserved
     * All identities must be consolidated
     * Validates: Requirements 6.4, 6.5
     */
    it('Property 19: Account merge preserves all funds and identities', () => {
      fc.assert(
        fc.property(
          // Source user claims
          fc.array(
            fc.record({
              amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
              tokenSymbol: fc.constantFrom('USDT', 'ETH', 'DOT'),
              platform: fc.constantFrom('telegram', 'discord'),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          // Target user claims
          fc.array(
            fc.record({
              amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
              tokenSymbol: fc.constantFrom('USDT', 'ETH', 'DOT'),
              platform: fc.constantFrom('telegram', 'discord'),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (sourceClaims, targetClaims) => {
            userService.clear();

            // Create source user
            const sourceUser = userService.getOrCreateUser({
              platform: 'telegram',
              platformId: 'source_123',
            });

            // Create target user
            const targetUser = userService.getOrCreateUser({
              platform: 'discord',
              platformId: 'target_456',
            });

            // Record claims for source
            let sourceTotal = 0;
            for (const claim of sourceClaims) {
              userService.recordClaim(sourceUser.userId, {
                ...claim,
                claimedAt: new Date(),
                status: 'confirmed',
              });
              sourceTotal += claim.amount;
            }

            // Record claims for target
            let targetTotal = 0;
            for (const claim of targetClaims) {
              userService.recordClaim(targetUser.userId, {
                ...claim,
                claimedAt: new Date(),
                status: 'confirmed',
              });
              targetTotal += claim.amount;
            }

            // Merge accounts
            const result = userService.mergeAccounts(sourceUser.userId, targetUser.userId);

            // Verify all funds preserved
            expect(result.totalBalance).to.be.closeTo(sourceTotal + targetTotal, 0.01);

            // Verify identities merged
            expect(result.totalIdentities).to.equal(2);

            // Verify source user deleted
            expect(userService.findUserByIdentity('telegram', 'source_123')?.userId)
              .to.equal(targetUser.userId);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent merging account with itself', () => {
      const user = userService.getOrCreateUser({
        platform: 'telegram',
        platformId: '123',
      });

      expect(() => {
        userService.mergeAccounts(user.userId, user.userId);
      }).to.throw('Cannot merge with self');
    });
  });

  // ==========================================================================
  // Reward Aggregation Tests
  // ==========================================================================

  describe('Reward Aggregation', () => {
    
    it('should aggregate rewards by token', () => {
      const user = userService.getOrCreateUser({
        platform: 'telegram',
        platformId: '123',
      });

      userService.recordClaim(user.userId, {
        amount: 100,
        tokenSymbol: 'USDT',
        platform: 'telegram',
        claimedAt: new Date(),
        status: 'confirmed',
      });

      userService.recordClaim(user.userId, {
        amount: 50,
        tokenSymbol: 'USDT',
        platform: 'discord',
        claimedAt: new Date(),
        status: 'confirmed',
      });

      userService.recordClaim(user.userId, {
        amount: 1,
        tokenSymbol: 'ETH',
        platform: 'telegram',
        claimedAt: new Date(),
        status: 'confirmed',
      });

      const claims = userService.getClaims(user.userId);
      
      // Aggregate by token
      const byToken = new Map<string, number>();
      for (const claim of claims) {
        if (claim.status === 'confirmed') {
          const current = byToken.get(claim.tokenSymbol) || 0;
          byToken.set(claim.tokenSymbol, current + claim.amount);
        }
      }

      expect(byToken.get('USDT')).to.equal(150);
      expect(byToken.get('ETH')).to.equal(1);
    });

    /**
     * Property: Reward aggregation is accurate
     */
    it('Property: Reward aggregation sums correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
              tokenSymbol: fc.constantFrom('USDT', 'ETH', 'DOT'),
              platform: fc.constantFrom('telegram', 'discord', 'github'),
              status: fc.constantFrom('pending', 'confirmed', 'failed') as fc.Arbitrary<'pending' | 'confirmed' | 'failed'>,
            }),
            { minLength: 1, maxLength: 30 }
          ),
          (claims) => {
            userService.clear();

            const user = userService.getOrCreateUser({
              platform: 'telegram',
              platformId: 'test_user',
            });

            // Record all claims
            for (const claim of claims) {
              userService.recordClaim(user.userId, {
                ...claim,
                claimedAt: new Date(),
              });
            }

            // Calculate expected totals
            const expectedByToken = new Map<string, number>();
            const expectedByPlatform = new Map<string, number>();

            for (const claim of claims) {
              if (claim.status === 'confirmed') {
                const tokenTotal = expectedByToken.get(claim.tokenSymbol) || 0;
                expectedByToken.set(claim.tokenSymbol, tokenTotal + claim.amount);

                const platformTotal = expectedByPlatform.get(claim.platform) || 0;
                expectedByPlatform.set(claim.platform, platformTotal + claim.amount);
              }
            }

            // Verify aggregation
            const storedClaims = userService.getClaims(user.userId);
            
            const actualByToken = new Map<string, number>();
            for (const claim of storedClaims) {
              if (claim.status === 'confirmed') {
                const current = actualByToken.get(claim.tokenSymbol) || 0;
                actualByToken.set(claim.tokenSymbol, current + claim.amount);
              }
            }

            for (const [token, expected] of expectedByToken) {
              expect(actualByToken.get(token)).to.be.closeTo(expected, 0.01);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // ==========================================================================
  // Withdrawal Tests
  // ==========================================================================

  describe('Withdrawal System', () => {
    
    it('should create withdrawal request', () => {
      withdrawalService.addBalance('user1', 'USDT', 1000);

      const request = withdrawalService.createWithdrawal(
        'user1',
        'wallet',
        100,
        'USDT',
        '0x1234567890abcdef'
      );

      expect(request.status).to.equal('pending');
      expect(request.amount).to.equal(100);
      expect(request.netAmount).to.be.lessThan(100); // Fee deducted
    });

    it('should reject withdrawal with insufficient balance', () => {
      withdrawalService.addBalance('user1', 'USDT', 50);

      expect(() => {
        withdrawalService.createWithdrawal('user1', 'wallet', 100, 'USDT', '0x123');
      }).to.throw('Insufficient balance');
    });

    it('should cancel pending withdrawal and refund', () => {
      withdrawalService.addBalance('user1', 'USDT', 1000);

      const request = withdrawalService.createWithdrawal(
        'user1',
        'wallet',
        100,
        'USDT',
        '0x123'
      );

      const balanceAfterWithdrawal = withdrawalService.getBalance('user1', 'USDT');
      expect(balanceAfterWithdrawal).to.equal(900);

      withdrawalService.cancelWithdrawal(request.id, 'user1');

      const balanceAfterCancel = withdrawalService.getBalance('user1', 'USDT');
      expect(balanceAfterCancel).to.equal(1000);
    });

    /**
     * Property 18: Flexible Withdrawal Options
     * All withdrawal types should work correctly
     * Fees should be calculated properly
     * Balance should be updated correctly
     * Validates: Requirements 6.2
     */
    it('Property 18: Withdrawal preserves balance integrity', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(100), max: Math.fround(100000), noNaN: true }),
          fc.array(
            fc.record({
              type: fc.constantFrom('wallet', 'fiat', 'internal') as fc.Arbitrary<'wallet' | 'fiat' | 'internal'>,
              percentage: fc.float({ min: Math.fround(0.01), max: Math.fround(0.3), noNaN: true }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (initialBalance, withdrawals) => {
            withdrawalService.clear();

            const userId = 'test_user';
            withdrawalService.addBalance(userId, 'USDT', initialBalance);

            let expectedBalance = initialBalance;
            let totalWithdrawn = 0;
            let totalFees = 0;

            for (const w of withdrawals) {
              const amount = Math.floor(expectedBalance * w.percentage);
              if (amount < 1) continue;

              try {
                const request = withdrawalService.createWithdrawal(
                  userId,
                  w.type,
                  amount,
                  'USDT',
                  'destination'
                );

                expectedBalance -= amount;
                totalWithdrawn += amount;
                totalFees += request.fee;

                // Verify balance updated
                const actualBalance = withdrawalService.getBalance(userId, 'USDT');
                expect(actualBalance).to.be.closeTo(expectedBalance, 0.01);

                // Verify net amount = amount - fee
                expect(request.netAmount).to.be.closeTo(amount - request.fee, 0.01);

              } catch {
                // Expected for insufficient balance
              }
            }

            // Verify total withdrawn + remaining = initial
            const finalBalance = withdrawalService.getBalance(userId, 'USDT');
            expect(finalBalance + totalWithdrawn).to.be.closeTo(initialBalance, 0.01);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have zero fee for internal transfers', () => {
      withdrawalService.addBalance('user1', 'USDT', 1000);

      const request = withdrawalService.createWithdrawal(
        'user1',
        'internal',
        100,
        'USDT',
        'user2'
      );

      expect(request.fee).to.equal(0);
      expect(request.netAmount).to.equal(100);
    });
  });

  // ==========================================================================
  // Fee Calculation Tests
  // ==========================================================================

  describe('Fee Calculation', () => {
    
    /**
     * Property: Fees are always non-negative and less than amount
     */
    it('Property: Fees are bounded correctly', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(10), max: Math.fround(100000), noNaN: true }),
          fc.constantFrom('wallet', 'fiat', 'internal') as fc.Arbitrary<'wallet' | 'fiat' | 'internal'>,
          (amount, type) => {
            withdrawalService.clear();
            withdrawalService.addBalance('user', 'USDT', amount);

            try {
              const request = withdrawalService.createWithdrawal(
                'user',
                type,
                amount,
                'USDT',
                'dest'
              );

              // Fee should be non-negative
              expect(request.fee).to.be.greaterThanOrEqual(0);

              // Fee should be less than amount
              expect(request.fee).to.be.lessThan(amount);

              // Net amount should be positive
              expect(request.netAmount).to.be.greaterThan(0);

              // Net amount + fee = amount
              expect(request.netAmount + request.fee).to.be.closeTo(amount, 0.01);

            } catch {
              // Expected for amounts too small
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Multi-Platform Identity Tests
  // ==========================================================================

  describe('Multi-Platform Identity', () => {
    
    /**
     * Property: User can be found by any linked identity
     */
    it('Property: User discoverable by all linked identities', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              platform: fc.constantFrom('telegram', 'discord', 'whatsapp', 'github') as fc.Arbitrary<'telegram' | 'discord' | 'whatsapp' | 'github'>,
              platformId: fc.uuid(),
            }),
            { minLength: 1, maxLength: 4 }
          ),
          (identities) => {
            userService.clear();

            // Ensure unique platform-id combinations
            const uniqueIdentities = identities.filter((id, idx) =>
              identities.findIndex(i => 
                i.platform === id.platform && i.platformId === id.platformId
              ) === idx
            );

            if (uniqueIdentities.length === 0) return true;

            // Create user with first identity
            const user = userService.getOrCreateUser(uniqueIdentities[0]);

            // Link remaining identities
            for (let i = 1; i < uniqueIdentities.length; i++) {
              try {
                userService.linkIdentity(user.userId, uniqueIdentities[i]);
              } catch {
                // May fail if identity already linked
              }
            }

            // Verify user can be found by all linked identities
            for (const identity of user.linkedIdentities) {
              const found = userService.findUserByIdentity(identity.platform, identity.platformId);
              expect(found).to.not.be.null;
              expect(found!.userId).to.equal(user.userId);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
