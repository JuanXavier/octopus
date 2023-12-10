# Octopus: A cross-chain DAO-governed protocol for multi-chain play-to-earn game centers

![Octopus Logo](https://i.ibb.co/h2tFgBR/logo1.jpg)

For documentation on Octopus and Chainopoly, please refer to: https://juanxaviervalverde.gitbook.io/octopus/

## Inspiration

Octopus originated with the development of Chainopoly, a fully on-chain implementation of a classical board game that incorporates intriguing economic aspects. Initially designed to translate a banking system into a fun and engaging experience, the project evolved to encompass a broader vision. The goal shifted from creating just a game to establishing an interconnected network that benefits various protocols within the web3 ecosystem.

The current landscape of web3 gaming appears fragmented, with many games either lacking open-source accessibility or failing to achieve full decentralization. Play-to-earn games, in particular, often feel limited in their rewards, confining players to tokens usable only within closed ecosystems. Recognizing this gap, Octopus aims to address these issues.

The objective is to create a unique gaming experience while keeping the ecosystem open to external elements. The concept evolved into a Ticket Center, akin to an arcade game center, where players earn tickets by participating in various games. These tickets can be later redeemed for prizes represented by any token, allowing the protocol to remain untethered to a specific game or closed context.

Octopus's main mission is to capture the attention of all web3 users interested in gaming, including those transitioning from web 2.0, encouraging them to reconsider the concept of integration.

The project seeks to promote various tokens, including LINK, USDC, AAVE, UNI, OPT, and more. If a token holds value within the ecosystem, it should be a viable reward for Octopus. Additionally, plans include the integration of NFTs, trading cards, gaming assets, and even Dual Layer tokens, marking the beginning of real-life asset tokenization.

## What it does

This project is intended to be an open-source protocol governed by a DAO that is not tied to a unique chain.

Just as in a physical arcade game center, where you find several different games and you can just play what you want, just for fun, or with a prize to claim at the end with all the tickets received, Octopus intends to do the same with the idea of promting web3 as a whole ecosystem.

![arcade](https://i.ibb.co/3kyhNNf/tc.jpg)

Well that is the idea, except the game center will be decentralized, and the games will be decentralized as well.

Just as in an arcade, prizes are common items, and not just items that you could only used inside the arcade.

So, players accumulate tickets by playing different games and can redeem them for prizes, which can be any token. And by any token

Imagine playing a game that costs you $2 to play, and after playing a couple of times, allows you to claim tickets equivalent to an NFT valued at $50.

## Tokenomics

![diagram](https://i.ibb.co/Bcqhrwm/diagram.png)

At Octopus, we believe in empowering the public by inviting them to be an integral part of the governance process.

To participate in the DAO, players must create games for others to join, with a defined cost in USD that adjusts over time to account for inflation. For example:

_Note: This are just reference prices for explanation purposes._

-   Creating a game could cost around $20
-   Joining a game could cost around $2

**The protocol's funds come from these costs, so this should give an idea of the importance of Chainlink's Oracles functionality.**

Users that create games in the ecosystem get a share of the DAO's tokens. This tokens (name to be determined) to players creating games. Participants in the DAO should be able to **propose and vote for**:

-   Games to add to the Ticket Center.
-   Tokens to buy as prizes for the Ticket Center.
-   Organizing prizes bundles for the Ticket Center tier list.
-   Buying domains for games that are part of Octopus.
-   More things yet to come...

The tiers may look something like this, where the prizes at tier 1 are the most valuable ones in the protocol, and the prizes at tier 5 are the least valuable ones.

![Tiers](https://i.ibb.co/rbWxyhG/pyramid.png)

Also, existing reputable protocols could donate some of their tokens to popularize them and incentivize their use. This could make Octopus a way to understand what's hot in the web3 space and discover stuff that was not available before.

## How I built it

The smart contracts are written in Solidity, with Foundry and Hardhat serving as local frameworks for testing and deploying. External contracts, such as `QRNG` from Airnode protocol for random number generation and OpenZeppelin's libraries for ERC20, ERC721, and ERC1155 standards, were incorporated. Solady's FixedPointMath library was used for math calculations.

For fetching prices, Octopus depends on Chainlink Aggregators (oracles) to control the flow of income.Most importantly, everything within Octopus revolves around the dynamic interplay between the Ticket Center and Chainlink's CCIP. This nexus forms the backbone of the ecosystem, ensuring a robust and interconnected platform where governance, gaming, and cross-chain interactions seamlessly converge.

## Challenges we ran into

Challenges encountered during Chainopoly development:

-   Managing contract size, leading to code refactoring into libraries several times. The spurious dragon is not funny.
-   Timing issues with turn transitions, auction management, and game states. It was hard to determine how to balance user experience, gaming logic and security, taking into an account a decentralized system.
-   The lack of a frontend, which was a major hurdle for testing the game at first. But I didn't want to spend too much time on it as it is not my forte nor the important aspect of the project.

## Accomplishments that I'm proud of

My consistency and effort during the development.

## What I learned

-   Understanding and implementing Chainlink's CCIP and its transformative capabilities for the web3 ecosystem.
-   Recognizing the early stages of blockchain games and the potential for future growth.

## Current state of Octopus

At the time of submission, the main focus have been put on Chainopoly game. This means that this is the most developed section of the project.

## What's next for Octopus

Given that time was not enough prior to the submission date limit, there are many things to do next for Octopus. There is a basic attempt at a frontend but was mainly developed for testing purposes while developing Chainopoly.

### Short-term

. These are just some of the ideas that are definitely needed:

-   Completing deployment setup for full public testnet use of Chainopoly with set prices for creating and joining games with mock prizes to test the system across chains. This should include all [supported test networks in Chinlink's CCIP](https://docs.chain.link/ccip/supported-networks/testnet).
-   Creating the token for the DAO.
-   Create the DAO. Up until now, the authority of the whole system is an EOA only.
-   Develop a front-end that allows for players to interact with the protocol.
-   Expand on the tokenomics with assistance.

### Mid-term

-   Incorporating Chainlink's CCIP capabilities by deploying the Ticket Center on various mainnets, enabling players to claim prizes on any chain.
-   Opening up the opportunity for interested developers to propose games for inclusion in the Ticket Center.
-   Incorporate most respectable supported tokens as payment methods or prizes. This is a

### Long-term

-   Deploy games on different chains and start testing cross-chain gameplay. Eg. Alice playes her turn on Polygon and Bob can play his turn on Arbitrum while all game data in synchronized via Chainlink's CCIP.
-   Allowing players to play and claim tickets and prizes on any chain they prefer, using any tokens.

## Smart Contracts Architecture

These are the contracts in the project with their respective contract sizes. Due to the way the external libraries are imported , most Chainlink's CCIP contracts appear on the list.

![Contracts](https://i.ibb.co/JQMrmB6/contracts.png)

### Octopus

This is the file tree corresponding to the Octopus Protocol:

-   [abstract/](./blockchain/contracts/main/abstract)
    -   [OctopusErrors.sol](./blockchain/contracts/main/abstract/OctopusErrors.sol)
    -   [OctopusEvents.sol](./blockchain/contracts/main/abstract/OctopusEvents.sol)
-   [extensions/](./blockchain/contracts/main/extensions)
    -   [Authority.sol](./blockchain/contracts/main/extensions/Authority.sol)
-   [interfaces/](./blockchain/contracts/main/interfaces)
    -   [IOctopusConverter.sol](./blockchain/contracts/main/interfaces/IOctopusConverter.sol)
-   [OctopusConverter.sol](./blockchain/contracts/main/OctopusConverter.sol)
-   [OctopusTicketCenter.sol](./blockchain/contracts/main/OctopusTicketCenter.sol)
-   [OctopusTicketCenterFactory.sol](./blockchain/contracts/main/OctopusTicketCenterFactory.sol)

This is the amount of lines of code corresponding to Octopus protocol:

![Octopus](https://i.ibb.co/3kVKYfP/octopus.png)

### Chainopoly

This is the file tree corresponding to the Chainopoly Game:

-   [interfaces/](./blockchain/contracts/chainopoly/interfaces)
    -   [IBoard.sol](./blockchain/contracts/chainopoly/interfaces/IBoard.sol)
    -   [IChainopoly.sol](./blockchain/contracts/chainopoly/interfaces/IChainopoly.sol)
-   [libraries/](./blockchain/contracts/chainopoly/libraries)
    -   [ChainopolyAuction.sol](./blockchain/contracts/chainopoly/libraries/ChainopolyAuction.sol)
    -   [ChainopolyCards.sol](./blockchain/contracts/chainopoly/libraries/ChainopolyCards.sol)
    -   [ChainopolyCore.sol](./blockchain/contracts/chainopoly/libraries/ChainopolyCore.sol)
    -   [ChainopolyErrors.sol](./blockchain/contracts/chainopoly/libraries/ChainopolyErrors.sol)
    -   [ChainopolyEvents.sol](./blockchain/contracts/chainopoly/libraries/ChainopolyEvents.sol)
    -   [ChainopolyHelpers.sol](./blockchain/contracts/chainopoly/libraries/ChainopolyHelpers.sol)
    -   [ChainopolySetup.sol](./blockchain/contracts/chainopoly/libraries/ChainopolySetup.sol)
    -   [ChainopolySwaps.sol](./blockchain/contracts/chainopoly/libraries/ChainopolySwaps.sol)
-   [Chainopoly.sol](./blockchain/contracts/chainopoly/Chainopoly.sol)
-   [ChainopolyBoard.sol](./blockchain/contracts/chainopoly/ChainopolyBoard.sol)

This is the amount of lines of code corresponding to Chainopoly Game:

![Chainopoly](https://i.ibb.co/pZNF1Bb/chainopoly.png)

## Disclaimer

This project is intended for recreational purposes only and should not be used for any commercial or financial purposes at the time of publication. The code is provided "as is" and without warranty of any kind, express or implied. Use of this code is at your own risk.

## Author

Juan Xavier Valverde, 2023
