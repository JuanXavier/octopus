// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {ChainopolySetup as Setup} from "../libraries/ChainopolySetup.sol";

interface IChainopoly {
  function allGameDetails(uint256 gameID) external view returns (Setup.GameDetails memory gameDetails);

  function getPlayerGameID(address player) external view returns (uint256);

  function priceOf(uint256 position) external view returns (uint256);

  function buildingPrice(uint256 position) external view returns (uint256);

  function clearPlayersInGame(address player) external;

  function propertyDetails(
    uint256 position
  ) external view returns (Setup.Property memory property, Setup.PropertyDetails memory details);

  function blocktrainDetails()
    external
    view
    returns (
      uint256 price,
      uint256 rentOneBlocktrain,
      uint256 rentTwoBlocktrains,
      uint256 rentThreeBlocktrains,
      uint256 rentFourBlocktrains
    );
}
