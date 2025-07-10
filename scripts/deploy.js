// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

async function main() {

  // Get fake metamask users or accounts given by hardhat
  [buyer, seller, inspector, lender] = await ethers.getSigners()       


  // Deploy Real Estate
  const RealEstate = await ethers.getContractFactory('RealEstate')
  const realEstate = await RealEstate.deploy()
  await realEstate.deployed()

  console.log(`Deployed real estate contract at ${realEstate.address}`)
  console.log(`Minting properties... \n `)

  for(let i = 0;i<3;i++){
    // Mint
    let transaction = await realEstate.connect(seller).mint(`https://copper-bizarre-jay-816.mypinata.cloud/ipfs/bafybeigitlcwk54sonfpzmjzwjnk54ldkgovgnm3x2sf4w62sgvjxkgcp4/${i+1}.json`)
    await transaction.wait()
  }

  const Escrow = await ethers.getContractFactory('Escrow')
  const escrow = await Escrow.deploy(
                        realEstate.address,
                        seller.address,
                        inspector.address,
                        lender.address
                    )
  await escrow.deployed()

  console.log(`Deployed Escrow Contract at: ${escrow.address}`)
  console.log(`Listing 3 properties...\n`)

  for(let i = 0;i<3;i++){
    // Approve property
    transaction = await realEstate.connect(seller).approve(escrow.address,i+1);
    await transaction.wait();
  }

  // Listing properties
  transaction = await escrow.connect(seller).list(1, tokens(20), tokens(10), buyer.address);
  await transaction.wait()

  transaction = await escrow.connect(seller).list(2, tokens(15), tokens(5), buyer.address);
  await transaction.wait()

  transaction = await escrow.connect(seller).list(3, tokens(10), tokens(5), buyer.address);
  await transaction.wait()

  console.log('Finished...')


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
