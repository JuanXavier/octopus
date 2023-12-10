// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

abstract contract OctopusEvents {
  event PrizeClaimed(
    bytes32 indexed messageId, // The unique ID of the CCIP message.
    uint64 indexed destinationChainSelector, // The chain selector of the destination chain.
    uint256 indexed gameID,
    address claimer, // The address of the claimer on the destination chain.
    address feeToken, // the token address used to pay CCIP fees.
    uint256 fees // The fees paid for sending the message.
  );

  event MessageReceived(
    bytes32 indexed messageId, // The unique ID of the CCIP message.
    uint64 indexed sourceChainSelector, // The chain selector of the source chain.
    address sender, // The address of the sender from the source chain.
    string text, // The text that was received.
    address token, // The token address that was transferred.
    uint256 tokenAmount // The token amount that was transferred.
  );

  event TicketsClaimed(address indexed player, uint256 indexed amount);
  event PrizeClaimed(uint256 prizeID);
  event PrizeAdded(uint256 prizeID);
}
