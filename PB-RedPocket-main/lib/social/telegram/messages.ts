/**
 * @fileoverview Telegram Message Templates
 * @description Pre-formatted message templates for RedPocket bot
 * @module lib/social/telegram/messages
 */

import {
  InlineKeyboardMarkup,
  RedPocketMessageData,
  ClaimResultMessageData,
  CallbackAction,
  encodeCallbackData,
} from './types';
import { authConfig } from '../../auth/config';

// ============================================================================
// Message Formatters
// ============================================================================

/**
 * Format RedPocket announcement message
 * @param data - RedPocket data
 * @returns Formatted HTML message
 */
export function formatRedPocketMessage(data: RedPocketMessageData): string {
  const expiresIn = getTimeRemaining(data.expiresAt);
  
  return `
🧧 <b>Protocol Bank 红包</b>

💰 总额: <b>${data.totalAmount} ${data.tokenSymbol}</b>
📦 剩余: <b>${data.remainingCount}/${data.totalCount}</b>
⏰ 有效期: ${expiresIn}

${data.message ? `📝 "${data.message}"` : ''}

<i>由 ${data.senderName} 发送</i>
`.trim();
}

/**
 * Format claim result message
 * @param data - Claim result data
 * @returns Formatted HTML message
 */
export function formatClaimResultMessage(data: ClaimResultMessageData): string {
  if (data.success) {
    return `
🎉 <b>领取成功！</b>

💰 获得: <b>${data.claimedAmount} ${data.tokenSymbol}</b>
👛 钱包: <code>${data.walletAddress}</code>
📦 剩余: ${data.remainingCount}/${data.totalCount}

<a href="https://basescan.org/tx/${data.txHash}">查看交易</a>
`.trim();
  } else {
    return `
❌ <b>领取失败</b>

原因: ${data.error || '未知错误'}

如有问题请联系客服。
`.trim();
  }
}

/**
 * Format wallet balance message
 * @param balances - Token balances
 * @param totalValueUsd - Total value in USD
 * @returns Formatted HTML message
 */
export function formatWalletMessage(
  balances: Array<{ symbol: string; amount: number; valueUsd: number; chain: string }>,
  totalValueUsd: number
): string {
  const balanceLines = balances.map(b => 
    `  ${b.symbol}: ${b.amount.toFixed(4)} ($${b.valueUsd.toFixed(2)}) - ${b.chain}`
  ).join('\n');

  return `
👛 <b>我的钱包</b>

💰 总价值: <b>$${totalValueUsd.toFixed(2)} USD</b>

📊 资产明细:
${balanceLines || '  暂无资产'}

<i>点击下方按钮管理资产</i>
`.trim();
}

/**
 * Format claim history message
 * @param claims - Claim history
 * @param page - Current page
 * @param totalPages - Total pages
 * @returns Formatted HTML message
 */
export function formatHistoryMessage(
  claims: Array<{ date: string; amount: number; symbol: string; source: string }>,
  page: number,
  totalPages: number
): string {
  const claimLines = claims.map(c => 
    `  ${c.date} | ${c.amount} ${c.symbol} | ${c.source}`
  ).join('\n');

  return `
📜 <b>领取历史</b> (${page}/${totalPages})

${claimLines || '暂无领取记录'}

<i>共 ${totalPages} 页</i>
`.trim();
}

/**
 * Format help message
 * @returns Formatted HTML message
 */
export function formatHelpMessage(): string {
  return `
🤖 <b>Protocol Bank Bot 帮助</b>

<b>可用命令:</b>
/start - 开始使用 / 领取红包
/wallet - 查看钱包余额
/history - 查看领取历史
/withdraw - 提现奖励
/link - 绑定其他社交账号
/help - 显示此帮助

<b>如何领取红包:</b>
1. 点击群里的红包消息
2. 点击"立即领取"按钮
3. 奖励自动到账！

<b>如何提现:</b>
1. 使用 /withdraw 命令
2. 选择提现方式
3. 输入目标地址或选择法币出金

<b>联系我们:</b>
官网: https://protocolbanks.com
客服: @ProtocolBankSupport
`.trim();
}

/**
 * Format welcome message for new users
 * @param username - User's username
 * @param walletAddress - Generated wallet address
 * @returns Formatted HTML message
 */
export function formatWelcomeMessage(username: string, walletAddress: string): string {
  return `
👋 <b>欢迎使用 Protocol Bank！</b>

Hi ${username}，你的专属钱包已创建：
<code>${walletAddress}</code>

✨ 你现在可以：
• 领取群里的红包
• 查看钱包余额
• 随时提现到任意钱包

使用 /help 查看所有命令。
`.trim();
}

// ============================================================================
// Keyboard Builders
// ============================================================================

/**
 * Build RedPocket claim keyboard
 * @param redpocketId - RedPocket ID
 * @returns Inline keyboard markup
 */
export function buildClaimKeyboard(redpocketId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '🎁 立即领取',
          callback_data: encodeCallbackData({
            action: CallbackAction.CLAIM,
            redpocketId,
          }),
        },
      ],
      [
        {
          text: '👛 查看钱包',
          callback_data: encodeCallbackData({ action: CallbackAction.VIEW_WALLET }),
        },
        {
          text: '📜 领取记录',
          callback_data: encodeCallbackData({ action: CallbackAction.VIEW_HISTORY }),
        },
      ],
    ],
  };
}

/**
 * Build claimed RedPocket keyboard (after claiming)
 * @param txHash - Transaction hash
 * @returns Inline keyboard markup
 */
export function buildClaimedKeyboard(txHash: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '🔍 查看交易',
          url: `https://basescan.org/tx/${txHash}`,
        },
      ],
      [
        {
          text: '👛 我的钱包',
          callback_data: encodeCallbackData({ action: CallbackAction.VIEW_WALLET }),
        },
      ],
    ],
  };
}

/**
 * Build wallet management keyboard
 * @returns Inline keyboard markup
 */
export function buildWalletKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '💸 提现',
          callback_data: encodeCallbackData({ action: CallbackAction.WITHDRAW }),
        },
        {
          text: '🔗 绑定账号',
          callback_data: encodeCallbackData({ action: CallbackAction.LINK_ACCOUNT }),
        },
      ],
      [
        {
          text: '📜 领取历史',
          callback_data: encodeCallbackData({ action: CallbackAction.VIEW_HISTORY }),
        },
      ],
      [
        {
          text: '🌐 打开网页版',
          web_app: { url: authConfig.telegram.webAppUrl },
        },
      ],
    ],
  };
}

/**
 * Build history pagination keyboard
 * @param page - Current page
 * @param totalPages - Total pages
 * @returns Inline keyboard markup
 */
export function buildHistoryKeyboard(page: number, totalPages: number): InlineKeyboardMarkup {
  const buttons: InlineKeyboardMarkup['inline_keyboard'] = [];
  
  // Pagination row
  const paginationRow = [];
  if (page > 1) {
    paginationRow.push({
      text: '⬅️ 上一页',
      callback_data: encodeCallbackData({ action: CallbackAction.VIEW_HISTORY, page: page - 1 }),
    });
  }
  if (page < totalPages) {
    paginationRow.push({
      text: '下一页 ➡️',
      callback_data: encodeCallbackData({ action: CallbackAction.VIEW_HISTORY, page: page + 1 }),
    });
  }
  if (paginationRow.length > 0) {
    buttons.push(paginationRow);
  }

  // Back button
  buttons.push([
    {
      text: '🔙 返回钱包',
      callback_data: encodeCallbackData({ action: CallbackAction.VIEW_WALLET }),
    },
  ]);

  return { inline_keyboard: buttons };
}

/**
 * Build withdraw options keyboard
 * @returns Inline keyboard markup
 */
export function buildWithdrawKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '🦊 转到 Web3 钱包',
          callback_data: encodeCallbackData({ action: CallbackAction.WITHDRAW, platform: 'web3' }),
        },
      ],
      [
        {
          text: '🏦 兑换法币',
          callback_data: encodeCallbackData({ action: CallbackAction.WITHDRAW, platform: 'fiat' }),
        },
      ],
      [
        {
          text: '🔙 返回',
          callback_data: encodeCallbackData({ action: CallbackAction.VIEW_WALLET }),
        },
      ],
    ],
  };
}

/**
 * Build confirmation keyboard
 * @param action - Action to confirm
 * @param data - Additional data
 * @returns Inline keyboard markup
 */
export function buildConfirmKeyboard(action: string, data?: Record<string, unknown>): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '✅ 确认',
          callback_data: encodeCallbackData({ action: CallbackAction.CONFIRM, ...data }),
        },
        {
          text: '❌ 取消',
          callback_data: encodeCallbackData({ action: CallbackAction.CANCEL }),
        },
      ],
    ],
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get human-readable time remaining
 * @param expiresAt - Expiration date
 * @returns Formatted time string
 */
function getTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  
  if (diff <= 0) return '已过期';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}天`;
  }
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  return `${minutes}分钟`;
}
