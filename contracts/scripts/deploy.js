const hre = require('hardhat');

async function main() {
  const PassageLedger = await hre.ethers.getContractFactory('PassageLedger');
  const ledger = await PassageLedger.deploy();
  await ledger.waitForDeployment();

  const address = await ledger.getAddress();
  console.log('');
  console.log('PassageLedger deployed to:', address);
  console.log('Network:', hre.network.name);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Add to backend/.env:  LEDGER_CONTRACT_ADDRESS=${address}`);
  console.log('  2. Run `npm run export-abi` in contracts/ to refresh backend/../contracts/artifacts/PassageLedger.abi.js');
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
