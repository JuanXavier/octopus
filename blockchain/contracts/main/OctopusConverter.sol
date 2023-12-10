// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {AggregatorV3Interface} from "../external/chainlink/AggregatorV3Interface.sol";
import {FixedPointMath} from "../external/solady/FixedPointMath.sol";
import {IERC20} from "../external/openzeppelin/IERC20.sol";
import {IOctopusConverter} from "./interfaces/IOctopusConverter.sol";
import {Authority} from "./extensions/Authority.sol";

/**
 * @title OctopusConverter
 *@author Juan Xavier Valverde M.
 * @dev A contract for converting USD to various tokens based on Chainlink's price feeds.
 * In testnet supports ETH, BTC, DAI, USDC, LINK.
 */
contract OctopusConverter is Authority, IOctopusConverter {
  error StalePrice();
  error PriceTooLow();
  error UsdAmountOrDecimalsTooLow();

  event TokenAndPairAdded(address indexed token, address indexed pair);

  mapping(address => address) private tokenToPair;

  /**
   * @dev Sets the token and its corresponding pair address. Only the AUTHORITY can call this function.
   * @param token The name of the token.
   * @param pair The address of the token pair.
   */
  function setTokenAndPair(address token, address pair) external {
    _onlyAuthority();
    tokenToPair[token] = pair;
    emit TokenAndPairAdded(token, pair);
  }

  /**
   * @dev Gets the USD price of the specified token.
   * @param token The name of the token.
   * @return The price and decimals of the token.
   */
  function getUsdPrice(address token) public view returns (uint256, uint8 decimals) {
    address pair = tokenToPair[token];
    if (pair == address(0)) revert Unauthorized();
    (uint80 round, int256 price, , uint256 time, uint80 updatedRound) = AggregatorV3Interface(pair).latestRoundData();
    if (price <= 0) revert PriceTooLow();
    if (time == 0 || updatedRound < round) revert StalePrice();
    decimals = AggregatorV3Interface(pair).decimals();
    return (uint256(price), decimals);
  }

  /**
   * @dev Converts USD to tokens with specified decimals, excluding cents. Example: 1 usdAmount = $1 USD
   * @param token The name of the token.
   * @param usdAmount The amount in USD to convert.
   * @param wantedDecimals The desired decimals for the result.
   * @return The equivalent amount of tokens.
   */
  function usdToTokenInDollars(
    address token,
    uint256 usdAmount,
    uint256 wantedDecimals
  ) external view returns (uint256) {
    (uint256 _price, uint8 _decimals) = getUsdPrice(token);
    uint256 result = FixedPointMath.fullMulDivUp((usdAmount * 10 ** wantedDecimals), (10 ** _decimals), _price);
    if (result == 1 || result == 0) revert UsdAmountOrDecimalsTooLow();
    uint8 tokenDecimals = IERC20(token).decimals();
    if (tokenDecimals > wantedDecimals) return result * (10 ** (tokenDecimals - wantedDecimals));
    else return result;
  }

  /**
   * @dev Converts USD to tokens with specified decimals, including cents. Example: 150 usdAmount = $1,50 USD
   * @param token The name of the token.
   * @param usdAmount The amount in USD to convert.
   * @param wantedDecimals The desired decimals for the result.
   * @return The equivalent amount of tokens.
   */
  function usdToTokenInCents(address token, uint256 usdAmount, uint256 wantedDecimals) external view returns (uint256) {
    (uint256 _price, uint8 _decimals) = getUsdPrice(token);
    uint256 result = FixedPointMath.fullMulDivUp((usdAmount * 10 ** wantedDecimals), (10 ** _decimals), _price);
    result = FixedPointMath.divUp(result, 100);
    if (result == 1 || result == 0) revert UsdAmountOrDecimalsTooLow();
    uint8 tokenDecimals = IERC20(token).decimals();
    if (tokenDecimals > wantedDecimals) return result * (10 ** (tokenDecimals - wantedDecimals));
    else return result;
  }
}
