// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {ChainopolySetup as Setup} from "./ChainopolySetup.sol";

library ChainopolyErrors {
  error AlreadyVoted();
  error AmountOfPlayersOutOfBounds();
  error AnAuctionIsTakingPlace();
  error ArrayLengthMismatch();
  error BidTooLow();
  error BlocktrainIsNotOwned();
  error BlocktrainTravelFeeTooHigh();
  error BlocktrainTravelNotActive();
  error CantQuitBeingHigghestBidder();
  error CurrentPositionIsNotBlocktrain();
  error DestinationIsNotBlocktrain();
  error DifferenceInHouseBuildingIsTooBig();
  error GameHasNotFinished();
  error GotDoublesSoRollAgain(); //0x9e3b4f9c
  error HousesMaxSupplyReached();
  error HousesMaximumSupplyReached();
  error HotelMaximumSupplyReached();
  error InsufficientTransferAmount();
  error InvalidGameStatus(Setup.Status currentStatus); //0xfceca3f7 -- 0xc32f1f34
  error InvalidGenesisReward();
  error InvalidInitialAmount();
  error MajorityHasNotDecidedToEndGame(uint256 currentVotes);
  error MinimumRoundsNotMet(uint256 currentRounds, uint256 minimumRounds);
  error MustWaitToGiveUp();
  error NoSmartContractsAllowed();
  error NoHotelHere();
  error NoTicketsToClaim();
  error NoTimeLeft(); //0xcde14bd4
  error NotEnoughCash();
  error NotEnoughHouses();
  error NotEnoughHousesInProperty(uint256 spot);
  error NotEnoughJailCards();
  error NotEnoughTickets();
  error NotYourTurn();
  error OfferIsNotForYou();
  error OriginAndDestinationCantBeTheSame();
  error OutOfBounds();
  error PlayerHasToPayGasFee();
  error PositionIsNotCard(uint256 position);
  error PositionNotOwnable(uint256 position);
  error PropertyAlreadyOwned();
  error PropertyHasAHotel();
  error StillTimeToGetOutOfBankruptcy();
  error StillTimeToPayUtilityRent();
  error ThisOfferIsNotForYou();
  error ThisOfferIsNotYours();
  error ThisPropertyIsAlreadyMortgaged(uint256 position);
  error ThisPropertyIsNotMortgaged(uint256 position);
  error TimeForAuctionTooShort();
  error TimeForTurnTooShort();
  error TooManyMinimumRounds();
  error TooSoon();
  error TransferFailed();
  error Unauthorized();
  error UnknownRequestType();
  error UsernameIsNotUnique();
  error UsernameTooLong();
  error YouAlreadyJoinedThisGame();
  error YouAlreadyRolledThisTurn(); //0xd73bd5b7
  error YouAreFree();
  error YouAreNotNearBankruptcy();
  error YouAreNotWhitelisted();
  error YouDontOwnAllPropertiesOfGroup();
  error YouDontOwnThisProperty(uint256);
  error YouDontShareAGameWithPlayer(address player);
  error YouHaveNoCards();
  error YouHaveToPickACard();
  error YouHaventJoinedAnyGame(address notJoined);
  error YouHaventRolledTheDice(); //0x30638b7c
  error YouArePartOfOngoingGame();
}
