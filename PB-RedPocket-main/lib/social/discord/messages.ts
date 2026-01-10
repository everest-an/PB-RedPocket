/**
 * @fileoverview Discord Message Templates
 * @description Pre-formatted message templates for Discord bot
 * @module lib/social/discord/messages
 */

import {
  DiscordEmbed,
  DiscordActionRow,
  DiscordMessage,
  ComponentType,
  ButtonStyle,
  DiscordColors,
  DiscordCallbackAction,
  encodeDiscordCallback,
  MessageFlags,
} from './types';

// ============================================================================
// RedPocket Message Data
// ============================================================================

export interface RedPocketData {
  redpocketId: string;
  senderName: string;
  senderAvatar?: string;
  totalAmount: number;
  tokenSymbol: string;
  remainingCount: number;
  totalCount: number;
  message?: string;
  expiresAt: Date;
}

export interface ClaimResultData {
  success: boolean;
  claimedAmount?: number;
  tokenSymbol?: string;
  walletAddress?: string;
  txHash?: string;
  error?: string;
  remainingCount?: number;
  totalCount?: number;
}

// ============================================================================
// Embed Builders
// ============================================================================

/**
 * Build RedPocket announcement embed
 */
export function buildRedPocketEmbed(data: RedPocketData): DiscordEmbed {
  const expiresIn = getTimeRemaining(data.expiresAt);
  
  return {
    title: '🧧 Protocol Bank 红包',
    description: data.message || '快来领取红包！',
    color: DiscordColors.RED_POCKET,
    fields: [
      {
        name: '💰 总额',
        value: `${data.totalAmount} ${data.tokenSymbol}`,
        inline: true,
      },
      {
        name: '📦 剩余',
        value: `${data.remainingCount}/${data.totalCount}`,
        inline: true,
      },
      {
        name: '⏰ 有效期',
        value: expiresIn,
        inline: true,
      },
    ],
    footer: {
      text: `由 ${data.senderName} 发送`,
      icon_url: data.senderAvatar,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build claim success embed
 */
export function buildClaimSuccessEmbed(data: ClaimResultData): DiscordEmbed {
  return {
    title: '🎉 领取成功！',
    color: DiscordColors.SUCCESS,
    fields: [
      {
        name: '💰 获得',
        value: `${data.claimedAmount} ${data.tokenSymbol}`,
        inline: true,
      },
      {
        name: '📦 剩余',
        value: `${data.remainingCount}/${data.totalCount}`,
        inline: true,
      },
      {
        name: '👛 钱包',
        value: `\`${data.walletAddress}\``,
        inline: false,
      },
    ],
    footer: {
      text: '奖励已自动存入您的钱包',
    },
  };
}

/**
 * Build claim error embed
 */
export function buildClaimErrorEmbed(error: string): DiscordEmbed {
  return {
    title: '❌ 领取失败',
    description: error,
    color: DiscordColors.ERROR,
    footer: {
      text: '如有问题请联系客服',
    },
  };
}

/**
 * Build wallet balance embed
 */
export function buildWalletEmbed(
  balances: Array<{ symbol: string; amount: number; valueUsd: number; chain: string }>,
  totalValueUsd: number,
  walletAddress: string
): DiscordEmbed {
  const balanceFields = balances.map(b => ({
    name: b.symbol,
    value: `${b.amount.toFixed(4)} ($${b.valueUsd.toFixed(2)})\n*${b.chain}*`,
    inline: true,
  }));

  return {
    title: '👛 我的钱包',
    color: DiscordColors.INFO,
    fields: [
      {
        name: '💰 总价值',
        value: `**$${totalValueUsd.toFixed(2)} USD**`,
        inline: false,
      },
      ...balanceFields,
      {
        name: '📍 钱包地址',
        value: `\`${walletAddress}\``,
        inline: false,
      },
    ],
  };
}

/**
 * Build claim history embed
 */
export function buildHistoryEmbed(
  claims: Array<{ date: string; amount: number; symbol: string; source: string }>,
  page: number,
  totalPages: number
): DiscordEmbed {
  const claimLines = claims.map(c => 
    `${c.date} | ${c.amount} ${c.symbol} | ${c.source}`
  ).join('\n');

  return {
    title: '📜 领取历史',
    description: claimLines || '暂无领取记录',
    color: DiscordColors.INFO,
    footer: {
      text: `第 ${page} 页，共 ${totalPages} 页`,
    },
  };
}

/**
 * Build help embed
 */
export function buildHelpEmbed(): DiscordEmbed {
  return {
    title: '🤖 Protocol Bank Bot 帮助',
    color: DiscordColors.BRAND,
    fields: [
      {
        name: '📋 可用命令',
        value: [
          '`/claim <id>` - 领取红包',
          '`/wallet` - 查看钱包余额',
          '`/history` - 查看领取历史',
          '`/withdraw` - 提现奖励',
          '`/link` - 绑定其他账号',
          '`/help` - 显示此帮助',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🎁 如何领取红包',
        value: '1. 点击红包消息的"领取"按钮\n2. 奖励自动到账！',
        inline: false,
      },
      {
        name: '🔗 链接',
        value: '[官网](https://protocolbanks.com) | [帮助中心](https://help.protocolbanks.com)',
        inline: false,
      },
    ],
  };
}

/**
 * Build welcome embed for new users
 */
export function buildWelcomeEmbed(username: string, walletAddress: string): DiscordEmbed {
  return {
    title: '👋 欢迎使用 Protocol Bank！',
    description: `Hi ${username}，你的专属钱包已创建！`,
    color: DiscordColors.SUCCESS,
    fields: [
      {
        name: '👛 钱包地址',
        value: `\`${walletAddress}\``,
        inline: false,
      },
      {
        name: '✨ 你现在可以',
        value: '• 领取服务器里的红包\n• 查看钱包余额\n• 随时提现到任意钱包',
        inline: false,
      },
    ],
    footer: {
      text: '使用 /help 查看所有命令',
    },
  };
}

// ============================================================================
// Button Builders
// ============================================================================

/**
 * Build RedPocket claim buttons
 */
export function buildClaimButtons(redpocketId: string): DiscordActionRow {
  return {
    type: ComponentType.ACTION_ROW,
    components: [
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.SUCCESS,
        label: '🎁 立即领取',
        custom_id: encodeDiscordCallback({
          action: DiscordCallbackAction.CLAIM,
          redpocketId,
        }),
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.SECONDARY,
        label: '👛 我的钱包',
        custom_id: encodeDiscordCallback({
          action: DiscordCallbackAction.WALLET,
        }),
      },
    ],
  };
}

/**
 * Build claimed buttons (after successful claim)
 */
export function buildClaimedButtons(txHash: string): DiscordActionRow {
  return {
    type: ComponentType.ACTION_ROW,
    components: [
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.LINK,
        label: '🔍 查看交易',
        url: `https://basescan.org/tx/${txHash}`,
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.SECONDARY,
        label: '👛 我的钱包',
        custom_id: encodeDiscordCallback({
          action: DiscordCallbackAction.WALLET,
        }),
      },
    ],
  };
}

/**
 * Build wallet management buttons
 */
export function buildWalletButtons(): DiscordActionRow {
  return {
    type: ComponentType.ACTION_ROW,
    components: [
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.PRIMARY,
        label: '💸 提现',
        custom_id: encodeDiscordCallback({
          action: DiscordCallbackAction.WITHDRAW,
        }),
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.SECONDARY,
        label: '📜 历史',
        custom_id: encodeDiscordCallback({
          action: DiscordCallbackAction.HISTORY,
        }),
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.SECONDARY,
        label: '🔗 绑定',
        custom_id: encodeDiscordCallback({
          action: DiscordCallbackAction.LINK,
        }),
      },
    ],
  };
}

/**
 * Build history pagination buttons
 */
export function buildHistoryButtons(page: number, totalPages: number): DiscordActionRow {
  const components: DiscordActionRow['components'] = [];
  
  if (page > 1) {
    components.push({
      type: ComponentType.BUTTON,
      style: ButtonStyle.SECONDARY,
      label: '⬅️ 上一页',
      custom_id: encodeDiscordCallback({
        action: DiscordCallbackAction.HISTORY,
        page: page - 1,
      }),
    });
  }
  
  if (page < totalPages) {
    components.push({
      type: ComponentType.BUTTON,
      style: ButtonStyle.SECONDARY,
      label: '下一页 ➡️',
      custom_id: encodeDiscordCallback({
        action: DiscordCallbackAction.HISTORY,
        page: page + 1,
      }),
    });
  }
  
  components.push({
    type: ComponentType.BUTTON,
    style: ButtonStyle.PRIMARY,
    label: '🔙 返回钱包',
    custom_id: encodeDiscordCallback({
      action: DiscordCallbackAction.WALLET,
    }),
  });

  return {
    type: ComponentType.ACTION_ROW,
    components,
  };
}

/**
 * Build link account buttons
 */
export function buildLinkButtons(): DiscordActionRow {
  return {
    type: ComponentType.ACTION_ROW,
    components: [
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.LINK,
        label: '📱 绑定 Telegram',
        url: 'https://protocolbanks.com/link/telegram',
      },
      {
        type: ComponentType.BUTTON,
        style: ButtonStyle.LINK,
        label: '🐙 绑定 GitHub',
        url: 'https://protocolbanks.com/link/github',
      },
    ],
  };
}

// ============================================================================
// Full Message Builders
// ============================================================================

/**
 * Build complete RedPocket message
 */
export function buildRedPocketMessage(data: RedPocketData): DiscordMessage {
  return {
    embeds: [buildRedPocketEmbed(data)],
    components: [buildClaimButtons(data.redpocketId)],
  };
}

/**
 * Build ephemeral claim result message
 */
export function buildClaimResultMessage(data: ClaimResultData): DiscordMessage {
  if (data.success) {
    return {
      embeds: [buildClaimSuccessEmbed(data)],
      components: [buildClaimedButtons(data.txHash || '')],
      flags: MessageFlags.EPHEMERAL,
    };
  } else {
    return {
      embeds: [buildClaimErrorEmbed(data.error || '未知错误')],
      flags: MessageFlags.EPHEMERAL,
    };
  }
}

/**
 * Build ephemeral wallet message
 */
export function buildWalletMessage(
  balances: Array<{ symbol: string; amount: number; valueUsd: number; chain: string }>,
  totalValueUsd: number,
  walletAddress: string
): DiscordMessage {
  return {
    embeds: [buildWalletEmbed(balances, totalValueUsd, walletAddress)],
    components: [buildWalletButtons()],
    flags: MessageFlags.EPHEMERAL,
  };
}

/**
 * Build ephemeral history message
 */
export function buildHistoryMessage(
  claims: Array<{ date: string; amount: number; symbol: string; source: string }>,
  page: number,
  totalPages: number
): DiscordMessage {
  return {
    embeds: [buildHistoryEmbed(claims, page, totalPages)],
    components: [buildHistoryButtons(page, totalPages)],
    flags: MessageFlags.EPHEMERAL,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get human-readable time remaining
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
