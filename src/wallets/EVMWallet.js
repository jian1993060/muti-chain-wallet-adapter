import { BaseWallet } from './BaseWallet';
import { ethers } from 'ethers';

export class EVMWallet extends BaseWallet {
  constructor({ chainId, rpcUrl, debug = false }) {
    super({ chainId, chainType: 'EVM', rpcUrl, debug });
    this._provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this._address = null;
    this._connected = false;
  }

  _validateRequest({ method, params }) {
    if (typeof method !== 'string') {
      throw new Error('Method must be a string');
    }
    if (params && typeof params !== 'object') {
      throw new Error('Params must be an object');
    }
    return true;
  }

  _validateAddress(address) {
    if (!ethers.utils.isAddress(address)) {
      throw new Error('Invalid Ethereum address');
    }
    return true;
  }

  _validateTransaction(tx) {
    if (!tx) throw new Error('Transaction is required');
    if (tx.to && !ethers.utils.isAddress(tx.to)) {
      throw new Error('Invalid transaction recipient address');
    }
    if (tx.value && !ethers.BigNumber.isBigNumber(tx.value)) {
      throw new Error('Invalid transaction value');
    }
    return true;
  }

  async request({ method, params = [] }) {
    this._validateRequest({ method, params });

    try {
      const result = await this._callAndroid(method, params);
      
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          if (!Array.isArray(result) || result.length === 0) {
            throw new Error('No accounts returned');
          }
          const address = result[0];
          this._validateAddress(address);
          this._address = address;
          this._connected = true;
          this._updateState({
            connected: true,
            accounts: [address],
            lastError: null
          });
          break;
        case 'eth_chainId':
          this._updateState({
            chainId: result,
            networkVersion: parseInt(result, 16).toString()
          });
          break;
      }
      
      return result;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async connect() {
    try {
      const accounts = await this.request({ method: 'eth_requestAccounts' });
      return accounts[0];
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

  get selectedAddress() {
    return this._address;
  }

  get isConnected() {
    return this._connected;
  }

  get networkVersion() {
    return this._state.networkVersion;
  }

  async signMessage(message) {
    if (!this._address) throw new Error('Wallet not connected');
    if (typeof message !== 'string') {
      throw new Error('Message must be a string');
    }

    try {
      const result = await this._callAndroid('personal_sign', {
        message,
        address: this._address
      });
      return result;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async signTypedData(typedData) {
    if (!this._address) throw new Error('Wallet not connected');
    if (!typedData || typeof typedData !== 'object') {
      throw new Error('Invalid typed data');
    }

    try {
      const result = await this._callAndroid('eth_signTypedData_v4', {
        typedData,
        address: this._address
      });
      return result;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async signTransaction(transaction) {
    if (!this._address) throw new Error('Wallet not connected');
    this._validateTransaction(transaction);

    try {
      const result = await this._callAndroid('eth_signTransaction', {
        transaction,
        address: this._address
      });
      return result;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async sendTransaction(transaction) {
    if (!this._address) throw new Error('Wallet not connected');
    this._validateTransaction(transaction);

    try {
      const result = await this._callAndroid('eth_sendTransaction', {
        transaction: {
          ...transaction,
          from: this._address
        }
      });
      return result;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async getBalance(address = this._address) {
    if (!address) throw new Error('Address is required');
    this._validateAddress(address);

    try {
      const result = await this._callAndroid('eth_getBalance', [address, 'latest']);
      return ethers.BigNumber.from(result);
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async getGasPrice() {
    try {
      const result = await this._callAndroid('eth_gasPrice', []);
      return ethers.BigNumber.from(result);
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async estimateGas(transaction) {
    this._validateTransaction(transaction);

    try {
      const result = await this._callAndroid('eth_estimateGas', [transaction]);
      return ethers.BigNumber.from(result);
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async getTransactionCount(address = this._address, blockTag = 'latest') {
    if (!address) throw new Error('Address is required');
    this._validateAddress(address);

    try {
      const result = await this._callAndroid('eth_getTransactionCount', [address, blockTag]);
      return ethers.BigNumber.from(result);
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async getTransactionReceipt(txHash) {
    if (!txHash || typeof txHash !== 'string') {
      throw new Error('Invalid transaction hash');
    }

    try {
      return await this._callAndroid('eth_getTransactionReceipt', [txHash]);
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async getBlockNumber() {
    try {
      const result = await this._callAndroid('eth_blockNumber', []);
      return ethers.BigNumber.from(result).toNumber();
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async switchChain(chainId) {
    const result = await this._callAndroid('wallet_switchEthereumChain', {
      chainId
    });
    this._chainId = chainId;
    this._emit('chainChanged', chainId);
    return result;
  }

  async addChain(chainParams) {
    return await this._callAndroid('wallet_addEthereumChain', {
      chainParams
    });
  }
} 