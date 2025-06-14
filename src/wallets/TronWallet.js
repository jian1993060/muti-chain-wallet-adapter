import { BaseWallet } from './BaseWallet';

export class TronWallet extends BaseWallet {
  constructor({ chainId, rpcUrl, debug = false }) {
    super({ chainId, chainType: 'TRON', rpcUrl, debug });
    this._address = null;
    this._connected = false;
  }

  async connect() {
    try {
      const result = await this._callAndroid('tron_requestAccounts');
      if (!result || !result.address) {
        throw new Error('Invalid connect response');
      }

      this._address = result.address;
      this._connected = true;
      this._updateState({
        connected: true,
        accounts: [result.address],
        lastError: null
      });

      return result.address;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async disconnect() {
    this._address = null;
    this._connected = false;
    this._updateState({
      connected: false,
      accounts: [],
      lastError: null
    });
  }

  get publicKey() {
    return this._address;
  }

  get connected() {
    return this._connected;
  }

  async getBalance() {
    if (!this._address) throw new Error('Wallet not connected');
    
    try {
      const result = await this._callAndroid('tron_getBalance', {
        address: this._address
      });
      return result / 1e6; // TRX精度
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async signTransaction(transaction) {
    if (!this._address) throw new Error('Wallet not connected');
    
    try {
      const result = await this._callAndroid('tron_signTransaction', {
        transaction,
        address: this._address
      });
      return result;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async signAndSendTransaction({ to, value }) {
    if (!this._address) throw new Error('Wallet not connected');
    
    try {
      const result = await this._callAndroid('tron_sendTransaction', {
        to,
        value: value * 1e6, // 转换为 TRX 精度
        from: this._address
      });
      return result;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async signMessage(message) {
    if (!this._address) throw new Error('Wallet not connected');
    if (typeof message !== 'string') {
      throw new Error('Message must be a string');
    }

    try {
      const result = await this._callAndroid('tron_signMessage', {
        message,
        address: this._address
      });
      return result;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async request({ method, params = [] }) {
    const supportedMethods = [
      'tron_requestAccounts',
      'tron_signMessage',
      'tron_sendTransaction',
      'tron_getBalance'
    ];

    if (!supportedMethods.includes(method)) {
      throw new Error(`Unsupported Tron method: ${method}`);
    }

    try {
      const result = await this._callAndroid(method, params);
      
      switch (method) {
        case 'tron_requestAccounts':
          if (!result || !result.address) {
            throw new Error('Invalid account response');
          }
          this._address = result.address;
          this._connected = true;
          this._updateState({
            connected: true,
            accounts: [result.address],
            lastError: null
          });
          break;
      }
      
      return result;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }
} 