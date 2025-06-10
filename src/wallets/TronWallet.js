import { BaseWallet } from './BaseWallet';

export class TronWallet extends BaseWallet {
  constructor({ chainId, rpcUrl }) {
    super({ chainId, chainType: 'TRON', rpcUrl });
    this.wallet = window.tronWeb || null;
  }

  async connect() {
    if (!this.wallet) throw new Error('TronLink not found');
    // TronLink 自动注入，无需 connect
    return this.wallet.defaultAddress.base58;
  }

  async disconnect() {
    // TronLink 通常不需要断开
  }

  get publicKey() {
    if (!this.wallet || !this.wallet.defaultAddress) throw new Error('Wallet not connected');
    return this.wallet.defaultAddress.base58;
  }

  get connected() {
    return !!(this.wallet && this.wallet.defaultAddress && this.wallet.defaultAddress.base58);
  }

  async getBalance() {
    if (!this.wallet) throw new Error('TronLink not found');
    const addr = this.wallet.defaultAddress.base58;
    const bal = await this.wallet.trx.getBalance(addr);
    return bal / 1e6; // TRX精度
  }

  async signTransaction() {
    throw new Error('signTransaction not implemented for Tron');
  }

  async signAndSendTransaction({ to, lamports }) {
    if (!this.wallet) throw new Error('TronLink not found');
    // lamports 这里按 TRX 1e6 精度
    return await this.wallet.trx.sendTransaction(to, lamports);
  }
} 