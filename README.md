# SwiftRemit

A peer-to-peer remittance dApp built on the Celo blockchain, enabling group contributions for cross-border money transfers with minimal fees (0.5% vs. traditional 5-10%).

## Overview

SwiftRemit leverages blockchain technology to provide a secure, transparent, and cost-effective solution for international money transfers. By utilizing group contributions and smart contract escrow mechanisms, users can pool funds together and benefit from significantly reduced transaction fees.

## Features

### Core Functionality
- **Group Contribution Pooling**: Enable multiple users to contribute to remittance requests
- **Secure Escrow Mechanism**: Smart contract-based fund management with release controls
- **Automatic Refund System**: Cancelled transfers automatically refund all contributors
- **Low Platform Fees**: Only 0.5% platform fee compared to traditional 5-10% remittance fees

### User Experience
- **Real-time Progress Tracking**: Monitor contribution progress in real-time
- **Forex Price Monitoring**: Chainlink-powered price feeds for optimal timing
- **Recipient-Controlled Release**: Recipients have full control over fund release
- **Mobile-First Design**: Optimized for MiniPay integration

### Security & Safety
- **ReentrancyGuard Protection**: OpenZeppelin security standards
- **Gas-Optimized Operations**: IR-based compilation for efficiency
- **Dark Mode Support**: User preference persistence via localStorage
- **WCAG Accessibility**: Full accessibility compliance

## Technology Stack

### Blockchain Layer
- Solidity 0.8.24
- Hardhat 2.22
- OpenZeppelin Contracts 5.1
- Chainlink 1.2
- Celo Network (Alfajores Testnet)

### Frontend
- React 18.3
- TypeScript 5.6
- Vite 6.0
- Wagmi 2.12 (Web3 integration)
- TanStack Query 5.59
- Tailwind CSS 4.1
- Framer Motion 11.11

## Project Structure

```
swiftremit/
├── contracts/              # Smart contract development
│   ├── contracts/          # Solidity contracts
│   ├── scripts/            # Deployment scripts
│   ├── test/               # Contract tests
│   └── hardhat.config.js   # Hardhat configuration
├── frontend/               # React dApp
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks (Wagmi)
│   │   ├── lib/            # Utilities and config
│   │   └── assets/         # Static assets
│   └── public/             # Public assets
└── package.json            # Workspace configuration
```

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd SwiftRemit
```

2. Install dependencies:
```bash
npm install
```

### Development

#### Smart Contracts

Compile contracts:
```bash
npm run contracts:compile
```

Run tests:
```bash
npm run contracts:test
```

Deploy to testnet:
```bash
npm run contracts:deploy
```

#### Frontend

Start development server:
```bash
npm run dev
```

Build for production:
```bash
npm run frontend:build
```

Preview production build:
```bash
npm run frontend:preview
```

### Environment Variables

Create `.env` files in the respective directories:

#### contracts/.env
```
PRIVATE_KEY=your_private_key
CELOSCAN_API_KEY=your_celoscan_api_key
```

#### frontend/.env
```
VITE_CONTRACT_ADDRESS=deployed_contract_address
VITE_CHAIN_ID=44787
```

## Development Workflow

This project follows GitFlow best practices:

1. **main** - Production-ready code
2. **Feature branches** - Individual features developed in separate branches
3. **Pull Requests** - All changes reviewed via PRs before merging

## Roadmap

The development is divided into 11 PRs:
1. Smart Contract Foundation
2. Smart Contract Testing & Deployment
3. Frontend Foundation
4. Web3 Integration Layer
5. Layout & Theme System
6. Create Remittance Feature
7. View & List Remittances
8. Contribution System
9. Chainlink Price Feeds
10. MiniPay Integration
11. Final Polish & Deployment

## Contributing

Please follow the established PR workflow for all contributions.

## License

MIT

## Contact

For questions and support, please open an issue in the repository.
