// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {ChainopolyErrors as Errors} from "../libraries/ChainopolyErrors.sol";
import {ChainopolyEvents as Events} from "../libraries/ChainopolyEvents.sol";
import {ChainopolySetup as Setup} from "../libraries/ChainopolySetup.sol";
import {ChainopolyCore as Core} from "../libraries/ChainopolyCore.sol";
import {IChainopoly} from "../interfaces/IChainopoly.sol";

library ChainopolySwaps {
  function ownerOf(Setup.Data storage gameData, uint256 spot) public view returns (address) {
    if (spot > 39) revert Errors.OutOfBounds();
    if (
      spot == 0 ||
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
      spot == 38
    ) revert Errors.PositionNotOwnable(spot);
    if (spot == 5 || spot == 15 || spot == 25 || spot == 35 || spot == 12 || spot == 28)
      return gameData.specialPropertiesDetails[spot].owner;
    else return gameData.propertiesDetails[spot].owner;
  }

  /* ***************************************************** */
  /*                         SWAPS                         */
  /* ***************************************************** */

  function iOfferYouThis(
    Setup.Game storage game,
    address toPlayer,
    uint256[] memory propertiesOffered,
    uint256[] memory propertiesWanted,
    uint256 cashOffered,
    uint256 cashWanted,
    uint256 getOutOfJailCardsOffered,
    uint256 getOutOfJailCardsWanted
  ) external returns (uint256 offerID) {
    if (!game.data.joined[tx.origin]) revert Errors.YouHaventJoinedAnyGame(tx.origin);
    if (game.data.players[tx.origin].outOfJailCards < getOutOfJailCardsOffered) revert Errors.NotEnoughJailCards();
    if (cashOffered > game.data.balances[tx.origin]) revert Errors.NotEnoughCash();
    unchecked {
      for (uint256 i; i < propertiesOffered.length; ++i) {
        if (ownerOf(game.data, propertiesOffered[i]) != tx.origin)
          revert Errors.YouDontOwnThisProperty(propertiesOffered[i]);
      }
    }
    lockForSwaps(game.data, tx.origin, cashOffered);

    Setup.Offer memory newOffer = Setup.Offer({
      from: tx.origin,
      to: toPlayer,
      status: Setup.OfferStatus.PENDING,
      cashOffered: uint24(cashOffered),
      cashWanted: uint24(cashWanted),
      getOutOfJailCardsOffered: uint8(getOutOfJailCardsOffered),
      getOutOfJailCardsWanted: uint8(getOutOfJailCardsWanted),
      propertiesOffered: propertiesOffered,
      propertiesWanted: propertiesWanted
    });

    game.offers.push(newOffer);
    offerID = game.offers.length;

    game.totalOffers[tx.origin].offersMade.push(offerID);
    game.totalOffers[toPlayer].offersReceived.push(offerID);

    emit Events.OfferMade(tx.origin, toPlayer, offerID);
  }

  function lockForSwaps(Setup.Data storage gameData, address player, uint256 amount) public {
    unchecked {
      if (amount > gameData.balances[player]) revert Errors.NotEnoughCash();
      gameData.balances[player] -= amount;
      gameData.lockedForSwaps[player] += amount;
    }
  }

  function unlockFromSwaps(Setup.Data storage gameData, address player, uint256 amount) public {
    gameData.balances[player] += amount;
    gameData.lockedForSwaps[player] -= amount;
  }

  function iAcceptYourOffer(Setup.Game storage game, uint256 id) external {
    if (!game.data.joined[tx.origin]) revert Errors.YouHaventJoinedAnyGame(tx.origin);
    Setup.Offer memory offer = game.offers[id - 1];
    if (offer.to != tx.origin) revert Errors.ThisOfferIsNotForYou();
    offer.status = Setup.OfferStatus.ACCEPTED;

    if (offer.cashOffered > 0) {
      Core.voluntaryTransfer(game.data, offer.from, offer.to, offer.cashOffered);
      unlockFromSwaps(game.data, offer.from, offer.cashOffered);
    }
    if (offer.cashWanted > 0) {
      Core.voluntaryTransfer(game.data, offer.to, offer.from, offer.cashWanted);
      unlockFromSwaps(game.data, offer.to, offer.cashWanted);
    }

    if (offer.propertiesOffered.length > 0) swapProperties(game, offer.propertiesOffered, offer.from, offer.to);
    if (offer.propertiesWanted.length > 0) swapProperties(game, offer.propertiesWanted, offer.to, offer.from);

    if (game.data.players[tx.origin].outOfJailCards >= offer.getOutOfJailCardsWanted) {
      game.data.players[tx.origin].outOfJailCards -= offer.getOutOfJailCardsWanted;
      game.data.players[offer.to].outOfJailCards += offer.getOutOfJailCardsWanted;
    } else revert Errors.NotEnoughJailCards();
    if (game.data.players[offer.to].outOfJailCards >= offer.getOutOfJailCardsOffered) {
      game.data.players[offer.to].outOfJailCards -= offer.getOutOfJailCardsOffered;
      game.data.players[tx.origin].outOfJailCards += offer.getOutOfJailCardsOffered;
    } else revert Errors.NotEnoughJailCards();

    emit Events.OfferAccepted(id);
  }

  function iRejectYourOffer(Setup.Game storage game, uint256 id) external {
    Setup.Offer storage offer = game.offers[id];
    if (offer.to != tx.origin) revert Errors.ThisOfferIsNotForYou();
    offer.status = Setup.OfferStatus.REJECTED;
    unlockFromSwaps(game.data, offer.from, offer.cashOffered);
    emit Events.OfferRejected(id);
  }

  function iCancelMyOffer(Setup.Game storage game, uint256 id) external {
    Setup.Offer storage offer = game.offers[id];
    if (offer.from != tx.origin) revert Errors.ThisOfferIsNotYours();
    unlockFromSwaps(game.data, offer.from, offer.cashOffered);
    if (offer.status == Setup.OfferStatus.PENDING) {
      offer.status = Setup.OfferStatus.CANCELLED;
      emit Events.OfferCancelled(id);
    }
  }

  function swapProperties(Setup.Game storage game, uint256[] memory props, address from, address to) public {
    unchecked {
      for (uint256 i; i < props.length; ++i) {
        if (ownerOf(game.data, props[i]) != from) revert Errors.YouDontOwnThisProperty(props[i]);
        uint256 priceOfProperty = IChainopoly(msg.sender).priceOf(props[i]);

        if ((props[i] == 12 || props[i] == 28)) {
          game.data.specialPropertiesDetails[props[i]].owner = to;
          --game.data.players[from].utilities;
          ++game.data.players[to].utilities;
        } else if ((props[i] == 5 || props[i] == 15 || props[i] == 25 || props[i] == 35)) {
          game.data.specialPropertiesDetails[props[i]].owner = to;
          --game.data.players[from].blocktrains;
          ++game.data.players[to].blocktrains;
        } else {
          game.data.propertiesDetails[props[i]].owner = to;
        }
        game.data.players[to].properties.push(props[i]);
        removeProperty(game.data.players[from].properties, props[i]);
        game.data.players[to].propertiesPatrimony += uint24(priceOfProperty);
        game.data.players[from].propertiesPatrimony -= uint24(priceOfProperty);
      }
    }
  }

  function removeProperty(uint256[] storage properties, uint256 spot) public {
    unchecked {
      for (uint256 i; i < properties.length; ++i) {
        if (properties[i] == spot) {
          properties[i] = properties[properties.length - 1];
          properties.pop();
          break;
        }
      }
    }
  }
}
