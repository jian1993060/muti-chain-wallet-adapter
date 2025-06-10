# 多链钱包适配器

一个支持多链（Solana、EVM、Tron）的钱包适配器库，可以轻松集成到你的 dApp 中。

## 功能特点

- 支持多条区块链网络（Solana、EVM、Tron）
- 简单易用的 React 集成方案
- 现代化的钱包连接界面
- 支持交易签名和发送
- 余额查询
- 链切换
- 统一的 API 接口

## 安装

```bash
npm install multi-chain-wallet-adapter
# 或
yarn add multi-chain-wallet-adapter
```

## 快速开始

### 基础用法

```jsx
import Wallet from 'multi-chain-wallet-adapter';

// 创建钱包实例
const wallet = new Wallet({
  chainId: 'mainnet-beta',  // 链 ID
  chainType: 'SOLANA',      // 链类型：'SOLANA' | 'EVM' | 'TRON'
  rpcUrl: 'https://api.mainnet-beta.solana.com'  // RPC 地址
});

// 连接钱包
await wallet.connect();

// 获取余额
const balance = await wallet.getBalance();

// 发送交易
const signature = await wallet.signAndSendTransaction({
  to: '接收地址',
  lamports: 1000000  // 转账金额（注意不同链的精度不同）
});
```

### React 集成示例

```jsx
import { WalletProvider, useWallet } from 'multi-chain-wallet-adapter';

function App() {
  return (
    <WalletProvider>
      <YourApp />
    </WalletProvider>
  );
}
```

## 测试方法

### 1. 本地开发测试

1. 克隆仓库：
```bash
git clone https://github.com/your-username/multi-chain-wallet-adapter.git
cd multi-chain-wallet-adapter
```

2. 安装依赖：
```bash
yarn install
cd example
yarn install
```

3. 启动示例项目：
```bash
yarn start
```
访问 http://localhost:3000 查看示例

### 2. 在现有 dApp 中测试

1. 构建库：
```bash
yarn build
```

2. 在目标 dApp 中安装：
```bash
# 在目标项目目录下
yarn add file:../path/to/multi-chain-wallet-adapter
```

3. 在 dApp 中集成：
```jsx
import Wallet from 'multi-chain-wallet-adapter';

// 创建钱包实例
const wallet = new Wallet({
  chainType: 'SOLANA',  // 或 'EVM' 或 'TRON'
  chainId: 'mainnet-beta',
  rpcUrl: '你的 RPC 地址'
});

// 测试连接
try {
  await wallet.connect();
  console.log('钱包地址:', wallet.publicKey);
  const balance = await wallet.getBalance();
  console.log('钱包余额:', balance);
} catch (error) {
  console.error('连接失败:', error);
}
```

### 3. 浏览器扩展要求

- Solana 链：需要安装 [Phantom 钱包](https://phantom.app/)
- EVM 链：需要安装 [MetaMask](https://metamask.io/)
- Tron 链：需要安装 [TronLink](https://www.tronlink.org/)

## 注意事项

1. 不同链的精度不同：
   - Solana: 1 SOL = 1e9 lamports
   - EVM: 1 ETH = 1e18 wei
   - Tron: 1 TRX = 1e6 sun

2. 交易参数：
   - `lamports` 参数在不同链中代表不同单位
   - 发送交易时需要注意金额单位的转换

3. 错误处理：
   - 所有方法都会返回 Promise
   - 建议使用 try/catch 处理可能的错误

## 开发计划

- [ ] 添加更多钱包支持
- [ ] 支持更多链类型
- [ ] 添加交易历史查询
- [ ] 支持代币转账
- [ ] 添加更多测试用例

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
