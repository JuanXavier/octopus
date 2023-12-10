// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

interface IOctopusConverter {
  function usdToTokenInDollars(address token, uint256 usdAmount, uint256 wantedDecimals) external returns (uint256);

  function usdToTokenInCents(address token, uint256 usdAmount, uint256 wantedDecimals) external returns (uint256);
}
