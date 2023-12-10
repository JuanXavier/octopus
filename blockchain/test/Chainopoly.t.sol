// // SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.0;

// import "forge-std/Test.sol";
// import "forge-std/console.sol";

// import "../contracts/Chainopoly.sol";

// contract ChainopolyTest is Test {
//     address internal alice = address(0xA71CE);
//     address internal bob = address(0xB0B);
//     address internal becca = address(0xBECCA);
//     Chainopoly public chainopoly;

//     function setUp() public {
//         vm.startPrank(alice, alice);
//         chainopoly = new Chainopoly();
//         uint256 newGameID = chainopoly.createOpenGame(2, 3, 10, 5, false, false, true, 50, true, true, true, true);
//         console.log("Origin is: ", tx.origin);
//         console.log("New game ID is: ", newGameID);
//         vm.stopPrank();
//     }

//     function testJoinGame() public {
//         setUp();
//         vm.startPrank(bob, bob);
//         chainopoly.joinGame(1);
//         console.log("Origin is: ", tx.origin);
//         vm.stopPrank();
//     }
// }
