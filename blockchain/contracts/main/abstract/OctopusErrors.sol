// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

abstract contract OctopusErrors {
  error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees); // Used to make sure contract has enough balance to cover the fees.
  error NothingToWithdraw(); // Used when trying to withdraw Ether but there's nothing to withdraw.
  error FailedToWithdrawEth(address owner, address target, uint256 value); // Used when the withdrawal of Ether fails.
  error DestinationChainNotAllowed(uint256 destinationChainSelector); // Used when the destination chain has not been allowlisted by the contract owner.
  error SourceChainNotAllowed(uint256 sourceChainSelector); // Used when the source chain has not been allowlisted by the contract owner.
  error SenderNotAllowed(address sender); // Used when the sender has not been allowlisted by the contract owner.
  error UsernameTooLong();
  error UsernameIsNotUnique();
  error NoTicketsToClaim();
  error NotEnoughTickets();
  error ERC20TransferFailed();
  error NativeTransferFailed();
  error PrizeAlreadyClaimed();
  error TicketsAlreadyClaimed();
  error ArrayLengthMismatch();
  error DLTTransferFailed();
}
