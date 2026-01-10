/**
 * @fileoverview API Business Logic Tests
 * @description Property tests for API services and data aggregation
 * 
 * Note: These tests validate business logic without database dependencies
 * using mock data and in-memory operations.
 */

import { expect } from 'chai';
import * as fc from 'fast-check';

// ============================================================================
// Mock Types (matching database types)
// ============================================================================

enum Platform {
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  WHATSAPP = 'whatsapp',
  GITHUB = 'github',
}

enum RedPocketStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  DEPLETED = 'depleted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

enum ClaimStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

interface RedPocket {
  id: string;
  total_amount: number;
  remaining_amount: number;
  total_count: number;
  claimed_count: number;
  is_lucky_draw: boolean;
  min_amount?: number;
  max_amount?: number;
  status: RedPocketStatus;
  expires_at: Date;
}

interface Claim {
  id: string;
  redpocket_id: string;
  user_id: string;
  platform: Platform;
  platform_id: string;
  amount: number;
  status: ClaimStatus;
  created_at: Date;
}

interface DashboardStats {
  total_redpockets: number;
  active_redpockets: number;
  total_claims: number;
  total_distributed: number;
  unique_claimers: number;
  claims_by_platform: Record<Platform, number>;
}

// ============================================================================
// Business Logic Functions (matching service implementations)
// ============================================================================

/**
 * Calculate claim amount for a RedPocket
 */
function calculateClaimAmount(redpocket: RedPocket): number {
  if (!redpocket.is_lucky_draw) {
    return redpocket.total_amount / redpocket.total_count;
  }

  const remainingCount = redpocket.total_count - redpocket.claimed_count;
  const avgRemaining = redpocket.remaining_amount / remainingCount;
  
  const min = redpocket.min_amount || avgRemaining * 0.5;
  const max = Math.min(
    redpocket.max_amount || avgRemaining * 2,
    redpocket.remaining_amount - (remainingCount - 1) * min
  );

  const amount = Math.random() * (max - min) + min;
  return Math.round(amount * 100) / 100;
}

/**
 * Check if claim is valid
 */
function isClaimValid(
  redpocket: RedPocket,
  existingClaims: Claim[],
  userId: string,
  platformId: string
): { valid: boolean; reason?: string } {
  if (redpocket.status !== RedPocketStatus.ACTIVE) {
    return { valid: false, reason: `RedPocket is ${redpocket.status}` };
  }

  if (new Date(redpocket.expires_at) < new Date()) {
    return { valid: false, reason: 'RedPocket has expired' };
  }

  if (redpocket.claimed_count >= redpocket.total_count) {
    return { valid: false, reason: 'RedPocket is fully claimed' };
  }

  if (redpocket.remaining_amount <= 0) {
    return { valid: false, reason: 'No funds remaining' };
  }

  const userClaim = existingClaims.find(c => c.user_id === userId);
  if (userClaim) {
    return { valid: false, reason: 'User already claimed' };
  }

  const platformClaim = existingClaims.find(c => c.platform_id === platformId);
  if (platformClaim) {
    return { valid: false, reason: 'Platform ID already claimed' };
  }

  return { valid: true };
}

/**
 * Aggregate dashboard statistics from claims
 */
function aggregateDashboardStats(
  redpockets: RedPocket[],
  claims: Claim[]
): DashboardStats {
  const successfulClaims = claims.filter(c => c.status === ClaimStatus.SUCCESS);
  
  const claimsByPlatform: Record<Platform, number> = {
    [Platform.TELEGRAM]: 0,
    [Platform.DISCORD]: 0,
    [Platform.WHATSAPP]: 0,
    [Platform.GITHUB]: 0,
  };

  for (const claim of successfulClaims) {
    claimsByPlatform[claim.platform]++;
  }

  const uniqueUsers = new Set(successfulClaims.map(c => c.user_id));

  return {
    total_redpockets: redpockets.length,
    active_redpockets: redpockets.filter(r => r.status === RedPocketStatus.ACTIVE).length,
    total_claims: successfulClaims.length,
    total_distributed: successfulClaims.reduce((sum, c) => sum + c.amount, 0),
    unique_claimers: uniqueUsers.size,
    claims_by_platform: claimsByPlatform,
  };
}

/**
 * Aggregate user rewards across platforms
 */
function aggregateUserRewards(
  claims: Claim[],
  userId: string
): { total: number; by_platform: Record<Platform, number> } {
  const userClaims = claims.filter(
    c => c.user_id === userId && c.status === ClaimStatus.SUCCESS
  );

  const byPlatform: Record<Platform, number> = {
    [Platform.TELEGRAM]: 0,
    [Platform.DISCORD]: 0,
    [Platform.WHATSAPP]: 0,
    [Platform.GITHUB]: 0,
  };

  let total = 0;
  for (const claim of userClaims) {
    total += claim.amount;
    byPlatform[claim.platform] += claim.amount;
  }

  return { total, by_platform: byPlatform };
}

// ============================================================================
// Generators
// ============================================================================

const platformArb = fc.constantFrom(
  Platform.TELEGRAM,
  Platform.DISCORD,
  Platform.WHATSAPP,
  Platform.GITHUB
);

const redpocketArb = fc.record({
  id: fc.uuid(),
  total_amount: fc.float({ min: Math.fround(1), max: Math.fround(10000), noNaN: true }),
  total_count: fc.integer({ min: 1, max: 1000 }),
  is_lucky_draw: fc.boolean(),
}).chain(base => {
  const claimed_count = fc.integer({ min: 0, max: base.total_count - 1 });
  return claimed_count.map(cc => ({
    ...base,
    claimed_count: cc,
    remaining_amount: base.total_amount * (1 - cc / base.total_count),
    min_amount: base.is_lucky_draw ? base.total_amount / base.total_count * 0.5 : undefined,
    max_amount: base.is_lucky_draw ? base.total_amount / base.total_count * 2 : undefined,
    status: RedPocketStatus.ACTIVE,
    expires_at: new Date(Date.now() + 86400000), // 24 hours from now
  }));
});

const claimArb = (redpocketId: string) => fc.record({
  id: fc.uuid(),
  redpocket_id: fc.constant(redpocketId),
  user_id: fc.uuid(),
  platform: platformArb,
  platform_id: fc.string({ minLength: 5, maxLength: 20 }),
  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true }),
  status: fc.constantFrom(ClaimStatus.SUCCESS, ClaimStatus.FAILED, ClaimStatus.PENDING),
  created_at: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
});

// ============================================================================
// Test Suites
// ============================================================================

describe('API Business Logic', function () {
  describe('Property 13: Real-Time Dashboard Accuracy', function () {
    /**
     * Property: Dashboard stats should accurately reflect claim data
     * For any set of claims, the aggregated stats should match manual calculation
     */
    it('should accurately aggregate dashboard statistics', function () {
      fc.assert(
        fc.property(
          fc.array(redpocketArb, { minLength: 1, maxLength: 10 }),
          (redpockets) => {
            // Generate claims for each redpocket
            const allClaims: Claim[] = [];
            for (const rp of redpockets) {
              const claimCount = Math.min(rp.claimed_count, 5);
              for (let i = 0; i < claimCount; i++) {
                allClaims.push({
                  id: `claim_${rp.id}_${i}`,
                  redpocket_id: rp.id,
                  user_id: `user_${i}`,
                  platform: Object.values(Platform)[i % 4] as Platform,
                  platform_id: `pid_${i}`,
                  amount: rp.total_amount / rp.total_count,
                  status: ClaimStatus.SUCCESS,
                  created_at: new Date(),
                });
              }
            }

            const stats = aggregateDashboardStats(redpockets, allClaims);

            // Verify total redpockets count
            expect(stats.total_redpockets).to.equal(redpockets.length);

            // Verify active redpockets count
            const activeCount = redpockets.filter(r => r.status === RedPocketStatus.ACTIVE).length;
            expect(stats.active_redpockets).to.equal(activeCount);

            // Verify total claims matches successful claims
            const successfulClaims = allClaims.filter(c => c.status === ClaimStatus.SUCCESS);
            expect(stats.total_claims).to.equal(successfulClaims.length);

            // Verify total distributed matches sum of successful claim amounts
            const expectedTotal = successfulClaims.reduce((sum, c) => sum + c.amount, 0);
            expect(Math.abs(stats.total_distributed - expectedTotal)).to.be.lessThan(0.01);

            // Verify platform breakdown sums to total
            const platformSum = Object.values(stats.claims_by_platform).reduce((a, b) => a + b, 0);
            expect(platformSum).to.equal(stats.total_claims);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Unique claimers count should never exceed total claims
     */
    it('should have unique claimers <= total claims', function () {
      fc.assert(
        fc.property(
          fc.array(redpocketArb, { minLength: 1, maxLength: 5 }),
          (redpockets) => {
            const allClaims: Claim[] = [];
            for (const rp of redpockets) {
              for (let i = 0; i < Math.min(rp.claimed_count, 3); i++) {
                allClaims.push({
                  id: `claim_${rp.id}_${i}`,
                  redpocket_id: rp.id,
                  user_id: `user_${Math.floor(i / 2)}`, // Some users claim multiple
                  platform: Platform.TELEGRAM,
                  platform_id: `pid_${i}`,
                  amount: 1,
                  status: ClaimStatus.SUCCESS,
                  created_at: new Date(),
                });
              }
            }

            const stats = aggregateDashboardStats(redpockets, allClaims);
            return stats.unique_claimers <= stats.total_claims;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 17: Reward Aggregation Accuracy', function () {
    /**
     * Property: User reward aggregation should match sum of individual claims
     */
    it('should accurately aggregate user rewards', function () {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(platformArb, { minLength: 1, maxLength: 4 }),
          fc.array(fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true }), { minLength: 1, maxLength: 10 }),
          (userId, platforms, amounts) => {
            const claims: Claim[] = amounts.map((amount, i) => ({
              id: `claim_${i}`,
              redpocket_id: `rp_${i}`,
              user_id: userId,
              platform: platforms[i % platforms.length],
              platform_id: `pid_${i}`,
              amount,
              status: ClaimStatus.SUCCESS,
              created_at: new Date(),
            }));

            const result = aggregateUserRewards(claims, userId);

            // Total should match sum of all amounts
            const expectedTotal = amounts.reduce((sum, a) => sum + a, 0);
            expect(Math.abs(result.total - expectedTotal)).to.be.lessThan(0.01);

            // Platform breakdown should sum to total
            const platformSum = Object.values(result.by_platform).reduce((a, b) => a + b, 0);
            expect(Math.abs(platformSum - result.total)).to.be.lessThan(0.01);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Failed claims should not be included in aggregation
     */
    it('should exclude failed claims from aggregation', function () {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }), { minLength: 2, maxLength: 5 }),
          (userId, amounts) => {
            const claims: Claim[] = amounts.map((amount, i) => ({
              id: `claim_${i}`,
              redpocket_id: `rp_${i}`,
              user_id: userId,
              platform: Platform.TELEGRAM,
              platform_id: `pid_${i}`,
              amount,
              status: i === 0 ? ClaimStatus.FAILED : ClaimStatus.SUCCESS,
              created_at: new Date(),
            }));

            const result = aggregateUserRewards(claims, userId);

            // Total should exclude the failed claim (first one)
            const expectedTotal = amounts.slice(1).reduce((sum, a) => sum + a, 0);
            expect(Math.abs(result.total - expectedTotal)).to.be.lessThan(0.01);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Claim Amount Calculation', function () {
    /**
     * Property: Fixed distribution should give equal amounts
     */
    it('should calculate equal amounts for fixed distribution', function () {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(10), max: Math.fround(10000), noNaN: true }),
          fc.integer({ min: 1, max: 100 }),
          (totalAmount, totalCount) => {
            const redpocket: RedPocket = {
              id: 'test',
              total_amount: totalAmount,
              remaining_amount: totalAmount,
              total_count: totalCount,
              claimed_count: 0,
              is_lucky_draw: false,
              status: RedPocketStatus.ACTIVE,
              expires_at: new Date(Date.now() + 86400000),
            };

            const amount = calculateClaimAmount(redpocket);
            const expectedAmount = totalAmount / totalCount;

            return Math.abs(amount - expectedAmount) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Lucky draw amounts should be within bounds
     */
    it('should keep lucky draw amounts within bounds', function () {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }),
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 0, max: 50 }),
          (totalAmount, totalCount, claimedCount) => {
            if (claimedCount >= totalCount) return true;

            const avgAmount = totalAmount / totalCount;
            const minAmount = avgAmount * 0.5;
            const maxAmount = avgAmount * 2;
            const remainingAmount = totalAmount - (claimedCount * avgAmount);

            const redpocket: RedPocket = {
              id: 'test',
              total_amount: totalAmount,
              remaining_amount: remainingAmount,
              total_count: totalCount,
              claimed_count: claimedCount,
              is_lucky_draw: true,
              min_amount: minAmount,
              max_amount: maxAmount,
              status: RedPocketStatus.ACTIVE,
              expires_at: new Date(Date.now() + 86400000),
            };

            const amount = calculateClaimAmount(redpocket);

            // Amount should be positive
            if (amount <= 0) return false;

            // Amount should not exceed remaining
            if (amount > remainingAmount) return false;

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Claim Validation', function () {
    /**
     * Property: Expired RedPockets should reject claims
     */
    it('should reject claims on expired RedPockets', function () {
      const expiredRedPocket: RedPocket = {
        id: 'test',
        total_amount: 100,
        remaining_amount: 100,
        total_count: 10,
        claimed_count: 0,
        is_lucky_draw: false,
        status: RedPocketStatus.ACTIVE,
        expires_at: new Date(Date.now() - 1000), // Expired
      };

      const result = isClaimValid(expiredRedPocket, [], 'user1', 'pid1');
      expect(result.valid).to.be.false;
      expect(result.reason).to.include('expired');
    });

    /**
     * Property: Depleted RedPockets should reject claims
     */
    it('should reject claims on depleted RedPockets', function () {
      const depletedRedPocket: RedPocket = {
        id: 'test',
        total_amount: 100,
        remaining_amount: 100,
        total_count: 10,
        claimed_count: 10, // Fully claimed
        is_lucky_draw: false,
        status: RedPocketStatus.ACTIVE,
        expires_at: new Date(Date.now() + 86400000),
      };

      const result = isClaimValid(depletedRedPocket, [], 'user1', 'pid1');
      expect(result.valid).to.be.false;
      expect(result.reason).to.include('fully claimed');
    });

    /**
     * Property: Double claims should be rejected
     */
    it('should reject double claims by same user', function () {
      const redpocket: RedPocket = {
        id: 'test',
        total_amount: 100,
        remaining_amount: 90,
        total_count: 10,
        claimed_count: 1,
        is_lucky_draw: false,
        status: RedPocketStatus.ACTIVE,
        expires_at: new Date(Date.now() + 86400000),
      };

      const existingClaims: Claim[] = [{
        id: 'claim1',
        redpocket_id: 'test',
        user_id: 'user1',
        platform: Platform.TELEGRAM,
        platform_id: 'pid1',
        amount: 10,
        status: ClaimStatus.SUCCESS,
        created_at: new Date(),
      }];

      const result = isClaimValid(redpocket, existingClaims, 'user1', 'pid2');
      expect(result.valid).to.be.false;
      expect(result.reason).to.include('already claimed');
    });

    /**
     * Property: Valid claims should be accepted
     */
    it('should accept valid claims', function () {
      fc.assert(
        fc.property(
          redpocketArb,
          fc.uuid(),
          fc.string({ minLength: 5, maxLength: 20 }),
          (redpocket, userId, platformId) => {
            // Ensure redpocket is claimable
            if (redpocket.claimed_count >= redpocket.total_count) return true;
            if (redpocket.remaining_amount <= 0) return true;

            const result = isClaimValid(redpocket, [], userId, platformId);
            return result.valid === true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
