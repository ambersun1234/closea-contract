import { DevelopmentChains, ChainMapping } from "../helper-hardhat.config";
import fs from "fs";
import * as path from "path";

export const isDevelopChain = (chainID: number) => {
    return DevelopmentChains.includes(ChainMapping[chainID]);
};

export const readSVGs = (dirPath: string): string[] => {
    let svgs: string[] = [];

    fs.readdirSync(dirPath).forEach((file) => {
        const absolutePath = path.join(path.resolve(dirPath), file);
        svgs.push(fs.readFileSync(absolutePath, { encoding: "utf8" }));
    });

    return svgs;
};
