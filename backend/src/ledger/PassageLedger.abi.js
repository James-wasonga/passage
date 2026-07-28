// Copy of contracts/artifacts/PassageLedger.abi.js, duplicated here
// deliberately: backend/ is deployed as its own self-contained unit (e.g.
// Railway/Render with Root Directory = backend), so it cannot reach a
// sibling contracts/ folder at runtime. Keep this in sync manually if the
// contract's ABI ever changes - or better, re-run `npm run export-abi` in
// contracts/ and copy the result here too.
export const abi = [
    {
      "inputs": [
        { "internalType": "bytes32", "name": "queryHash", "type": "bytes32" },
        { "internalType": "uint256", "name": "totalMicroUSD", "type": "uint256" },
        { "internalType": "uint32", "name": "providerCount", "type": "uint32" }
      ],
      "name": "recordSettlement",
      "outputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "settlementCount",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "id", "type": "uint256" }],
      "name": "getSettlement",
      "outputs": [
        {
          "components": [
            { "internalType": "address", "name": "agent", "type": "address" },
            { "internalType": "bytes32", "name": "queryHash", "type": "bytes32" },
            { "internalType": "uint256", "name": "totalMicroUSD", "type": "uint256" },
            { "internalType": "uint32", "name": "providerCount", "type": "uint32" },
            { "internalType": "uint64", "name": "timestamp", "type": "uint64" }
          ],
          "internalType": "struct PassageLedger.Settlement",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "agent", "type": "address" }],
      "name": "totalVolumeForAgent",
      "outputs": [
        { "internalType": "uint256", "name": "totalMicroUSD", "type": "uint256" },
        { "internalType": "uint256", "name": "count", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "uint256", "name": "id", "type": "uint256" },
        { "indexed": true, "internalType": "address", "name": "agent", "type": "address" },
        { "indexed": true, "internalType": "bytes32", "name": "queryHash", "type": "bytes32" },
        { "indexed": false, "internalType": "uint256", "name": "totalMicroUSD", "type": "uint256" },
        { "indexed": false, "internalType": "uint32", "name": "providerCount", "type": "uint32" },
        { "indexed": false, "internalType": "uint64", "name": "timestamp", "type": "uint64" }
      ],
      "name": "SettlementRecorded",
      "type": "event"
    }
  ]