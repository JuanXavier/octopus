// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

/**
 * @title A library containing all the structures of the Chainopoly game
 * @author Juan Xavier Valverde M. (millers.planet)
 * @dev This library is used all around the Chainopoly codebase. It does not contain functions.
 */
library ChainopolySetup {
  /* ----------------------- QRNG ----------------------- */

  enum RequestType {
    NULL,
    MOVE,
    CARD,
    RENT
  }

  struct Airnode {
    address airnodeContract;
    bytes32 endpointID;
    uint256 lastRandom;
    address sponsorWallet;
    mapping(bytes32 => Request) requestIdToRequest;
  }

  struct Request {
    uint256 gameID;
    address player;
    bool expectingRespond;
    RequestType requestType;
  }

  /* -------------------- BOARD -------------------- */

  enum Elements {
    HOUSES,
    HOTELS,
    OUT_OF_JAIL_CARDS
  }

  enum Color {
    PURPLE,
    CYAN,
    PINK,
    ORANGE,
    RED,
    YELLOW,
    GREEN,
    BLUE
  }

  struct Property {
    Color color;
    uint16 price;
    uint16 rent;
    uint16 rentOneHouse;
    uint16 rentTwoHouses;
    uint16 rentThreeHouses;
    uint16 rentFourHouses;
    uint16 rentHotel;
  }

  struct PropertyDetails {
    address owner;
    uint8 houses;
    bool hotel;
    bool mortgaged;
  }

  struct SpecialPropertyDetails {
    address owner;
    bool mortgaged;
  }

  /* ------------------------ GAME ------------------------ */

  enum CostType {
    CREATE_GAME,
    JOIN_GAME
  }

  enum Status {
    INACTIVE,
    WAITING_TO_JOIN,
    MIN_PLAYERS_MET,
    MAX_PLAYERS_REACHED,
    PLAYING,
    AUCTIONING,
    PLAYER_HAS_TO_DECIDE,
    PLAYER_HAS_TO_PICK_CARD,
    PLAYER_HAS_TO_PAY_UTILITY_RENT,
    PLAYER_HAS_TO_PAY_HIGH_GAS_FEES,
    PLAYER_IS_NEAR_BANKRUPTCY,
    FINISHED
  }

  struct Game {
    Variants variants;
    Status status;
    Auction auction;
    Amounts amounts;
    Data data;
    Offer[] offers;
    mapping(address => Offers) totalOffers;
    uint24 rounds;
    address winner;
    address playerNearBankruptcy;
    bool diceRolledThisTurn;
  }

  struct Offers {
    uint256[] offersMade;
    uint256[] offersReceived;
  }

  struct Amounts {
    uint16 initial;
    uint16 genesisReward;
    uint16 blocktrainTravel;
  }

  struct Data {
    address[] joinedPlayers;
    uint24 timePerTurn; // time
    uint8 doublesCount;
    uint8 currentTurnIndex;
    mapping(address => bool) joined;
    mapping(address => uint256) endOfTurn;
    mapping(address => uint256) balances;
    mapping(address => uint256) lockedForAuction;
    mapping(address => uint256) lockedForSwaps;
    mapping(address => Player) players;
    mapping(uint256 => PropertyDetails) propertiesDetails;
    mapping(uint256 => SpecialPropertyDetails) specialPropertiesDetails;
  }

  struct GameInfo {
    uint96 creationDate;
    uint8 minimumPlayers;
    uint8 votesToEndGame;
    mapping(address => bool) hasVoted;
  }

  struct Variants {
    bool landAndBuy;
    bool staggeredStart;
    bool blocktrainTravel;
    bool getAuctionMoney;
    bool noEasyMonopolies;
    bool getStablecoinStationMoney;
  }

  struct Costs {
    uint128 createGameInUsd;
    uint128 joinGameInUsd;
  }

  /* ----------------------- PLAYER ----------------------- */
  struct Player {
    uint8 position;
    uint8 strikes;
    uint8 houses;
    uint8 hotels;
    uint8 utilities;
    uint8 blocktrains;
    uint8 outOfJailCards;
    uint8 turnsLeftInJail;
    uint24 propertiesPatrimony;
    uint24 buildingsPatrimony;
    address debtWith; // if (totalDebt > 0) && (address(0) == ALL_PLAYERS)
    uint16 totalDebt;
    uint256[] properties;
  }

  /* ------------------------ SWAPS ----------------------- */

  enum OfferStatus {
    PENDING,
    ACCEPTED,
    REJECTED,
    CANCELLED
  }

  struct Offer {
    OfferStatus status;
    address from;
    address to;
    uint24 cashOffered;
    uint24 cashWanted;
    uint8 getOutOfJailCardsOffered;
    uint8 getOutOfJailCardsWanted;
    uint256[] propertiesOffered;
    uint256[] propertiesWanted;
  }

  /* ----------------------- AUCTION ---------------------- */

  struct Auction {
    address starter;
    uint24 timePerAuction;
    uint16 maxTimeAfterLastBid;
    uint24 highestBid;
    address highestBidder;
    uint32 end;
    uint256[] propertiesInAuction;
  }

  struct GameDetails {
    Variants variants;
    Status status;
    Amounts amounts;
    uint8 minimumPlayers;
    uint24 timePerTurn;
    uint24 timePerAuction;
    bool diceRolledThisTurn;
    uint8 doublesCount;
    uint24 rounds;
    uint256 cashInFreeStablecoinStation;
    address playerNearBankruptcy;
    address winner;
    address[] players;
  }
}
