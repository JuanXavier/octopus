// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {IBoard} from "./interfaces/IBoard.sol";
import {ChainopolySetup as Setup} from "./libraries/ChainopolySetup.sol";
import {ChainopolyErrors as Errors} from "./libraries/ChainopolyErrors.sol";

/**
 * @title A contract containing all the board setup for Chainopoly
 * @author Juan Xavier Valverde M. (millers.planet)
 * @dev This contract is used from all around the Chainopoly codebase. It's intended to be read-only.
 */
contract ChainopolyBoard is IBoard {
  uint8 public constant LUXURY_TAX = 75;

  uint8 public constant HOTELS_SUPPLY = 12;
  uint8 public constant HOUSES_SUPPLY = 32;
  uint8 public constant OUT_OF_JAIL_CARDS_SUPPLY = 4;

  uint8 public constant BLOCKTRAIN_PRICE = 200;
  uint8 public constant ONE_BLOCKTRAIN_RENT = 25;
  uint8 public constant TWO_BLOCKTRAINS_RENT = 50;
  uint8 public constant THREE_BLOCKTRAINS_RENT = 100;
  uint8 public constant FOUR_BLOCKTRAINS_RENT = 200;

  mapping(Setup.Color => uint256[3]) public groupsByColor;

  bytes[40] private _board;
  bytes[16] private _defiBootyBag;
  bytes[16] private _zeroKnowledgeChance;

  mapping(uint256 => Setup.Property) private properties;

  constructor() {
    _setBoard();
    _setProperties();
    _setDefiBootyBag();
    _setZeroKnowledgeChance();
  }

  function sameGroup(uint256 spot) public pure returns (uint256, uint256, uint256) {
    if (spot == 1 || spot == 3) return (1, 3, 0);
    if (spot == 6 || spot == 8 || spot == 9) return (6, 8, 9);
    if (spot == 11 || spot == 13 || spot == 14) return (11, 13, 14);
    if (spot == 16 || spot == 18 || spot == 19) return (16, 18, 19);
    if (spot == 21 || spot == 23 || spot == 24) return (21, 23, 24);
    if (spot == 26 || spot == 27 || spot == 29) return (26, 27, 29);
    if (spot == 31 || spot == 32 || spot == 34) return (31, 32, 34);
    if (spot == 37 || spot == 39) return (37, 39, 0);
    return (0, 0, 0);
  }

  function _setGroups() private {
    groupsByColor[Setup.Color.PURPLE] = [1, 3, 0];
    groupsByColor[Setup.Color.CYAN] = [6, 8, 9];
    groupsByColor[Setup.Color.PINK] = [11, 13, 14];
    groupsByColor[Setup.Color.ORANGE] = [16, 18, 19];
    groupsByColor[Setup.Color.RED] = [21, 23, 24];
    groupsByColor[Setup.Color.YELLOW] = [26, 27, 29];
    groupsByColor[Setup.Color.GREEN] = [31, 32, 34];
    groupsByColor[Setup.Color.BLUE] = [37, 39, 0];
  }

  function getGroups() external view returns (uint256[3][] memory groups) {
    groups[0] = groupsByColor[Setup.Color.PURPLE];
    groups[1] = groupsByColor[Setup.Color.CYAN];
    groups[2] = groupsByColor[Setup.Color.PINK];
    groups[3] = groupsByColor[Setup.Color.ORANGE];
    groups[4] = groupsByColor[Setup.Color.RED];
    groups[5] = groupsByColor[Setup.Color.YELLOW];
    groups[6] = groupsByColor[Setup.Color.GREEN];
    groups[7] = groupsByColor[Setup.Color.BLUE];
  }

  function positionName(uint256 position) public view returns (string memory) {
    return string(_board[position]);
  }

  function buildingPrice(uint256 position) public pure returns (uint256) {
    if (position < 10) return 50;
    if (position > 10 && position < 20) return 100;
    if (position > 20 && position < 30) return 150;
    if (position > 30 && position < 40) return 200;
    return 0;
  }

  function propertyCard(uint256 position) external view returns (Setup.Property memory) {
    return properties[position];
  }

  function utilityCard() external pure returns (uint256 price, uint256 rentOneUtility, uint256 rentTwoUtilities) {
    return (150, 4, 10);
  }

  function blocktrainCard()
    external
    pure
    returns (
      uint256 price,
      uint256 rentOneBlocktrain,
      uint256 rentTwoBlocktrains,
      uint256 rentThreeBlocktrains,
      uint256 rentFourBlocktrains
    )
  {
    return (200, 25, 50, 100, 200);
  }

  function defiBootyBag(uint256 card) external view returns (string memory) {
    return string(_defiBootyBag[card]);
  }

  function zeroKnowledgeChance(uint256 card) external view returns (string memory) {
    return string(_zeroKnowledgeChance[card]);
  }

  function outOfJailCardsSupply() external pure returns (uint8) {
    return OUT_OF_JAIL_CARDS_SUPPLY;
  }

  function hotelsSupply() external pure returns (uint8) {
    return HOTELS_SUPPLY;
  }

  function housesSupply() external pure returns (uint8) {
    return HOUSES_SUPPLY;
  }

  function luxuryTax() external pure returns (uint8) {
    return LUXURY_TAX;
  }

  function isUtility(uint256 spot) public pure returns (bool) {
    return (spot == 12 || spot == 28);
  }

  function isBlocktrain(uint256 spot) public pure returns (bool) {
    return (spot == 5 || spot == 15 || spot == 25 || spot == 35);
  }

  function isOwnable(uint256 spot) public pure returns (bool) {
    return (spot < 40 &&
      spot != 0 &&
      spot != 2 &&
      spot != 4 &&
      spot != 7 &&
      spot != 10 &&
      spot != 17 &&
      spot != 20 &&
      spot != 22 &&
      spot != 30 &&
      spot != 33 &&
      spot != 36 &&
      spot != 38);
  }

  function priceOf(uint256 spot) external view returns (uint256) {
    if (isOwnable(spot)) {
      if (isBlocktrain(spot)) return 200;
      else if (isUtility(spot)) return 150;
      else return properties[spot].price;
    } else revert Errors.PositionNotOwnable(spot);
  }

  function sameColor(uint256 position) external pure returns (uint256, uint256, uint256) {
    if (position == 1 || position == 3) return (1, 3, 0);
    if (position == 6 || position == 8 || position == 9) return (6, 8, 9);
    if (position == 11 || position == 13 || position == 14) return (11, 13, 14);
    if (position == 16 || position == 18 || position == 19) return (16, 18, 19);
    if (position == 21 || position == 23 || position == 24) return (21, 23, 24);
    if (position == 26 || position == 27 || position == 29) return (26, 27, 29);
    if (position == 31 || position == 32 || position == 34) return (31, 32, 34);
    if (position == 37 || position == 39) return (37, 39, 0);
    return (0, 0, 0);
  }

  function _setBoard() private {
    _board[0] = "Genesis Block"; // np
    _board[1] = "Alchemy Valley";
    _board[2] = "DeFi Booty Bag"; // np
    _board[3] = "Infura Avenue";
    _board[4] = "High Gas Fee"; // np
    _board[5] = "Remix Blocktrain";
    _board[6] = "IMX Avenue";
    _board[7] = "Zero Knowledge Chance"; // np
    _board[8] = "OpenSea Lake";
    _board[9] = "Rarible Park";
    _board[10] = "Jail"; // np
    _board[11] = "Uniswap Square";
    _board[12] = "Hot Wallet";
    _board[13] = "Aave Triangle";
    _board[14] = "SushiSwap Street";
    _board[15] = "Truffle Blocktrain";
    _board[16] = "Avalanche Mountain";
    _board[17] = "DeFi Booty Bag";
    _board[18] = "Optimism Bridge";
    _board[19] = "Arbitrum Expressway";
    _board[20] = "Free Stablecoin Station";
    _board[21] = "NFT Explanade";
    _board[22] = "Zero Knowledge Chance";
    _board[23] = "Compound Boulevard";
    _board[24] = "Polygon Plaza";
    _board[25] = "Hardhat Blocktrain";
    _board[26] = "OpenZeppelin Library";
    _board[27] = "Chainlink Resource Center";
    _board[28] = "Cold Wallet";
    _board[29] = "Curve Curb";
    _board[30] = "Go To Jail";
    _board[31] = "Lido Embassy";
    _board[32] = "Maker Terrace";
    _board[33] = "DeFi Booty Bag";
    _board[34] = "Binance Cafe";
    _board[35] = "Foundry Blocktrain";
    _board[36] = "Zero Knowledge Chance";
    _board[37] = "Ethereum Dark Forest";
    _board[38] = "Protocol Fee";
    _board[39] = "Bitcoin Mystic Lane";
  }

  /* --------------------- PROPERTIES --------------------- */
  function _setProperties() private {
    /* ----------------- PURPLE ----------------- */
    properties[1] = Setup.Property({
      color: Setup.Color.PURPLE,
      price: 60,
      rent: 2,
      rentOneHouse: 10,
      rentTwoHouses: 30,
      rentThreeHouses: 90,
      rentFourHouses: 160,
      rentHotel: 250
    });
    properties[3] = Setup.Property({
      color: Setup.Color.PURPLE,
      price: 60,
      rent: 4,
      rentOneHouse: 20,
      rentTwoHouses: 60,
      rentThreeHouses: 180,
      rentFourHouses: 320,
      rentHotel: 450
    });
    /* -------------------- CYAN ------------------- */
    properties[6] = Setup.Property({
      color: Setup.Color.CYAN,
      price: 100,
      rent: 6,
      rentOneHouse: 30,
      rentTwoHouses: 90,
      rentThreeHouses: 270,
      rentFourHouses: 400,
      rentHotel: 550
    });
    properties[8] = Setup.Property({
      color: Setup.Color.CYAN,
      price: 100,
      rent: 6,
      rentOneHouse: 30,
      rentTwoHouses: 90,
      rentThreeHouses: 270,
      rentFourHouses: 400,
      rentHotel: 550
    });
    properties[9] = Setup.Property({
      color: Setup.Color.CYAN,
      price: 120,
      rent: 8,
      rentOneHouse: 40,
      rentTwoHouses: 100,
      rentThreeHouses: 300,
      rentFourHouses: 450,
      rentHotel: 600
    });

    /* -------------------- PINK -------------------- */
    properties[11] = Setup.Property({
      color: Setup.Color.PINK,
      price: 140,
      rent: 10,
      rentOneHouse: 50,
      rentTwoHouses: 150,
      rentThreeHouses: 450,
      rentFourHouses: 625,
      rentHotel: 750
    });
    properties[13] = Setup.Property({
      color: Setup.Color.PINK,
      price: 140,
      rent: 10,
      rentOneHouse: 50,
      rentTwoHouses: 150,
      rentThreeHouses: 450,
      rentFourHouses: 625,
      rentHotel: 750
    });
    properties[14] = Setup.Property({
      color: Setup.Color.PINK,
      price: 160,
      rent: 12,
      rentOneHouse: 60,
      rentTwoHouses: 180,
      rentThreeHouses: 500,
      rentFourHouses: 700,
      rentHotel: 900
    });

    /* ------------------- ORANGE ------------------ */
    properties[16] = Setup.Property({
      color: Setup.Color.ORANGE,
      price: 180,
      rent: 14,
      rentOneHouse: 70,
      rentTwoHouses: 200,
      rentThreeHouses: 550,
      rentFourHouses: 750,
      rentHotel: 950
    });
    properties[18] = Setup.Property({
      color: Setup.Color.ORANGE,
      price: 180,
      rent: 14,
      rentOneHouse: 70,
      rentTwoHouses: 200,
      rentThreeHouses: 550,
      rentFourHouses: 750,
      rentHotel: 950
    });
    properties[19] = Setup.Property({
      color: Setup.Color.ORANGE,
      price: 200,
      rent: 16,
      rentOneHouse: 80,
      rentTwoHouses: 220,
      rentThreeHouses: 600,
      rentFourHouses: 800,
      rentHotel: 1000
    });

    /* -------------------- /RED -------------------- */
    properties[21] = Setup.Property({
      color: Setup.Color.RED,
      price: 220,
      rent: 18,
      rentOneHouse: 90,
      rentTwoHouses: 250,
      rentThreeHouses: 700,
      rentFourHouses: 875,
      rentHotel: 1050
    });
    properties[23] = Setup.Property({
      color: Setup.Color.RED,
      price: 220,
      rent: 18,
      rentOneHouse: 90,
      rentTwoHouses: 250,
      rentThreeHouses: 700,
      rentFourHouses: 875,
      rentHotel: 1050
    });
    properties[24] = Setup.Property({
      color: Setup.Color.RED,
      price: 240,
      rent: 20,
      rentOneHouse: 100,
      rentTwoHouses: 300,
      rentThreeHouses: 750,
      rentFourHouses: 925,
      rentHotel: 1100
    });

    /* ------------------- YELLOW ------------------- */
    properties[26] = Setup.Property({
      color: Setup.Color.YELLOW,
      price: 260,
      rent: 22,
      rentOneHouse: 110,
      rentTwoHouses: 330,
      rentThreeHouses: 800,
      rentFourHouses: 975,
      rentHotel: 1150
    });
    properties[27] = Setup.Property({
      color: Setup.Color.YELLOW,
      price: 260,
      rent: 22,
      rentOneHouse: 110,
      rentTwoHouses: 330,
      rentThreeHouses: 800,
      rentFourHouses: 975,
      rentHotel: 1150
    });
    properties[29] = Setup.Property({
      color: Setup.Color.YELLOW,
      price: 280,
      rent: 24,
      rentOneHouse: 120,
      rentTwoHouses: 360,
      rentThreeHouses: 850,
      rentFourHouses: 1025,
      rentHotel: 1200
    });

    /* -------------------- GREEN ------------------- */
    properties[31] = Setup.Property({
      color: Setup.Color.GREEN,
      price: 300,
      rent: 26,
      rentOneHouse: 130,
      rentTwoHouses: 390,
      rentThreeHouses: 900,
      rentFourHouses: 1100,
      rentHotel: 1275
    });
    properties[32] = Setup.Property({
      color: Setup.Color.GREEN,
      price: 300,
      rent: 26,
      rentOneHouse: 130,
      rentTwoHouses: 390,
      rentThreeHouses: 900,
      rentFourHouses: 1100,
      rentHotel: 1275
    });
    properties[34] = Setup.Property({
      color: Setup.Color.GREEN,
      price: 320,
      rent: 28,
      rentOneHouse: 150,
      rentTwoHouses: 450,
      rentThreeHouses: 1000,
      rentFourHouses: 1200,
      rentHotel: 1400
    });

    /* -------------------- BLUE -------------------- */
    properties[37] = Setup.Property({
      color: Setup.Color.BLUE,
      price: 350,
      rent: 35,
      rentOneHouse: 175,
      rentTwoHouses: 500,
      rentThreeHouses: 1100,
      rentFourHouses: 1300,
      rentHotel: 1500
    });
    properties[39] = Setup.Property({
      color: Setup.Color.BLUE,
      price: 400,
      rent: 50,
      rentOneHouse: 200,
      rentTwoHouses: 600,
      rentThreeHouses: 1400,
      rentFourHouses: 1700,
      rentHotel: 2000
    });
  }

  /* ----------------------- CARDS ---------------------- */

  function _setDefiBootyBag() private {
    _defiBootyBag[0] = "Advance to Genesis Block. Collect the Genesis Block reward.";
    _defiBootyBag[1] = "Smart contract error in your favor. Collect $200";
    _defiBootyBag[2] = "Sudden airdrop appears. Collect $100";
    _defiBootyBag[3] = "Lucky misterious transfer in your favor. Receive $100";
    _defiBootyBag[4] = "Aren't you just lucky today? You get $100";
    _defiBootyBag[5] = "From NFT sale you get $50";
    _defiBootyBag[6] = "Your staking rewards are here! Receive $25.";
    _defiBootyBag[7] = "Gas fee refund. Collect $20";
    _defiBootyBag[8] = "Get $10 from every player. If any of them are unable to pay, get $100 from Bank instead!";
    _defiBootyBag[9] = "You have won second prize in a hacking contest. Collect $10";
    _defiBootyBag[10] = "You can get out of jail for free! Keep this card until needed or sold";
    _defiBootyBag[11] = "Go to Jail. Go directly to jail, do not pass Genesis Block, nor collect any rewards";
    _defiBootyBag[12] = "You are assessed for buildings wifi repair. Pay $40 per house and $115 per hotel";
    _defiBootyBag[13] = "Pay bridge fees of $50";
    _defiBootyBag[14] = "Doctor's fee. Pay $50";
    _defiBootyBag[15] = "You fell for a new scam! Fortunately, you lost $100 only";
  }

  function _setZeroKnowledgeChance() private {
    _zeroKnowledgeChance[0] = "Advance to Bitcoin Mystic Lane";
    _zeroKnowledgeChance[1] = "Advance to Genesis Block and collect your rewards";
    _zeroKnowledgeChance[2] = "Advance to Polygon Plaza. If you pass Genesis Block, collect the rewards";
    _zeroKnowledgeChance[3] = "Advance to Uniswap Square. If you pass Genesis Block, collect the rewards";
    _zeroKnowledgeChance[
      4
    ] = "Advance to the nearest Blocktrain. If unowned, you may buy it. If owned, pay twice the current rental!";
    _zeroKnowledgeChance[
      5
    ] = "Advance to the nearest Blocktrain. If unowned, you may buy it. If owned, pay twice the current rental!";
    _zeroKnowledgeChance[
      6
    ] = "Advance token to nearest Utility. If unowned, you may buy it. If owned, throw dice and pay owner a total ten times amount thrown.";
    _zeroKnowledgeChance[7] = "Take a trip to Remix Blocktrain. If you pass Genesis Block, collect the rewards";
    _zeroKnowledgeChance[8] = "Bank pays you dividend of $50";
    _zeroKnowledgeChance[9] = "Your building loan matures. Collect $150";
    _zeroKnowledgeChance[10] = "You can get out of jail for free! Keep this card until needed or sold";
    _zeroKnowledgeChance[11] = "Go to Jail. Go directly to jail, do not pass Genesis Block, nor collect any rewards";
    _zeroKnowledgeChance[12] = "Slippery territory! Go back 2 spaces";
    _zeroKnowledgeChance[13] = "Making general repairs is expensive! For each house pay $25. For each hotel pay $100";
    _zeroKnowledgeChance[14] = "Frontrunning fine. Pay $25";
    _zeroKnowledgeChance[15] = "You have been elected Chairman of the Board. Pay each player $50";
  }
}
