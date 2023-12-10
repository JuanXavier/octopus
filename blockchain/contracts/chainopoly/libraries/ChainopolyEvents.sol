// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

library ChainopolyEvents {
  event AuctionStarted(uint256 indexed position, address indexed starter);
  event AuctionEnded(address indexed winner, uint256 indexed property, uint256 indexed amount);
  event BidMade(address indexed bidder, uint256 indexed amount);
  event DefiBootyBagCardDrawn(address indexed player, uint256 indexed cardID); // 0x3292b9271315d98070d314bfd836d5eba7dce9c228f134d8930d87473b27085c
  event DiceRolled(uint256 indexed diceResult, bool indexed doubles); // 0x79a26b20ea7495bd83e8a824342bedf6055425d77172c3660cf23c365d62fef1
  event GameConfigSet();
  event GameCreated(address indexed creator, uint256 indexed gameID);
  event GameIsReadyToStart(uint256 indexed gameID);
  event GameStarted(uint256 indexed gameID);
  event GameEnded(uint256 indexed gameID, address indexed winner, uint256 indexed time);
  event GameCancelled(uint256 indexed gameID);
  event HighGasFeesPaid(address indexed player, uint256 indexed amount);
  event HouseBuilt(address indexed owner, uint256 indexed property);
  event HouseSold(address indexed owner, uint256 indexed property);
  event HotelBuilt(address indexed owner, uint256 indexed property);
  event HotelSold(address indexed owner, uint256 indexed property);
  event OfferAccepted(uint256 indexed offerId);
  event OfferCancelled(uint256 indexed offerId);
  event OfferMade(address indexed fromPlayer, address indexed toPlayer, uint256 indexed id);
  event OfferRejected(uint256 indexed offerId);
  event PlayerOutOfBankruptcy(address indexed player);
  event PlayerJoined(address indexed player, uint256 indexed gameID);
  event PlayerRemoved(address indexed player);
  event PlayerMoved(address indexed player, uint256 indexed newPosition); // 0xe0a1b340a14d47a5482875f738abb6e2c70f533d80188606facc527b70cbd212
  event PlayerUsedBlocktrain(address indexed player, uint256 indexed origin, uint256 indexed destination);
  event PlayerHasToDecide(address indexed player, uint256 indexed property); // 0xaf456bfbbe045fce53db1db9eec6c2e9cf8df8566bcc0524199d8cbdfec201a8
  event PlayerHasToPickCard(address indexed player);
  event PlayerIsNearBankruptcy(address indexed player, uint256 indexed debt);
  event PlayerIsFree(address indexed player);
  event PlayerSentToJail(address indexed player); //0x3b5199cd3083e47fbeb917c976913b6ed8b3ba05e35933cb169ed1a2340d2b4c
  event PropertyBought(address indexed buyer, uint256 indexed property, uint256 indexed price); // 0x7ce889f63a87f68eea447e77ca8d98459b197666725ffb94bfc06ba3fd982934
  event PropertyMortgaged(address indexed owner, uint256 indexed property);
  event PropertySold(address indexed seller, uint256 indexed property);
  event PropertyUnmortgaged(address indexed owner, uint256 indexed property);
  event ProtocolFeePaid(address indexed player, uint256 indexed amount);
  event RequestedRandom(bytes32 indexed requestId);
  event RentPaid(address indexed payer, address indexed payee, uint256 indexed amount); // 0x791ff5c84f9acebb4b26797f063e5992a2fe426c7b60a97e82d103e9c8b210e4
  event SponsorWalletFunded(address indexed from, uint256 indexed amount);
  event Transfer(address indexed from, address indexed to, uint256 indexed value); // 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
  event TurnEnded(address indexed playerEndingTurn, address indexed nextTurn); // 0x008b5836e0bda253b35b7163a4b65c9e559d5830c0467592d1e697160d385e71
  event VoteCasted(address indexed voter);
  event WithdrawalRequested();
  event ZeroKnowledgeChanceCardDrawn(address indexed player, uint256 indexed cardID); // 0x3c14d9d41b7ca58862985f5734765995ae1d3dbf0b30baafbf49887f3e362392
}
