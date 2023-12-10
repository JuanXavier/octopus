// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {ChainopolySetup as Setup} from "../libraries/ChainopolySetup.sol";

interface IBoard {
  function outOfJailCardsSupply() external pure returns (uint8); // not here

  function luxuryTax() external pure returns (uint8); // not here

  function buildingPrice(uint256 position) external pure returns (uint256);

  function priceOf(uint256 position) external view returns (uint256);

  function positionName(uint256 position) external view returns (string memory);

  function blocktrainCard()
    external
    pure
    returns (
      uint256 price,
      uint256 rentOneBlocktrain,
      uint256 rentTwoBlocktrains,
      uint256 rentThreeBlocktrains,
      uint256 rentFourBlocktrains
    );

  function utilityCard() external pure returns (uint256 price, uint256 rentOneUtility, uint256 rentTwoUtilities);

  function propertyCard(uint256 position) external view returns (Setup.Property memory);

  function defiBootyBag(uint256 card) external view returns (string calldata);

  function zeroKnowledgeChance(uint256 card) external view returns (string calldata);
}
