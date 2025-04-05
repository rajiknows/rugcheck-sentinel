import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

const secretKey = bs58.decode("5hFcgsMXe4VXmk9GuJGLma5eJfdfNL9R2uVBdFg9AkMScNQ2HTjbHeYLTP9CAvRrXahy46h1xu9E1mNcGiayxM8Z");
const keypair = Keypair.fromSecretKey(secretKey);

const message = "Sign-in to Rugcheck.xyz";
const messageBytes = new TextEncoder().encode(message);

// Use tweetnacl to sign the message
const signature = nacl.sign.detached(messageBytes, keypair.secretKey);

const payload = {
  message: {
    message,
    publicKey: keypair.publicKey.toBase58(),
    timestamp: Date.now(),
  },
  signature: {
    data: Array.from(signature),
    type: "ed25519",
  },
  wallet: keypair.publicKey.toBase58(),
};

console.log(JSON.stringify(payload, null, 2));
