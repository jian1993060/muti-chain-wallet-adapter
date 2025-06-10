# 钱包适配器注入指南

## 1. 构建

首先构建适配器：

```bash
yarn install
yarn build
```

构建完成后，在 `dist` 目录下会生成 `wallet-adapter.min.js` 文件。

## 2. 在安卓钱包 App 中注入

### 方法一：通过 WebView 注入

```java
// 在 WebView 中注入
webView.evaluateJavascript("""
    (function() {
        // 注入适配器脚本
        var script = document.createElement('script');
        script.src = 'file:///android_asset/wallet-adapter.min.js';
        document.head.appendChild(script);
        
        // 等待脚本加载完成
        script.onload = function() {
            // 初始化钱包适配器
            window.walletAdapter = new WalletAdapter({
                chainType: 'SOLANA',  // 或 'EVM' 或 'TRON'
                chainId: 'mainnet-beta',
                rpcUrl: 'https://api.mainnet-beta.solana.com'
            });
            
            // 注入钱包对象
            window.solana = {
                isPhantom: true,
                connect: async () => {
                    const result = await window.walletAdapter.connect();
                    return { publicKey: result };
                },
                disconnect: async () => {
                    await window.walletAdapter.disconnect();
                },
                signTransaction: async (transaction) => {
                    return await window.walletAdapter.signTransaction(transaction);
                },
                signAndSendTransaction: async (params) => {
                    return await window.walletAdapter.signAndSendTransaction(params);
                }
            };
            
            // 触发 dApp 的初始化
            window.dispatchEvent(new Event('wallet-ready'));
        };
    })();
""", null);
```

### 方法二：通过 JavaScript 接口注入

```java
// 在 WebView 中设置 JavaScript 接口
webView.addJavascriptInterface(new WebAppInterface(this), "Android");

// JavaScript 接口类
public class WebAppInterface {
    private Context context;
    private WalletAdapter walletAdapter;

    WebAppInterface(Context context) {
        this.context = context;
        this.walletAdapter = new WalletAdapter(/* 配置参数 */);
    }

    @JavascriptInterface
    public String connect() {
        // 实现连接逻辑
        return walletAdapter.connect();
    }

    @JavascriptInterface
    public void disconnect() {
        walletAdapter.disconnect();
    }

    @JavascriptInterface
    public String signTransaction(String transaction) {
        return walletAdapter.signTransaction(transaction);
    }
}

// 在 WebView 中注入接口
webView.evaluateJavascript("""
    (function() {
        window.solana = {
            isPhantom: true,
            connect: async () => {
                const result = await Android.connect();
                return { publicKey: result };
            },
            disconnect: () => Android.disconnect(),
            signTransaction: async (transaction) => {
                return await Android.signTransaction(transaction);
            }
        };
        window.dispatchEvent(new Event('wallet-ready'));
    })();
""", null);
```

## 3. dApp 中使用

dApp 可以通过以下方式检测和使用注入的钱包：

```javascript
// 等待钱包注入
window.addEventListener('wallet-ready', () => {
    // 钱包已注入，可以开始使用
    if (window.solana && window.solana.isPhantom) {
        // 使用钱包
        window.solana.connect()
            .then(() => {
                console.log('钱包已连接');
            })
            .catch(err => {
                console.error('连接失败:', err);
            });
    }
});

// 或者定期检查
function checkWallet() {
    if (window.solana && window.solana.isPhantom) {
        // 钱包已注入，开始使用
        initWallet();
    } else {
        // 继续等待
        setTimeout(checkWallet, 100);
    }
}
checkWallet();
```

## 4. 注意事项

1. 安全性：
   - 确保在 HTTPS 环境下使用
   - 验证交易签名
   - 实现适当的错误处理

2. 兼容性：
   - 测试不同版本的安卓系统
   - 测试不同的 WebView 实现
   - 处理各种网络环境

3. 用户体验：
   - 添加加载状态提示
   - 实现优雅的错误提示
   - 处理网络切换

4. 调试：
   - 在开发时使用 `yarn build:dev` 生成未压缩版本
   - 使用 Chrome 远程调试
   - 添加详细的日志记录 