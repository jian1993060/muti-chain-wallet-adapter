import { EVMWallet } from './wallets/EVMWallet';
import { SolanaWallet } from './wallets/SolanaWallet';
import { TronWallet } from './wallets/TronWallet';
import { WalletFactory } from './wallets/WalletFactory';
import { BaseWallet } from './wallets/BaseWallet';

export default class WalletAdapter {
  constructor({ chainType, chainId, rpcUrl }) {
    this.chainType = chainType && chainType.toUpperCase();
    this.chainId = chainId;
    this.rpcUrl = rpcUrl;
    
    // 使用 WalletFactory 创建钱包实例
    this.wallet = WalletFactory.createWallet({ 
      chainType: this.chainType, 
      chainId: this.chainId, 
      rpcUrl: this.rpcUrl 
    });
    
    // 注入到 window
    this._injectToWindow();
  }

  // 注入到 window
  _injectToWindow() {
    switch (this.chainType) {
      case 'EVM':
        window.ethereum = this.wallet;
        break;
      case 'SOLANA':
        window.solana = this.wallet;
        break;
      case 'TRON':
        window.tronWeb = this.wallet;
        break;
    }
    
    // 触发初始化事件
    window.dispatchEvent(new Event('wallet#initialized'));
  }

  // 导出钱包工厂方法
  static createWallet({ chainType, chainId, rpcUrl }) {
    return new WalletAdapter({ chainType, chainId, rpcUrl }).wallet;
  }

  // 主流方法统一暴露
  async connect() { return await this.wallet.connect(); }
  async disconnect() { return await this.wallet.disconnect(); }
  get publicKey() { return this.wallet.publicKey; }
  get connected() { return this.wallet.connected; }
  async getBalance() { return await this.wallet.getBalance(); }
  async signTransaction(tx) { return await this.wallet.signTransaction(tx); }
  async signAndSendTransaction(params) { return await this.wallet.signAndSendTransaction(params); }
  async signMessage(msg) { return await this.wallet.signMessage ? this.wallet.signMessage(msg) : undefined; }

  // 统一 request 方法
  async request({ method, params }) {
    return await this.wallet.request({ method, params });
  }
}

// 导出所有相关类
export { 
  EVMWallet,
  SolanaWallet,
  TronWallet,
  WalletFactory,
  BaseWallet
};

// 桥接方法
function callAndroid(method, params) {
  return new Promise((resolve, reject) => {
    if (window._tw_ && window._tw_.postMessage) {
      try {
        const req = JSON.stringify({ method, params });
        const result = window._tw_.postMessage(req);
        resolve(JSON.parse(result));
      } catch (e) {
        reject(e);
      }
    } else {
      reject('_tw_ bridge not found');
    }
  });
}

// 极简多链自动注入初始化函数
export async function initProvider({ chainType, chainId, rpcUrl, address }) {
  console.log('initProvider called', { chainType, chainId, rpcUrl, address });
  if (chainType === "EVM") {
    // 确保chainId是十六进制格式
    const formatChainId = (id) => {
      if (typeof id === 'string') {
        return id.startsWith('0x') ? id : `0x${parseInt(id).toString(16)}`;
      }
      return `0x${id.toString(16)}`;
    };

    // 当前chainId
    let currentChainId = formatChainId(chainId);

    window.ethereum = {
      isMetaMask: true,
      chainId: currentChainId,
      selectedAddress: address,
      isConnected: () => !!window.ethereum.selectedAddress,
      enable: async () => [address],
      request: async (args) => {
        const { method, params } = args;
        
        // 处理网络切换请求
        if (method === 'wallet_switchEthereumChain') {
          const targetChainId = params[0].chainId;
          try {
            // 调用安卓端切换网络
            const result = await callAndroid('wallet_switchEthereumChain', { chainId: targetChainId });
            if (result) {
              // 更新当前chainId
              currentChainId = formatChainId(targetChainId);
              // 触发chainChanged事件
              window.dispatchEvent(new CustomEvent('ethereum:chainChanged', { 
                detail: { chainId: currentChainId }
              }));
            }
            return result;
          } catch (error) {
            // 如果目标链未添加，返回4902错误
            if (error.code === 4902) {
              throw {
                code: 4902,
                message: 'The requested chain has not been added to MetaMask.'
              };
            }
            throw error;
          }
        }

        // 处理其他请求
        const result = await callAndroid(method, params);
        if (method === 'eth_requestAccounts' && Array.isArray(result)) {
          window.ethereum.selectedAddress = result[0];
        }
        return result;
      },
      on: (eventName, callback) => {
        window.addEventListener('ethereum:' + eventName, callback);
      },
      removeListener: (eventName, callback) => {
        window.removeEventListener('ethereum:' + eventName, callback);
      }
    };

    // 自动连接并触发事件
    window.dispatchEvent(new CustomEvent('ethereum:accountsChanged', { 
      detail: { accounts: [address] } 
    }));
    window.dispatchEvent(new CustomEvent('ethereum:chainChanged', { 
      detail: { chainId: currentChainId } 
    }));
  }
  if (chainType === "SOLANA") {
    window.solana = {
      isPhantom: true,
      publicKey: address,
      isConnected: () => !!window.solana.publicKey,
      connect: async () => ({ publicKey: address }),
      signMessage: async (message) => await callAndroid('signMessage', { message }),
      signTransaction: async (transaction) => await callAndroid('signTransaction', { transaction }),
      on: (eventName, callback) => {
        window.addEventListener('solana:' + eventName, callback);
      },
      removeListener: (eventName, callback) => {
        window.removeEventListener('solana:' + eventName, callback);
      }
    };
    window.dispatchEvent(new CustomEvent('solana:connect', { detail: { publicKey: address } }));
  }
  if (chainType === "TRON") {
    window.tronWeb = {
      ready: true,
      defaultAddress: { base58: address, hex: "" },
      request: async (args) => {
        const { method, params } = args;
        const result = await callAndroid(method, params);
        if (method === 'tron_requestAccounts' && Array.isArray(result)) {
          window.tronWeb.defaultAddress.base58 = result[0];
        }
        return result;
      }
    };
    // 可选：自动连接事件
  }
}

// 兼容自定义多链调用
export async function evmRequest(method, params) {
  return await callAndroid(method, params);
}
export async function solanaRequest(method, params) {
  return await callAndroid(method, params);
}
export async function tronRequest(method, params) {
  return await callAndroid(method, params);
}

(function() {
  let config = {
    ethereum: { address: '', chainId: '0x1', rpcUrl: '' },
    solana: { address: '', cluster: '' },
    tron: { address: '' }
  };

  function createEthereumProvider(cfg) {
    const provider = {
      isMetaMask: true,
      chainId: cfg.chainId,
      selectedAddress: cfg.address,
      isConnected: () => true,
      enable: async () => [cfg.address],
      request: async ({ method, params }) => {
        if (method === 'eth_chainId') return cfg.chainId;
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [cfg.address];
        if (window._tw_ && window._tw_.postMessage)
          return JSON.parse(await window._tw_.postMessage(JSON.stringify({ method, params })));
        return [];
      },
      on: (event, cb) => window.addEventListener('ethereum:' + event, cb),
      removeListener: (event, cb) => window.removeEventListener('ethereum:' + event, cb),
      type: 'Ethereum',
      _metamask: { isUnlocked: async () => true }
    };
    // providers字段将在Proxy挂载后补充
    return provider;
  }

  function createSolanaProvider(cfg) {
    return {
      isPhantom: true,
      publicKey: cfg.address,
      isConnected: () => !!cfg.address,
      connect: async () => ({ publicKey: cfg.address }),
      signMessage: async (msg) => window._tw_ && window._tw_.postMessage
        ? JSON.parse(await window._tw_.postMessage(JSON.stringify({ method: 'signMessage', params: { message: msg } })))
        : null,
      on: (event, cb) => window.addEventListener('solana:' + event, cb),
      removeListener: (event, cb) => window.removeEventListener('solana:' + event, cb)
    };
  }

  function createTronProvider(cfg) {
    return {
      ready: true,
      defaultAddress: { base58: cfg.address, hex: "" },
      request: async ({ method, params }) => window._tw_ && window._tw_.postMessage
        ? JSON.parse(await window._tw_.postMessage(JSON.stringify({ method, params })))
        : null
    };
  }

  window.initProvider = function({ chainType, chainId, rpcUrl, address }) {
    if (chainType === 'EVM') {
      config.ethereum = { address, chainId, rpcUrl };
      const rawProvider = createEthereumProvider(config.ethereum);
      window.ethereum = new Proxy(rawProvider, {
        get(target, prop) {
          return prop in target ? target[prop] : undefined;
        }
      });
      // providers字段（MetaMask兼容）
      window.ethereum.providers = [window.ethereum];
      window.dispatchEvent(new CustomEvent('ethereum:accountsChanged', { detail: { accounts: [address] } }));
      window.dispatchEvent(new CustomEvent('ethereum:chainChanged', { detail: { chainId } }));
    }
    if (chainType === 'SOLANA') {
      config.solana = { address, cluster: chainId };
      window.solana = createSolanaProvider(config.solana);
      window.dispatchEvent(new CustomEvent('solana:connect', { detail: { publicKey: address } }));
    }
    if (chainType === 'TRON') {
      config.tron = { address };
      window.tronWeb = createTronProvider(config.tron);
    }
  };
})();
