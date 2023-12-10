// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {IBoard} from "./interfaces/IBoard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IOctopusConverter} from "../main/interfaces/IOctopusConverter.sol";
import {IChainopoly} from "./interfaces/IChainopoly.sol";
import {ChainopolyCore as Core} from "./libraries/ChainopolyCore.sol";
import {ChainopolyCards as Cards} from "./libraries/ChainopolyCards.sol";
import {ChainopolySetup as Setup} from "./libraries/ChainopolySetup.sol";
import {ChainopolyErrors as Errors} from "./libraries/ChainopolyErrors.sol";
import {ChainopolySwaps as Swaps} from "./libraries/ChainopolySwaps.sol";
import {ChainopolyEvents as Events} from "./libraries/ChainopolyEvents.sol";
import {ChainopolyHelpers as Helpers} from "./libraries/ChainopolyHelpers.sol";
import {ChainopolyAuction as Auction} from "./libraries/ChainopolyAuction.sol";
import {Authority} from "../main/extensions/Authority.sol";
import {RrpRequesterV0} from "../external/airnode/contracts/RrpRequesterV0.sol";

contract Chainopoly is IChainopoly, Authority, RrpRequesterV0 {
  address private constant BANK = 0x000000000000000000000000000000000000dEaD;
  IBoard internal BOARD;
  address private converter;

  uint256 public totalGames;
  Setup.Costs public costs;
  Setup.Airnode internal airnode;
  uint8 internal minimumRounds = 10;
  uint8 internal minPlayers = 2;
  uint8 internal maxPlayers = 10;
  uint16 internal minHoursToCancelGame = 2 hours;
  mapping(address => uint256) internal playerCurrentGameID;
  mapping(uint256 => address[]) internal whitelistedPlayers;
  mapping(uint256 => Setup.Game) internal games;
  mapping(uint256 => Setup.GameInfo) internal gamesInfo;

  /* ****************************************************** */
  /*                       CONSTRUCTOR                      */
  /* ****************************************************** */
  constructor(address _airnodeRrp) RrpRequesterV0(_airnodeRrp) {}

  function setAirnodeParams(address _sponsorWallet, address _airnode, bytes32 _endpointID) external {
    _onlyAuthority();
    airnode.sponsorWallet = _sponsorWallet;
    airnode.airnodeContract = _airnode;
    airnode.endpointID = _endpointID;
  }

  function setGameConfig(
    address newBoard,
    address _converter,
    uint128 createGameInUsd,
    uint128 joinGameInUsd,
    uint8 newMinimumRounds,
    uint256 _minPlayers,
    uint256 _maxPlayers,
    uint16 _minHoursToCancelGame
  ) external {
    _onlyAuthority();
    converter = _converter;
    costs.createGameInUsd = createGameInUsd;
    costs.joinGameInUsd = joinGameInUsd;
    minPlayers = uint8(_minPlayers);
    maxPlayers = uint8(_maxPlayers);
    minimumRounds = newMinimumRounds;
    minHoursToCancelGame = _minHoursToCancelGame;
    BOARD = IBoard(newBoard);
    emit Events.GameConfigSet();
  }

  function requestWithdrawalFromSponsor() external {
    _onlyAuthority();
    airnodeRrp.requestWithdrawal(airnode.airnodeContract, airnode.sponsorWallet);
    emit Events.WithdrawalRequested();
  }

  function withdrawToken(address token) external {
    _onlyAuthority();
    uint256 balance = IERC20(token).balanceOf(address(this));
    if (!IERC20(token).transferFrom(address(this), authority, balance)) revert Errors.TransferFailed();
  }

  /* ****************************************************** */
  /*                         FUNDING                        */
  /* ****************************************************** */

  function _chargePlayer(address token, Setup.CostType costType) internal {
    uint256 costInUsdWithCents = costType == Setup.CostType.JOIN_GAME ? costs.joinGameInUsd : costs.createGameInUsd;
    if (costInUsdWithCents == 0) return;
    uint256 amountToPayInToken = IOctopusConverter(converter).usdToTokenInCents(token, costInUsdWithCents, 6);
    bool success;

    if (token == address(0)) {
      if (msg.value < amountToPayInToken) revert Errors.InsufficientTransferAmount();
      uint256 dust = msg.value - amountToPayInToken;
      if (dust > 1 gwei) {
        (success, ) = msg.sender.call{value: dust}("");
        if (!success) revert Errors.TransferFailed();
      }
      uint256 sponsorAmount = (amountToPayInToken * 20) / 100;
      if (sponsorAmount == 0) revert Errors.InsufficientTransferAmount();
      (success, ) = airnode.sponsorWallet.call{value: sponsorAmount}("");
      if (!success) revert Errors.TransferFailed();
    } else {
      if (!IERC20(token).transferFrom(msg.sender, address(this), amountToPayInToken)) revert Errors.TransferFailed();
    }
  }

  // function fundSponsorWallet() public payable {
  //   if (airnode.sponsorWallet != address(0)) {
  //     (bool ok, ) = payable(airnode.sponsorWallet).call{value: msg.value}("");
  //     if (ok) emit Events.SponsorWalletFunded(msg.sender, msg.value);
  //     else revert Errors.TransferFailed();
  //   }
  // }

  receive() external payable {
    // fundSponsorWallet();
  }

  /* ****************************************************** */
  /*                         GAMING                         */
  /* ****************************************************** */

  function _onlyEOA() internal view {
    if (tx.origin != msg.sender || (msg.sender).code.length > 0) revert Errors.NoSmartContractsAllowed();
  }

  function _onlyJoined(uint256 gameID) internal view {
    if (!games[gameID].data.joined[tx.origin]) revert Errors.YouHaventJoinedAnyGame(tx.origin);
  }

  function _isInvited(uint256 gameID, address player) internal view returns (bool) {
    unchecked {
      address[] memory whitelisted = whitelistedPlayers[gameID];
      for (uint256 i; i < whitelisted.length; ++i) if (player == whitelisted[i]) return true;
      return false;
    }
  }

  function getPlayerGameID(address player) public view returns (uint256) {
    return playerCurrentGameID[player];
  }

  function createGame(
    address _tokenToPayWith,
    uint8 _minimumPlayers,
    uint24 _minutesPerTurn,
    uint16 _minutesPerAuction,
    uint16 _maxMinutesAfterLastBid,
    address[] calldata _whitelistedPlayers,
    Setup.Amounts calldata _amounts,
    Setup.Variants calldata _gameVariants
  ) external payable returns (uint256 gameID) {
    if (getPlayerGameID(msg.sender) != 0) revert Errors.YouArePartOfOngoingGame();
    if (_minutesPerTurn < 5) revert Errors.TimeForTurnTooShort();
    if (_minutesPerAuction < 5) revert Errors.TimeForAuctionTooShort();
    if (_maxMinutesAfterLastBid > _minutesPerAuction) revert Errors.TimeForAuctionTooShort();
    if (_amounts.initial < 200 || _amounts.initial > 1500) revert Errors.InvalidInitialAmount();
    if (_amounts.blocktrainTravel > 500) revert Errors.BlocktrainTravelFeeTooHigh();
    if (_amounts.genesisReward < 200 || _amounts.genesisReward > 500) revert Errors.InvalidGenesisReward();

    if (_minimumPlayers < minPlayers || _minimumPlayers > maxPlayers) revert Errors.AmountOfPlayersOutOfBounds();
    _chargePlayer(_tokenToPayWith, Setup.CostType.CREATE_GAME);
    gameID = ++totalGames;
    if (_whitelistedPlayers.length > 0) whitelistedPlayers[gameID] = _whitelistedPlayers;
    gamesInfo[gameID].minimumPlayers = _minimumPlayers;
    playerCurrentGameID[msg.sender] = gameID;
    Setup.Game storage newGame = games[gameID];
    newGame.amounts = _amounts;
    newGame.variants = _gameVariants;
    newGame.data.joined[msg.sender] = true;
    newGame.data.joinedPlayers.push(msg.sender);
    newGame.data.timePerTurn = _minutesPerTurn * 1 minutes;
    newGame.auction.timePerAuction = _minutesPerAuction * 1 minutes;
    newGame.auction.maxTimeAfterLastBid = _maxMinutesAfterLastBid * 1 minutes;
    newGame.status = Setup.Status.WAITING_TO_JOIN;
    emit Events.GameCreated(msg.sender, gameID);
  }

  function joinGame(address tokenToPayWith, uint256 gameID) external payable {
    _onlyEOA();
    _chargePlayer(tokenToPayWith, Setup.CostType.JOIN_GAME);
    if (getPlayerGameID(msg.sender) != 0) revert Errors.YouArePartOfOngoingGame();
    if (whitelistedPlayers[gameID].length > 0 && !_isInvited(gameID, msg.sender)) revert Errors.YouAreNotWhitelisted();

    Setup.Game storage game = games[gameID];
    playerCurrentGameID[msg.sender] = gameID;
    Helpers.joinGame(game);
    emit Events.PlayerJoined(msg.sender, gameID);

    if (game.data.joinedPlayers.length == maxPlayers) game.status = Setup.Status.MAX_PLAYERS_REACHED;
    else if (game.data.joinedPlayers.length == gamesInfo[gameID].minimumPlayers)
      game.status = Setup.Status.MIN_PLAYERS_MET;

    emit Events.GameIsReadyToStart(gameID);
  }

  function startGame() external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Helpers.startGame(games[gameID]);
    emit Events.GameStarted(gameID);
  }

  function cancelGame(uint256 gameID) external {
    Setup.Game storage game = games[gameID];
    if (msg.sender != game.data.joinedPlayers[0]) revert Errors.Unauthorized();
    if (game.status != Setup.Status.WAITING_TO_JOIN) revert Errors.InvalidGameStatus(game.status);
    _clearPlayers(gameID);
    game.status = Setup.Status.FINISHED;
    emit Events.GameCancelled(gameID);
  }

  /* ****************************************************** */
  /*                          CORE TURN                          */
  /* ****************************************************** */

  function whoseTurnIsIt() public view returns (address playerInTurn, uint256 minsLeft, uint256 secsLeft) {
    uint256 gameID = getPlayerGameID(msg.sender);
    if (gameID == 0) revert Errors.YouHaventJoinedAnyGame(msg.sender);
    Setup.Game storage game = games[gameID];
    if (game.status == Setup.Status.FINISHED) return (address(0), 0, 0);

    playerInTurn = game.status == Setup.Status.PLAYER_IS_NEAR_BANKRUPTCY
      ? game.playerNearBankruptcy
      : game.data.joinedPlayers[game.data.currentTurnIndex];

    if (
      game.status == Setup.Status.WAITING_TO_JOIN ||
      game.status == Setup.Status.MIN_PLAYERS_MET ||
      game.status == Setup.Status.MAX_PLAYERS_REACHED
    ) return (playerInTurn, 0, 0);

    uint256 endOfTurn = game.data.endOfTurn[playerInTurn];
    if (endOfTurn > block.timestamp) {
      uint256 timeLeft = endOfTurn - block.timestamp;
      return (playerInTurn, (timeLeft / 1 minutes), (timeLeft % 1 minutes));
    } else return (playerInTurn, 0, 0);
  }

  /* ------------------- QRNG FUNCTIONS START------------------- */
  function _requestRandom(Setup.Request memory request) internal returns (bytes32 requestId) {
    requestId = airnodeRrp.makeFullRequest(
      airnode.airnodeContract,
      airnode.endpointID,
      address(this),
      airnode.sponsorWallet,
      address(this),
      this.fulfillUint256.selector,
      ""
    );
    airnode.requestIdToRequest[requestId] = request;
    emit Events.RequestedRandom(requestId);
  }

  function fulfillUint256(bytes32 requestId, bytes calldata data) external {
    Setup.Request memory request = airnode.requestIdToRequest[requestId];
    if (!request.expectingRespond || msg.sender != address(airnodeRrp)) revert Errors.Unauthorized();
    delete request.expectingRespond;
    uint256 _random = abi.decode(data, (uint256));
    airnode.lastRandom = _random;

    if (request.requestType == Setup.RequestType.CARD) {
      uint256 cardNumber = _random % 16;
      Cards.pickCard(games[request.gameID], request.player, cardNumber);
    } else {
      uint256 dieOne = (uint256(keccak256(abi.encode(_random, requestId))) % 6) + 1;
      uint256 dieTwo = (uint256(keccak256(abi.encode(requestId, _random))) % 6) + 1;

      if (request.requestType == Setup.RequestType.MOVE) {
        Core.move(games[request.gameID], request.player, (dieOne + dieTwo), (dieOne == dieTwo));
      } else if (request.requestType == Setup.RequestType.RENT) {
        Core.payUtilityRent(games[request.gameID], request.player, (dieOne + dieTwo));
      } else revert Errors.UnknownRequestType();
    }
  }

  function rollAndMove() external {
    (address playerInTurn, uint256 mins, uint256 secs) = whoseTurnIsIt();
    if (msg.sender != playerInTurn) revert Errors.NotYourTurn();
    if (mins == 0 && secs == 0) revert Errors.NoTimeLeft();
    uint256 gameID = getPlayerGameID(msg.sender);
    Setup.Request memory _request = Setup.Request({
      requestType: Setup.RequestType.MOVE,
      player: msg.sender,
      expectingRespond: true,
      gameID: gameID
    });
    _requestRandom(_request);
  }

  function pickCard() external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Setup.Request memory _request = Setup.Request({
      requestType: Setup.RequestType.CARD,
      player: msg.sender,
      expectingRespond: true,
      gameID: gameID
    });
    _requestRandom(_request);
  }

  function payUtilityRent() external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Setup.Request memory _request = Setup.Request({
      requestType: Setup.RequestType.RENT,
      player: msg.sender,
      expectingRespond: true,
      gameID: gameID
    });
    _requestRandom(_request);
  }

  function payHighGasFees(bool calculatePatrimony) external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Core.payHighGasFees(games[gameID], msg.sender, calculatePatrimony);
  }

  function buyOrNot(bool decision) external {
    Core.buyOrNot(games[getPlayerGameID(msg.sender)], decision);
  }

  function getOutOfBankruptcy() external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Core.getOutOfBankruptcy(games[gameID]);
  }

  function useBlocktrain(uint256 destination) external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Helpers.useBlocktrain(games[gameID], destination);
  }

  function nextTurn() external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Helpers.endTurn(games[gameID]);
  }

  /* ************************************************** */
  /*                      BUILDINGS                      */
  /* ************************************************** */

  function buildHouses(uint256[3] calldata properties, uint256[3] calldata amountOfHouses) external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Core.buildHousesInGroup(games[gameID].data, properties, amountOfHouses);
  }

  function buildHotels(uint256[] memory properties) external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Core.buildHotels(games[gameID].data, properties);
  }

  function sellHouses(uint256[] memory positions, uint256[] memory amountOfHouses) external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Core.sellHouses(games[gameID].data, positions, amountOfHouses);
  }

  function sellHotels(uint256[] memory positions) external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Core.sellHotels(games[gameID].data, positions);
  }

  /* ************************************************** */
  /*                      MORTGAGE                      */
  /* ************************************************** */

  function mortgageMyProperty(uint256 property) external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Core.mortgageMyProperty(games[gameID].data, property);
  }

  function unmortgageMyProperty(uint256 property) external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Core.unmortgageMyProperty(games[gameID].data, property);
  }

  /* ****************************************************** */
  /*                          JAIL                          */
  /* ****************************************************** */

  function payToBeFree() external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Core.payToBeFree(games[gameID]);
  }

  function redeemJailCard() external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Helpers.redeemJailCard(games[gameID]);
  }

  /* ****************************************************** */
  /*                         AUCTION                        */
  /* ****************************************************** */

  function bid(uint256 bidAmount) external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Auction.bid(games[gameID], bidAmount);
  }

  function endAuction() external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Auction.endAuction(games[gameID]);
  }

  /* ****************************************************** */
  /*                         TRADES                         */
  /* ****************************************************** */

  function sellToBank(uint256[] calldata properties) external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Core.sellToBank(games[gameID], properties);
  }

  function iOfferYouThis(
    address toPlayer,
    uint256[] calldata propertiesOffered,
    uint256[] calldata propertiesWanted,
    uint24 cashOffered,
    uint24 cashWanted,
    uint8 getOutOfJailCardsOffered,
    uint8 getOutOfJailCardsWanted
  ) external returns (uint256 offerID) {
    uint256 gameID = getPlayerGameID(msg.sender);
    return
      Swaps.iOfferYouThis(
        games[gameID],
        toPlayer,
        propertiesOffered,
        propertiesWanted,
        cashOffered,
        cashWanted,
        getOutOfJailCardsOffered,
        getOutOfJailCardsWanted
      );
  }

  function iCancelMyOffer(uint256 offerID) external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Swaps.iAcceptYourOffer(games[gameID], offerID);
  }

  function iAcceptYourOffer(uint256 offerID) external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Swaps.iAcceptYourOffer(games[gameID], offerID);
  }

  function iRejectYourOffer(uint256 offerID) external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Swaps.iRejectYourOffer(games[gameID], offerID);
  }

  /* ************************************************** */
  /*                        EXTRA                       */
  /* ************************************************** */

  function clearMyGameID() public {
    uint256 gameID = getPlayerGameID(msg.sender);
    if (games[gameID].status == Setup.Status.FINISHED) delete playerCurrentGameID[msg.sender];
    else revert Errors.YouArePartOfOngoingGame();
  }

  function clearPlayersInGame(address player) public {
    uint256 gameID = getPlayerGameID(player);
    if (games[gameID].status != Setup.Status.WAITING_TO_JOIN || games[gameID].status != Setup.Status.FINISHED)
      revert Errors.GameHasNotFinished();
    _clearPlayers(gameID);
    emit Events.GameEnded(gameID, games[gameID].winner, block.timestamp);
  }

  function _clearPlayers(uint256 gameID) internal {
    unchecked {
      address[] memory players = games[gameID].data.joinedPlayers;
      for (uint256 i; i < players.length; ++i) delete playerCurrentGameID[players[i]];
    }
  }

  function voteToEndGame() external {
    Setup.GameInfo storage gameInfo = gamesInfo[getPlayerGameID(msg.sender)];
    Helpers.voteToEndGame(gameInfo);
  }

  function giveUp() external {
    uint256 gameID = getPlayerGameID(msg.sender);
    Setup.Game storage game = games[gameID];
    if (game.rounds < minimumRounds) revert Errors.MinimumRoundsNotMet(game.rounds, minimumRounds);
    delete playerCurrentGameID[msg.sender];
    Helpers.removePlayer(game, msg.sender);
  }

  function endGame() external {
    uint256 gameID = getPlayerGameID(msg.sender);
    _onlyJoined(gameID);
    (uint256 votes, bool result) = votingResults();
    if (!result) revert Errors.MajorityHasNotDecidedToEndGame(votes);
    Setup.Game storage game = games[gameID];
    if (game.rounds < minimumRounds) revert Errors.MinimumRoundsNotMet(minimumRounds, game.rounds);
    Helpers.declareWinner(game);
    for (uint256 i; i < game.data.joinedPlayers.length; ++i) delete playerCurrentGameID[game.data.joinedPlayers[i]];
  }

  /* ****************************************************** */
  /*                      PLAYER VIEW FUNCTIONS                       */
  /* ****************************************************** */
  function allGameDetails(uint256 gameID) external view returns (Setup.GameDetails memory gameDetails) {
    Setup.Game storage game = games[gameID];

    gameDetails = Setup.GameDetails({
      variants: game.variants,
      status: game.status,
      amounts: game.amounts,
      minimumPlayers: gamesInfo[gameID].minimumPlayers,
      timePerTurn: game.data.timePerTurn,
      timePerAuction: game.auction.timePerAuction,
      diceRolledThisTurn: game.diceRolledThisTurn,
      doublesCount: game.data.doublesCount,
      rounds: game.rounds,
      cashInFreeStablecoinStation: game.data.balances[BANK],
      playerNearBankruptcy: game.playerNearBankruptcy,
      winner: game.winner,
      players: game.data.joinedPlayers
    });
  }

  function playerDetails(address player) external view returns (uint256 balance, Setup.Player memory) {
    uint256 gameID = getPlayerGameID(player);
    balance = games[gameID].data.balances[player];
    Setup.Player memory _player = games[gameID].data.players[tx.origin];
    return (balance, _player);
  }

  function auctionDetails() external view returns (Setup.Auction memory, uint256 mins, uint256 secs) {
    uint256 gameID = getPlayerGameID(msg.sender);
    (mins, secs) = Auction.timeLeftToBid(games[gameID].auction);
    return (games[gameID].auction, mins, secs);
  }

  function offerDetails(uint256 offerID) external view returns (Setup.Offer memory) {
    uint256 gameID = getPlayerGameID(msg.sender);
    return games[gameID].offers[offerID];
  }

  function getOffers(
    address player
  ) external view returns (uint256[] memory offersMade, uint256[] memory offersReceived) {
    uint256 gameID = getPlayerGameID(player);
    Setup.Offers memory offers = games[gameID].totalOffers[player];
    return (offers.offersMade, offers.offersReceived);
  }

  function calculateRent(uint256 spot) external view returns (uint256) {
    uint256 gameID = getPlayerGameID(msg.sender);
    return Core.calculateRent(games[gameID].data, spot);
  }

  /* ------------------ BOARD DETAILS ----------------- */

  function priceOf(uint256 position) external view returns (uint256) {
    return BOARD.priceOf(position);
  }

  function buildingPrice(uint256 position) external view returns (uint256) {
    return BOARD.buildingPrice(position);
  }

  function propertyDetails(
    uint256 position
  ) external view returns (Setup.Property memory property, Setup.PropertyDetails memory details) {
    uint256 gameID = getPlayerGameID(msg.sender);
    return (BOARD.propertyCard(position), games[gameID].data.propertiesDetails[position]);
  }

  function blocktrainDetails()
    external
    view
    returns (
      uint256 price,
      uint256 rentOneBlocktrain,
      uint256 rentTwoBlocktrains,
      uint256 rentThreeBlocktrains,
      uint256 rentFourBlocktrains
    )
  {
    return BOARD.blocktrainCard();
  }

  // utilitycard?

  function defiBootyBag(uint256 card) external view returns (string memory) {
    return BOARD.defiBootyBag(card);
  }

  function zeroKnowledgeChance(uint256 card) external view returns (string memory) {
    return BOARD.zeroKnowledgeChance(card);
  }

  function votingResults() public view returns (uint256 votes, bool result) {
    uint256 gameID = getPlayerGameID(msg.sender);
    Setup.GameInfo storage gameInfo = gamesInfo[gameID];
    uint256 amountOfPlayers = games[gameID].data.joinedPlayers.length;
    return Helpers.votingResults(gameInfo, amountOfPlayers);
  }
}
