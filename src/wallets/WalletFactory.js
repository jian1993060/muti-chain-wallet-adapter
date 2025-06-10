import { SolanaWallet } from './SolanaWallet';
import { TronWallet } from './TronWallet';
import { EVMWallet } from './EVMWallet';

export class WalletFactory {
  static createWallet({ chainId, chainType, rpcUrl }) {
    switch (chainType.toUpperCase()) {
      case 'SOLANA':
        return new SolanaWallet({ chainId, rpcUrl });
      case 'TRON':
        return new TronWallet({ chainId, rpcUrl });
      case 'EVM':
        return new EVMWallet({ chainId, rpcUrl });
      default:
        throw new Error('Unsupported chainType');
    }
  }
} 