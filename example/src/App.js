import React, { useState, useMemo, useEffect } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import { Web3ReactProvider, useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { ethers } from 'ethers';
import './App.css';

// MetaMask 连接器
const injected = new InjectedConnector({
  supportedChainIds: [1, 3, 4, 5, 42], // 支持的以太坊网络
});

// 默认配置
const DEFAULTS = {
  SOLANA: {
    chainId: 'mainnet-beta',
    rpcUrl: clusterApiUrl('mainnet-beta'),
  },
  TRON: {
    chainId: 'tron-mainnet',
    rpcUrl: 'https://api.trongrid.io',
  },
  EVM: {
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
  },
};

// MetaMask 钱包组件
function MetaMaskWallet() {
  const { active, account, library, activate, deactivate, chainId } = useWeb3React();
  const [balance, setBalance] = useState(null);
  const [logs, setLogs] = useState([]);

  function addLog(log) {
    setLogs((logs) => [...logs, log]);
  }

  async function connect() {
    try {
      await activate(injected);
      addLog('MetaMask connected');
    } catch (error) {
      addLog('Error connecting to MetaMask: ' + error.message);
    }
  }

  async function disconnect() {
    try {
      deactivate();
      addLog('MetaMask disconnected');
    } catch (error) {
      addLog('Error disconnecting from MetaMask: ' + error.message);
    }
  }

  async function getBalance() {
    if (!account || !library) return;
    try {
      const balance = await library.getBalance(account);
      setBalance(ethers.utils.formatEther(balance));
      addLog(`MetaMask balance: ${ethers.utils.formatEther(balance)} ETH`);
    } catch (error) {
      addLog('Error getting MetaMask balance: ' + error.message);
    }
  }

  return (
    <div>
      <h3>MetaMask Wallet (EVM)</h3>
      {!active ? (
        <button onClick={connect}>Connect MetaMask</button>
      ) : (
        <>
          <div>Account: {account}</div>
          <div>Chain ID: {chainId}</div>
          <div>Balance: {balance !== null ? balance : '--'} ETH</div>
          <button onClick={getBalance}>Refresh Balance</button>
          <button onClick={disconnect}>Disconnect</button>
        </>
      )}
      <div className="logs">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}

// TronLink 钱包组件
function TronLinkWallet() {
  const [tronWeb, setTronWeb] = useState(null);
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [logs, setLogs] = useState([]);

  function addLog(log) {
    setLogs((logs) => [...logs, log]);
  }

  useEffect(() => {
    const checkTronLink = async () => {
      try {
        // 等待 TronLink 注入
        let attempts = 0;
        const maxAttempts = 10;
        
        const check = () => {
          if (window.tronWeb) {
            if (window.tronWeb.ready) {
              setTronWeb(window.tronWeb);
              setAccount(window.tronWeb.defaultAddress.base58);
              addLog('TronLink connected');
            } else {
              addLog('TronLink is not ready, please unlock your wallet');
            }
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(check, 1000);
          } else {
            addLog('TronLink not detected, please make sure it is installed and enabled');
          }
        };
        
        check();
      } catch (error) {
        addLog('Error checking TronLink: ' + error.message);
      }
    };
    checkTronLink();
  }, []);

  async function getBalance() {
    if (!tronWeb || !account) return;
    try {
      const balance = await tronWeb.trx.getBalance(account);
      setBalance(tronWeb.fromSun(balance));
      addLog(`TronLink balance: ${tronWeb.fromSun(balance)} TRX`);
    } catch (error) {
      addLog('Error getting TronLink balance: ' + error.message);
    }
  }

  return (
    <div>
      <h3>TronLink Wallet (TRON)</h3>
      {!tronWeb ? (
        <div>Please install TronLink extension</div>
      ) : (
        <>
          <div>Account: {account}</div>
          <div>Balance: {balance !== null ? balance : '--'} TRX</div>
          <button onClick={getBalance}>Refresh Balance</button>
        </>
      )}
      <div className="logs">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}

// Solana 钱包组件
function SolanaWallet() {
  const { publicKey, connected, disconnect } = useWallet();
  const [logs, setLogs] = useState([]);
  const [balance, setBalance] = useState(null);

  function addLog(log) {
    setLogs((logs) => [...logs, log]);
  }

  async function getBalance() {
    if (!publicKey) return;
    try {
      const connection = new Connection(DEFAULTS.SOLANA.rpcUrl);
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / 1e9);
      addLog(`Phantom balance: ${bal / 1e9} SOL`);
    } catch (e) {
      addLog('Error getting Phantom balance: ' + e.message);
    }
  }

  return (
    <div>
      <h3>Phantom Wallet (Solana)</h3>
      <WalletMultiButton />
      {connected && (
        <>
          <div>Account: {publicKey?.toBase58()}</div>
          <div>Balance: {balance !== null ? balance : '--'} SOL</div>
          <button onClick={getBalance}>Refresh Balance</button>
          <button onClick={disconnect}>Disconnect</button>
        </>
      )}
      <div className="logs">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}

function WalletContent() {
  return (
    <div className="App">
      <h1>Multi-chain Wallet Demo</h1>
      <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
        <div style={{ margin: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', minWidth: '300px' }}>
          <SolanaWallet />
        </div>
        <div style={{ margin: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', minWidth: '300px' }}>
          <MetaMaskWallet />
        </div>
        <div style={{ margin: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', minWidth: '300px' }}>
          <TronLinkWallet />
        </div>
      </div>
    </div>
  );
}

function App() {
  const solanaWallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const endpoint = useMemo(() => clusterApiUrl('mainnet-beta'), []);

  return (
    <Web3ReactProvider getLibrary={(provider) => new ethers.providers.Web3Provider(provider)}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={solanaWallets} autoConnect>
          <WalletModalProvider>
            <WalletContent />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </Web3ReactProvider>
  );
}

export default App;
