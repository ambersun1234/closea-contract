// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Dog is ERC721 {
    uint256 public tokenID;
    string public constant TOKEN_URI =
        "ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d";

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
