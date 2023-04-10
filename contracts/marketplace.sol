// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

error Marketplace__PriceTooLow();
error Marketplace__NotApproved();
error Marketplace__NotOwner();
error Marketplace__AlreadyListed(address nftContractAddress, uint256 tokenID);

contract Marketplace {
    struct Listing {
        uint256 price;
        address seller;
    }
    mapping(address => mapping(uint256 => Listing)) private listingItems;

    event ItemListed(
        address indexed seller,
        address indexed nftContractAddress,
        uint256 indexed tokenID,
        uint256 price
    );

    modifier isListed(address nftContractAddress, uint256 tokenID) {
        Listing memory item = listingItems[nftContractAddress][tokenID];

        if (item.price > 0) {
            revert Marketplace__AlreadyListed(nftContractAddress, tokenID);
        }

        _;
    }

    modifier isNFTOwner(
        address nftContractAddress,
        uint256 tokenID,
        address spender
    ) {
        IERC721 nft = IERC721(nftContractAddress);

        if (nft.ownerOf(tokenID) != spender) {
            revert Marketplace__NotOwner();
        }

        _;
    }

    modifier isApproved(address nftContractAddress, uint256 tokenID) {
        IERC721 nft = IERC721(nftContractAddress);

        if (nft.getApproved(tokenID) != address(this)) {
            revert Marketplace__NotApproved();
        }

        _;
    }

    function listNFT(
        address nftContractAddress,
        uint256 tokenID,
        uint256 price
    )
        external
        isListed(nftContractAddress, tokenID)
        isNFTOwner(nftContractAddress, tokenID, msg.sender)
        isApproved(nftContractAddress, tokenID)
    {
        if (price <= 0) {
            revert Marketplace__PriceTooLow();
        }

        listingItems[nftContractAddress][tokenID] = Listing(
            price,
            address(this)
        );

        emit ItemListed(msg.sender, nftContractAddress, tokenID, price);
    }
}
