// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

contract Authority {
  address internal authority = msg.sender;
  error Unauthorized();

  function _onlyAuthority() internal view {
    if (msg.sender != authority) revert Unauthorized();
  }

  function setAuthority(address newAuthority) external {
    _onlyAuthority();
    if (newAuthority != address(0)) authority = newAuthority;
  }
}
