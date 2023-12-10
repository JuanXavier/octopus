// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {ChainopolyCore as Core} from "./ChainopolyCore.sol";
import {ChainopolyCards as Cards} from "./ChainopolyCards.sol";
import {ChainopolySetup as Setup} from "../libraries/ChainopolySetup.sol";
import {ChainopolyErrors as Errors} from "../libraries/ChainopolyErrors.sol";
import {ChainopolyEvents as Events} from "../libraries/ChainopolyEvents.sol";
import {ChainopolyAuction as Auction} from "../libraries/ChainopolyAuction.sol";
import {IChainopoly} from "../interfaces/IChainopoly.sol";

library ChainopolyHelpers {
  address private constant BANK = 0x000000000000000000000000000000000000dEaD;
  uint8 private constant HIGH_GAS_FEES = 4;
  uint8 private constant STABLECOIN_STATION = 20;
  uint8 private constant GO_TO_JAIL = 30;
  uint8 private constant PROTOCOL_FEE = 38;

  function _onlyOwnable(uint256 spot) private pure {
    if (!isOwnable(spot)) revert Errors.PositionNotOwnable(spot);
  }

  function _onlyOwner(Setup.Data storage gameData, uint256 spot) private view {
    if (tx.origin != ownerOf(gameData, spot)) revert Errors.YouDontOwnThisProperty(spot);
  }

  function _onlyDuringStatus(Setup.Status currentStatus, Setup.Status neededStatus) private pure {
    if (currentStatus != neededStatus) revert Errors.InvalidGameStatus(currentStatus);
  }

  function isMortgaged(Setup.Data storage gameData, uint256 spot) public view returns (bool) {
    _onlyOwnable(spot);
    if (isSpecialProperty(spot)) return gameData.specialPropertiesDetails[spot].mortgaged;
    return gameData.propertiesDetails[spot].mortgaged;
  }

  function isSpecialProperty(uint256 spot) public pure returns (bool) {
    return (spot == 12 || spot == 28 || spot == 5 || spot == 15 || spot == 25 || spot == 35);
  }

  function isUtility(uint256 spot) public pure returns (bool) {
    return (spot == 12 || spot == 28);
  }

  function isBlocktrain(uint256 spot) public pure returns (bool) {
    return (spot == 5 || spot == 15 || spot == 25 || spot == 35);
  }

  function isZeroKnowledgeChance(uint256 spot) public pure returns (bool) {
    return (spot == 7 || spot == 22 || spot == 36);
  }

  function isDefiBootyBag(uint256 spot) public pure returns (bool) {
    return (spot == 2 || spot == 17 || spot == 33);
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

  function ownerOf(Setup.Data storage gameData, uint256 spot) public view returns (address) {
    _onlyOwnable(spot);
    if (spot == 5 || spot == 15 || spot == 25 || spot == 35 || spot == 12 || spot == 28)
      return gameData.specialPropertiesDetails[spot].owner;
    else return gameData.propertiesDetails[spot].owner;
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

  function joinGame(Setup.Game storage game) external {
    if (game.data.joined[msg.sender]) revert Errors.YouAlreadyJoinedThisGame();
    if (game.status != Setup.Status.WAITING_TO_JOIN || game.status != Setup.Status.MIN_PLAYERS_MET)
      revert Errors.InvalidGameStatus(game.status);

    if (game.variants.staggeredStart) {
      uint256 joinedPlayers = game.data.joinedPlayers.length;
      if (joinedPlayers == 1 || joinedPlayers == 5) game.data.players[tx.origin].position = 10;
      if (joinedPlayers == 2 || joinedPlayers == 6) game.data.players[tx.origin].position = 20;
      if (joinedPlayers == 3 || joinedPlayers == 7) game.data.players[tx.origin].position = 30;
    }
    game.data.joinedPlayers.push(tx.origin);
    game.data.joined[tx.origin] = true;
  }

  function startGame(Setup.Game storage game) external {
    if (!game.data.joined[tx.origin]) revert Errors.YouHaventJoinedAnyGame(tx.origin);
    if (game.status != Setup.Status.MIN_PLAYERS_MET || game.status != Setup.Status.MAX_PLAYERS_REACHED)
      revert Errors.InvalidGameStatus(game.status);
    game.status = Setup.Status.PLAYING;
    game.data.endOfTurn[game.data.joinedPlayers[0]] = block.timestamp + game.data.timePerTurn;
    Core.initialMint(game);
  }

  function useBlocktrain(Setup.Game storage game, uint256 destination) external {
    _onlyDuringStatus(game.status, Setup.Status.PLAYING);
    (address playerInTurn, uint256 mins, uint256 secs) = whoseTurnIsIt(game);
    if (tx.origin != playerInTurn) revert Errors.NotYourTurn();
    if (mins == 0 && secs == 0) revert Errors.NoTimeLeft();
    if (game.diceRolledThisTurn && game.data.doublesCount == 0) revert Errors.YouAlreadyRolledThisTurn();

    if (!isBlocktrain(destination)) revert Errors.DestinationIsNotBlocktrain();
    uint256 origin = game.data.players[tx.origin].position;
    if (!isBlocktrain(origin)) revert Errors.CurrentPositionIsNotBlocktrain();
    if (origin == destination) revert Errors.OriginAndDestinationCantBeTheSame();

    address originOwner = game.data.specialPropertiesDetails[origin].owner;
    address destinationOwner = game.data.specialPropertiesDetails[destination].owner;
    if (originOwner == address(0) || destinationOwner == address(0)) revert Errors.BlocktrainIsNotOwned();

    if (game.variants.blocktrainTravel) {
      uint256 travelFee = game.amounts.blocktrainTravel;
      bool playerOwnsOrigin = tx.origin == originOwner;
      bool playerOwnsDestination = tx.origin == destinationOwner;

      if (playerOwnsOrigin && !playerOwnsDestination) {
        Core.voluntaryTransfer(game.data, tx.origin, destinationOwner, travelFee / 2);
      } else if (playerOwnsDestination && !playerOwnsOrigin) {
        Core.voluntaryTransfer(game.data, tx.origin, originOwner, travelFee / 2);
      } else if (!playerOwnsOrigin && !playerOwnsDestination && originOwner != destinationOwner) {
        Core.voluntaryTransfer(game.data, tx.origin, originOwner, travelFee / 2);
        Core.voluntaryTransfer(game.data, tx.origin, destinationOwner, travelFee / 2);
      } else if (!playerOwnsOrigin && !playerOwnsDestination && originOwner == destinationOwner) {
        Core.voluntaryTransfer(game.data, tx.origin, destinationOwner, travelFee);
      }
      game.diceRolledThisTurn = true;
      delete game.data.doublesCount;
      game.data.players[tx.origin].position = uint8(destination);
    } else revert Errors.BlocktrainTravelNotActive();
    emit Events.PlayerUsedBlocktrain(tx.origin, origin, destination);
  }

  function addToAuctionList(Setup.Auction storage auction, uint256[] memory properties) public {
    unchecked {
      if (auction.propertiesInAuction.length > 0) {
        for (uint256 i; i < properties.length; ++i) auction.propertiesInAuction.push(properties[i]);
      } else auction.propertiesInAuction = properties;
    }
  }

  function redeemJailCard(Setup.Game storage game) public {
    if (game.data.players[tx.origin].turnsLeftInJail == 0) revert Errors.YouAreFree();
    if (game.data.players[tx.origin].outOfJailCards > 0) --game.data.players[tx.origin].outOfJailCards;
    else revert Errors.YouHaveNoCards();
    delete game.data.players[tx.origin].turnsLeftInJail;
    emit Events.PlayerIsFree(tx.origin);
  }

  function whoseTurnIsIt(Setup.Game storage game) public view returns (address, uint256 mins, uint256 secs) {
    if (!game.data.joined[tx.origin]) revert Errors.YouHaventJoinedAnyGame(tx.origin);

    if (game.status == Setup.Status.WAITING_TO_JOIN || game.status == Setup.Status.FINISHED) return (address(0), 0, 0);

    if (game.data.joinedPlayers.length > 0) {
      address currentPlayer = game.status == Setup.Status.PLAYER_IS_NEAR_BANKRUPTCY
        ? game.playerNearBankruptcy
        : game.data.joinedPlayers[game.data.currentTurnIndex];

      if (
        game.status == Setup.Status.WAITING_TO_JOIN ||
        game.status == Setup.Status.MIN_PLAYERS_MET ||
        game.status == Setup.Status.MAX_PLAYERS_REACHED
      ) return (currentPlayer, 0, 0);

      uint256 endOfTurn = game.data.endOfTurn[currentPlayer];
      if (endOfTurn > block.timestamp) {
        uint256 timeLeft = endOfTurn - block.timestamp;
        return (currentPlayer, (timeLeft / 1 minutes), (timeLeft % 1 minutes));
      } else return (currentPlayer, 0, 0);
    }
    return (address(0), 0, 0);
  }

  function endTurn(Setup.Game storage game) public {
    if (!game.data.joined[tx.origin]) revert Errors.YouHaventJoinedAnyGame(tx.origin);
    Setup.Status gameStatus = game.status;
    if (
      gameStatus == Setup.Status.INACTIVE ||
      gameStatus == Setup.Status.WAITING_TO_JOIN ||
      gameStatus == Setup.Status.MIN_PLAYERS_MET ||
      gameStatus == Setup.Status.MAX_PLAYERS_REACHED ||
      gameStatus == Setup.Status.FINISHED
    ) revert Errors.InvalidGameStatus(game.status);

    (address playerEndingTurn, uint256 _mins, uint256 _secs) = whoseTurnIsIt(game);
    bool timeLeft = (_mins > 0 || _secs > 0);
    bool diceRolled = game.diceRolledThisTurn;

    if (timeLeft) {
      if (tx.origin != playerEndingTurn) revert Errors.NotYourTurn();
      if (!diceRolled) revert Errors.YouHaventRolledTheDice();
      if (game.data.doublesCount > 0) revert Errors.GotDoublesSoRollAgain();
    }

    if (gameStatus == Setup.Status.PLAYER_HAS_TO_PICK_CARD) {
      if (timeLeft) revert Errors.YouHaveToPickACard();
      else {
        if (isDefiBootyBag(game.data.players[playerEndingTurn].position))
          Cards.pickDefiBootyBag(game, playerEndingTurn, 15);
        else Cards.pickZeroKnowledgeChance(game, playerEndingTurn, 15);
      }
    }

    if (game.status == Setup.Status.PLAYER_HAS_TO_PAY_UTILITY_RENT) {
      if (timeLeft) revert Errors.StillTimeToPayUtilityRent();
      else Core.payUtilityRent(game, playerEndingTurn, 12);
    }

    if (game.status == Setup.Status.PLAYER_HAS_TO_PAY_HIGH_GAS_FEES) {
      if (timeLeft) revert Errors.PlayerHasToPayGasFee();
      else Core.payHighGasFees(game, playerEndingTurn, true);
    }

    if (game.status == Setup.Status.PLAYER_IS_NEAR_BANKRUPTCY) {
      if (timeLeft) revert Errors.StillTimeToGetOutOfBankruptcy();
      else removePlayer(game, game.playerNearBankruptcy);
    }

    if (game.status == Setup.Status.AUCTIONING) {
      (uint256 auctionMins, uint256 auctionSecs) = Auction.timeLeftToBid(game.auction);
      timeLeft = (auctionMins > 0 || auctionSecs > 0);
      if (timeLeft) revert Errors.AnAuctionIsTakingPlace();
      else Auction.endAuction(game);
    }

    if (game.status == Setup.Status.PLAYER_HAS_TO_DECIDE) {
      if (tx.origin == playerEndingTurn || !timeLeft) {
        Auction.startAuction(game, game.data.players[playerEndingTurn].position, playerEndingTurn);
        return;
      } else revert Errors.NotYourTurn();
    }

    /* -------------- CORE ENDING FUNCTIONALITY ------------- */
    uint256 endingTurnIndex = game.data.currentTurnIndex;
    uint256 numberOfPlayers = game.data.joinedPlayers.length;
    game.data.currentTurnIndex = uint8((game.data.currentTurnIndex + 1) % numberOfPlayers); // change turn to next player
    if (game.data.currentTurnIndex < endingTurnIndex) ++game.rounds; // Increment rounds if full circle

    for (uint256 i; i < numberOfPlayers; ++i) {
      if (game.data.joinedPlayers[game.data.currentTurnIndex] != address(0)) break;
      else game.data.currentTurnIndex = uint8((game.data.currentTurnIndex + 1) % numberOfPlayers);
    }

    address playerStartingNextTurn = game.data.joinedPlayers[game.data.currentTurnIndex];
    if (playerStartingNextTurn == playerEndingTurn) {
      game.winner = playerEndingTurn;
      game.status = Setup.Status.FINISHED;
      IChainopoly(msg.sender).clearPlayersInGame(playerEndingTurn);
      return;
    }

    if (diceRolled) {
      game.diceRolledThisTurn = false;
      delete game.data.players[playerEndingTurn].strikes;
    } else {
      if (game.data.players[playerEndingTurn].strikes == 2) removePlayer(game, playerEndingTurn);
      else ++game.data.players[playerEndingTurn].strikes;
    }

    if (game.data.players[playerEndingTurn].turnsLeftInJail > 0) --game.data.players[playerEndingTurn].turnsLeftInJail;
    delete game.data.doublesCount;
    game.status = Setup.Status.PLAYING;
    game.data.endOfTurn[playerStartingNextTurn] = block.timestamp + game.data.timePerTurn;
    emit Events.TurnEnded(playerEndingTurn, playerStartingNextTurn);
  }

  function voteToEndGame(Setup.GameInfo storage gameInfo) external {
    if (gameInfo.hasVoted[tx.origin]) revert Errors.AlreadyVoted();
    ++gameInfo.votesToEndGame;
    gameInfo.hasVoted[msg.sender] = true;
    emit Events.VoteCasted(msg.sender);
  }

  function votingResults(
    Setup.GameInfo storage gameInfo,
    uint256 players
  ) public view returns (uint256 votes, bool result) {
    if (players == 0) return (0, false);
    uint256 majority = (players / 2) + 1;
    return (gameInfo.votesToEndGame, gameInfo.votesToEndGame >= majority);
  }

  function removePlayer(Setup.Game storage game, address player) public {
    Setup.Status gameStatus = game.status;
    if (
      gameStatus == Setup.Status.INACTIVE ||
      gameStatus == Setup.Status.WAITING_TO_JOIN ||
      gameStatus == Setup.Status.MIN_PLAYERS_MET ||
      gameStatus == Setup.Status.MAX_PLAYERS_REACHED ||
      gameStatus == Setup.Status.FINISHED
    ) revert Errors.InvalidGameStatus(game.status);

    (address playerInTurn, , ) = whoseTurnIsIt(game);
    bool isPlayerInTurn = tx.origin == playerInTurn;

    if (!isPlayerInTurn) {
      if (
        game.status == Setup.Status.PLAYING ||
        game.status == Setup.Status.AUCTIONING ||
        game.status == Setup.Status.PLAYER_HAS_TO_DECIDE ||
        game.status == Setup.Status.PLAYER_HAS_TO_PICK_CARD ||
        game.status == Setup.Status.PLAYER_IS_NEAR_BANKRUPTCY ||
        game.status == Setup.Status.PLAYER_HAS_TO_PAY_UTILITY_RENT ||
        game.status == Setup.Status.PLAYER_HAS_TO_PAY_HIGH_GAS_FEES
      ) revert Errors.MustWaitToGiveUp();
    }

    if (game.status == Setup.Status.AUCTIONING) {
      if (player == game.auction.starter) game.auction.starter = BANK;
      if (player == game.auction.highestBidder) revert Errors.CantQuitBeingHigghestBidder();
    }

    if (
      game.status == Setup.Status.PLAYER_IS_NEAR_BANKRUPTCY &&
      game.data.players[game.playerNearBankruptcy].debtWith == tx.origin
    ) game.data.players[game.playerNearBankruptcy].debtWith = BANK;

    Setup.Player memory _player = game.data.players[player];
    // IF PLAYER GIVES UP OR IS RETIRED FROM GAME AFTER 3 STRIKES

    if (_player.totalDebt == 0) {
      deletePropertiesAndPlayer(game, player);
    } else {
      // IF PLAYER NEAR BANKRUPCY AND GIVES UP OR DIDNT PAY DEBT IN TIME
      /* --------- DEBT WITH OTHER PLAYER --------- */

      if (_player.debtWith != address(0) && _player.debtWith != BANK) {
        // Sell buildings to bank at half price and transfers value to the player creditor of debt
        Core.mint(game.data, _player.debtWith, _player.buildingsPatrimony / 2);

        // transfer the props patrimony from retiring player to creditor
        game.data.players[_player.debtWith].utilities += _player.utilities;
        game.data.players[_player.debtWith].blocktrains += _player.blocktrains;
        game.data.players[_player.debtWith].outOfJailCards += _player.outOfJailCards;
        game.data.players[_player.debtWith].propertiesPatrimony += _player.propertiesPatrimony;

        for (uint256 i; i < _player.properties.length; ++i) {
          if (isSpecialProperty(_player.properties[i])) {
            game.data.specialPropertiesDetails[_player.properties[i]].owner = _player.debtWith;
          } else {
            delete game.data.propertiesDetails[_player.properties[i]].houses;
            game.data.propertiesDetails[_player.properties[i]].hotel = false;
            game.data.propertiesDetails[_player.properties[i]].owner = _player.debtWith;
          }

          // If props are mortgaged, creditor is forced to unmortgage the property
          if (isMortgaged(game.data, _player.properties[i]))
            Core.unmortgageMyProperty(game.data, _player.properties[i]);
          game.data.players[_player.debtWith].properties.push(_player.properties[i]);
        }
      }

      /* ------------ DEBT WITH BANK / ALL PLAYERS ------------ */

      if (_player.debtWith == BANK || _player.debtWith == address(0)) {
        if (!game.variants.getAuctionMoney) addToAuctionList(game.auction, _player.properties);
        deletePropertiesAndPlayer(game, player);
        if (game.auction.propertiesInAuction.length > 0)
          Auction._startAuction(
            game,
            player,
            game.auction.propertiesInAuction[game.auction.propertiesInAuction.length - 1]
          );
      }
    }

    /* ------------------- COMMON DELETION ------------------ */
    // replace the players address with address(0) and  cancel all offers made
    unchecked {
      uint256 i;

      for (; i < game.data.joinedPlayers.length; ++i) {
        if (game.data.joinedPlayers[i] == player) {
          delete game.data.joinedPlayers[i];
          break;
        }
      }

      delete i;

      for (i; i < game.offers.length; ++i) {
        if (game.offers[i].from == tx.origin && game.offers[i].status == Setup.OfferStatus.PENDING)
          game.offers[i].status = Setup.OfferStatus.CANCELLED;
      }
    }
    game.data.joined[player] = false;
    delete game.data.players[player];
    delete game.data.balances[player];
    delete game.data.lockedForAuction[player];
    if (player == game.playerNearBankruptcy) delete game.playerNearBankruptcy;
    game.data.endOfTurn[address(0)] = block.timestamp;
    emit Events.PlayerRemoved(player);
  }

  function deletePropertiesAndPlayer(Setup.Game storage game, address player) public {
    uint256[] memory properties = game.data.players[player].properties;
    unchecked {
      for (uint256 i; i < properties.length; ++i) {
        isSpecialProperty(game.data.players[player].properties[i])
          ? delete game.data.specialPropertiesDetails[properties[i]]
          : delete game.data.propertiesDetails[properties[i]];
      }
      delete game.data.players[player];
    }
  }

  function declareWinner(Setup.Game storage game) external {
    address playerInLoop;
    uint256 playerInLoopPatrimony;
    address currentWinner;
    uint256 winnerPatrimony;
    Setup.Player memory _player;

    // Loop through all the joined players to find the playerInLoop with the highest playerInLoopPatrimony
    unchecked {
      for (uint256 i; i < game.data.joinedPlayers.length; ++i) {
        playerInLoop = game.data.joinedPlayers[i];
        _player = game.data.players[playerInLoop];

        // Check if the playerInLoop still exists in game (is not address(0))
        if (playerInLoop != address(0)) {
          // Calculate the playerInLoopPatrimony by adding its balance, properties and buildings
          playerInLoopPatrimony = (game.data.balances[playerInLoop] +
            _player.propertiesPatrimony +
            _player.buildingsPatrimony);

          // Check if the playerInLoop has a higher playerInLoopPatrimony than the current highest playerInLoopPatrimony
          if (playerInLoopPatrimony > winnerPatrimony) {
            currentWinner = playerInLoop;
            winnerPatrimony = playerInLoopPatrimony;
          }

          // If the playerInLoop has the same playerInLoopPatrimony as the current highest playerInLoopPatrimony, break the tie based on:
          // 1. special properties, 2. regular properties owned 3. turn order
          if (playerInLoopPatrimony == winnerPatrimony) {
            // Calculate the number of special properties owned by the current playerInLoop and the playerInLoop with the higher playerInLoopPatrimony
            uint256 playerInLoopSpecialProps = _player.utilities + _player.blocktrains;
            uint256 currentWinnerSpecialProps = game.data.players[currentWinner].utilities +
              game.data.players[currentWinner].blocktrains;

            if (playerInLoopSpecialProps > currentWinnerSpecialProps) currentWinner = playerInLoop;

            // If the current player owns the same number of special properties as the player with the higher patrimony, break the tie based on the number of properties owned
            if (playerInLoopSpecialProps == currentWinnerSpecialProps) {
              if (_player.properties.length > game.data.players[currentWinner].properties.length)
                currentWinner = playerInLoop;

              // If both players own the same number of properties, break the tie based on turn order
              if (_player.properties.length == game.data.players[currentWinner].properties.length) {
                uint256 numberOfPlayers = game.data.joinedPlayers.length;
                uint256 gameCurrentTurnIndex = game.data.currentTurnIndex;

                // Loop through all the joined players to find the player whose turn is next or whose turn is closer
                for (uint256 j; j < numberOfPlayers; ++j) {
                  if (game.data.joinedPlayers[gameCurrentTurnIndex] == playerInLoop) {
                    currentWinner = playerInLoop;
                    break;
                  } else if (game.data.joinedPlayers[gameCurrentTurnIndex] == currentWinner) break;
                  else gameCurrentTurnIndex = (gameCurrentTurnIndex + 1) % numberOfPlayers;
                }
              }
            }
          }
        }
        // If its address zero then it will go to next index
      }
    }

    game.winner = currentWinner;
    game.status = Setup.Status.FINISHED;
    IChainopoly(msg.sender).clearPlayersInGame(currentWinner);
  }
}
