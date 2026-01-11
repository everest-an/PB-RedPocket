'use client'

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'

export function ConnectButton() {
  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted
        const connected = ready && account && chain

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    Connect Wallet
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="w-full px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 font-medium"
                  >
                    Wrong network
                  </button>
                )
              }

              return (
                <button
                  onClick={openAccountModal}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-sm font-medium text-foreground truncate">
                    {account.displayName}
                  </span>
                </button>
              )
            })()}
          </div>
        )
      }}
    </RainbowConnectButton.Custom>
  )
}

export { useAccount as useWallet } from 'wagmi'
