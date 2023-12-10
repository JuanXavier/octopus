//SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {ChainopolySetup as Setup} from "../libraries/ChainopolySetup.sol";
import {ChainopolyErrors as Errors} from "../libraries/ChainopolyErrors.sol";
import {ChainopolyEvents as Events} from "../libraries/ChainopolyEvents.sol";
import {IChainopoly} from "../interfaces/IChainopoly.sol";

library ChainopolyAuction {
  address private constant BANK = 0x000000000000000000000000000000000000dEaD;

  function isBlocktrain(uint256 spot) private pure returns (bool) {
    return (spot == 5 || spot == 15 || spot == 25 || spot == 35);
  }

  function isSpecialProperty(uint256 spot) private pure returns (bool) {
    return (spot == 12 || spot == 28 || spot == 5 || spot == 15 || spot == 25 || spot == 35);
  }

  function _onlyDuringStatus(Setup.Status currentStatus, Setup.Status neededStatus) public pure {
    if (currentStatus != neededStatus) revert Errors.InvalidGameStatus(currentStatus);
  }

  function timeLeftToBid(Setup.Auction storage auction) external view returns (uint256 mins, uint256 secs) {
    unchecked {
      if (auction.end > block.timestamp) {
        uint256 timeLeft = auction.end - block.timestamp;
        return (timeLeft / 1 minutes, timeLeft % 1 minutes);
      } else return (0, 0);
    }
  }

  function lockForAuction(Setup.Data storage gameData, uint256 amount) public {
    unchecked {
      if (gameData.balances[tx.origin] < amount) revert Errors.NotEnoughCash();
      uint256 difference = amount - gameData.lockedForAuction[tx.origin];
      gameData.balances[tx.origin] -= difference;
      gameData.lockedForAuction[tx.origin] += difference;
    }
  }

  function unlockFromAuction(Setup.Data storage gameData) public {
    unchecked {
      address[] memory joinedPlayers = gameData.joinedPlayers;
      for (uint256 i; i < joinedPlayers.length; ++i) {
        gameData.balances[joinedPlayers[i]] += gameData.lockedForAuction[joinedPlayers[i]];
        delete gameData.lockedForAuction[joinedPlayers[i]];
      }
    }
  }

  function startAuction(Setup.Game storage game, uint256 spot, address auctionStarter) public {
    game.auction.propertiesInAuction.push(spot);
    _startAuction(game, auctionStarter, spot);
  }

  function _startAuction(Setup.Game storage game, address auctionStarter, uint256 spot) public {
    game.auction.starter = auctionStarter;
    game.auction.end = game.auction.timePerAuction + uint32(block.timestamp);
    game.status = Setup.Status.AUCTIONING;
    emit Events.AuctionStarted(spot, auctionStarter);
  }

  function bid(Setup.Game storage game, uint256 bidAmount) external {
    if (!game.data.joined[tx.origin]) revert Errors.YouHaventJoinedAnyGame(tx.origin);
    _onlyDuringStatus(game.status, Setup.Status.AUCTIONING);
    Setup.Auction memory _auction = game.auction;
    if (block.timestamp > _auction.end) {
      endAuction(game);
      return;
    }

    uint256 price = IChainopoly(msg.sender).priceOf(
      _auction.propertiesInAuction[_auction.propertiesInAuction.length - 1]
    );

    if (_auction.highestBidder == address(0)) {
      if (bidAmount < price) revert Errors.BidTooLow();
    } else {
      if (bidAmount <= _auction.highestBid) revert Errors.BidTooLow();
    }

    lockForAuction(game.data, bidAmount);
    game.auction.highestBidder = tx.origin;
    game.auction.highestBid = uint24(bidAmount);

    if ((block.timestamp + _auction.maxTimeAfterLastBid) < _auction.end) {
      game.auction.end = uint32(block.timestamp) + _auction.maxTimeAfterLastBid;
    }

    emit Events.BidMade(tx.origin, bidAmount);
  }

  function endAuction(Setup.Game storage game) public {
    if (!game.data.joined[tx.origin]) revert Errors.YouHaventJoinedAnyGame(tx.origin);
    _onlyDuringStatus(game.status, Setup.Status.AUCTIONING);
    Setup.Auction memory _auction = game.auction;
    uint256 propertyInAuction = _auction.propertiesInAuction[_auction.propertiesInAuction.length - 1];

    if (_auction.highestBidder != address(0)) {
      if (block.timestamp < _auction.end) revert Errors.TooSoon();

      if (isSpecialProperty(propertyInAuction)) {
        isBlocktrain(propertyInAuction)
          ? ++game.data.players[_auction.highestBidder].blocktrains
          : ++game.data.players[_auction.highestBidder].utilities;

        game.data.specialPropertiesDetails[propertyInAuction].owner = _auction.highestBidder;
      } else game.data.propertiesDetails[propertyInAuction].owner = _auction.highestBidder;

      game.data.players[_auction.highestBidder].properties.push(uint8(propertyInAuction));

      if (game.variants.getAuctionMoney) {
        game.data.balances[_auction.starter] += game.data.lockedForAuction[_auction.highestBidder];
      }
      delete game.data.lockedForAuction[_auction.highestBidder];
      unlockFromAuction(game.data);
      emit Events.AuctionEnded(_auction.highestBidder, propertyInAuction, _auction.highestBid);
    } else {
      if (block.timestamp < _auction.end) revert Errors.TooSoon();
    }

    delete game.auction.end;
    delete game.auction.starter;
    delete game.auction.highestBid;
    delete game.auction.highestBidder;
    game.auction.propertiesInAuction.pop();
    emit Events.AuctionEnded(BANK, propertyInAuction, 0);
    if (game.auction.propertiesInAuction.length == 0) game.status = Setup.Status.PLAYING;
    else _startAuction(game, BANK, game.auction.propertiesInAuction[_auction.propertiesInAuction.length - 1]);
  }
}
