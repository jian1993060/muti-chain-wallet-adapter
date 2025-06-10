export class BaseWallet {
  constructor({ chainId, chainType, rpcUrl }) {
    this.chainId = chainId;
    this.chainType = chainType && chainType.toUpperCase();
    this.rpcUrl = rpcUrl;
  }

  async connect() {
    throw new Error('connect() must be implemented');
  }

  async disconnect() {
    throw new Error('disconnect() must be implemented');
  }

  get publicKey() {
    throw new Error('publicKey getter must be implemented');
  }

  get connected() {
    throw new Error('connected getter must be implemented');
  }

  async getBalance() {
    throw new Error('getBalance() must be implemented');
  }

  async signTransaction(transaction) {
    throw new Error('signTransaction() must be implemented');
  }

  async signAndSendTransaction({ to, lamports }) {
    throw new Error('signAndSendTransaction() must be implemented');
  }
} 