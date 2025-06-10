import { Connection, SystemProgram, Transaction, PublicKey } from '@solana/web3.js';
import { BaseWallet } from './BaseWallet';

export class SolanaWallet extends BaseWallet {
  constructor({ chainId, rpcUrl }) {
    super({ chainId, chainType: 'SOLANA', rpcUrl });
    this.connection = new Connection(rpcUrl);
    this.wallet = window.solana && window.solana.isPhantom ? window.solana : null;
  }

  async connect() {
    if (!this.wallet) throw new Error('Phantom wallet not found');
    await this.wallet.connect();
    return this.wallet.publicKey;
  }

  async disconnect() {
    if (this.wallet && this.wallet.isConnected) {
      await this.wallet.disconnect();
    }
  }

  get publicKey() {
    if (!this.wallet || !this.wallet.publicKey) throw new Error('Wallet not connected');
    return this.wallet.publicKey;
  }

  get connected() {
    return !!(this.wallet && this.wallet.isConnected);
  }

  async getBalance() {
    if (!this.wallet || !this.wallet.publicKey) throw new Error('Wallet not connected');
    const bal = await this.connection.getBalance(this.wallet.publicKey);
    return bal / 1e9;
  }

  async signTransaction(transaction) {
    if (!this.wallet || !this.wallet.publicKey) throw new Error('Wallet not connected');
    transaction.feePayer = this.wallet.publicKey;
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    const signed = await this.wallet.signTransaction(transaction);
    return signed;
  }

  async signAndSendTransaction({ to, lamports }) {
    if (!this.wallet || !this.wallet.publicKey) throw new Error('Wallet not connected');
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: new PublicKey(to),
        lamports,
      })
    );
    transaction.feePayer = this.wallet.publicKey;
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    const signed = await this.wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());
    await this.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });
    return signature;
  }
} 