import { assert, expect } from "chai";
import { Contract } from "ethers";
import { deployments, ethers, getNamedAccounts } from "hardhat";

describe("Revenue", () => {
    const invalidShare = "Revenue__InvalidShare";

    let deployer: string;
    let revenue: Contract;

    beforeEach(async () => {
        deployer = (await getNamedAccounts())["deployer"];
        await deployments.fixture(["revenue"]);

        revenue = await ethers.getContract("Revenue");
    });

    describe("constructor", () => {
        it("Should set share correctly", async () => {
            assert.equal(await revenue.share(), 10);
        });
    });

    describe("updateShare", () => {
        it("Should successfully update share", async () => {
            await revenue.updateShare(50);
            assert.equal(await revenue.share(), 50);
        });

        it("Should fail if share <= 0", async () => {
            await expect(revenue.updateShare(0)).to.be.revertedWithCustomError(
                revenue,
                invalidShare
            );
        });

        it("Should fail if share >= 100", async () => {
            await expect(
                revenue.updateShare(100)
            ).to.be.revertedWithCustomError(revenue, invalidShare);
            await expect(
                revenue.updateShare(200)
            ).to.be.revertedWithCustomError(revenue, invalidShare);
        });

        it("Should fail if other people try to update share", async () => {
            const people = (await ethers.getSigners())[2];
            const peopleRevenue = revenue.connect(people.address);

            await expect(peopleRevenue.updateShare(2)).to.be.rejected;
        });
    });

    describe("calculateShare", () => {
        it("Should calculate share correctly", async () => {
            let share;
            const price = ethers.utils.parseEther("1");

            share = await revenue.calculateShare(price);
            assert.equal(
                share.toString(),
                ethers.utils.parseEther("0.1").toString()
            );

            await revenue.updateShare(5);
            share = await revenue.calculateShare(price);
            assert.equal(
                share.toString(),
                ethers.utils.parseEther("0.05").toString()
            );
        });
    });
});
