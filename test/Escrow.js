const { expect } = require('chai')
const { ethers } = require('hardhat')

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {
    let buyer, seller, inspector, lender
    let realEstate, escrow

    beforeEach(async () => {

        // Get fake metamask users or accounts given by hardhat
        [buyer, seller, inspector, lender] = await ethers.getSigners()
        


        // Deploy Real Estate
        const RealEstate = await ethers.getContractFactory('RealEstate')
        realEstate = await RealEstate.deploy()

        // Mint
        let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmQUozrHLAusXDxrvsESJ3PYB3rUeUuBAvVWw6nop2uu7c/1.png")
        await transaction.wait()

        const Escrow = await ethers.getContractFactory('Escrow')
        escrow = await Escrow.deploy(
            realEstate.address,
            seller.address,
            inspector.address,
            lender.address
        )

        // Approve property
        transaction = await realEstate.connect(seller).approve(escrow.address,1);
        await transaction.wait();

        // List property
        transaction = await escrow.connect(seller).list(1, tokens(10), tokens(5), buyer.address);
        await transaction.wait()
    })

    describe('Deployment', () => { 

        it("Returns NFT Address", async () => {
            const result = await escrow.nftAddress()
            expect(result).to.be.equal(realEstate.address)
        })

        it("Returns Seller Address", async () => {
            const result = await escrow.seller()
            expect(result).to.be.equal(seller.address)
        })

        it("Returns Inspector Address", async () => {
            const result = await escrow.inspector()
            expect(result).to.be.equal(inspector.address)
        })

        it("Returns Lender Address", async () => {
            const result = await escrow.lender()
            expect(result).to.be.equal(lender.address)
        })

    })

    describe('listing', () => { 

        it("Updates as Listed", async () => {
            expect(await escrow.isListed(1)).to.be.equal(true);
        })

        it("Updates Ownership", async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
        })

        it("Return Purchase Price", async () => {
            const result = await escrow.purchasePrice(1);
            expect(result).to.be.equal(tokens(10));
        })

        it("Return Escrow Amount", async () => {
            const result = await escrow.escrowAmount(1);
            expect(result).to.be.equal(tokens(5));
        })

        it("Return Buyers Address", async () => {
            const result = await escrow.buyer(1);
            expect(result).to.be.equal(buyer.address);
        })
    })


    describe('Deposits', () => {
        it('Updates contract balance', async () => {
            const transaction = await escrow.connect(buyer).depositEarnest(1, {value: tokens(5)});
            await transaction.wait();
            const result = await escrow.getBalance();
            expect(result).to.be.equal(tokens(5));
        })
    })

    describe('Inspection', () => {
        it('Updates inspection status', async () => {
            const transaction = await escrow.connect(inspector).updateInspectionStatus(1,true);
            await transaction.wait();
            const result = await escrow.inspectionPassed(1);
            expect(result).to.be.equal(true);
        })
    })

    describe('Approval', () => {
        it('Updates approval status', async () => {
            let transaction = await escrow.connect(buyer).approveSale(1);
            await transaction.wait();

            transaction = await escrow.connect(seller).approveSale(1);
            await transaction.wait();

            transaction = await escrow.connect(lender).approveSale(1);
            await transaction.wait();
            
            expect(await escrow.approval(1,buyer.address)).to.be.equal(true);
            expect(await escrow.approval(1,seller.address)).to.be.equal(true);
            expect(await escrow.approval(1,lender.address)).to.be.equal(true);
        })
    })

    describe('Sale', async () => {
        beforeEach(async () => {
            let transaction = await escrow.connect(buyer).depositEarnest(1, {value: tokens(5)});
            await transaction.wait();

            transaction = await escrow.connect(inspector).updateInspectionStatus(1,true);
            await transaction.wait();

            transaction = await escrow.connect(buyer).approveSale(1);
            await transaction.wait();

            transaction = await escrow.connect(seller).approveSale(1);
            await transaction.wait();

            transaction = await escrow.connect(lender).approveSale(1);
            await transaction.wait();

            await lender.sendTransaction({to: escrow.address, value: tokens(5)});

            transaction = await escrow.connect(seller).finalizeSale(1);
            await transaction.wait();
        })

        it('Updates balance', async () => {
            expect(await escrow.getBalance()).to.be.equal(0);
        })

        it('Updates ownership', async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
        })
    })
    

})
