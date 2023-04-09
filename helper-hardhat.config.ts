export interface ChainMappingInterface {
    [key: number]: string;
}

export const ChainMapping: ChainMappingInterface = {
    11155111: "sepolia",
    31337: "hardhat"
};

export const DevelopmentChains = ["hardhat"];
