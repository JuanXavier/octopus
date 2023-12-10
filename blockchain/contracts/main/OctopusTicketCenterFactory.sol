// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {OctopusTicketCenter} from "./OctopusTicketCenter.sol";

contract OctopusTicketCenterFactory {
  event Deployed(address indexed addr);

  address[] public deployedContracts;

  function deploy(bytes32 _salt) external returns (address) {
    address newContract = address(new OctopusTicketCenter{salt: _salt}());
    deployedContracts.push(newContract);
    emit Deployed(newContract);
    return newContract;
  }

  function getBytecode() external pure returns (bytes memory) {
    bytes memory bytecode = type(OctopusTicketCenter).creationCode;
    return abi.encodePacked(bytecode);
  }

  function getAddress(bytes32 _salt) external view returns (address) {
    return
      address(
        uint160(
          uint(
            keccak256(
              abi.encodePacked(
                bytes1(0xff),
                address(this),
                _salt,
                keccak256(abi.encodePacked(type(OctopusTicketCenter).creationCode))
              )
            )
          )
        )
      );
  }
}

// deploy in mumbai, set ccipParams
// deploy in sepolia
