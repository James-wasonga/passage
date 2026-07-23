import 'dotenv/config';
import { privateKeyToAccount } from 'viem/accounts';

console.log('Your agent wallet (the one that PAYS) is:');
console.log(privateKeyToAccount(process.env.WALLET_PRIVATE_KEY).address);