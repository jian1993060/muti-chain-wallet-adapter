import { Connection, SystemProgram, Transaction, PublicKey } from '@solana/web3.js';
import { WalletFactory } from './wallets/WalletFactory';

export default class Wallet {
  constructor({ chainId, chainType, rpcUrl }) {
    this.wallet = WalletFactory.createWallet({ chainId, chainType, rpcUrl });
  }

  async connect() {
    return await this.wallet.connect();
  }

  async disconnect() {
    return await this.wallet.disconnect();
  }

  get publicKey() {
    return this.wallet.publicKey;
  }

  get connected() {
    return this.wallet.connected;
  }

  async getBalance() {
    return await this.wallet.getBalance();
  }

  async signTransaction(transaction) {
    return await this.wallet.signTransaction(transaction);
  }

  async signAndSendTransaction(params) {
    return await this.wallet.signAndSendTransaction(params);
  }
}
