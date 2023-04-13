# Closea Contract
![](https://github.com/ambersun1234/closea-contract/actions/workflows/lint.yaml/badge.svg)
![](https://github.com/ambersun1234/closea-contract/actions/workflows/unitTest.yaml/badge.svg)
![](https://img.shields.io/github/license/ambersun1234/closea-contract)

![](./closea.jpg)

Smart contracts for [Closea](https://github.com/ambersun1234/closea)

## Introduction
This project contains the marketplace smart contract that used for decentralized NFT marketplace project - [Closea](https://github.com/ambersun1234/closea)

## Features
+ List/Unlist NFT on this marketplace
+ Update price of listed NFT on this marketplace
+ Purchase NFT from this marketplace
+ Withdraw all the funds that you got from selling NFTs

## Prerequisite
Copy [.env.example](./.env.example) and fill in your information such as rpc url, private key ... etc.

## Build
```shell
$ yarn install
$ yarn hardhat compile
```

## Test
```shell
$ yarn hardhat test
```

## Coverage
```shell
$ yarn hardhat coverage
```

File              |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
------------------|----------|----------|----------|----------|----------------|
 contracts/       |      100 |    96.43 |      100 |    97.78 |                |
  marketplace.sol |      100 |    96.43 |      100 |    97.78 |            185 |
 contracts/nfts/  |       50 |      100 |    66.67 |       75 |                |
  dog.sol         |       50 |      100 |    66.67 |       75 |             24 |
  doggy.sol       |       50 |      100 |    66.67 |       75 |             24 |
------------------|----------|----------|----------|----------|----------------|
All files         |    93.75 |    96.43 |    88.24 |    94.34 |                |
------------------|----------|----------|----------|----------|----------------|

## Author
+ [ambersun1234](https://github.com/ambersun1234)

## License
This project is licensed under GNU General Public License v3 - see the [License](./LICENSE) file for more detail