import { EventEmitter } from 'events';

export class BaseWallet {
  constructor({ chainId, chainType, rpcUrl, debug = false }) {
    this.chainId = chainId;
    this.chainType = chainType;
    this.rpcUrl = rpcUrl;
    this._eventListeners = new Map();
    this._state = {
      connected: false,
      chainId: chainId,
      accounts: [],
      networkVersion: null,
      lastError: null
    };

    if (debug) {
      this._enableDebug();
    }
  }

  _enableDebug() {
    const originalCallAndroid = this._callAndroid;
    this._callAndroid = async (method, params) => {
      console.log(`[Wallet Debug] Calling ${method}:`, params);
      try {
        const result = await originalCallAndroid(method, params);
        console.log(`[Wallet Debug] Result for ${method}:`, result);
        return result;
      } catch (error) {
        console.error(`[Wallet Debug] Error in ${method}:`, error);
        throw error;
      }
    };

    // 添加事件调试
    const originalEmit = this._emit;
    this._emit = (eventName, data) => {
      console.log(`[Wallet Debug] Emitting event ${eventName}:`, data);
      originalEmit(eventName, data);
    };
  }

  // 通用验证方法
  _validateConnected() {
    if (!this._state.connected) {
      throw new Error('Wallet not connected');
    }
  }

  _validateMethod(method, supportedMethods) {
    if (!supportedMethods.includes(method)) {
      throw new Error(`Unsupported ${this.chainType} method: ${method}`);
    }
  }

  _validateParams(params, requiredFields = []) {
    if (!params || typeof params !== 'object') {
      throw new Error('Params must be an object');
    }
    
    for (const field of requiredFields) {
      if (!(field in params)) {
        throw new Error(`Missing required parameter: ${field}`);
      }
    }
  }

  _validateString(value, fieldName) {
    if (typeof value !== 'string') {
      throw new Error(`${fieldName} must be a string`);
    }
  }

  // 与 Android 通信
  async _callAndroid(method, params = {}) {
    if (!window._tw_) {
      const error = new Error('Android interface not found. Please ensure the wallet adapter is properly initialized.');
      this._updateState({ lastError: error.message });
      throw error;
    }

    try {
      const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const response = await window._tw_.postMessage(JSON.stringify({
        method,
        params,
        requestId,
        timestamp: Date.now()
      }));

      const result = JSON.parse(response);
      if (result.error) {
        const error = new Error(result.error);
        this._updateState({ lastError: error.message });
        throw error;
      }

      this._updateState({ lastError: null });
      return result;
    } catch (error) {
      console.error(`Android call failed for method ${method}:`, error);
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  getState() {
    return { ...this._state };
  }

  _updateState(newState) {
    const oldState = { ...this._state };
    this._state = { ...this._state, ...newState };
    
    // 检查状态变化并触发相应事件
    if (oldState.connected !== this._state.connected) {
      this._emit(this._state.connected ? 'connect' : 'disconnect', this._state);
    }
    if (oldState.chainId !== this._state.chainId) {
      this._emit('chainChanged', this._state.chainId);
    }
    if (JSON.stringify(oldState.accounts) !== JSON.stringify(this._state.accounts)) {
      this._emit('accountsChanged', this._state.accounts);
    }
    
    this._emit('stateChanged', this._state);
  }

  // 事件处理
  on(eventName, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    if (!this._eventListeners.has(eventName)) {
      this._eventListeners.set(eventName, new Set());
    }
    this._eventListeners.get(eventName).add(callback);
    return this;
  }

  removeListener(eventName, callback) {
    if (this._eventListeners.has(eventName)) {
      this._eventListeners.get(eventName).delete(callback);
      if (this._eventListeners.get(eventName).size === 0) {
        this._eventListeners.delete(eventName);
      }
    }
    return this;
  }

  _emit(eventName, data) {
    if (this._eventListeners.has(eventName)) {
      const event = new CustomEvent(`${this.chainType.toLowerCase()}:${eventName}`, {
        detail: data,
        timestamp: Date.now()
      });
      this._eventListeners.get(eventName).forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Event handler error for ${eventName}:`, error);
          this._updateState({ lastError: `Event handler error: ${error.message}` });
        }
      });
    }
  }

  // 基础方法
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

  async signMessage(message) {
    throw new Error('signMessage() must be implemented');
  }

  async signTypedData(data) {
    throw new Error('signTypedData() must be implemented');
  }

  async signAndSendTransaction({ to, lamports }) {
    throw new Error('signAndSendTransaction() must be implemented');
  }
} 