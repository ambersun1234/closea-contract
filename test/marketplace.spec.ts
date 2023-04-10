import { ContractTransaction } from "ethers";
import { deployments, ethers, getNamedAccounts } from "hardhat";
import { assert, expect } from "chai";

import { Dog, Marketplace } from "../typechain-types";

describe("marketplace", () => {
    const AlreadyListed = "Marketplace__AlreadyListed";
    const NotNFTOwner = "Marketplace__NotOwner";
    const NotApproved = "Marketplace__NotApproved";
    const PriceTooLow = "Marketplace__PriceTooLow";
    const PriceNotEnough = "Marketplace__PriceNotEnough";
    const NotListed = "Marketplace__NotListed";
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
    const mint = async () => {
        const mintResponse = await dogNft.mint();
        assert.equal(await transactionStatus(mintResponse), statusSuccess);
    };

    const approve = async (tokenID: number) => {
        const approveResponse = await dogNft.approve(
            marketplace.address,
            tokenID
        );
        assert.equal(await transactionStatus(approveResponse), statusSuccess);
    };

    beforeEach(async () => {
        deployer = (await getNamedAccounts())["deployer"];
        await deployments.fixture(["marketplace", "nft"]);

        marketplace = await ethers.getContract("Marketplace", deployer);
        dogNft = await ethers.getContract("Dog", deployer);
    });

    describe("listNFT", () => {
        it("Should list NFT successfully", async () => {
            await mint();
            await approve(0);

            const listResponse = await marketplace.listNFT(
                dogNft.address,
                0,
                1
            );
            assert.equal(await transactionStatus(listResponse), statusSuccess);
        });

        it("Should revert if item already listed", async () => {
            await mint();
            await approve(0);

            const listResponse = await marketplace.listNFT(
                dogNft.address,
                0,
                1
            );
            assert.equal(await transactionStatus(listResponse), statusSuccess);

            await expect(
                marketplace.listNFT(dogNft.address, 0, 1)
            ).to.be.revertedWithCustomError(marketplace, AlreadyListed);
        });

        it("Should revert if user is not nft owner", async () => {
            await mint();
            await approve(0);

            const people = (await ethers.getSigners())[1];
            const peopleMarketplace = marketplace.connect(people);

            await expect(
                peopleMarketplace.listNFT(dogNft.address, 0, 1)
            ).to.be.revertedWithCustomError(marketplace, NotNFTOwner);
        });

        it("Should revert if not approved", async () => {
            await mint();

            await expect(
                marketplace.listNFT(dogNft.address, 0, 1)
            ).to.be.revertedWithCustomError(marketplace, NotApproved);
        });

        it("Should revert if list price is less than zero", async () => {
            await mint();
            await approve(0);

            await expect(
                marketplace.listNFT(dogNft.address, 0, 0)
            ).to.be.revertedWithCustomError(marketplace, PriceTooLow);
        });

        it("Should emit an event when item listed", async () => {
            const listPrice = 1;
            await mint();
            await approve(0);

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

    describe("purchaseNFT", () => {
        it("Should revert if nft not listed", async () => {
            await mint();

            await expect(
                marketplace.purchaseNFT(dogNft.address, 0, {
                    value: ethers.utils.parseEther("0.001")
                })
            ).to.be.revertedWithCustomError(marketplace, NotListed);
        });

        it("Should revert if price lower than sell price", async () => {
            await mint();
            await approve(0);

            await marketplace.listNFT(
                dogNft.address,
                0,
                ethers.utils.parseEther("1")
            );
            await expect(
                marketplace.purchaseNFT(dogNft.address, 0, {
                    value: ethers.utils.parseEther("0.01")
                })
            ).to.be.revertedWithCustomError(marketplace, PriceNotEnough);
        });

        it("Should purchase successfully if price equal to sell price", async () => {
            const price = ethers.utils.parseEther("1");
            const people = (await ethers.getSigners())[1];
            const peopleMarketplaceContract = marketplace.connect(people);

            await mint();

            await approve(0);
            await marketplace.listNFT(dogNft.address, 0, price);

            const response = await peopleMarketplaceContract.purchaseNFT(
                dogNft.address,
                0,
                {
                    value: price
                }
            );
            assert.equal(await transactionStatus(response), statusSuccess);
        });

        it("Should purchase successfully if price greater than sell price", async () => {
            const price = ethers.utils.parseEther("1");
            const people = (await ethers.getSigners())[1];
            const peopleMarketplaceContract = marketplace.connect(people);

            await mint();
            await approve(0);

            await marketplace.listNFT(dogNft.address, 0, price);
            const response = await peopleMarketplaceContract.purchaseNFT(
                dogNft.address,
                0,
                {
                    value: ethers.utils.parseEther("2")
                }
            );
            assert.equal(await transactionStatus(response), statusSuccess);
        });

        it("Should remove item from the marketplace after purchase successfully", async () => {
            await mint();
            await approve(0);
            await marketplace.listNFT(dogNft.address, 0, 1);
            await marketplace.purchaseNFT(dogNft.address, 0, { value: 2 });
            await expect(
                marketplace.purchaseNFT(dogNft.address, 0)
            ).to.be.revertedWithCustomError(marketplace, NotListed);
        });

        it("Should have the nft after purchase successfully", async () => {
            const people = (await ethers.getSigners())[1];
            const peopleMarketplaceContract = marketplace.connect(people);

            await mint();
            await approve(0);
            await marketplace.listNFT(dogNft.address, 0, 1);
            await peopleMarketplaceContract.purchaseNFT(dogNft.address, 0, {
                value: 2
            });
            assert.equal(await dogNft.ownerOf(0), people.address);
        });

        it("Should emit purchase success event after purchase successfully", async () => {
            await mint();
            await approve(0);
            await marketplace.listNFT(dogNft.address, 0, 1);

            const response = await marketplace.purchaseNFT(dogNft.address, 0, {
                value: 2
            });
            const receipt = await response.wait(1);

            expect(response).to.be.emit(marketplace, "ItemTransferred");

            const eventData = receipt.events![1].args!;
            assert.equal(eventData[0], deployer);
            assert.equal(eventData[1], dogNft.address);
            assert.equal(eventData[2], 0);
        });
    });
});
