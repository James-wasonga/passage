const { expect } = require('chai');
const { ethers } = require('hardhat');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');

describe('PassageLedger', function () {
  it('records a settlement and reports agent volume', async function () {
    const [agent] = await ethers.getSigners();
    const PassageLedger = await ethers.getContractFactory('PassageLedger');
    const ledger = await PassageLedger.deploy();

    const queryHash = ethers.keccak256(ethers.toUtf8Bytes('busia electronics 800usd'));

    await expect(ledger.connect(agent).recordSettlement(queryHash, 13_000n, 3))
      .to.emit(ledger, 'SettlementRecorded')
      .withArgs(0n, agent.address, queryHash, 13_000n, 3, anyValue);

    expect(await ledger.settlementCount()).to.equal(1n);

    const entry = await ledger.getSettlement(0);
    expect(entry.agent).to.equal(agent.address);
    expect(entry.totalMicroUSD).to.equal(13_000n);
    expect(entry.providerCount).to.equal(3);

    const [totalMicroUSD, count] = await ledger.totalVolumeForAgent(agent.address);
    expect(totalMicroUSD).to.equal(13_000n);
    expect(count).to.equal(1n);
  });

  it('reverts when reading an out-of-range settlement', async function () {
    const PassageLedger = await ethers.getContractFactory('PassageLedger');
    const ledger = await PassageLedger.deploy();
    await expect(ledger.getSettlement(0)).to.be.revertedWith('PassageLedger: out of range');
  });
});
