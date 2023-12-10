// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IQRNG {
  function setQRNG(address _gameCenter, address _airnode, address _sponsorWallet, bytes32 _endpointID) external;

  function fundSponsorWallet() external payable;

  function requestRandom() external;

  function fulfillUint256(bytes32 requestId, bytes calldata data) external returns (uint256);

  function withdraw() external;
}
