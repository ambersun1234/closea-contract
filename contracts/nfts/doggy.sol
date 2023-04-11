// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Doggy is ERC721 {
    uint256 public tokenID;
    string public constant TOKEN_URI =
        "ipfs://QmdryoExpgEQQQgJPoruwGJyZmz6SqV4FRTX1i73CT3iXn";

    constructor() ERC721("DogNFT", "DNFT") {
        tokenID = 0;
    }

    function mint() public {
        _safeMint(msg.sender, tokenID);
        tokenID += 1;
    }

    function tokenURI(
        uint256 tokenID
    ) public view override returns (string memory) {
        return TOKEN_URI;
    }
}
