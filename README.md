# 多链钱包适配器 (Multi-Chain Wallet Adapter)

一个用于 WebView 环境的多链钱包适配器，支持 EVM、Solana 和 TRON 链的 DApp 交互。该适配器设计用于移动端 App 的 WebView 环境，可以替代浏览器插件钱包（如 MetaMask、Phantom、TronLink）。

## 特性

- 支持多链：EVM、Solana、TRON
- 兼容主流钱包接口
- 适用于 WebView 环境
- 统一的 API 接口
- 完整的事件系统
- 类型安全

## 安装

```bash
npm install multi-chain-wallet-adapter
# 或
yarn add multi-chain-wallet-adapter
```

## 快速开始

### 基础使用

```javascript
import { WalletAdapter } from 'multi-chain-wallet-adapter';

// 创建钱包实例
const wallet = WalletAdapter.createWallet({
  chainType: 'EVM',  // 'EVM' | 'SOLANA' | 'TRON'
  chainId: '1',      // 链 ID
  rpcUrl: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID'  // RPC 地址
});

// 连接钱包
try {
  const address = await wallet.connect();
  console.log('Connected:', address);
} catch (error) {
  console.error('Connection failed:', error);
}

// 发送交易
try {
  const txHash = await wallet.signAndSendTransaction({
    to: '0x...',
    value: '0.1'
  });
  console.log('Transaction sent:', txHash);
} catch (error) {
  console.error('Transaction failed:', error);
}
```

### 链特定使用

#### EVM 链

```javascript
// 创建 EVM 钱包
const evmWallet = WalletAdapter.createWallet({
  chainType: 'EVM',
  chainId: '1',  // Ethereum Mainnet
  rpcUrl: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID'
});

// 请求账户
const accounts = await evmWallet.request({
  method: 'eth_requestAccounts'
});

// 签名消息
const signature = await evmWallet.signMessage('Hello, Web3!');

// 发送交易
const txHash = await evmWallet.signAndSendTransaction({
  to: '0x...',
  value: '0.1',
  data: '0x...'  // 可选
});
```

#### Solana

```javascript
// 创建 Solana 钱包
const solanaWallet = WalletAdapter.createWallet({
  chainType: 'SOLANA',
  chainId: 'mainnet-beta',
  rpcUrl: 'https://api.mainnet-beta.solana.com'
});

// 连接钱包
const publicKey = await solanaWallet.connect();

// 签名消息
const { signature } = await solanaWallet.signMessage('Hello, Solana!');

// 发送交易
const { signature: txSignature } = await solanaWallet.signAndSendTransaction({
  to: '...',
  value: 0.1  // SOL
});
```

#### TRON

```javascript
// 创建 TRON 钱包
const tronWallet = WalletAdapter.createWallet({
  chainType: 'TRON',
  chainId: '1',  // Mainnet
  rpcUrl: 'https://api.trongrid.io'
});

// 连接钱包
const address = await tronWallet.connect();

// 签名消息
const signature = await tronWallet.signMessage('Hello, TRON!');

// 发送交易
const txHash = await tronWallet.signAndSendTransaction({
  to: 'T...',
  value: 100  // TRX
});
```

## API 文档

### WalletAdapter

主适配器类，提供统一的钱包接口。

#### 静态方法

##### `createWallet(config: WalletConfig): Wallet`

创建钱包实例。

```typescript
interface WalletConfig {
  chainType: 'EVM' | 'SOLANA' | 'TRON';
  chainId: string;
  rpcUrl: string;
}
```

#### 实例方法

##### `connect(): Promise<string>`

连接钱包，返回账户地址。

##### `disconnect(): Promise<void>`

断开钱包连接。

##### `request({ method: string, params: any[] }): Promise<any>`

发送 RPC 请求。

##### `signMessage(message: string): Promise<string>`

签名消息。

##### `signTransaction(transaction: any): Promise<any>`

签名交易。

##### `signAndSendTransaction(params: TransactionParams): Promise<string>`

签名并发送交易。

```typescript
interface TransactionParams {
  to: string;
  value: string | number;
  data?: string;  // 仅 EVM
}
```

#### 属性

##### `publicKey: string`

当前连接的账户地址。

##### `connected: boolean`

钱包连接状态。

### 事件

所有钱包实例都支持以下事件：

```javascript
wallet.on('connect', (address) => {
  console.log('Connected:', address);
});

wallet.on('disconnect', () => {
  console.log('Disconnected');
});

wallet.on('chainChanged', (chainId) => {
  console.log('Chain changed:', chainId);
});

wallet.on('accountsChanged', (accounts) => {
  console.log('Accounts changed:', accounts);
});
```

## 原生端集成

### Android

```kotlin
// 注入桥接对象
webView.addJavascriptInterface(object {
    @JavascriptInterface
    fun postMessage(message: String): String {
        // 处理钱包请求
        return handleWalletRequest(message)
    }
}, "_tw_")
```

### iOS

```swift
// 注入桥接对象
webView.configuration.userContentController.add(self, name: "_tw_")

// 处理消息
func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
    if message.name == "_tw_" {
        // 处理钱包请求
        handleWalletRequest(message.body as! String)
    }
}
```

## 错误处理

所有方法都会抛出错误，建议使用 try-catch 进行错误处理：

```javascript
try {
  await wallet.connect();
} catch (error) {
  if (error.message.includes('User rejected')) {
    // 用户拒绝连接
  } else if (error.message.includes('Android interface not found')) {
    // 未在 WebView 环境中
  } else {
    // 其他错误
  }
}
```

## 最佳实践

1. **环境检测**
```javascript
if (window._tw_) {
  // 使用钱包适配器
  const wallet = new WalletAdapter({...});
} else if (window.ethereum) {
  // 降级到 MetaMask
} else if (window.solana) {
  // 降级到 Phantom
}
```

2. **错误处理**
```javascript
async function handleTransaction(wallet, params) {
  try {
    const txHash = await wallet.signAndSendTransaction(params);
    return { success: true, txHash };
  } catch (error) {
    if (error.message.includes('User rejected')) {
      return { success: false, error: '用户拒绝交易' };
    }
    return { success: false, error: error.message };
  }
}
```

3. **事件监听**
```javascript
function setupWalletListeners(wallet) {
  wallet.on('connect', (address) => {
    updateUI({ connected: true, address });
  });
  
  wallet.on('disconnect', () => {
    updateUI({ connected: false, address: null });
  });
  
  wallet.on('chainChanged', (chainId) => {
    updateUI({ chainId });
  });
}
```

## 示例项目

查看 `examples` 目录获取完整的示例项目：

- `examples/evm-dapp`: EVM 链 DApp 示例
- `examples/solana-dapp`: Solana DApp 示例
- `examples/tron-dapp`: TRON DApp 示例

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

MIT

## 测试步骤（适配 Phantom 钱包 + Alchemy 主网 RPC）

1. **安装依赖**
   ```bash
   yarn install
   cd example
   yarn install
   ```

2. **启动示例项目**
   ```bash
   yarn start
   ```
   启动后访问 http://localhost:3000

3. **准备 Phantom 钱包**
   - 在浏览器安装 [Phantom 钱包插件](https://phantom.app/)
   - 创建或导入主网钱包，并确保有 SOL 余额

4. **连接钱包**
   - 打开 http://localhost:3000
   - 点击"Connect to Phantom Wallet"按钮
   - 在 Phantom 钱包弹窗中点击"连接"

5. **功能测试**
   - 连接后页面会显示你的钱包地址和主网 SOL 余额
   - 点击"Refresh Balance"可刷新余额
   - 点击"Send Test Transaction (0.001 SOL)"可自转 0.001 SOL（需余额充足）
   - 所有操作日志会在页面下方显示
   - 可随时点击"Disconnect Wallet"断开连接

6. **注意事项**
   - 本项目已切换为 Alchemy 主网 RPC，所有操作均为主网真实交易，请谨慎操作！
   - 若 Phantom 钱包弹窗被拦截，请检查浏览器弹窗设置或手动点击插件图标
   - 若连接被拒绝，请重新点击"Connect to Phantom Wallet"并在弹窗中同意

---

> **致谢**
>
> 本项目基于 [https://github.com/mathwallet/sol-wallet-adapter) 开发，感谢原作者的开源贡献！
