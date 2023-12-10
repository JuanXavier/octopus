// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {ChainopolyErrors as Errors} from "../libraries/ChainopolyErrors.sol";
import {ChainopolyEvents as Events} from "../libraries/ChainopolyEvents.sol";
import {ChainopolySetup as Setup} from "../libraries/ChainopolySetup.sol";
import {ChainopolyCore as Core} from "../libraries/ChainopolyCore.sol";
import {ChainopolyAuction as Auction} from "../libraries/ChainopolyAuction.sol";

/**
 * @title A library containing all the Chainopoly cards description and implementations for them.
 * @author Juan Xavier Valverde M. (millers.planet)
 * @dev This library is called when player lands on ZeroKnowledgeChance or DefiBootyBag.
 * It generates a pseudorandom number from 0 to 15, then picks up the corresponding card on the cards stack
 * and executed the description of card.
 */
library ChainopolyCards {
  address private constant BANK = 0x000000000000000000000000000000000000dEaD;

  /* ----------------------- NUMBERS ---------------------- */
  uint8 private constant TEN = 10;
  uint8 private constant DOUBLE = 2;
  uint8 private constant FIFTY = 50;
  uint8 private constant TWENTY = 20;
  uint8 private constant TWENTY_FIVE = 25;
  uint8 private constant ONE_HUNDRED = 100;
  uint8 private constant ONE_HUNDRED_FIFTY = 150;
  uint8 private constant TWO_HUNDRED = 200;
  uint8 public constant OUT_OF_JAIL_CARDS_SUPPLY = 4;

  /* ------------------- BOARD LOCATIONS ------------------ */
  uint8 private constant JAIL = 10;
  uint8 private constant HOT_WALLET = 12;
  uint8 private constant COLD_WALLET = 28;
  uint8 private constant ZK_CHANCE_A = 7;
  uint8 private constant ZK_CHANCE_B = 22;
  uint8 private constant ZK_CHANCE_C = 36;
  uint8 private constant BLOCKTRAIN_A = 5;
  uint8 private constant BLOCKTRAIN_B = 15;
  uint8 private constant BLOCKTRAIN_C = 25;
  uint8 private constant GENESIS_BLOCK = 0;
  uint8 private constant BINANCE_CAFE = 34;
  uint8 private constant POLYGON_PLAZA = 24;
  uint8 private constant UNISWAP_SQUARE = 11;
  uint8 private constant BITCOIN_MYSTIC_LANE = 39;
  uint8 private constant FREE_STABLECOIN_STATION = 20;

  function isZeroKnowledgeChance(uint256 spot) public pure returns (bool) {
    return (spot == 7 || spot == 22 || spot == 36);
  }

  function isDefiBootyBag(uint256 spot) public pure returns (bool) {
    return (spot == 2 || spot == 17 || spot == 33);
  }

  function isBlocktrain(uint256 spot) public pure returns (bool) {
    if (spot == 5 || spot == 15 || spot == 25 || spot == 35) return true;
    else return false;
  }

  function enforceVariants(Setup.Game storage game, uint256 spot) public {
    if (game.variants.noEasyMonopolies) {
      if (
        (isBlocktrain(spot) && game.data.players[tx.origin].blocktrains == 3) ||
        (isUtility(spot) && game.data.players[tx.origin].utilities == 1)
      ) {
        Auction.startAuction(game, spot, tx.origin);
        return;
      }

      {
        (uint256 a, uint256 b, uint256 c) = _sameGroup(spot);
        uint256 count;
        if (game.data.propertiesDetails[a].owner == tx.origin) ++count;
        if (game.data.propertiesDetails[b].owner == tx.origin) ++count;
        if (c > 0 && game.data.propertiesDetails[c].owner == tx.origin) ++count;
        if (count == 2 || (c == 0 && count == 1)) {
          Auction.startAuction(game, spot, tx.origin);
          return;
        }
      }
    }
    if (!game.variants.landAndBuy) {
      game.status = Setup.Status.PLAYER_HAS_TO_DECIDE;
      emit Events.PlayerHasToDecide(tx.origin, spot);
    } else Core.buyFromBank(game, spot);
  }

  function _sameGroup(uint256 spot) private pure returns (uint256, uint256, uint256) {
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

  function _relocate(Setup.Data storage gameData, uint256 newPosition) private {
    gameData.players[tx.origin].position = uint8(newPosition);
    emit Events.PlayerMoved(tx.origin, newPosition);
  }

  function isUtility(uint256 spot) public pure returns (bool) {
    if (spot == 12 || spot == 28) return true;
    else return false;
  }

  function pickCard(Setup.Game storage game, address player, uint256 cardNumber) external {
    if (game.status != Setup.Status.PLAYER_HAS_TO_PICK_CARD) revert Errors.InvalidGameStatus(game.status);
    address currentPlayer = game.data.joinedPlayers[game.data.currentTurnIndex];
    if (game.data.endOfTurn[currentPlayer] > block.timestamp && currentPlayer != player) revert Errors.NotYourTurn();
    uint256 position = game.data.players[currentPlayer].position;
    if (isDefiBootyBag(position)) pickDefiBootyBag(game, player, cardNumber);
    else if (isZeroKnowledgeChance(position)) pickZeroKnowledgeChance(game, player, cardNumber);
    else revert Errors.PositionIsNotCard(position);
    if (game.status == Setup.Status.PLAYER_HAS_TO_PICK_CARD) game.status = Setup.Status.PLAYING;
  }

  function pickDefiBootyBag(Setup.Game storage game, address player, uint256 cardNumber) public {
    if (cardNumber == 10) {
      if (Core.countElements(game.data, Setup.Elements.OUT_OF_JAIL_CARDS) < OUT_OF_JAIL_CARDS_SUPPLY)
        ++game.data.players[player].outOfJailCards;
      else cardNumber = 5;
    }

    emit Events.DefiBootyBagCardDrawn(player, cardNumber);
    if (cardNumber == 0) {
      _relocate(game.data, 0);
      Core.mint(game.data, player, game.amounts.initial);
    } else if (cardNumber == 1) Core.mint(game.data, player, TWO_HUNDRED);
    else if (cardNumber == 2 || cardNumber == 3 || cardNumber == 4) Core.mint(game.data, player, ONE_HUNDRED);
    else if (cardNumber == 5) Core.mint(game.data, player, FIFTY);
    else if (cardNumber == 6) Core.mint(game.data, player, TWENTY_FIVE);
    else if (cardNumber == 7) Core.mint(game.data, player, TWENTY);
    else if (cardNumber == 8) Core.collectFromEveryone(game.data, player);
    else if (cardNumber == 9) Core.mint(game.data, player, TEN);
    else if (cardNumber == 11) Core.sendToJail(game.data, player);
    else if (cardNumber == 12) {
      uint256 amount = ((game.data.players[player].houses * 15) + (game.data.players[player].hotels * 40));
      if (game.variants.getStablecoinStationMoney) Core.mandatoryTransfer(game, player, BANK, amount);
      else Core.mandatoryBurn(game, player, amount);
    } else if (cardNumber == 13 || cardNumber == 14) {
      if (game.variants.getStablecoinStationMoney) Core.mandatoryTransfer(game, player, BANK, FIFTY);
      else Core.mandatoryBurn(game, player, FIFTY);
    } else if (cardNumber == 15) {
      if (game.variants.getStablecoinStationMoney) Core.mandatoryTransfer(game, player, BANK, ONE_HUNDRED);
      else Core.mandatoryBurn(game, player, ONE_HUNDRED);
    }
  }

  function pickZeroKnowledgeChance(Setup.Game storage game, address player, uint256 cardNumber) public {
    uint256 currentPosition = game.data.players[player].position;
    uint256 newPosition;
    address owner;

    if (cardNumber == 10) {
      if (Core.countElements(game.data, Setup.Elements.OUT_OF_JAIL_CARDS) < OUT_OF_JAIL_CARDS_SUPPLY)
        ++game.data.players[player].outOfJailCards;
      else cardNumber = 1; /// @dev Safety measure to avoid failing when there are no cards left.
    }

    emit Events.ZeroKnowledgeChanceCardDrawn(player, cardNumber);

    if (cardNumber == 0) {
      newPosition = BITCOIN_MYSTIC_LANE;
      _relocate(game.data, newPosition);
      owner = game.data.propertiesDetails[newPosition].owner;
      if (owner != player) {
        if (owner == address(0)) enforceVariants(game, newPosition);
        else Core.payRent(game, newPosition);
      }
    } else if (cardNumber == 1) {
      newPosition = GENESIS_BLOCK;
      _relocate(game.data, newPosition);
    } else if (cardNumber == 2) {
      newPosition = POLYGON_PLAZA;
      _relocate(game.data, newPosition);
      owner = game.data.propertiesDetails[newPosition].owner;
      if (owner != player) {
        if (owner == address(0)) enforceVariants(game, newPosition);
        else Core.payRent(game, newPosition);
      }
    } else if (cardNumber == 3) {
      newPosition = UNISWAP_SQUARE;
      _relocate(game.data, newPosition);
      owner = game.data.propertiesDetails[newPosition].owner;
      if (owner != player) {
        if (owner == address(0)) enforceVariants(game, newPosition);
        else Core.payRent(game, newPosition);
      }
    } else if (cardNumber == 4 || cardNumber == 5) {
      if (currentPosition == ZK_CHANCE_A) newPosition = BLOCKTRAIN_B;
      else if (currentPosition == ZK_CHANCE_B) newPosition = BLOCKTRAIN_C;
      else if (currentPosition == ZK_CHANCE_C) newPosition = BLOCKTRAIN_A;
      _relocate(game.data, newPosition);
      owner = game.data.propertiesDetails[newPosition].owner;

      if (owner != player) {
        if (owner == address(0)) enforceVariants(game, newPosition);
        else Core.mandatoryTransfer(game, player, owner, Core.calculateRent(game.data, newPosition) * 2);
      }
    } else if (cardNumber == 6) {
      if (currentPosition == ZK_CHANCE_A || currentPosition == ZK_CHANCE_C) newPosition = HOT_WALLET;
      else if (currentPosition == ZK_CHANCE_B) newPosition = COLD_WALLET;
      _relocate(game.data, newPosition);
      owner = game.data.propertiesDetails[newPosition].owner;
      if (owner != player) {
        if (owner == address(0)) enforceVariants(game, newPosition);
        else Core.payRent(game, newPosition);
      }
    } else if (cardNumber == 7) {
      newPosition = BLOCKTRAIN_A;
      _relocate(game.data, newPosition);
      owner = game.data.propertiesDetails[newPosition].owner;

      if (owner != player) {
        if (owner == address(0)) enforceVariants(game, newPosition);
        else Core.payRent(game, newPosition);
      }
    } else if (cardNumber == 8) Core.mint(game.data, player, FIFTY);
    else if (cardNumber == 9) Core.mint(game.data, player, ONE_HUNDRED_FIFTY);
    else if (cardNumber == 11) Core.sendToJail(game.data, player);
    else if (cardNumber == 12) {
      if (currentPosition == ZK_CHANCE_A) {
        newPosition = BLOCKTRAIN_A;
        _relocate(game.data, newPosition);
        owner = game.data.propertiesDetails[newPosition].owner;
        if (owner != player) {
          if (owner == address(0)) enforceVariants(game, newPosition);
          else Core.payRent(game, newPosition);
        }
      } else if (currentPosition == ZK_CHANCE_B) {
        newPosition = FREE_STABLECOIN_STATION;
        _relocate(game.data, newPosition);
        if (game.variants.getStablecoinStationMoney) {
          Core.transferFrom(game.data, BANK, player, game.data.balances[BANK]);
        }
      } else if (currentPosition == ZK_CHANCE_C) {
        newPosition = BINANCE_CAFE;
        _relocate(game.data, newPosition);
        owner = game.data.propertiesDetails[newPosition].owner;
        if (owner != player) {
          if (owner == address(0)) enforceVariants(game, newPosition);
          else Core.payRent(game, newPosition);
        }
      }
    } else if (cardNumber == 13) {
      uint256 amount = (game.data.players[player].houses * 25) + (game.data.players[player].hotels * 100);
      if (game.variants.getStablecoinStationMoney) Core.mandatoryTransfer(game, player, BANK, amount);
      else Core.mandatoryBurn(game, player, amount);
    } else if (cardNumber == 14) {
      if (game.variants.getStablecoinStationMoney) Core.mandatoryTransfer(game, player, BANK, TWENTY_FIVE);
      else Core.mandatoryBurn(game, player, TWENTY_FIVE);
    } else if (cardNumber == 15) Core.transferToAllPlayers(game, FIFTY);

    if (newPosition < currentPosition) Core.mint(game.data, player, game.amounts.genesisReward);
  }
}
