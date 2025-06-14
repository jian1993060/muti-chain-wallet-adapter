import { BaseWallet } from './BaseWallet';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

export class SolanaWallet extends BaseWallet {
  constructor({ chainId, rpcUrl, debug = false }) {
    super({ chainId, chainType: 'SOLANA', rpcUrl, debug });
    this._connection = new Connection(rpcUrl);
    this._publicKey = null;
    this._connected = false;
  }

  _validatePublicKey(publicKey) {
    try {
      if (typeof publicKey === 'string') {
        new PublicKey(publicKey);
      } else if (!(publicKey instanceof PublicKey)) {
        throw new Error('Invalid public key');
      }
      return true;
    } catch (error) {
      throw new Error('Invalid Solana public key');
    }
  }

  _validateTransaction(transaction) {
    if (!(transaction instanceof Transaction)) {
      throw new Error('Transaction must be an instance of solana.Transaction');
    }
    if (!transaction.recentBlockhash) {
      throw new Error('Transaction must have a recent blockhash');
    }
    if (!transaction.feePayer) {
      throw new Error('Transaction must have a fee payer');
    }
    return true;
  }

  _validateMessage(message) {
    if (!message || typeof message !== 'string') {
      throw new Error('Message must be a non-empty string');
    }
    return true;
  }

  async connect() {
    try {
      const result = await this._callAndroid('connect');
      if (!result || !result.publicKey) {
        throw new Error('Invalid connect response');
      }

      const publicKey = new PublicKey(result.publicKey);
      this._validatePublicKey(publicKey);
      
      this._publicKey = publicKey;
      this._connected = true;
      this._updateState({
        connected: true,
        accounts: [publicKey.toString()],
        lastError: null
      });

      return publicKey;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async disconnect() {
    try {
      await this._callAndroid('disconnect');
      this._publicKey = null;
      this._connected = false;
      this._updateState({
        connected: false,
        accounts: [],
        lastError: null
      });
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  get publicKey() {
    return this._publicKey;
  }

  get isConnected() {
    return this._connected;
  }

  async signMessage(message) {
    if (!this._publicKey) throw new Error('Wallet not connected');
    this._validateMessage(message);

    try {
      const result = await this._callAndroid('signMessage', {
        message,
        publicKey: this._publicKey.toString()
      });

      if (!result || !result.signature) {
        throw new Error('Invalid signature response');
      }

      return {
        signature: Buffer.from(result.signature, 'base64'),
        publicKey: this._publicKey
      };
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async signTransaction(transaction) {
    if (!this._publicKey) throw new Error('Wallet not connected');
    this._validateTransaction(transaction);

    try {
      if (!transaction.recentBlockhash) {
        const { blockhash } = await this._connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
      }
      if (!transaction.feePayer) {
        transaction.feePayer = this._publicKey;
      }

      const signedTx = await this._callAndroid('signTransaction', {
        transaction: transaction.serialize().toString('base64'),
        publicKey: this._publicKey.toString()
      });

      if (!signedTx) {
        throw new Error('Invalid signed transaction response');
      }

      return Transaction.from(Buffer.from(signedTx, 'base64'));
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async signAndSendTransaction(transaction) {
    if (!this._publicKey) throw new Error('Wallet not connected');
    this._validateTransaction(transaction);

    try {
      const signedTx = await this.signTransaction(transaction);
      const signature = await this._connection.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: false }
      );

      const confirmation = await this._connection.confirmTransaction(signature);
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      return {
        signature,
        publicKey: this._publicKey,
        confirmation
      };
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async getBalance(publicKey = this._publicKey) {
    if (!publicKey) throw new Error('Public key is required');
    this._validatePublicKey(publicKey);

    try {
      const balance = await this._connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async getTokenAccounts(publicKey = this._publicKey) {
    if (!publicKey) throw new Error('Public key is required');
    this._validatePublicKey(publicKey);

    try {
      const accounts = await this._connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );
      return accounts.value;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async getTokenBalance(mint, publicKey = this._publicKey) {
    if (!publicKey) throw new Error('Public key is required');
    if (!mint) throw new Error('Token mint address is required');
    
    this._validatePublicKey(publicKey);
    this._validatePublicKey(mint);

    try {
      const accounts = await this.getTokenAccounts(publicKey);
      const tokenAccount = accounts.find(
        account => account.account.data.parsed.info.mint === mint.toString()
      );

      if (!tokenAccount) {
        return 0;
      }

      return tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async switchNetwork(network) {
    if (!network || typeof network !== 'string') {
      throw new Error('Invalid network parameter');
    }

    try {
      await this._callAndroid('switchNetwork', { network });
      this._connection = new Connection(network);
      this._updateState({ lastError: null });
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }

  async createTransferTransaction(toPublicKey, amount, fromPublicKey = this._publicKey) {
    if (!fromPublicKey) throw new Error('Sender public key is required');
    if (!toPublicKey) throw new Error('Recipient public key is required');
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Invalid transfer amount');
    }

    this._validatePublicKey(fromPublicKey);
    this._validatePublicKey(toPublicKey);

    try {
      const transaction = new Transaction();
      const { blockhash } = await this._connection.getLatestBlockhash();

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: amount * LAMPORTS_PER_SOL
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      return transaction;
    } catch (error) {
      this._updateState({ lastError: error.message });
      throw error;
    }
  }
} 