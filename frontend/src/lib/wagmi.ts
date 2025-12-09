import { http, createConfig } from 'wagmi'
import { celo, celoAlfajores } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Get project ID from environment variable
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''

export const config = createConfig({
  chains: [celoAlfajores, celo],
  connectors: [
    injected(),
    walletConnect({
      projectId,
      metadata: {
        name: 'SwiftRemit',
        description: 'Peer-to-peer remittance dApp on Celo blockchain',
        url: 'https://swiftremit.app',
        icons: ['https://swiftremit.app/icon.png']
      }
    })
  ],
  transports: {
    [celo.id]: http(),
    [celoAlfajores.id]: http()
  }
})
