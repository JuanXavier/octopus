// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {IChainopoly} from "../interfaces/IChainopoly.sol";
import {ChainopolySetup as Setup} from "../libraries/ChainopolySetup.sol";
import {ChainopolyErrors as Errors} from "../libraries/ChainopolyErrors.sol";
import {ChainopolyEvents as Events} from "../libraries/ChainopolyEvents.sol";
import {ChainopolyAuction as Auction} from "../libraries/ChainopolyAuction.sol";

library ChainopolyCore {
  address private constant BANK = 0x000000000000000000000000000000000000dEaD;

  uint8 private constant JAIL_BAIL_AMOUNT = 50;
  uint8 public constant PROTOCOL_FEE_AMOUNT = 75;

  uint8 private constant MAX_HOUSES_PER_SPOT = 4;
  uint8 public constant HOTELS_SUPPLY = 12;
  uint8 public constant HOUSES_SUPPLY = 32;

  uint8 private constant HIGH_GAS_FEES = 4;
  uint8 private constant STABLECOIN_STATION = 20;
  uint8 private constant GO_TO_JAIL = 30;
  uint8 private constant PROTOCOL_FEE = 38;

  function _onlyDuringTurn(Setup.Data storage gameData, address player) private view {
    if (gameData.joinedPlayers[gameData.currentTurnIndex] != player) revert Errors.NotYourTurn();
  }

  function sellToBank(Setup.Game storage game, uint256[] calldata properties) external {
    uint256 i = properties.length;
    while (i > 0) {
      _sell(game, properties[i]);
      --i;
    }
  }

  function _sell(Setup.Game storage game, uint256 spot) internal {
    //without houses and hotels
    onlyOwner(game.data, spot);
    uint256 price = IChainopoly(msg.sender).priceOf(spot);

    if (isBlocktrain(spot)) {
      --game.data.players[tx.origin].blocktrains;
      game.data.specialPropertiesDetails[spot].owner = address(0);
    } else if (isUtility(spot)) {
      --game.data.players[tx.origin].utilities;
      game.data.specialPropertiesDetails[spot].owner = address(0);
    } else game.data.propertiesDetails[spot].owner = address(0);

    unchecked {
      for (uint256 i; i < game.data.players[tx.origin].properties.length; ++i) {
        if (game.data.players[tx.origin].properties[i] == spot) {
          game.data.players[tx.origin].properties[i] = game.data.players[tx.origin].properties[
            game.data.players[tx.origin].properties.length - 1
          ];
          game.data.players[tx.origin].properties.pop();
          break;
        }
      }
    }

    transferFrom(game.data, BANK, tx.origin, price / 2);
    game.data.players[tx.origin].propertiesPatrimony -= uint24(price);
    emit Events.PropertySold(tx.origin, spot);
  }

  function _onlyDuringStatus(Setup.Status currentStatus, Setup.Status neededStatus) private pure {
    if (currentStatus != neededStatus) revert Errors.InvalidGameStatus(currentStatus);
  }

  function _onlyOwnable(uint256 spot) private pure {
    if (spot > 39) revert Errors.OutOfBounds();
    if (
      (spot == 0 ||
        spot == 2 ||
        spot == 4 ||
        spot == 7 ||
        spot == 10 ||
        spot == 17 ||
        spot == 20 ||
        spot == 22 ||
        spot == 30 ||
        spot == 33 ||
        spot == 36 ||
        spot == 38)
    ) revert Errors.PositionNotOwnable(spot);
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

  function isUtility(uint256 spot) public pure returns (bool) {
    return (spot == 12 || spot == 28);
  }

  function isBlocktrain(uint256 spot) public pure returns (bool) {
    return (spot == 5 || spot == 15 || spot == 25 || spot == 35);
  }

  function isSpecialProperty(uint256 spot) public pure returns (bool) {
    return (spot == 12 || spot == 28 || spot == 5 || spot == 15 || spot == 25 || spot == 35);
  }

  function isZeroKnowledgeChance(uint256 spot) public pure returns (bool) {
    return (spot == 7 || spot == 22 || spot == 36);
  }

  function isDefiBootyBag(uint256 spot) public pure returns (bool) {
    return (spot == 2 || spot == 17 || spot == 33);
  }

  function move(
    Setup.Game storage game,
    address player,
    uint256 result,
    bool doubles
  ) public returns (uint256 newPosition) {
    if (game.status != Setup.Status.PLAYING || game.status != Setup.Status.AUCTIONING)
      revert Errors.InvalidGameStatus(game.status);

    uint256 _doublesCount = game.data.doublesCount;
    if (game.diceRolledThisTurn && _doublesCount == 0) revert Errors.YouAlreadyRolledThisTurn();
    emit Events.DiceRolled(result, doubles);
    game.diceRolledThisTurn = true;

    bool playerInJail = game.data.players[player].turnsLeftInJail > 0;
    if (playerInJail) {
      if (doubles) {
        delete game.data.players[player].turnsLeftInJail;
        emit Events.PlayerIsFree(player);
      } else {
        delete game.data.doublesCount;
        return 10;
      }
    } else {
      if (doubles) {
        if (_doublesCount == 2) {
          sendToJail(game.data, player);
          return 10;
        }
        game.data.endOfTurn[player] = block.timestamp + game.data.timePerTurn;
        ++game.data.doublesCount;
      } else delete game.data.doublesCount;
    }
    newPosition = _move(game, player, result);
  }

  function _move(Setup.Game storage game, address player, uint256 spaces) public returns (uint256 newPosition) {
    uint256 initialPosition = game.data.players[player].position;
    newPosition = (initialPosition + uint8(spaces)) % 40;
    emit Events.PlayerMoved(player, newPosition);

    if (newPosition < initialPosition) mint(game.data, player, game.amounts.genesisReward);
    game.data.players[player].position = uint8(newPosition);

    if (isOwnable(newPosition)) {
      if (ownerOf(game.data, newPosition) == address(0)) {
        if (game.variants.noEasyMonopolies) {
          if (
            (isBlocktrain(newPosition) && game.data.players[player].blocktrains == 3) ||
            (isUtility(newPosition) && game.data.players[player].utilities == 1)
          ) Auction.startAuction(game, newPosition, player);
          else noEasyMonopolies(game, newPosition);
        }
        if (game.variants.landAndBuy) buyFromBank(game, newPosition);
        else {
          game.status = Setup.Status.PLAYER_HAS_TO_DECIDE;
          emit Events.PlayerHasToDecide(player, newPosition);
        }
      } else payRent(game, newPosition);
    } else {
      if (isDefiBootyBag(newPosition) || isZeroKnowledgeChance(newPosition)) {
        game.status = Setup.Status.PLAYER_HAS_TO_PICK_CARD;
        emit Events.PlayerHasToPickCard(player);
      } else if (newPosition == HIGH_GAS_FEES) game.status = Setup.Status.PLAYER_HAS_TO_PAY_HIGH_GAS_FEES;
      else if (newPosition == STABLECOIN_STATION && game.variants.getStablecoinStationMoney) {
        transferFrom(game.data, BANK, player, game.data.balances[BANK]);
      } else if (newPosition == GO_TO_JAIL) sendToJail(game.data, player);
      else if (newPosition == PROTOCOL_FEE) payProtocolFee(game, player);
    }
  }

  function noEasyMonopolies(Setup.Game storage game, uint256 spot) public {
    (uint256 a, uint256 b, uint256 c) = sameGroup(spot);
    uint256 count;
    if (game.data.propertiesDetails[a].owner == tx.origin) ++count;
    if (game.data.propertiesDetails[b].owner == tx.origin) ++count;
    if (c != 0 && game.data.propertiesDetails[c].owner == tx.origin) ++count;
    if (count == 2 || (c == 0 && count == 1)) Auction.startAuction(game, spot, tx.origin);
  }

  function mint(Setup.Data storage gameData, address player, uint256 amount) public {
    if (player != address(0) && amount > 0) {
      gameData.balances[player] += amount;
      emit Events.Transfer(BANK, player, amount);
    }
  }

  function sendToJail(Setup.Data storage gameData, address prisoner) public {
    delete gameData.doublesCount;
    gameData.players[prisoner].position = 10;
    gameData.players[prisoner].turnsLeftInJail = 3;
    gameData.endOfTurn[prisoner] = block.timestamp;
    emit Events.PlayerSentToJail(prisoner);
  }

  function countElements(Setup.Data storage gameData, Setup.Elements element) public view returns (uint256 total) {
    uint256 eachPlayersAmount;

    unchecked {
      for (uint256 i; i < gameData.joinedPlayers.length; ++i) {
        if (element == Setup.Elements.HOUSES) eachPlayersAmount = gameData.players[gameData.joinedPlayers[i]].houses;
        else if (element == Setup.Elements.HOTELS) {
          eachPlayersAmount = gameData.players[gameData.joinedPlayers[i]].hotels;
        } else if (element == Setup.Elements.OUT_OF_JAIL_CARDS) {
          eachPlayersAmount = gameData.players[gameData.joinedPlayers[i]].outOfJailCards;
        }
        total += eachPlayersAmount;
      }
    }
  }

  function ownerOf(Setup.Data storage gameData, uint256 spot) public view returns (address) {
    _onlyOwnable(spot);
    if (isSpecialProperty(spot)) return gameData.specialPropertiesDetails[spot].owner;
    return gameData.propertiesDetails[spot].owner;
  }

  function onlyOwner(Setup.Data storage gameData, uint256 spot) private view {
    if (ownerOf(gameData, spot) != tx.origin) revert Errors.YouDontOwnThisProperty(spot);
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

  function ownsPropertyAndGroup(Setup.Data storage gameData, address player, uint256 spot) public view returns (bool) {
    (uint256 a, uint256 b, uint256 c) = sameGroup(spot);
    return playerOwnsGroup(gameData, a, b, c, player);
  }

  function playerOwnsGroup(
    Setup.Data storage gameData,
    uint256 a,
    uint256 b,
    uint256 c,
    address player
  ) public view returns (bool) {
    if (c == 0) return (ownerOf(gameData, a) == player && ownerOf(gameData, b) == player);
    else return (ownerOf(gameData, a) == player && ownerOf(gameData, b) == player && ownerOf(gameData, c) == player);
  }

  /* ****************************************************** */
  /*                         BANKING                        */
  /* ****************************************************** */
  function buyOrNot(Setup.Game storage game, bool decision) public {
    _onlyDuringTurn(game.data, tx.origin);
    _onlyDuringStatus(game.status, Setup.Status.PLAYER_HAS_TO_DECIDE);

    uint256 spot = game.data.players[tx.origin].position;
    if (block.timestamp > game.data.endOfTurn[game.data.joinedPlayers[game.data.currentTurnIndex]]) {
      Auction.startAuction(game, spot, tx.origin);
      return;
    }

    decision ? buyFromBank(game, spot) : Auction.startAuction(game, spot, tx.origin);
  }

  function buyFromBank(Setup.Game storage game, uint256 spot) public {
    if (ownerOf(game.data, spot) != address(0)) revert Errors.PropertyAlreadyOwned();
    uint256 price = IChainopoly(msg.sender).priceOf(spot);

    (game.variants.landAndBuy) ? mandatoryBurn(game, tx.origin, price) : voluntaryBurn(game.data, tx.origin, price);

    if (game.status != Setup.Status.PLAYER_IS_NEAR_BANKRUPTCY) {
      if (isBlocktrain(spot)) {
        ++game.data.players[tx.origin].blocktrains;
        game.data.specialPropertiesDetails[spot].owner = tx.origin;
      } else if (isUtility(spot)) {
        ++game.data.players[tx.origin].utilities;
        game.data.specialPropertiesDetails[spot].owner = tx.origin;
      } else game.data.propertiesDetails[spot].owner = tx.origin;

      game.data.players[tx.origin].propertiesPatrimony += uint24(price);
      game.data.players[tx.origin].properties.push(uint8(spot));
      game.status = Setup.Status.PLAYING;
      emit Events.PropertyBought(tx.origin, spot, price);
    }
  }

  function _checkEnoughBalance(Setup.Data storage gameData, uint256 amount) public view returns (bool) {
    unchecked {
      for (uint256 i; i < gameData.joinedPlayers.length; ++i) {
        address playerInLoop = gameData.joinedPlayers[i];
        if (playerInLoop != address(0) && gameData.balances[playerInLoop] < amount) return false;
      }
      return true;
    }
  }

  function transferFrom(
    Setup.Data storage gameData,
    address sender,
    address recipient,
    uint256 amount
  ) public returns (uint256 debt) {
    unchecked {
      if (recipient != address(0) && sender != recipient && amount > 0) {
        if (amount > gameData.balances[sender]) return (amount);
        gameData.balances[sender] -= amount;
        gameData.balances[recipient] += amount;
        emit Events.Transfer(sender, recipient, amount);
      }
      return (0);
    }
  }

  function initialMint(Setup.Game storage game) public {
    unchecked {
      address[] memory _players = game.data.joinedPlayers;
      for (uint256 i; i < _players.length; ++i) mint(game.data, _players[i], game.amounts.initial);
    }
  }

  function collectFromEveryone(Setup.Data storage gameData, address player) external {
    unchecked {
      bool everyoneHasEnough = _checkEnoughBalance(gameData, 10);
      if (everyoneHasEnough) {
        for (uint256 i; i < gameData.joinedPlayers.length; ++i) {
          address playerInLoop = gameData.joinedPlayers[i];
          if (playerInLoop != player) transferFrom(gameData, playerInLoop, player, 10);
        }
      } else transferFrom(gameData, BANK, player, 100);
    }
  }

  function transferToAllPlayers(Setup.Game storage game, uint256 amount) public {
    unchecked {
      address[] memory players = game.data.joinedPlayers;
      uint256 totalDebt;
      for (uint256 i; i < players.length; ++i) totalDebt += transferFrom(game.data, tx.origin, players[i], amount);
      if (totalDebt > 0) playerNearBankruptcy(game, tx.origin, uint40(totalDebt), address(0));
    }
  }

  function voluntaryTransfer(Setup.Data storage gameData, address from, address to, uint256 amount) public {
    uint256 debt = transferFrom(gameData, from, to, amount);
    if (debt > 0) revert Errors.NotEnoughCash();
  }

  function mandatoryTransfer(Setup.Game storage game, address from, address to, uint256 amount) public {
    uint256 debt = transferFrom(game.data, from, to, amount);
    if (debt > 0) playerNearBankruptcy(game, from, uint40(debt), to);
  }

  function voluntaryBurn(Setup.Data storage gameData, address player, uint256 amount) public {
    if (amount > gameData.balances[player]) revert Errors.NotEnoughCash();
    else gameData.balances[player] -= amount;
  }

  function mandatoryBurn(Setup.Game storage game, address player, uint256 amount) public {
    if (amount > game.data.balances[player]) playerNearBankruptcy(game, player, uint40(amount), BANK);
    else game.data.balances[player] -= amount;
  }

  function totalPatrimony(Setup.Data storage gameData, address player) public view returns (uint256) {
    return (gameData.balances[player] +
      gameData.players[player].propertiesPatrimony +
      gameData.players[player].buildingsPatrimony);
  }

  function payHighGasFees(Setup.Game storage game, address player, bool calculatePatrimony) public {
    unchecked {
      _onlyDuringTurn(game.data, player);
      _onlyDuringStatus(game.status, Setup.Status.PLAYER_HAS_TO_PAY_HIGH_GAS_FEES);
      uint256 amount;

      calculatePatrimony ? amount = (totalPatrimony(game.data, player) * 10) / 100 : amount = game
        .amounts
        .genesisReward;

      game.variants.getStablecoinStationMoney
        ? mandatoryTransfer(game, player, BANK, amount)
        : mandatoryBurn(game, player, amount);

      game.status = Setup.Status.PLAYING;
      emit Events.HighGasFeesPaid(player, amount);
    }
  }

  function payProtocolFee(Setup.Game storage game, address player) public {
    game.variants.getStablecoinStationMoney
      ? mandatoryTransfer(game, player, BANK, PROTOCOL_FEE_AMOUNT)
      : mandatoryBurn(game, player, PROTOCOL_FEE_AMOUNT);
    emit Events.ProtocolFeePaid(player, PROTOCOL_FEE_AMOUNT);
  }

  function payToBeFree(Setup.Game storage game) public {
    if (game.data.players[tx.origin].turnsLeftInJail == 0) revert Errors.YouAreFree();
    voluntaryBurn(game.data, tx.origin, JAIL_BAIL_AMOUNT);
    delete game.data.players[tx.origin].turnsLeftInJail;
    emit Events.PlayerIsFree(tx.origin);
  }

  function payRent(Setup.Game storage game, uint256 spot) public {
    if (!isMortgaged(game.data, spot))
      mandatoryTransfer(game, tx.origin, ownerOf(game.data, spot), calculateRent(game.data, spot));
    emit Events.RentPaid(tx.origin, ownerOf(game.data, spot), calculateRent(game.data, spot));
  }

  function payUtilityRent(Setup.Game storage game, address player, uint256 diceResult) public {
    _onlyDuringStatus(game.status, Setup.Status.PLAYER_HAS_TO_PAY_UTILITY_RENT);
    uint256 spot = game.data.players[player].position;
    if (!isMortgaged(game.data, spot)) {
      address beneficiary = ownerOf(game.data, spot);
      uint256 numberOfProperties = game.data.players[beneficiary].utilities;
      uint256 rent;
      if (numberOfProperties == 1) rent = diceResult * 4;
      else if (numberOfProperties == 2) rent = diceResult * 10;
      mandatoryTransfer(game, player, beneficiary, rent);
      emit Events.RentPaid(player, beneficiary, rent);
    }
  }

  function calculateRent(Setup.Data storage gameData, uint256 spot) public view returns (uint256) {
    address owner = ownerOf(gameData, spot);
    if (owner == address(0) || isMortgaged(gameData, spot)) return 0;
    if (isUtility(spot)) return 120;
    uint256 numberOfProperties;
    if (isBlocktrain(spot)) {
      (
        ,
        uint256 rentOneBlocktrain,
        uint256 rentTwoBlocktrains,
        uint256 rentThreeBlocktrains,
        uint256 rentFourBlocktrains
      ) = IChainopoly(msg.sender).blocktrainDetails();
      numberOfProperties = gameData.players[owner].blocktrains;
      if (numberOfProperties == 1) return rentOneBlocktrain;
      else if (numberOfProperties == 2) return rentTwoBlocktrains;
      else if (numberOfProperties == 3) return rentThreeBlocktrains;
      else if (numberOfProperties == 4) return rentFourBlocktrains;
    }

    (Setup.Property memory prop, ) = IChainopoly(msg.sender).propertyDetails(spot);

    if (ownsPropertyAndGroup(gameData, owner, spot)) {
      if (gameData.propertiesDetails[spot].hotel) return prop.rentHotel;
      numberOfProperties = gameData.propertiesDetails[spot].houses;
      if (numberOfProperties == 1) return prop.rentOneHouse;
      else if (numberOfProperties == 2) return prop.rentTwoHouses;
      else if (numberOfProperties == 3) return prop.rentThreeHouses;
      else if (numberOfProperties == 4) return prop.rentFourHouses;
      else return prop.rent * 2;
    } else return prop.rent;
  }

  function getOutOfBankruptcy(Setup.Game storage game) external {
    _onlyDuringStatus(game.status, Setup.Status.PLAYER_IS_NEAR_BANKRUPTCY);
    if (game.playerNearBankruptcy != tx.origin) revert Errors.YouAreNotNearBankruptcy();

    Setup.Player memory player = game.data.players[tx.origin];
    if (player.debtWith == BANK) voluntaryBurn(game.data, tx.origin, player.totalDebt);
    if (player.debtWith != address(0)) voluntaryTransfer(game.data, tx.origin, player.debtWith, player.totalDebt);
    if (player.debtWith == address(0)) transferToAllPlayers(game, player.totalDebt / game.data.joinedPlayers.length);

    emit Events.PlayerOutOfBankruptcy(game.playerNearBankruptcy);
    delete game.playerNearBankruptcy;
    delete game.data.players[tx.origin].totalDebt;
    delete game.data.players[tx.origin].debtWith;
    game.status = Setup.Status.PLAYING;
  }

  function playerNearBankruptcy(Setup.Game storage game, address player, uint256 debt, address debtWith) public {
    game.playerNearBankruptcy = player;
    game.data.endOfTurn[player] = block.timestamp + game.data.timePerTurn;
    game.data.players[player].debtWith = debtWith;
    game.data.players[player].totalDebt = uint16(debt);
    game.status = Setup.Status.PLAYER_IS_NEAR_BANKRUPTCY;
    emit Events.PlayerIsNearBankruptcy(player, debt);
  }

  function unmortgageMyProperty(Setup.Data storage gameData, uint256 spot) public {
    onlyOwner(gameData, spot);
    if (!isMortgaged(gameData, spot)) revert Errors.ThisPropertyIsNotMortgaged(spot);
    voluntaryBurn(gameData, tx.origin, calculateUnmortgage(spot));
    (isSpecialProperty(spot))
      ? gameData.specialPropertiesDetails[spot].mortgaged = false
      : gameData.propertiesDetails[spot].mortgaged = false;
    emit Events.PropertyUnmortgaged(tx.origin, spot);
  }

  function calculateMortgage(uint256 spot) public view returns (uint256) {
    unchecked {
      return IChainopoly(msg.sender).priceOf(spot) / 2;
    }
  }

  function calculateUnmortgage(uint256 spot) public view returns (uint256) {
    unchecked {
      uint256 mortgage = calculateMortgage(spot);
      uint256 tenPercent = (mortgage * 10) / 100;
      return (mortgage + tenPercent);
    }
  }

  function isMortgaged(Setup.Data storage gameData, uint256 spot) public view returns (bool) {
    _onlyOwnable(spot);
    if (isSpecialProperty(spot)) return gameData.specialPropertiesDetails[spot].mortgaged;
    return gameData.propertiesDetails[spot].mortgaged;
  }

  function mortgageMyProperty(Setup.Data storage gameData, uint256 spot) public {
    onlyOwner(gameData, spot);
    if (isMortgaged(gameData, spot)) revert Errors.ThisPropertyIsAlreadyMortgaged(spot);
    (isSpecialProperty(spot))
      ? gameData.specialPropertiesDetails[spot].mortgaged = true
      : gameData.propertiesDetails[spot].mortgaged = true;
    mint(gameData, tx.origin, calculateMortgage(spot));
    emit Events.PropertyMortgaged(tx.origin, spot);

    /* ****************************************************** */
    /*                        BUILDINGS                       */
    /* ****************************************************** */
  }

  function _ensureEqualBuilding(Setup.Data storage gameData, uint256 a, uint256 b, uint256 c) public view {
    _checkBuildingDifference(gameData.propertiesDetails[a].houses, gameData.propertiesDetails[b].houses);
    if (c != 0) {
      _checkBuildingDifference(gameData.propertiesDetails[a].houses, gameData.propertiesDetails[c].houses);
      _checkBuildingDifference(gameData.propertiesDetails[b].houses, gameData.propertiesDetails[c].houses);
    }
  }

  function _checkBuildingDifference(uint256 housesInA, uint256 housesInB) public pure {
    uint256 difference;
    (housesInA > housesInB) ? difference = housesInA - housesInB : difference = housesInB - housesInA;
    if (difference > 1) revert Errors.DifferenceInHouseBuildingIsTooBig();
  }

  /* ****************************************************** */
  /*                        BUILDINGS                       */
  /* ****************************************************** */

  function buildHousesInGroup(
    Setup.Data storage gameData,
    uint256[3] memory spots,
    uint256[3] memory amounts
  ) external {
    (uint256 a, uint256 b, uint256 c) = sameGroup(spots[0]);
    if (!playerOwnsGroup(gameData, a, b, c, tx.origin)) revert Errors.YouDontOwnAllPropertiesOfGroup();

    uint256 totalPrice;
    uint256 totalHousesBuilt;
    uint256 remainingHouses = HOUSES_SUPPLY - countElements(gameData, Setup.Elements.HOUSES);
    uint256 i;

    while (i < 3) {
      if (gameData.propertiesDetails[spots[i]].houses + amounts[i] > MAX_HOUSES_PER_SPOT)
        revert Errors.HousesMaxSupplyReached();
      gameData.propertiesDetails[spots[i]].houses += uint8(amounts[i]);
      totalPrice += IChainopoly(msg.sender).buildingPrice(spots[i]) * amounts[i];
      totalHousesBuilt += amounts[i];
      emit Events.HouseBuilt(tx.origin, spots[i]);
      ++i;
    }
    if (totalHousesBuilt > remainingHouses) revert Errors.HousesMaximumSupplyReached();

    voluntaryBurn(gameData, tx.origin, totalPrice);
    _ensureEqualBuilding(gameData, a, b, c);
    gameData.players[tx.origin].buildingsPatrimony += uint24(totalPrice);
    gameData.players[tx.origin].houses += uint8(totalHousesBuilt);
  }

  function sellHouses(Setup.Data storage gameData, uint256[] memory spots, uint256[] memory amounts) public {
    if (spots.length != amounts.length) revert Errors.ArrayLengthMismatch();

    (uint256 a, uint256 b, uint256 c) = sameGroup(spots[0]);

    if (!playerOwnsGroup(gameData, a, b, c, tx.origin)) revert Errors.YouDontOwnAllPropertiesOfGroup();

    uint256 totalPrice;
    uint256 totalAmountOfHouses;

    unchecked {
      for (uint256 i; i < spots.length; ++i) {
        if (amounts[i] > gameData.propertiesDetails[spots[i]].houses) revert Errors.NotEnoughHousesInProperty(spots[i]);
        gameData.propertiesDetails[spots[i]].houses -= uint8(amounts[i]);
        totalPrice += IChainopoly(msg.sender).buildingPrice(spots[i]) * amounts[i];
        totalAmountOfHouses += amounts[i];
        emit Events.HouseSold(tx.origin, spots[i]);
      }
    }

    _ensureEqualBuilding(gameData, a, b, c);
    mint(gameData, tx.origin, totalPrice / 2);
    gameData.players[tx.origin].buildingsPatrimony -= uint24(totalPrice);
    gameData.players[tx.origin].houses -= uint8(totalAmountOfHouses);
  }

  function buildHotels(Setup.Data storage gameData, uint256[] memory spots) external {
    if (countElements(gameData, Setup.Elements.HOTELS) + spots.length > HOUSES_SUPPLY)
      revert Errors.HotelMaximumSupplyReached();

    uint256 totalPrice;
    unchecked {
      for (uint256 i; i < spots.length; ++i) {
        onlyOwner(gameData, spots[i]);
        Setup.PropertyDetails storage prop = gameData.propertiesDetails[spots[i]];
        if (prop.hotel) revert Errors.PropertyHasAHotel();

        (uint256 a, uint256 b, uint256 c) = sameGroup(spots[i]);

        if (
          gameData.propertiesDetails[a].houses < MAX_HOUSES_PER_SPOT ||
          gameData.propertiesDetails[b].houses < MAX_HOUSES_PER_SPOT ||
          gameData.propertiesDetails[c].houses < MAX_HOUSES_PER_SPOT
        ) revert Errors.NotEnoughHouses();

        prop.hotel = true;
        delete prop.houses;
        totalPrice += IChainopoly(msg.sender).buildingPrice(spots[i]);
        emit Events.HotelBuilt(tx.origin, spots[i]);
      }
    }
    voluntaryBurn(gameData, tx.origin, totalPrice);
    gameData.players[tx.origin].buildingsPatrimony += uint24(totalPrice);
    gameData.players[tx.origin].hotels += uint8(spots.length);
  }

  function sellHotels(Setup.Data storage gameData, uint256[] memory spots) external {
    uint256 totalPrice;
    Setup.PropertyDetails storage prop;

    unchecked {
      for (uint256 i; i < spots.length; ++i) {
        onlyOwner(gameData, spots[i]);
        prop = gameData.propertiesDetails[spots[i]];
        if (!prop.hotel) revert Errors.NoHotelHere();
        prop.hotel = false;
        totalPrice += IChainopoly(msg.sender).buildingPrice(spots[i]);
        prop.houses = MAX_HOUSES_PER_SPOT;
        emit Events.HotelSold(tx.origin, spots[i]);
      }
    }
    if (countElements(gameData, Setup.Elements.HOUSES) > HOUSES_SUPPLY) revert Errors.NotEnoughHouses();
    gameData.players[tx.origin].buildingsPatrimony -= uint24(totalPrice);
    gameData.players[tx.origin].hotels -= uint8(spots.length);
    mint(gameData, tx.origin, totalPrice / 2);
  }

  function sellHotelsAndHouses(
    Setup.Data storage gameData,
    uint256[] memory spots,
    uint256[] memory housesToSell
  ) external {
    if (spots.length != housesToSell.length) revert Errors.ArrayLengthMismatch();
    uint256 totalPrice;
    Setup.PropertyDetails storage prop;

    unchecked {
      for (uint256 i; i < spots.length; ++i) {
        onlyOwner(gameData, spots[i]);
        prop = gameData.propertiesDetails[spots[i]];
        if (!prop.hotel) revert Errors.NoHotelHere();
        prop.hotel = false;
        emit Events.HotelSold(tx.origin, spots[i]);
        totalPrice += IChainopoly(msg.sender).buildingPrice(spots[i]);
      }
    }

    gameData.players[tx.origin].buildingsPatrimony -= uint24(totalPrice);
    gameData.players[tx.origin].hotels -= uint8(spots.length);
    sellHouses(gameData, spots, housesToSell);
    if (countElements(gameData, Setup.Elements.HOUSES) > HOUSES_SUPPLY) revert Errors.HousesMaximumSupplyReached();
    mint(gameData, tx.origin, totalPrice / 2);
  }
}
