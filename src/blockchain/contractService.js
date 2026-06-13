const { ethers } = require('ethers');

// Minimal ABI — only the two functions we use
const ABI = [
  'function storeHash(bytes32 hash) external',
  'function verifyHash(bytes32 hash) external view returns (bool)',
];

function getContract() {
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);
}

async function storeOnChain(hexHash) {
  const contract = getContract();
  const tx = await contract.storeHash(`0x${hexHash}`);
  const receipt = await tx.wait();
  return receipt.hash;
}

async function verifyOnChain(hexHash) {
  const contract = getContract();
  return contract.verifyHash(`0x${hexHash}`);
}

module.exports = { storeOnChain, verifyOnChain };
