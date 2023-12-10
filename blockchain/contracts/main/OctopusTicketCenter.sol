// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {IDLT} from "../external/token/IDLT.sol";
import {IERC20} from "../external/openzeppelin/IERC20.sol";
import {IERC721} from "../external/openzeppelin/IERC721.sol";
import {IERC1155} from "../external/openzeppelin/IERC1155.sol";
import {CCIPReceiver} from "../external/ccip/v0.8/ccip/applications/CCIPReceiver.sol";
import {Client, IRouterClient} from "../external/ccip/v0.8/ccip/interfaces/IRouterClient.sol";
import {Authority} from "./extensions/Authority.sol";
import {IChainopoly} from "../chainopoly/interfaces/IChainopoly.sol";
import {OctopusErrors as Errors} from "./abstract/OctopusErrors.sol";
import {OctopusEvents as Events} from "./abstract/OctopusEvents.sol";
import {ChainopolySetup as Setup} from "../chainopoly/libraries/ChainopolySetup.sol";

/**
 * @dev This contract should manage minting and burning of non-transferable tickets.
 * Mints NTT when available and burn when claiming.
 * On first instance, this will be on Polygon and players can only interact with it on polygon, claimg their assets on other networks
 * The CCIP Receiver is modified to avoid a constructor and easy the deployment of the contract with determed addresses.
 */
contract OctopusTicketCenter is CCIPReceiver, Authority, Events {
  uint64 internal constant SEPOLIA_SELECTOR = 16015286601757825753;

  enum PrizeType {
    NATIVE,
    ERC20,
    ERC721,
    ERC1155,
    IDLT
  }

  struct Prize {
    uint256 id;
    uint96 ticketsNeeded;
    string description;
    PrizeType[] prizeType;
    uint256[] ids;
    uint256[] subIds;
    uint256[] amounts;
    address[] tokenAddresses;
  }

  string public constant name = "Octopus Tickets";
  string public constant symbol = "OCT";
  mapping(bytes => bool) internal uniqueUsername;
  mapping(address => bytes) internal usernames;

  IChainopoly public chainopoly;
  address internal linkToken;
  uint256 internal counter;

  mapping(address => uint256) public balanceOf;

  mapping(uint256 id => Prize) public prizes;
  mapping(uint256 => bytes32) internal prizeIdToMessageId;
  mapping(uint256 => uint256) internal prizeID;

  mapping(uint64 => bool) public allowlistedDestinationChains;
  mapping(uint64 => bool) public allowlistedSourceChains;
  mapping(address => bool) public allowlistedSenders;
  mapping(uint256 gameId => bool) internal ticketsClaimedPerGame;
  mapping(uint256 prizeId => bool claimed) internal isClaimed;

  mapping(uint256 chainSelector => address ticketCenter) internal ticketCenters;

  receive() external payable {}

  /* **************************************************** */
  /*                    AUTHORITY ONLY                   */
  /* **************************************************** */

  function setChainopoly(address _chainopoly) external {
    _onlyAuthority();
    chainopoly = IChainopoly(_chainopoly);
  }

  function setCcipParams(address _router, address _link) external {
    _onlyAuthority();
    _setRouter(_router);
    linkToken = _link;
  }

  function setTicketCenters(uint256[] calldata chainSelectors, address[] calldata _ticketCenters) external {
    _onlyAuthority();
    if (chainSelectors.length != _ticketCenters.length) revert Errors.ArrayLengthMismatch();
    unchecked {
      for (uint256 i; i < chainSelectors.length; ++i) {
        if (chainSelectors[i] != 0 && _ticketCenters[i] != address(0))
          ticketCenters[uint64(chainSelectors[i])] = _ticketCenters[i];
      }
    }
  }

  function testMintTickets() external {
    _onlyAuthority();
    _mint(msg.sender, 1 ether);
  }

  function addPrize(Prize memory prize) external {
    _onlyAuthority();
    prizes[++counter] = prize;
    emit PrizeAdded(counter);
  }

  function allowlistSender(address _sender, bool allowed) external {
    _onlyAuthority();
    allowlistedSenders[_sender] = allowed;
  }

  function allowlistSourceChain(uint64 _sourceChainSelector, bool allowed) external {
    _onlyAuthority();
    allowlistedSourceChains[_sourceChainSelector] = allowed;
  }

  function allowlistDestinationChain(uint64 _destinationChainSelector, bool allowed) external {
    _onlyAuthority();
    allowlistedDestinationChains[_destinationChainSelector] = allowed;
  }

  /* **************************************************** */
  /*                      PERMISSIONS                     */
  /* **************************************************** */

  function _onlyAllowlistedDestinationChain(uint64 _destinationChainSelector) internal view {
    if (!allowlistedDestinationChains[_destinationChainSelector])
      revert Errors.DestinationChainNotAllowed(_destinationChainSelector);
  }

  function _onlyAllowlisted(uint64 _sourceChainSelector, address _sender) internal view {
    if (!allowlistedSourceChains[_sourceChainSelector]) revert Errors.SourceChainNotAllowed(_sourceChainSelector);
    if (!allowlistedSenders[_sender]) revert Errors.SenderNotAllowed(_sender);
  }

  /* ****************************************************** */
  /*                 CROSS-CHAIN INTERACTION                */
  /* ****************************************************** */

  // For this POC, transfer will be done with one ERC20 only, using native tokens

  function claimPrizeInSepolia(uint256 prizeId) external {
    Prize memory prize = prizes[prizeId];
    if (isClaimed[prizeId]) revert Errors.PrizeAlreadyClaimed();
    isClaimed[prizeId] = true;
    emit PrizeClaimed(prizeId);
    _burn(msg.sender, prize.ticketsNeeded);
    _claimPrizePayNative(SEPOLIA_SELECTOR, ticketCenters[SEPOLIA_SELECTOR], prize);
  }

  function _claimPrizePayNative(
    uint64 _destinationChain,
    address _receiver,
    Prize memory prize
  ) internal returns (bytes32 messageId) {
    _onlyAllowlistedDestinationChain(SEPOLIA_SELECTOR);
    address[] memory _tokens;
    uint256[] memory _amounts;
    for (uint256 i; i < prize.prizeType.length; ++i) {
      if (prize.prizeType[i] == PrizeType.ERC20) {
        _tokens[i] = prize.tokenAddresses[i];
        _amounts[i] = prize.amounts[i];
        IERC20(_tokens[i]).approve(i_router, _amounts[i]);
      }
    }
    Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(_receiver, prize, _tokens, _amounts, address(0));
    IRouterClient router = IRouterClient(this.getRouter());
    uint256 fees = router.getFee(_destinationChain, evm2AnyMessage);
    if (fees > address(this).balance) revert Errors.NotEnoughBalance(address(this).balance, fees);
    messageId = router.ccipSend{value: fees}(_destinationChain, evm2AnyMessage);
    return messageId;
  }

  function _ccipReceive(Client.Any2EVMMessage memory any2EvmMessage) internal override {
    _onlyAllowlisted(any2EvmMessage.sourceChainSelector, abi.decode(any2EvmMessage.sender, (address)));

    Prize memory prize = abi.decode(any2EvmMessage.data, (Prize));
    prizeIdToMessageId[prize.id] = any2EvmMessage.messageId;

    address[] memory _tokens = prize.tokenAddresses;
    uint256[] memory _amounts = prize.amounts;

    bool success;

    for (uint256 i; i < _tokens.length; ++i) {
      if (prize.prizeType[i] == PrizeType.NATIVE) {
        (success, ) = msg.sender.call{value: _amounts[i]}("");
        if (!success) revert Errors.NativeTransferFailed();
      } else if (prize.prizeType[i] == PrizeType.ERC20) {
        success = IERC20(prize.tokenAddresses[i]).transfer(msg.sender, _amounts[i]);
        if (!success) revert Errors.ERC20TransferFailed();
      } else if (prize.prizeType[i] == PrizeType.ERC721) {
        IERC721(prize.tokenAddresses[i]).safeTransferFrom(msg.sender, address(this), prize.ids[i]);
      } else if (prize.prizeType[i] == PrizeType.ERC1155) {
        IERC1155(prize.tokenAddresses[i]).safeTransferFrom(msg.sender, address(this), prize.ids[i], _amounts[i], "");
      } else if (prize.prizeType[i] == PrizeType.IDLT) {
        success = IDLT(prize.tokenAddresses[i]).safeTransferFrom(
          address(this),
          msg.sender,
          prize.ids[i],
          prize.subIds[i],
          _amounts[i],
          ""
        );
        if (!success) revert Errors.DLTTransferFailed();
      }
    }

    emit MessageReceived(
      any2EvmMessage.messageId,
      any2EvmMessage.sourceChainSelector,
      abi.decode(any2EvmMessage.sender, (address)),
      abi.decode(any2EvmMessage.data, (string)),
      any2EvmMessage.destTokenAmounts[0].token,
      any2EvmMessage.destTokenAmounts[0].amount
    );
  }

  function _buildCCIPMessage(
    address _receiver,
    Prize memory _prize,
    address[] memory _tokens,
    uint256[] memory _amounts,
    address _feeTokenAddress
  ) internal pure returns (Client.EVM2AnyMessage memory) {
    if (_tokens.length != _amounts.length) revert Errors.ArrayLengthMismatch();
    Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](_tokens.length);

    for (uint256 i; i < _tokens.length; ++i) {
      tokenAmounts[i] = Client.EVMTokenAmount({token: _tokens[i], amount: _amounts[i]});
    }

    return
      Client.EVM2AnyMessage({
        receiver: abi.encode(_receiver),
        data: abi.encode(_prize),
        tokenAmounts: tokenAmounts,
        extraArgs: Client._argsToBytes(Client.EVMExtraArgsV1({gasLimit: 300_000, strict: false})),
        feeToken: _feeTokenAddress
      });
  }

  /* ****************************************************** */
  /*                        USERNAMES                       */
  /* ****************************************************** */

  function setUsername(string calldata username) external {
    bytes calldata _userBytes = bytes(username);
    if (_userBytes.length > 32) revert Errors.UsernameTooLong();
    if (!uniqueUsername[_userBytes]) revert Errors.UsernameIsNotUnique();
    uniqueUsername[_userBytes] = true;
    usernames[msg.sender] = _userBytes;
  }

  function getUsername(address player) external view returns (string memory) {
    return string(usernames[player]);
  }

  /* ****************************************************** */
  /*                        TICKETING                       */
  /* ****************************************************** */

  function claimTickets() internal {
    uint256 gameID = chainopoly.getPlayerGameID(msg.sender);
    Setup.GameDetails memory gameDetails = chainopoly.allGameDetails(gameID);
    if (ticketsClaimedPerGame[gameID]) revert Errors.TicketsAlreadyClaimed();
    if (msg.sender != gameDetails.winner) revert Errors.NoTicketsToClaim();
    ticketsClaimedPerGame[gameID] = true;
    uint256 tickets = _calculateTickets(gameDetails.rounds);
    _mint(msg.sender, tickets);
  }

  function claimPrize(uint256 prizeId) external {
    Prize memory prize = prizes[prizeId];
    isClaimed[prizeId] = true;
    if (isClaimed[prizeId]) revert Errors.PrizeAlreadyClaimed();
    emit PrizeClaimed(prize.id);
    if (msg.sender != authority) _burn(msg.sender, prize.ticketsNeeded); /// test purposes only
    bool success;

    for (uint256 i; i < prize.amounts.length; ++i) {
      if (prize.prizeType[i] == PrizeType.NATIVE) {
        (success, ) = msg.sender.call{value: prize.amounts[i]}("");
        if (!success) revert Errors.NativeTransferFailed();
      } else if (prize.prizeType[i] == PrizeType.ERC20) {
        success = IERC20(prize.tokenAddresses[i]).transfer(msg.sender, prize.amounts[i]);
        if (!success) revert Errors.ERC20TransferFailed();
      } else if (prize.prizeType[i] == PrizeType.ERC721) {
        IERC721(prize.tokenAddresses[i]).safeTransferFrom(msg.sender, address(this), prize.ids[i]);
      } else if (prize.prizeType[i] == PrizeType.ERC1155) {
        IERC1155(prize.tokenAddresses[i]).safeTransferFrom(
          msg.sender,
          address(this),
          prize.ids[i],
          prize.amounts[i],
          ""
        );
      } else if (prize.prizeType[i] == PrizeType.IDLT) {
        success = IDLT(prize.tokenAddresses[i]).safeTransferFrom(
          address(this),
          msg.sender,
          prize.ids[i],
          prize.subIds[i],
          prize.amounts[i],
          ""
        );
        if (!success) revert Errors.DLTTransferFailed();
      }
    }
  }

  function _mint(address player, uint256 amount) private {
    balanceOf[player] += amount;
    emit TicketsClaimed(player, amount);
  }

  function _burn(address player, uint256 amount) private {
    if (amount > balanceOf[player]) revert Errors.NotEnoughTickets();
    balanceOf[player] -= amount;
  }

  function _calculateTickets(uint256 rounds) internal pure returns (uint256 tickets) {
    if (rounds > 0 && rounds < 10) tickets = rounds * 100;
    if (rounds > 9 && rounds < 20) tickets = rounds * 130;
    if (rounds > 19 && rounds < 30) tickets = rounds * 160;
    if (rounds > 29 && rounds < 40) tickets = rounds * 190;
    if (rounds > 39 && rounds < 50) tickets = rounds * 220;
    if (rounds > 49 && rounds < 60) tickets = rounds * 250;
    if (rounds > 59 && rounds < 70) tickets = rounds * 280;
    if (rounds > 69 && rounds < 80) tickets = rounds * 310;
    if (rounds > 79 && rounds < 90) tickets = rounds * 340;
    if (rounds > 89 && rounds < 100) tickets = rounds * 370;
    if (rounds > 99) tickets = rounds * 400;
  }
}
