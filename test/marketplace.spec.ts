import { BaseContract, BigNumber, ContractTransaction } from "ethers";
import { deployments, ethers, getNamedAccounts } from "hardhat";
import { assert, expect } from "chai";

import { Dog, Marketplace } from "../typechain-types";
import { marketplaceSol } from "../typechain-types/contracts";

describe("marketplace", () => {
    const AlreadyListed = "Marketplace__AlreadyListed";
    const NotNFTOwner = "Marketplace__NotOwner";
    const NotApproved = "Marketplace__NotApproved";
    const PriceTooLow = "Marketplace__PriceTooLow";
    const PriceNotEnough = "Marketplace__PriceNotEnough";
    const NotListed = "Marketplace__NotListed";
    const NoFund = "Marketplace__NoFund";
    const TransferFailed = "Marketplace__TransferFailed";

    const ItemTransferred = "ItemTransferred";
    const ItemListed = "ItemListed";
    const ItemUnList = "ItemUnList";

    const statusSuccess = 1;

    let marketplace: Marketplace;
    let dogNft: Dog;
    let doggyNft: Dog;
    let deployer: string;

    const transactionStatus = async (
        response: ContractTransaction
    ): Promise<number> => {
        const receipt = await response.wait(1);
        return receipt.status!;
    };

    const mint = async (contract: Dog) => {
        const mintResponse = await contract.mint();
        assert.equal(await transactionStatus(mintResponse), statusSuccess);
    };

    const approve = async (
        contract: Dog,
        approveContract: BaseContract,
        tokenID: number
    ) => {
        const approveResponse = await contract.approve(
            approveContract.address,
            tokenID
        );
        assert.equal(await transactionStatus(approveResponse), statusSuccess);
    };

    const soldItemsEqual = (
        actual: Marketplace.SoldItemRecordStructOutput[],
        expect: Marketplace.SoldItemRecordStruct[]
    ): boolean => {
        if (actual.length !== expect.length) return false;

        for (let i = 0; i < actual.length; i++) {
            assert.equal(
                actual[i].nftContractAddress,
                expect[i].nftContractAddress
            );
            assert.equal(
                actual[i].tokenID.toString(),
                expect[i].tokenID.toString()
            );
            assert.equal(
                actual[i].soldPrice.toString(),
                expect[i].soldPrice.toString()
            );
        }

        return true;
    };

    const gasPrice = async (
        response: ContractTransaction
    ): Promise<BigNumber> => {
        const receipt = await response.wait(1);
        const { gasUsed, effectiveGasPrice } = receipt;
        return gasUsed.mul(effectiveGasPrice);
    };

    beforeEach(async () => {
        deployer = (await getNamedAccounts())["deployer"];
        await deployments.fixture(["marketplace", "nft"]);

        marketplace = await ethers.getContract("Marketplace", deployer);
        dogNft = await ethers.getContract("Dog", deployer);
        doggyNft = await ethers.getContract("Doggy", deployer);
    });

    describe("listNFT", () => {
        it("Should list NFT successfully", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);

            const listResponse = await marketplace.listNFT(
                dogNft.address,
                0,
                1
            );
            assert.equal(await transactionStatus(listResponse), statusSuccess);
        });

        it("Should revert if item already listed", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);

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
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);

            const people = (await ethers.getSigners())[1];
            const peopleMarketplace = marketplace.connect(people);

            await expect(
                peopleMarketplace.listNFT(dogNft.address, 0, 1)
            ).to.be.revertedWithCustomError(marketplace, NotNFTOwner);
        });

        it("Should revert if not approved", async () => {
            await mint(dogNft);

            await expect(
                marketplace.listNFT(dogNft.address, 0, 1)
            ).to.be.revertedWithCustomError(marketplace, NotApproved);
        });

        it("Should revert if list price is less than zero", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);

            await expect(
                marketplace.listNFT(dogNft.address, 0, 0)
            ).to.be.revertedWithCustomError(marketplace, PriceTooLow);
        });

        it("Should emit an event when item listed", async () => {
            const listPrice = 1;
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);

            const response = await marketplace.listNFT(
                dogNft.address,
                0,
                listPrice
            );
            const receipt = await response.wait(1);

            expect(response).to.be.emit(marketplace, ItemListed);

            const eventData = receipt.events![0].args!;
            assert.equal(eventData[0], deployer);
            assert.equal(eventData[1], dogNft.address);
            assert.equal(eventData[2], 0);
            assert.equal(eventData[3], listPrice);
        });
    });

    describe("purchaseNFT", () => {
        it("Should revert if nft not listed", async () => {
            await mint(dogNft);

            await expect(
                marketplace.purchaseNFT(dogNft.address, 0, {
                    value: ethers.utils.parseEther("0.001")
                })
            ).to.be.revertedWithCustomError(marketplace, NotListed);
        });

        it("Should revert if price lower than sell price", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);

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
            const peopleMarketplace = marketplace.connect(people);

            await mint(dogNft);

            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, price);

            const response = await peopleMarketplace.purchaseNFT(
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
            const peopleMarketplace = marketplace.connect(people);

            await mint(dogNft);
            await approve(dogNft, marketplace, 0);

            await marketplace.listNFT(dogNft.address, 0, price);
            const response = await peopleMarketplace.purchaseNFT(
                dogNft.address,
                0,
                {
                    value: ethers.utils.parseEther("2")
                }
            );
            assert.equal(await transactionStatus(response), statusSuccess);
        });

        it("Should remove item from the marketplace after purchase successfully", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);
            await marketplace.purchaseNFT(dogNft.address, 0, { value: 2 });
            await expect(
                marketplace.purchaseNFT(dogNft.address, 0)
            ).to.be.revertedWithCustomError(marketplace, NotListed);
        });

        it("Should have the nft after purchase successfully", async () => {
            const people = (await ethers.getSigners())[1];
            const peopleMarketplace = marketplace.connect(people);

            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);
            await peopleMarketplace.purchaseNFT(dogNft.address, 0, {
                value: 2
            });
            assert.equal(await dogNft.ownerOf(0), people.address);
        });

        it("Should emit purchase success event after purchase successfully", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);

            const response = await marketplace.purchaseNFT(dogNft.address, 0, {
                value: 2
            });
            const receipt = await response.wait(1);

            expect(response).to.be.emit(marketplace, ItemTransferred);

            const eventData = receipt.events![1].args!;
            assert.equal(eventData[0], deployer);
            assert.equal(eventData[1], dogNft.address);
            assert.equal(eventData[2], 0);
        });
    });

    describe("unList", () => {
        it("Should revert if not nft owner", async () => {
            const people = (await ethers.getSigners())[1];
            const peopleContract = marketplace.connect(people);

            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);

            await expect(
                peopleContract.unListNFT(dogNft.address, 0)
            ).to.be.revertedWithCustomError(marketplace, NotNFTOwner);
        });

        it("Should revert if nft not listed", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await expect(
                marketplace.unListNFT(dogNft.address, 0)
            ).to.be.revertedWithCustomError(marketplace, NotListed);
        });

        it("Shouldn't be able to buy nft after unlist", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);
            await marketplace.unListNFT(dogNft.address, 0);
            await expect(
                marketplace.purchaseNFT(dogNft.address, 0)
            ).to.be.revertedWithCustomError(marketplace, NotListed);
        });

        it("Should unlist successfully", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);

            const response = await marketplace.unListNFT(dogNft.address, 0);
            assert.equal(await transactionStatus(response), statusSuccess);
        });

        it("Should emit event when successfully unlist", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);

            await expect(marketplace.unListNFT(dogNft.address, 0)).to.be.emit(
                marketplace,
                ItemUnList
            );
        });
    });

    describe("updateList", () => {
        it("Should revert if non-owner attempt to change price", async () => {
            const people = (await ethers.getSigners())[1];
            const peopleMarketplace = marketplace.connect(people);

            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);

            await expect(
                peopleMarketplace.updateListNFT(dogNft.address, 0, 2)
            ).to.be.revertedWithCustomError(marketplace, NotNFTOwner);
        });

        it("Should revert if item not listed", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);

            await expect(
                marketplace.updateListNFT(dogNft.address, 0, 2)
            ).to.be.revertedWithCustomError(marketplace, NotListed);
        });

        it("Should update item successfully", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);

            const response = await marketplace.updateListNFT(
                dogNft.address,
                0,
                2
            );
            assert.equal(await transactionStatus(response), statusSuccess);
        });

        it("Should use new price to mint after update list successfully", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);
            await marketplace.updateListNFT(dogNft.address, 0, 2);

            await expect(
                marketplace.purchaseNFT(dogNft.address, 0, { value: 1 })
            ).to.be.revertedWithCustomError(marketplace, PriceNotEnough);
            const response = await marketplace.purchaseNFT(dogNft.address, 0, {
                value: 2
            });
            assert.equal(await transactionStatus(response), statusSuccess);
        });

        it("Should emit event after item updated", async () => {
            const newPrice = 2;
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);

            const response = await marketplace.updateListNFT(
                dogNft.address,
                0,
                newPrice
            );
            const receipt = await response.wait(1);
            expect(response).to.be.emit(marketplace, ItemListed);

            const eventData = receipt.events![0].args!;
            assert.equal(eventData[0], deployer);
            assert.equal(eventData[1], dogNft.address);
            assert.equal(eventData[2], 0);
            assert.equal(eventData[3], newPrice);
        });
    });

    describe("withdraw", () => {
        it("Should revert if no one bought your nft", async () => {
            await expect(marketplace.withdraw()).to.be.revertedWithCustomError(
                marketplace,
                NoFund
            );
        });

        it("Should revert if someone bought other's nft", async () => {
            const people = (await ethers.getSigners())[1];
            const peopleMarketplace = marketplace.connect(people);

            const people2 = (await ethers.getSigners())[2];
            const peopleDogNft = dogNft.connect(people);
            const people2Marketplace = marketplace.connect(people2);

            await mint(peopleDogNft);
            await approve(peopleDogNft, marketplace, 0);
            await peopleMarketplace.listNFT(peopleDogNft.address, 0, 1);
            await people2Marketplace.purchaseNFT(peopleDogNft.address, 0, {
                value: 1
            });

            await expect(marketplace.withdraw()).to.be.revertedWithCustomError(
                marketplace,
                NoFund
            );
        });

        it("Should withdraw money if 1 nft sold", async () => {
            const price = 1;
            const people = (await ethers.getSigners())[1];
            const peopleMarketplace = marketplace.connect(people);

            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, price);
            await peopleMarketplace.purchaseNFT(dogNft.address, 0, {
                value: price
            });

            const previousBalance = await ethers.provider.getBalance(deployer);
            const response = await marketplace.withdraw();
            const gas = await gasPrice(response);
            assert.equal(await transactionStatus(response), statusSuccess);

            const currentBalance = await ethers.provider.getBalance(deployer);
            assert.equal(
                currentBalance.add(gas).toString(),
                previousBalance.add(price).toString()
            );
        });

        it("Should withdraw money if 1 nft sold but sold price is higher than default price", async () => {
            const price = ethers.utils.parseEther("0.001");
            const people = (await ethers.getSigners())[1];
            const peopleMarketplace = marketplace.connect(people);

            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);
            await peopleMarketplace.purchaseNFT(dogNft.address, 0, {
                value: price
            });

            const previousBalance = await ethers.provider.getBalance(deployer);
            const response = await marketplace.withdraw();
            const gas = await gasPrice(response);
            assert.equal(await transactionStatus(response), statusSuccess);

            const currentBalance = await ethers.provider.getBalance(deployer);
            assert.equal(
                currentBalance.add(gas).toString(),
                previousBalance.add(price).toString()
            );
        });

        it("Should withdraw money if 2 different nft sold", async () => {
            const price = ethers.utils.parseEther("0.001");
            const people = (await ethers.getSigners())[1];
            const peopleMarketplace = marketplace.connect(people);

            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, price);
            await peopleMarketplace.purchaseNFT(dogNft.address, 0, {
                value: price
            });

            await mint(doggyNft);
            await approve(doggyNft, marketplace, 0);
            await marketplace.listNFT(doggyNft.address, 0, price);
            await peopleMarketplace.purchaseNFT(doggyNft.address, 0, {
                value: price
            });

            const previousBalance = await ethers.provider.getBalance(deployer);
            const response = await marketplace.withdraw();
            const gas = await gasPrice(response);
            assert.equal(await transactionStatus(response), statusSuccess);

            const currentBalance = await ethers.provider.getBalance(deployer);
            assert.equal(
                currentBalance.add(gas).toString(),
                previousBalance.add(price.mul(2)).toString()
            );
        });

        it("Shouldn't withdraw twice if already withdraw once", async () => {
            const price = 1;
            const people = (await ethers.getSigners())[1];
            const peopleMarketplace = marketplace.connect(people);

            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, price);
            await peopleMarketplace.purchaseNFT(dogNft.address, 0, {
                value: price
            });

            const previousBalance = await ethers.provider.getBalance(deployer);
            const response = await marketplace.withdraw();
            const gas = await gasPrice(response);
            assert.equal(await transactionStatus(response), statusSuccess);

            const currentBalance = await ethers.provider.getBalance(deployer);
            assert.equal(
                currentBalance.add(gas).toString(),
                previousBalance.add(price).toString()
            );

            await expect(marketplace.withdraw()).to.be.revertedWithCustomError(
                marketplace,
                NoFund
            );
        });
    });

    describe("getSoldItems", () => {
        it("Should return empty array if no one have bought", async () => {
            const soldItemArr: Marketplace.SoldItemRecordStruct[] =
                await marketplace.getSoldItems();
            assert.deepEqual(soldItemArr, []);
        });

        it("Should return array with 1 entry if 1 nft sold", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);
            await marketplace.purchaseNFT(dogNft.address, 0, { value: 1 });

            let expectedArr: Marketplace.SoldItemRecordStruct[] = [
                {
                    nftContractAddress: dogNft.address,
                    tokenID: BigNumber.from(0),
                    soldPrice: BigNumber.from(1)
                }
            ];
            const soldItemArr: Marketplace.SoldItemRecordStructOutput[] =
                await marketplace.getSoldItems();

            assert(soldItemsEqual(soldItemArr, expectedArr));
        });

        it("Should return array with 1 entry if 1 nft sold but sold price is higher than default price", async () => {
            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);
            await marketplace.purchaseNFT(dogNft.address, 0, { value: 2 });

            let expectedArr: Marketplace.SoldItemRecordStruct[] = [
                {
                    nftContractAddress: dogNft.address,
                    tokenID: BigNumber.from(0),
                    soldPrice: BigNumber.from(2)
                }
            ];
            const soldItemArr: Marketplace.SoldItemRecordStructOutput[] =
                await marketplace.getSoldItems();

            assert(soldItemsEqual(soldItemArr, expectedArr));
        });

        it("Should return array with 2 entry if 2 different nft sold", async () => {
            const people = (await ethers.getSigners())[1];
            const peopleMarketplace = marketplace.connect(people);

            await mint(dogNft);
            await approve(dogNft, marketplace, 0);
            await marketplace.listNFT(dogNft.address, 0, 1);
            await peopleMarketplace.purchaseNFT(dogNft.address, 0, { value: 1 });

            await mint(doggyNft);
            await approve(doggyNft, marketplace, 0);
            await marketplace.listNFT(doggyNft.address, 0, 1);
            await peopleMarketplace.purchaseNFT(doggyNft.address, 0, {
                value: 2
            });

            let expectedArr: Marketplace.SoldItemRecordStruct[] = [
                {
                    nftContractAddress: dogNft.address,
                    tokenID: BigNumber.from(0),
                    soldPrice: BigNumber.from(1)
                },
                {
                    nftContractAddress: doggyNft.address,
                    tokenID: BigNumber.from(0),
                    soldPrice: BigNumber.from(2)
                }
            ];
            const soldItemArr: Marketplace.SoldItemRecordStructOutput[] =
                await marketplace.getSoldItems();

            assert(soldItemsEqual(soldItemArr, expectedArr));
        });
    });
});
