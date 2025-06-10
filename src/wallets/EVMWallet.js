import { BaseWallet } from './BaseWallet';

export class EVMWallet extends BaseWallet {
  constructor({ chainId, rpcUrl }) {
    super({ chainId, chainType: 'EVM', rpcUrl });
    this.wallet = window.ethereum || null;
  }

  async connect() {
    if (!this.wallet) throw new Error('MetaMask not found');
    // 切换到指定EVM链
    if (this.chainId) {
      await this.wallet.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + parseInt(this.chainId).toString(16) }],
      }).catch(async (switchError) => {
        // 如果链未添加，尝试添加
        if (switchError.code === 4902 && this.rpcUrl) {
          await this.wallet.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + parseInt(this.chainId).toString(16),
              rpcUrls: [this.rpcUrl],
              chainName: 'Custom EVM Chain',
              nativeCurrency: { name: 'Token', symbol: 'TKN', decimals: 18 },
              blockExplorerUrls: [],
            }],
          });
        } else {
          throw switchError;
        }
      });
    }
    const accounts = await this.wallet.request({ method: 'eth_requestAccounts' });
    return accounts[0];
  }

  async disconnect() {
    // MetaMask 通常不需要断开
  }

  get publicKey() {
    if (!this.wallet || !this.wallet.selectedAddress) throw new Error('Wallet not connected');
    return this.wallet.selectedAddress;
  }

  get connected() {
    return !!(this.wallet && this.wallet.selectedAddress);
  }

  async getBalance() {
    if (!this.wallet) throw new Error('MetaMask not found');
    const addr = this.wallet.selectedAddress;
    const bal = await this.wallet.request({
      method: 'eth_getBalance',
      params: [addr, 'latest'],
    });
    return parseInt(bal, 16) / 1e18; // ETH精度
  }

  async signTransaction() {
    throw new Error('signTransaction not implemented for EVM');
  }

  async signAndSendTransaction({ to, lamports }) {
    if (!this.wallet) throw new Error('MetaMask not found');
    const from = this.wallet.selectedAddress;
    const tx = {
      from,
      to,
      value: '0x' + lamports.toString(16), // lamports 需按 1e18 传入
    };
    return await this.wallet.request({ method: 'eth_sendTransaction', params: [tx] });
  }
} 