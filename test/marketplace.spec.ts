import { ContractTransaction } from "ethers";
import { deployments, ethers, getNamedAccounts } from "hardhat";
import { assert, expect } from "chai";

import { Dog, Marketplace } from "../typechain-types";

describe("marketplace", () => {
    const AlreadyListedError = "Marketplace__AlreadyListed";
    const NotNFTOwner = "Marketplace__NotOwner";
    const NotApproved = "Marketplace__NotApproved";
    const PriceTooLow = "Marketplace__PriceTooLow";
    const statusSuccess = 1;

    let marketplace: Marketplace;
    let dogNft: Dog;
    let deployer: string;

    const transactionStatus = async (
        response: ContractTransaction
    ): Promise<number> => {
        const receipt = await response.wait(1);
        return receipt.status!;
    };

    beforeEach(async () => {
        deployer = (await getNamedAccounts())["deployer"];
        await deployments.fixture(["marketplace", "nft"]);

        marketplace = await ethers.getContract("Marketplace", deployer);
        dogNft = await ethers.getContract("Dog", deployer);
    });

    describe("listNFT", () => {
        const mint = async () => {
            const mintResponse = await dogNft.mint();
            assert.equal(await transactionStatus(mintResponse), statusSuccess);
        };

        const approve = async () => {
            const approveResponse = await dogNft.approve(
                marketplace.address,
                0
            );
            assert.equal(
                await transactionStatus(approveResponse),
                statusSuccess
            );
        };

        it("Should list NFT successfully", async () => {
            mint();
            approve();

            const listResponse = await marketplace.listNFT(
                dogNft.address,
                0,
                1
            );
            assert.equal(await transactionStatus(listResponse), statusSuccess);
        });

        it("Should revert if item already listed", async () => {
            mint();
            approve();

            const listResponse = await marketplace.listNFT(
                dogNft.address,
                0,
                1
            );
            assert.equal(await transactionStatus(listResponse), statusSuccess);

            await expect(
                marketplace.listNFT(dogNft.address, 0, 1)
            ).to.be.revertedWithCustomError(marketplace, AlreadyListedError);
        });

        it("Should revert if user is not nft owner", async () => {
            mint();
            approve();

            const people = (await ethers.getSigners())[1];
            const peopleMarketplace = marketplace.connect(people);

            await expect(
                peopleMarketplace.listNFT(dogNft.address, 0, 1)
            ).to.be.revertedWithCustomError(marketplace, NotNFTOwner);
        });

        it("Should revert if not approved", async () => {
            mint();

            await expect(
                marketplace.listNFT(dogNft.address, 0, 1)
            ).to.be.revertedWithCustomError(marketplace, NotApproved);
        });

        it("Should revert if list price is less than zero", async () => {
            mint();
            approve();

            await expect(
                marketplace.listNFT(dogNft.address, 0, 0)
            ).to.be.revertedWithCustomError(marketplace, PriceTooLow);
        });

        it("Should emit an event when item listed", async () => {
            const listPrice = 1;
            mint();
            approve();

            const response = await marketplace.listNFT(
                dogNft.address,
                0,
                listPrice
            );
            const receipt = await response.wait(1);

            expect(response).to.be.emit(marketplace, "ItemListed");

            const eventData = receipt.events![0].args!;
            assert.equal(eventData[0], deployer);
            assert.equal(eventData[1], dogNft.address);
            assert.equal(eventData[2], 0);
            assert.equal(eventData[3], listPrice);
        });
    });
});
