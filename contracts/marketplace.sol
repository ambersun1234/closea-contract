// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

error Marketplace__NoFund();
error Marketplace__TransferFailed();
error Marketplace__PriceTooLow();
error Marketplace__NotApproved();
error Marketplace__NotOwner();
error Marketplace__AlreadyListed(address nftContractAddress, uint256 tokenID);
error Marketplace__NotListed(address nftContractAddress, uint256 tokenID);
error Marketplace__PriceNotEnough(
    address nftContractAddress,
    uint256 tokenID,
    uint256 price
);

contract Marketplace {
    struct Item {
        uint256 price;
        address seller;
    }

    struct SoldItemRecord {
        address nftContractAddress;
        uint256 tokenID;
        uint256 soldPrice;
    }

    mapping(address => mapping(uint256 => Item)) private listingItems;
    mapping(address => SoldItemRecord[]) private soldItems;

    event ItemListed(
        address indexed seller,
        address indexed nftContractAddress,
        uint256 indexed tokenID,
        uint256 price
    );
    event ItemUnList(
        address indexed nftContractAddress,
        uint256 indexed tokenID
    );
    event ItemTransferred(
        address indexed buyer,
        address indexed nftContractAddress,
        uint256 indexed tokenID
    );

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

    function isListed(
        address nftContractAddress,
        uint256 tokenID
    ) internal view returns (bool) {
        Item memory item = listingItems[nftContractAddress][tokenID];
        return item.price > 0;
    }

    function removeItem(address nftContractAddress, uint256 tokenID) internal {
        delete (listingItems[nftContractAddress][tokenID]);
    }

    function transferItem(
        address nftContractAddress,
        uint256 tokenID,
        address seller,
        address buyer
    ) internal {
        IERC721(nftContractAddress).safeTransferFrom(seller, buyer, tokenID);
        emit ItemTransferred(buyer, nftContractAddress, tokenID);
    }

    function listNFT(
        address nftContractAddress,
        uint256 tokenID,
        uint256 price
    )
        external
        isNFTOwner(nftContractAddress, tokenID, msg.sender)
        isApproved(nftContractAddress, tokenID)
    {
        if (isListed(nftContractAddress, tokenID)) {
            revert Marketplace__AlreadyListed(nftContractAddress, tokenID);
        }

        if (price <= 0) {
            revert Marketplace__PriceTooLow();
        }

        listingItems[nftContractAddress][tokenID] = Item(price, msg.sender);

        emit ItemListed(msg.sender, nftContractAddress, tokenID, price);
    }

    function unListNFT(
        address nftContractAddress,
        uint256 tokenID
    ) external isNFTOwner(nftContractAddress, tokenID, msg.sender) {
        if (!isListed(nftContractAddress, tokenID)) {
            revert Marketplace__NotListed(nftContractAddress, tokenID);
        }

        removeItem(nftContractAddress, tokenID);

        emit ItemUnList(nftContractAddress, tokenID);
    }

    function updateListNFT(
        address nftContractAddress,
        uint256 tokenID,
        uint256 newPrice
    ) external isNFTOwner(nftContractAddress, tokenID, msg.sender) {
        if (!isListed(nftContractAddress, tokenID)) {
            revert Marketplace__NotListed(nftContractAddress, tokenID);
        }

        listingItems[nftContractAddress][tokenID].price = newPrice;

        emit ItemListed(msg.sender, nftContractAddress, tokenID, newPrice);
    }

    function purchaseNFT(
        address nftContractAddress,
        uint256 tokenID
    ) external payable {
        if (!isListed(nftContractAddress, tokenID)) {
            revert Marketplace__NotListed(nftContractAddress, tokenID);
        }

        Item memory item = listingItems[nftContractAddress][tokenID];
        if (msg.value < item.price) {
            revert Marketplace__PriceNotEnough(
                nftContractAddress,
                tokenID,
                item.price
            );
        }

        soldItems[item.seller].push(
            SoldItemRecord(nftContractAddress, tokenID, msg.value)
        );
        removeItem(nftContractAddress, tokenID);
        transferItem(nftContractAddress, tokenID, item.seller, msg.sender);
    }

    function withdraw() external {
        uint256 earnedAmount = 0;

        for (uint256 index = 0; index < soldItems[msg.sender].length; index++) {
            earnedAmount += soldItems[msg.sender][index].soldPrice;
        }

        if (earnedAmount <= 0) {
            revert Marketplace__NoFund();
        }

        delete soldItems[msg.sender];

        (bool success, ) = payable(msg.sender).call{value: earnedAmount}("");
        if (!success) {
            revert Marketplace__TransferFailed();
        }
    }

    function getSoldItems() public view returns (SoldItemRecord[] memory) {
        return soldItems[msg.sender];
    }
}
