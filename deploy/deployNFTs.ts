import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { isDevelopChain } from "../utils/utils";
import { ChainMapping } from "../helper-hardhat.config";

const deployNFTs: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, network, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainID = network.config.chainId!;

    if (!isDevelopChain(chainID)) {
        return;
    }

    const args: any[] = [];

    console.log(`deploying to ${ChainMapping[chainID]}(${chainID})...`);
    console.log(`deploying with argument ${args}`);

    await deploy("Dog", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: 1
    });

    await deploy("Doggy", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: 1
    });
};

deployNFTs.tags = ["nft"];

export default deployNFTs;
