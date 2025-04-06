import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { exec } from "child_process";

const secretKey = bs58.decode(
    "5hFcgsMXe4VXmk9GuJGLma5eJfdfNL9R2uVBdFg9AkMScNQ2HTjbHeYLTP9CAvRrXahy46h1xu9E1mNcGiayxM8Z",
);
const keypair = Keypair.fromSecretKey(secretKey);

const message = "Sign-in to Rugcheck.xyz";
const messageBytes = new TextEncoder().encode(message);

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

// Pipe to curl
const curlCommand = `curl -X POST https://api.rugcheck.xyz/v1/auth/login/solana -H "Content-Type: application/json" -d '${JSON.stringify(payload)}'`;
exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return;
    }
    console.log(`Response: ${stdout}`);
});

console.log(JSON.stringify(payload, null, 2));
