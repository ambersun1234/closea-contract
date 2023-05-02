import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployRevenue: DeployFunction = async (
  hre: HardhatRuntimeEnvironment
) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  await deploy("Revenue", {
    from: deployer,
    args: [10],
    log: true,
    waitConfirmations: 1,
  });
};

deployRevenue.tags = ["revenue"];

export default deployRevenue;
