import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployMarketPlace: DeployFunction = async (
  hre: HardhatRuntimeEnvironment
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  await deploy("Marketplace", {
    from: deployer,
    args: [10],
    log: true,
    waitConfirmations: 1,
  });
};

deployMarketPlace.tags = ["marketplace"];

export default deployMarketPlace;
