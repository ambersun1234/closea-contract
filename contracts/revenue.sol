// SPDX-License-Identifier: AGPL-3.0

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

error Revenue__InvalidShare();

contract Revenue is Ownable {
    uint8 public share;

    constructor(uint8 _share) isPercentageValid(_share) {
        share = _share;
    }

    modifier isPercentageValid(uint8 _share) {
        if (_share <= 0 || _share >= 100) {
            revert Revenue__InvalidShare();
        }

        _;
    }

    function updateShare(
        uint8 _share
    ) external onlyOwner isPercentageValid(_share) {
        share = _share;
    }

    function calculateShare(uint256 price) public view returns (uint256) {
        return price * share / 100;
    }
}
