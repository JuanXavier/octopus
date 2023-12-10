import { ethers } from "hardhat"
import { expect } from "chai"
import * as c from "./utils/constants"

describe("CHAINOPOLY", function () {
  let alice: any, bob: any, carla: any, daniel: any, eve: any, nonPlayer: any, chainopoly: any, gameOne: any, tx: any
  let spot: number, name: string, diceRoll: number, doubles: boolean, twoDoubles: boolean, threeDoubles: boolean
  let auction: boolean, propInAuction: any, highestBidder: any, highestBid: any, auctionDetails: any, events: any
  let startingTurnBalance: number, startingTurnJailCards: any, landedSpot: number, startingTurnSpot: number, playerInJail: boolean
  let balanceAfterBuying: number, balanceAfterTaxes: number, balanceAfterRent: number, totalPatrimony: number, tax: number
  let decidedToBuy: boolean

  /* ***************************************************** */
  /*                        HELPERS                        */
  /* ***************************************************** */

  function resetDoubles() {
    doubles = false
    twoDoubles = false
    threeDoubles = false
  }

  async function startingTurnSetup(player: any) {
    decidedToBuy = false
    startingTurnBalance = await chainopoly.connect(player).balanceOf(player.address)
    playerInJail = await checkIfPlayerIsInJail(player)

    let [playerData] = await chainopoly.connect(player).whatDoIHave()
    startingTurnJailCards = playerData.outOfJailCards
    ;[startingTurnSpot] = await chainopoly.connect(player).whereAmI()
    totalPatrimony = await chainopoly.connect(player).myTotalPatrimony()
    expect(totalPatrimony).to.be.gt(0)
    // await logCurrentTurn()
  }

  async function checkIfPlayerIsInJail(player: any) {
    const turnsInJail = await chainopoly.turnsLeftInJail(player.address)
    return turnsInJail > 1
  }

  async function endTurn(player: any, playerName: string) {
    resetDoubles()
    await chainopoly.connect(player).nextTurn()
    expect(await chainopoly.whoseTurnIsIt()).to.not.be.eq(player.address)
  }
  /* ---------------------- LOGGING --------------------- */

  function logDiceRoll(player: string, numberOfRoll: number) {
    if (numberOfRoll == 1)
      console.log(
        `${player} rolled ${diceRoll} (${doubles ? "doubles" : "no doubles"}) and is in ${name} (spot ${String(spot)}).`
      )
    if (numberOfRoll == 2)
      console.log(
        `${player} rolled ${diceRoll} (${twoDoubles ? "doubles" : "no doubles"}) and is in ${name} (spot ${String(spot)}).`
      )
    if (numberOfRoll == 3)
      console.log(
        `${player} rolled ${diceRoll} (${threeDoubles ? "doubles" : "no doubles"}) and is in ${name} (spot ${String(spot)}).`
      )
  }

  async function logBalancesAndProperties() {
    let aliceBalance = await chainopoly.connect(alice).balanceOf(alice.address)
    let [aliceProps, alicePropNames] = await chainopoly.whatDoesThisPlayerHave(alice.address)
    let bobBalance = await chainopoly.connect(bob).balanceOf(bob.address)
    let [bobProps, bobPropNames] = await chainopoly.whatDoesThisPlayerHave(bob.address)
    let carlaBalance = await chainopoly.connect(carla).balanceOf(carla.address)
    let [carlaProps, carlaPropNames] = await chainopoly.whatDoesThisPlayerHave(carla.address)
    let danielBalance = await chainopoly.connect(daniel).balanceOf(daniel.address)
    let [danielProps, danielPropNames] = await chainopoly.whatDoesThisPlayerHave(daniel.address)
    let eveBalance = await chainopoly.connect(eve).balanceOf(eve.address)
    let [eveProps, evePropNames] = await chainopoly.whatDoesThisPlayerHave(eve.address)

    console.log(`Alice balance is: ${aliceBalance}. She owns ${aliceProps} (${alicePropNames}). `)
    console.log(`Bob balance is: ${bobBalance}. He owns ${bobProps} (${bobPropNames}).`)
    console.log(`Carla balance is: ${carlaBalance}. She owns ${carlaProps} (${carlaPropNames}).`)
    console.log(`Daniel balance is: ${danielBalance}. He owns ${danielProps} (${danielPropNames}).`)
    console.log(`Eve balance is: ${eveBalance}. She owns ${eveProps} (${evePropNames}).`)
  }

  async function logCurrentTurn() {
    let [playerInTurn, minsLeft, secsLeft] = await chainopoly.connect(alice).whoseTurnIsIt()
    console.log(`Current turn is ...${playerInTurn.slice(-4)}. ${minsLeft} mins and ${secsLeft} secs left`)
  }

  function logPositions() {
    console.log(`Starting spot is ${startingTurnSpot} and ending spot is ${spot}.`)
  }

  /* ---------------------- MOVING --------------------- */

  async function rollAndMove(player: any, numberOrRoll: number) {
    tx = await chainopoly.connect(player).rollAndMove()
  }

  async function waitForEvents() {
    events = (await tx.wait()).events
  }

  async function updateStatusAfterRoll(player: any) {
    playerInJail = await checkIfPlayerIsInJail(player)
    ;[spot, name] = await chainopoly.connect(player).whereAmI()
  }

  async function isUnowned(player: any, property: number) {
    return (await chainopoly.connect(player).ownerOf(property)) === ethers.constants.AddressZero
  }

  /* ------------------------- - ------------------------ */

  function getDiceRolledEvent(doublesType: string) {
    let diceRolledEvent = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DiceRolled(uint256,bool)"))
    expect(diceRolledEvent).to.be.eq(events[0].topics[0])
    ;[diceRoll] = ethers.utils.defaultAbiCoder.decode(["uint256"], events[0].topics[1])
    if (doublesType == "doubles") {
      ;[doubles] = ethers.utils.defaultAbiCoder.decode(["bool"], events[0].topics[2])
    } else if (doublesType == "twoDoubles") {
      ;[twoDoubles] = ethers.utils.defaultAbiCoder.decode(["bool"], events[0].topics[2])
    } else if (doublesType == "threeDoubles") {
      ;[threeDoubles] = ethers.utils.defaultAbiCoder.decode(["bool"], events[0].topics[2])
    }
  }

  /* ------------------------- - ------------------------ */

  async function checkPostDiceRoll(player: any) {
    // updateStatusAfterRoll(player)

    if (!playerInJail) {
      let playerMovedEvent = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PlayerMoved(address,uint256)"))
      let transferEvent = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Transfer(address,address,uint256)"))
      let emittedPlayer

      // if player is in jail, first event is PlayerIsFree

      // if passing for go
      if (Number(spot) < Number(startingTurnSpot)) {
        //Dice rolled - Transfer - PlayerMoved - ....
        console.log("sTARTING TURN SPOT:", startingTurnSpot)
        console.log("SPOT:", spot)
        expect(transferEvent).to.eq(events[1].topics[0])
        expect(playerMovedEvent).to.eq(events[2].topics[0])
        ;[landedSpot] = ethers.utils.defaultAbiCoder.decode(["uint256"], events[2].topics[2])
      } // if did not pass for go
      else if (Number(spot) > Number(startingTurnSpot) && !playerInJail) {
        expect(playerMovedEvent).to.eq(events[1].topics[0])
        ;[emittedPlayer] = ethers.utils.defaultAbiCoder.decode(["address"], events[1].topics[1])
        ;[landedSpot] = ethers.utils.defaultAbiCoder.decode(["uint256"], events[1].topics[2])
        expect(player.address).to.eq(emittedPlayer)
      }

      if (!threeDoubles && !playerInJail && spot > startingTurnSpot && !c.isCard(landedSpot)) {
        ;[spot, name] = await chainopoly.connect(player).whereAmI()
        expect(spot).to.eq(landedSpot)
      }
    } else {
      console.log("PLAYER IN JAIL. Turns left in jail: ", String(await chainopoly.turnsLeftInJail(player.address)))
      expect(spot).to.eq(c.JAIL)
    }
  }

  /* ---------------- BUYING / RENT / TAXES-------------- */

  async function buy(player: any) {
    let buyTx = await chainopoly.connect(player).buyOrNot(true)
    if (buyTx.length != 0) decidedToBuy = true
  }

  /* ------------------------- - ------------------------ */

  async function checkSuccessfulBuying(player: any) {
    const price = await chainopoly.priceOf(spot)
    balanceAfterBuying = await chainopoly.balanceOf(player.address)

    if (Number(spot) > Number(startingTurnSpot)) {
      expect(Number(balanceAfterBuying) + Number(price)).to.be.eq(startingTurnBalance)
    } else if (Number(spot) < Number(startingTurnSpot)) {
      expect(Number(balanceAfterBuying) + Number(price) - c.GENESIS_BONUS).to.be.eq(startingTurnBalance)
    }

    expect(balanceAfterBuying).to.be.gt(0)
    expect(price).to.be.gt(0)
    expect(await chainopoly.ownerOf(spot)).to.be.eq(player.address)
    console.log("startingTurnBalance is", String(startingTurnBalance))
    console.log("Price is", String(price))
    console.log("balanceAfterBuying is", String(balanceAfterBuying))
  }

  /* ------------------------- - ------------------------ */

  async function dontBuy(player: any) {
    await chainopoly.connect(player).buyOrNot(false)
    decidedToBuy = false
  }

  async function auctionShouldBeInPlace(auctionStarter: any) {
    const status = await chainopoly.connect(auctionStarter).gameStatus()
    auction = status == "Auctioning"
    if (auction) {
      ;[, auctionDetails] = await chainopoly.connect(auctionStarter).auctionDetails()
      propInAuction = auctionDetails.propertiesInAuction[auctionDetails.propertiesInAuction.length - 1]
    }
    expect(auction).to.be.true
    expect(auctionDetails.starter).to.eq(auctionStarter.address)
    expect(propInAuction).to.eq(spot)
  }

  async function bid(winner: any) {
    let price = await chainopoly.connect(winner).priceOf(spot)
    const playerBalance = await chainopoly.connect(winner).myBalance()

    expect(price).to.be.gt(0)
    expect(playerBalance).to.be.gt(0)

    // await chainopoly.connect(alice).bid(Number(price) + 30)
    // await chainopoly.connect(carla).bid(Number(price) + 40)
    // await chainopoly.connect(daniel).bid(Number(price) + 50)
    // await chainopoly.connect(alice).bid(Number(price) + 60)
    // await chainopoly.connect(eve).bid(Number(price) + 70)
    // await chainopoly.connect(eve).bid(Number(price) + 80)
    // await chainopoly.connect(bob).bid(Number(price) + 90)
    await chainopoly.connect(winner).bid(Number(price) + 100)
  }

  async function updateAuctionDetails() {
    ;[, auctionDetails] = await chainopoly.auctionDetails()
    highestBidder = auctionDetails.highestBidder
    highestBid = auctionDetails.highestBid
  }

  /* ----------------------- RENT ----------------------- */

  async function payRent(player: any) {
    await updateStatusAfterRoll(player)

    if (c.isUtility(spot)) expect(await chainopoly.balanceOf(player.address)).to.be.lt(startingTurnBalance)
    else {
      const rent = await chainopoly.calculateRent(spot)
      expect(rent).to.be.gt(0)
      balanceAfterRent = await chainopoly.balanceOf(player.address)

      if (Number(spot) > Number(startingTurnSpot)) {
        expect(Number(balanceAfterRent) + Number(rent)).to.be.eq(startingTurnBalance) // failed once
      } else if (Number(spot) < Number(startingTurnSpot)) {
        console.log("Starting turn balance", String(startingTurnBalance))
        console.log("rent", String(rent))
        console.log("Balance after rent", String(balanceAfterRent))
        console.log("GENESIS BONUS", c.GENESIS_BONUS)
        console.log("*********")
        expect(Number(balanceAfterRent) + Number(rent)).to.be.eq(Number(startingTurnBalance) + Number(c.GENESIS_BONUS)) // failed once
      }
    }
  }

  /* ----------------------- FEES ---------------------- */

  async function payHighGasFees(player: any) {
    await chainopoly.connect(player).payIncomeTax(true)
  }

  async function payProtocolFee(player: any) {
    balanceAfterTaxes = await chainopoly.balanceOf(player.address)
    expect(startingTurnBalance).to.eq(Number(balanceAfterTaxes) + Number(c.P_FEE))
  }

  async function expectTaxesPaid(player: any) {
    tax = Math.floor(totalPatrimony / 10)
    balanceAfterTaxes = await chainopoly.balanceOf(player.address)

    // todo take go into consideration
    if (Number(spot) > Number(startingTurnSpot)) {
      console.log("total Patrimony", totalPatrimony)
      console.log("Starting turn balance", String(startingTurnBalance))
      console.log("TAX", tax)
      console.log("Balance after TAX", String(balanceAfterTaxes))
      console.log("GENESIS BONUS", c.GENESIS_BONUS)
      expect(startingTurnBalance).to.eq(Number(balanceAfterTaxes) + Number(tax))
    } else if (Number(spot) < Number(startingTurnSpot)) {
      console.log("total Patrimony", totalPatrimony)
      console.log("Starting turn balance", String(startingTurnBalance))
      console.log("TAX", tax)
      console.log("Balance after TAX", String(balanceAfterTaxes))
      console.log("GENESIS BONUS", c.GENESIS_BONUS)
      expect(Number(startingTurnBalance) + c.GENESIS_BONUS).to.eq(Number(balanceAfterTaxes) + Number(tax))
    }
    totalPatrimony = await chainopoly.connect(player).myTotalPatrimony()
    expect(totalPatrimony).to.be.gt(0)
  }

  /* ----------------------- JAIL ----------------------- */

  async function playerShouldBeInJail(player: any) {
    const turnsInJail = await chainopoly.turnsLeftInJail(player.address)
    expect(spot).to.eq(c.JAIL)
    expect(turnsInJail).to.eq(3)
    if (turnsInJail > 0) console.log(`...${player.address.slice(-4)} is in Jail`)
  }

  async function checkCards(landedSpot: any, events: any) {
    if (c.isDefiBootyBag(landedSpot) || c.isZeroKnowledgeChance(landedSpot)) {
      let cardPickedEvent = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CardPicked(uint256)"))
      expect(cardPickedEvent).to.be.eq(events[2].topics[0])
      let [cardPicked] = ethers.utils.defaultAbiCoder.decode(["uint256"], events[2].topics[1])
      console.log("Card number picked:", cardPicked)

      if (c.isDefiBootyBag(landedSpot)) {
        console.log("CARD DESCRIPTION:", await chainopoly.defiBootyBag(landedSpot))
        if (cardPicked >= 0 && cardPicked < 10) {
          expect(await chainopoly.connect(alice).balanceOf(alice.address).to.be.gt(startingTurnBalance))
        } else if (cardPicked == 10) {
          let [playerData] = await chainopoly.connect(alice).whatDoIHave()
          expect(playerData.outOfJailCards).to.be.gt(startingTurnJailCards)
        } else if (cardPicked == 11) {
          expect(await chainopoly.connect(alice).turnsLeftInJail(alice.address).to.be(3))
        } else if (cardPicked > 11 && cardPicked < 16) {
          expect(await chainopoly.connect(alice).balanceOf(alice.address).to.be.lt(startingTurnBalance))
        }
      } else if (c.isZeroKnowledgeChance(landedSpot)) {
        console.log("CARD DESCRIPTION:", await chainopoly.c.isZeroKnowledgeChance(landedSpot))
        ;[spot, name] = await chainopoly.connect(alice).whereAmI()
        if (cardPicked == 0) {
          expect(spot).to.be.eq(c.BITCOIN_MYSTIC_LANE)
        } else if (cardPicked == 1) {
          expect(spot).to.be.eq(c.GENESIS_BLOCK)
          expect(await chainopoly.balanceOf(alice.address)).to.be.gt(startingTurnBalance)
        } else if (cardPicked == 2) {
          expect(spot).to.be.eq(c.POLYGON_PLAZA)
        } else if (cardPicked == 3) {
          expect(spot).to.be.eq(c.UNISWAP_SQUARE)
        } else if (cardPicked == 4 || cardPicked == 5) {
          expect(c.isBlocktrain(spot))
        } else if (cardPicked == 6) {
          expect(c.isUtility(spot))
        } else if (cardPicked == 7) {
          expect(spot).to.be.eq(c.REMIX_BLOCKTRAIN)
        } else if (cardPicked == 8 || cardPicked == 9) {
          expect(await chainopoly.connect(alice).balanceOf(alice.address).to.be.gt(startingTurnBalance))
        } else if (cardPicked == 10) {
          let [playerData] = await chainopoly.connect(alice).whatDoIHave()
          expect(playerData.outOfJailCards).to.be.gt(startingTurnJailCards)
        } else if (cardPicked == 11) {
          expect(await chainopoly.connect(alice).turnsLeftInJail(alice.address).to.be(3))
        } else if (cardPicked == 12) {
          expect(spot).to.be.eq(Number(landedSpot) - 2)
        } else if (cardPicked > 12 && cardPicked < 16) {
          expect(await chainopoly.connect(alice).balanceOf(alice.address).to.be.lt(startingTurnBalance))
        }
      }
    }
  }

  /* **************************************************** */
  /*                      DEPLOYMENT                      */
  /* **************************************************** */

  before(async function () {
    ;[alice, bob, carla, daniel, eve, nonPlayer] = await ethers.getSigners()

    const Board = await ethers.getContractFactory("ChainopolyBoard")
    this.board = await (await Board.deploy()).deployed()

    const Errors = await ethers.getContractFactory("Errors")
    this.errors = await (await Errors.deploy()).deployed()

    const Events = await ethers.getContractFactory("Events")
    this.events = await (await Events.deploy()).deployed()

    const ChainopolyAuction = await ethers.getContractFactory("ChainopolyAuction")
    const chainopolyAuction = await (await ChainopolyAuction.deploy()).deployed()

    const ChainopolyCore = await ethers.getContractFactory("ChainopolyCore", {
      libraries: {
        ChainopolyAuction: chainopolyAuction.address,
      },
    })
    this.chainopolyCore = await (await ChainopolyCore.deploy()).deployed()

    const ChainopolyCards = await ethers.getContractFactory("ChainopolyCards", {
      libraries: {
        ChainopolyCore: this.chainopolyCore.address,
        ChainopolyAuction: chainopolyAuction.address,
      },
    })
    this.chainopolyCards = await (await ChainopolyCards.deploy()).deployed()

    const ChainopolyHelpers = await ethers.getContractFactory("ChainopolyHelpers", {
      libraries: {
        ChainopolyCore: this.chainopolyCore.address,
        ChainopolyCards: this.chainopolyCore.address,
        ChainopolyAuction: chainopolyAuction.address,
      },
    })
    this.chainopolyHelpers = await (await ChainopolyHelpers.deploy()).deployed()

    const ChainopolySwaps = await ethers.getContractFactory("ChainopolySwaps", {
      libraries: {
        ChainopolyCore: this.chainopolyCore.address,
      },
    })
    this.chainopolySwaps = await (await ChainopolySwaps.deploy()).deployed()

    const ChainopolyCenter = await ethers.getContractFactory("ChainopolyCenter", {
      libraries: {
        ChainopolyCore: this.chainopolyCore.address,
        ChainopolyHelpers: this.chainopolyHelpers.address,
        ChainopolySwaps: this.chainopolySwaps.address,
        ChainopolyAuction: chainopolyAuction.address,
      },
    })
    chainopoly = await (await ChainopolyCenter.deploy()).deployed()
  })

  beforeEach(async () => {
    await c.increaseTime(5)
  })

  describe(" ************************* GAME CREATION ************************* ", function () {
    describe(" ************************* DICE *************************", function () {
      it("Dice should always return values between 2 and 12", async function () {
        for (let i = 0; i < 200; i++) {
          let diceRoll: any = await new Promise((resolve) => {
            setTimeout(async () => {
              resolve(await this.chainopolyHelpers.rollDice())
            }, 1)
          })
          await c.increaseTime(1)
          if (diceRoll.result.doubles) expect(diceRoll.result % 2).to.be.eq(0)
          expect(diceRoll.result).to.be.at.least(2).and.at.most(12)
          this.skip()
        }
      })
    })

    it("Alice should be able to create a game", async function () {
      tx = await chainopoly.connect(alice).createClassicGame(c.numberOfPlayers)

      events = (await tx.wait()).events
      let eventName = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GameCreated(address,uint256)"))
      let [creator] = ethers.utils.defaultAbiCoder.decode(["address"], events[0].topics[1])
      let [gameID] = ethers.utils.defaultAbiCoder.decode(["uint256"], events[0].topics[2])

      expect(await chainopoly.gamesCount()).to.eq(c.firstGame)
      expect(eventName).to.be.eq(events[0].topics[0])
      expect(creator).to.be.eq(alice.address)
      expect(gameID).to.be.eq(c.firstGame)
    })

    it("Alice should NOT be able to create another game while one is unfinished", async function () {
      await expect(chainopoly.connect(alice).createClassicGame(c.numberOfPlayers)).to.be.revertedWithCustomError(
        this.errors,
        "YouArePartOfOngoingGame"
      )
      expect(await chainopoly.gamesCount()).to.eq(c.firstGame)
    })

    it("Alice should NOT be able to re-join her created game", async function () {
      await expect(chainopoly.connect(alice).joinGame(c.firstGame)).to.be.revertedWithCustomError(
        this.errors,
        "YouAlreadyJoinedThisGame"
      )
    })

    it("Bob, Carla, Daniel and Eve should be able to join Alice's game", async function () {
      let tx = await chainopoly.connect(bob).joinGame(c.firstGame)
      await chainopoly.connect(carla).joinGame(c.firstGame)
      await chainopoly.connect(daniel).joinGame(c.firstGame)
      await chainopoly.connect(eve).joinGame(c.firstGame)

      events = (await tx.wait()).events
      let eventName = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PlayerJoined(address,uint256)"))
      let [player] = ethers.utils.defaultAbiCoder.decode(["address"], events[0].topics[1])
      let [gameID] = ethers.utils.defaultAbiCoder.decode(["uint256"], events[0].topics[2])

      expect(eventName).to.eq(events[0].topics[0])
      expect(player).to.eq(bob.address)
      expect(gameID).to.eq(c.firstGame)

      let [, bobPosition] = await chainopoly.connect(bob).whereAmI()
      let [, carlaPosition] = await chainopoly.connect(carla).whereAmI()
      let [, danielPosition] = await chainopoly.connect(daniel).whereAmI()
      let [, evePosition] = await chainopoly.connect(eve).whereAmI()

      expect(bobPosition).to.be.eq("Genesis Block")
      expect(carlaPosition).to.be.eq("Genesis Block")
      expect(danielPosition).to.be.eq("Genesis Block")
      expect(evePosition).to.be.eq("Genesis Block")

      expect(await chainopoly.getPlayerGameID(bob.address)).to.be.eq(c.firstGame)
      expect(await chainopoly.getPlayerGameID(carla.address)).to.be.eq(c.firstGame)
      expect(await chainopoly.getPlayerGameID(daniel.address)).to.be.eq(c.firstGame)
      expect(await chainopoly.getPlayerGameID(eve.address)).to.be.eq(c.firstGame)
    })

    it("Bob, Carla, Daniel and Eve should NOT be able to create new games while being part of a game", async function () {
      await expect(chainopoly.connect(bob).createClassicGame(c.numberOfPlayers)).to.be.revertedWithCustomError(
        this.errors,
        "YouArePartOfOngoingGame"
      )
      await expect(chainopoly.connect(carla).createClassicGame(c.numberOfPlayers)).to.be.revertedWithCustomError(
        this.errors,
        "YouArePartOfOngoingGame"
      )
      await expect(chainopoly.connect(daniel).createClassicGame(c.numberOfPlayers)).to.be.revertedWithCustomError(
        this.errors,
        "YouArePartOfOngoingGame"
      )
      await expect(chainopoly.connect(eve).createClassicGame(c.numberOfPlayers)).to.be.revertedWithCustomError(
        this.errors,
        "YouArePartOfOngoingGame"
      )
    })

    it("Game should be ready to start after required players have joined", async function () {
      const status = await chainopoly.connect(alice).gameStatus()
      expect(status).to.be.eq("ReadyToStart")
    })

    it("Game should be started by a joined player only", async function () {
      await expect(chainopoly.connect(nonPlayer).startGame()).to.be.revertedWithCustomError(this.errors, "YouHaventJoinedAnyGame")

      await chainopoly.connect(bob).startGame()
      const status = await chainopoly.connect(bob).gameStatus()
      expect(status).to.be.eq("Playing")
    })

    it("All joined players must have the correct initial amount", async function () {
      expect(await chainopoly.balanceOf(alice.address)).to.eq(c.INITIAL_AMOUNT)
      expect(await chainopoly.balanceOf(bob.address)).to.eq(c.INITIAL_AMOUNT)
      expect(await chainopoly.balanceOf(carla.address)).to.eq(c.INITIAL_AMOUNT)
      expect(await chainopoly.balanceOf(daniel.address)).to.eq(c.INITIAL_AMOUNT)
      expect(await chainopoly.balanceOf(eve.address)).to.eq(c.INITIAL_AMOUNT)
    })
  })

  describe(" *********************************** ROUND 1 *********************************** ", function () {
    describe(" ************************* FIRST TURN (ALICE) ************************* ", function () {
      describe("FIRST ROLL", function () {
        it("Only Alice should be allowed to roll the dice", async function () {
          await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
            this.errors,
            "InvalidGameStatus"
          )
        })

        it("Sets up turn ", async function () {
          await startingTurnSetup(alice)
        })

        it("Rolls", async function () {
          await rollAndMove(alice, 1)
        })

        it("Waits for events", async function () {
          await waitForEvents()
        })

        it("Get Dice Rolled event", async function () {
          getDiceRolledEvent("doubles")
        })

        it("Update status after roll", async function () {
          await updateStatusAfterRoll(alice)
          logDiceRoll("Alice", 1)
        })

        it("Check post dice roll", async function () {
          await checkPostDiceRoll(alice)
        })

        it("Alice should be allowed to BUY", async function () {
          if (c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
          else this.skip()
        })

        it("Alice should have bought", async function () {
          if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
          else this.skip()
        })

        it("Alice should pay RENT", async function () {
          if (
            c.isOwnable(spot) &&
            (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
            (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
          )
            await payRent(alice)
          else this.skip()
        })

        it("Alice should pay TAXES", async function () {
          if (c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
            else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
          } else this.skip()
        })

        it("TAXES should been paid", async function () {
          if (c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
          } else this.skip()
        })

        it("Alice should be sent to jail if lands on GO TO JAIL spot", async function () {
          if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
          else this.skip()
        })

        it("Cards should work as expected if landed on them", async function () {
          if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
          else this.skip()
        })

        it("Bank should pay if player lands on or beyond Genesis Block", async function () {
          if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
            expect(await chainopoly.balanceOf(alice.address)).to.be.gt(startingTurnBalance)
          else this.skip()
        })
      })

      describe("DOUBLES", function () {
        it("Sets up turn (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await startingTurnSetup(alice)
          } else this.skip()
        })

        it("Rolls (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await rollAndMove(alice, 2)
          } else this.skip()
        })

        it("Waits for events (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await waitForEvents()
          } else this.skip()
        })

        it("Get Dice Rolled event (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            getDiceRolledEvent("twoDoubles")
          } else this.skip()
        })

        it("Update status after roll (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await updateStatusAfterRoll(alice)
            logDiceRoll("Alice", 2)
          } else this.skip()
        })

        it("Check post dice roll (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await checkPostDiceRoll(alice)
          } else this.skip()
        })

        it("Alice should be allowed to BUY (DOUBLES)", async function () {
          if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
          else this.skip()
        })

        it("Alice should have bought (DOUBLES)", async function () {
          if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
          else this.skip()
        })

        it("Alice should pay RENT (DOUBLES)", async function () {
          if (
            doubles &&
            c.isOwnable(spot) &&
            (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
            (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
          )
            await payRent(alice)
          else this.skip()
        })

        it("Alice should pay TAXES (DOUBLES)", async function () {
          if (doubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
            else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
          } else this.skip()
        })

        it("TAXES should been paid (DOUBLES)", async function () {
          if (doubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
          } else this.skip()
        })

        it("Alice should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
          if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
          else this.skip()
        })

        it("Cards should work as expected if landed on them (DOUBLES)", async function () {
          if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
            await checkCards(landedSpot, events)
          else this.skip()
        })

        it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
          if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
            expect(await chainopoly.balanceOf(alice.address)).to.be.gt(startingTurnBalance)
          else this.skip()
        })
      })

      describe("SECOND TIME DOUBLES", function () {
        it("Sets up turn (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await startingTurnSetup(alice)
          } else this.skip()
        })

        it("Rolls (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await rollAndMove(alice, 3)
          } else this.skip()
        })

        it("Waits for events (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await waitForEvents()
          } else this.skip()
        })

        it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            getDiceRolledEvent("threeDoubles")
          } else this.skip()
        })

        it("Update status after roll (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await updateStatusAfterRoll(alice)
            logDiceRoll("Alice", 3)
          } else this.skip()
        })

        it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await checkPostDiceRoll(alice)
          } else this.skip()
        })

        it("Alice should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
          else this.skip()
        })

        it("Alice should have bought (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
          else this.skip()
        })

        it("Alice should pay RENT (SECOND TIME DOUBLES)", async function () {
          if (
            twoDoubles &&
            c.isOwnable(spot) &&
            (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
            (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
          )
            await payRent(alice)
          else this.skip()
        })

        it("Alice should pay TAXES (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
            else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
          } else this.skip()
        })

        it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
          } else this.skip()
        })

        it("Alice should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
          else this.skip()
        })

        it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
            await checkCards(landedSpot, events)
          else this.skip()
        })

        it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
          if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
            expect(await chainopoly.balanceOf(alice.address)).to.be.gt(startingTurnBalance)
          else this.skip()
        })
      })

      describe("ENDING TURN", function () {
        it("Alice should be allowed to end her turn", async function () {
          await endTurn(alice, "Alice")
        })
      })
    })

    describe(" ************************* SECOND TURN (BOB) ************************* ", function () {
      describe("FIRST ROLL", function () {
        it("Only Bob should be allowed to roll the dice", async function () {
          await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
            this.errors,
            "InvalidGameStatus"
          )
        })

        it("Sets up turn ", async function () {
          await startingTurnSetup(bob)
        })

        it("Rolls", async function () {
          await rollAndMove(bob, 1)
        })

        it("Waits for events", async function () {
          await waitForEvents()
        })

        it("Get Dice Rolled event", async function () {
          getDiceRolledEvent("doubles")
        })

        it("Update status after roll", async function () {
          await updateStatusAfterRoll(bob)
          logDiceRoll("Bob", 1)
        })

        it("Check post dice roll", async function () {
          await checkPostDiceRoll(bob)
        })

        it("Bob should be allowed to BUY", async function () {
          if (c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
          else this.skip()
        })

        it("Bob should have bought", async function () {
          if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
          else this.skip()
        })

        it("Bob should pay RENT", async function () {
          if (
            c.isOwnable(spot) &&
            (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
            (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
          )
            await payRent(bob)
          else this.skip()
        })

        it("Bob should pay TAXES", async function () {
          if (c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
            else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
          } else this.skip()
        })

        it("TAXES should been paid", async function () {
          if (c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
          } else this.skip()
        })

        it("Bob should be sent to jail if lands on GO TO JAIL spot", async function () {
          if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
          else this.skip()
        })

        it("Cards should work as expected if landed on them", async function () {
          if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
          else this.skip()
        })

        it("Bank should pay if player lands on or beyond Genesis Block", async function () {
          if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
            expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
          else this.skip()
        })
      })

      describe("DOUBLES", function () {
        it("Sets up turn (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await startingTurnSetup(bob)
          } else this.skip()
        })

        it("Rolls (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await rollAndMove(bob, 2)
          } else this.skip()
        })

        it("Waits for events (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await waitForEvents()
          } else this.skip()
        })

        it("Get Dice Rolled event (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            getDiceRolledEvent("twoDoubles")
          } else this.skip()
        })

        it("Update status after roll (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await updateStatusAfterRoll(bob)
            logDiceRoll("Bob", 2)
          } else this.skip()
        })

        it("Check post dice roll (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await checkPostDiceRoll(bob)
          } else this.skip()
        })

        it("Bob should be allowed to BUY (DOUBLES)", async function () {
          if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
          else this.skip()
        })

        it("Bob should have bought (DOUBLES)", async function () {
          if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
          else this.skip()
        })

        it("Bob should pay RENT (DOUBLES)", async function () {
          if (
            doubles &&
            c.isOwnable(spot) &&
            (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
            (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
          )
            await payRent(bob)
          else this.skip()
        })

        it("Bob should pay TAXES (DOUBLES)", async function () {
          if (doubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
            else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
          } else this.skip()
        })

        it("TAXES should been paid (DOUBLES)", async function () {
          if (doubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
          } else this.skip()
        })

        it("Bob should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
          if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
          else this.skip()
        })

        it("Cards should work as expected if landed on them (DOUBLES)", async function () {
          if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
            await checkCards(landedSpot, events)
          else this.skip()
        })

        it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
          if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
            expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
          else this.skip()
        })
      })

      describe("SECOND TIME DOUBLES", function () {
        it("Sets up turn (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await startingTurnSetup(bob)
          } else this.skip()
        })

        it("Rolls (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await rollAndMove(bob, 3)
          } else this.skip()
        })

        it("Waits for events (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await waitForEvents()
          } else this.skip()
        })

        it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            getDiceRolledEvent("threeDoubles")
          } else this.skip()
        })

        it("Update status after roll (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await updateStatusAfterRoll(bob)
            logDiceRoll("Bob", 3)
          } else this.skip()
        })

        it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await checkPostDiceRoll(bob)
          } else this.skip()
        })

        it("Bob should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
          else this.skip()
        })

        it("Bob should have bought (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
          else this.skip()
        })

        it("Bob should pay RENT (SECOND TIME DOUBLES)", async function () {
          if (
            twoDoubles &&
            c.isOwnable(spot) &&
            (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
            (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
          )
            await payRent(bob)
          else this.skip()
        })

        it("Bob should pay TAXES (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
            else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
          } else this.skip()
        })

        it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
          } else this.skip()
        })

        it("Bob should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
          else this.skip()
        })

        it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
            await checkCards(landedSpot, events)
          else this.skip()
        })

        it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
          if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
            expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
          else this.skip()
        })
      })

      describe("ENDING TURN", function () {
        it("Bob should be allowed to end her turn", async function () {
          await endTurn(bob, "Bob")
        })
      })
    })

    describe(" ************************* THIRD TURN (CARLA) ************************* ", function () {
      describe("FIRST ROLL", function () {
        it("Only Carla should be allowed to roll the dice", async function () {
          await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
            this.errors,
            "InvalidGameStatus"
          )
        })

        it("Sets up turn ", async function () {
          await startingTurnSetup(carla)
        })

        it("Rolls", async function () {
          await rollAndMove(carla, 1)
        })

        it("Waits for events", async function () {
          await waitForEvents()
        })

        it("Get Dice Rolled event", async function () {
          getDiceRolledEvent("doubles")
        })

        it("Update status after roll", async function () {
          await updateStatusAfterRoll(carla)
          logDiceRoll("Carla", 1)
        })

        it("Check post dice roll", async function () {
          await checkPostDiceRoll(carla)
        })

        it("Carla should be allowed to BUY", async function () {
          if (c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
          else this.skip()
        })

        it("Carla should have bought", async function () {
          if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
          else this.skip()
        })

        it("Carla should pay RENT", async function () {
          if (
            c.isOwnable(spot) &&
            (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
            (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
          )
            await payRent(carla)
          else this.skip()
        })

        it("Carla should pay TAXES", async function () {
          if (c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
            else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
          } else this.skip()
        })

        it("TAXES should been paid", async function () {
          if (c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
          } else this.skip()
        })

        it("Carla should be sent to jail if lands on GO TO JAIL spot", async function () {
          if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
          else this.skip()
        })

        it("Cards should work as expected if landed on them", async function () {
          if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
          else this.skip()
        })

        it("Bank should pay if player lands on or beyond Genesis Block", async function () {
          if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
            expect(await chainopoly.balanceOf(carla.address)).to.be.gt(startingTurnBalance)
          else this.skip()
        })
      })

      describe("DOUBLES", function () {
        it("Sets up turn (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await startingTurnSetup(carla)
          } else this.skip()
        })

        it("Rolls (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await rollAndMove(carla, 2)
          } else this.skip()
        })

        it("Waits for events (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await waitForEvents()
          } else this.skip()
        })

        it("Get Dice Rolled event (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            getDiceRolledEvent("twoDoubles")
          } else this.skip()
        })

        it("Update status after roll (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await updateStatusAfterRoll(carla)
            logDiceRoll("Carla", 2)
          } else this.skip()
        })

        it("Check post dice roll (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await checkPostDiceRoll(carla)
          } else this.skip()
        })

        it("Carla should be allowed to BUY (DOUBLES)", async function () {
          if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
          else this.skip()
        })

        it("Carla should have bought (DOUBLES)", async function () {
          if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
          else this.skip()
        })

        it("Carla should pay RENT (DOUBLES)", async function () {
          if (
            doubles &&
            c.isOwnable(spot) &&
            (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
            (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
          )
            await payRent(carla)
          else this.skip()
        })

        it("Carla should pay TAXES (DOUBLES)", async function () {
          if (doubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
            else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
          } else this.skip()
        })

        it("TAXES should been paid (DOUBLES)", async function () {
          if (doubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
          } else this.skip()
        })

        it("Carla should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
          if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
          else this.skip()
        })

        it("Cards should work as expected if landed on them (DOUBLES)", async function () {
          if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
            await checkCards(landedSpot, events)
          else this.skip()
        })

        it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
          if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
            expect(await chainopoly.balanceOf(carla.address)).to.be.gt(startingTurnBalance)
          else this.skip()
        })
      })

      describe("SECOND TIME DOUBLES", function () {
        it("Sets up turn (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await startingTurnSetup(carla)
          } else this.skip()
        })

        it("Rolls (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await rollAndMove(carla, 3)
          } else this.skip()
        })

        it("Waits for events (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await waitForEvents()
          } else this.skip()
        })

        it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            getDiceRolledEvent("threeDoubles")
          } else this.skip()
        })

        it("Update status after roll (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await updateStatusAfterRoll(carla)
            logDiceRoll("Carla", 3)
          } else this.skip()
        })

        it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await checkPostDiceRoll(carla)
          } else this.skip()
        })

        it("Carla should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
          else this.skip()
        })

        it("Carla should have bought (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
          else this.skip()
        })

        it("Carla should pay RENT (SECOND TIME DOUBLES)", async function () {
          if (
            twoDoubles &&
            c.isOwnable(spot) &&
            (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
            (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
          )
            await payRent(carla)
          else this.skip()
        })

        it("Carla should pay TAXES (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
            else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
          } else this.skip()
        })

        it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
          } else this.skip()
        })

        it("Carla should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
          else this.skip()
        })

        it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
            await checkCards(landedSpot, events)
          else this.skip()
        })

        it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
          if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
            expect(await chainopoly.balanceOf(carla.address)).to.be.gt(startingTurnBalance)
          else this.skip()
        })
      })

      describe("ENDING TURN", function () {
        it("Carla should be allowed to end her turn", async function () {
          await endTurn(carla, "Carla")
        })
      })
    })

    describe(" ************************* FOURTH TURN (DANIEL) ************************* ", function () {
      describe("FIRST ROLL", function () {
        it("Only Daniel should be allowed to roll the dice", async function () {
          await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
            this.errors,
            "InvalidGameStatus"
          )
        })

        it("Sets up turn ", async function () {
          await startingTurnSetup(daniel)
        })

        it("Rolls", async function () {
          await rollAndMove(daniel, 1)
        })

        it("Waits for events", async function () {
          await waitForEvents()
        })

        it("Get Dice Rolled event", async function () {
          getDiceRolledEvent("doubles")
        })

        it("Update status after roll", async function () {
          await updateStatusAfterRoll(daniel)
          logDiceRoll("Daniel", 1)
        })

        it("Check post dice roll", async function () {
          await checkPostDiceRoll(daniel)
        })

        it("Daniel should pay RENT", async function () {
          if (
            c.isOwnable(spot) &&
            (await chainopoly.connect(daniel).ownerOf(spot)) != ethers.constants.AddressZero &&
            (await chainopoly.connect(daniel).ownerOf(spot)) != daniel.address
          )
            await payRent(daniel)
          else this.skip()
        })

        it("Daniel should pay TAXES", async function () {
          if (c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await payHighGasFees(daniel)
            else if (spot == c.PROTOCOL_FEE) await payProtocolFee(daniel)
          } else this.skip()
        })

        it("TAXES should been paid", async function () {
          if (c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(daniel)
          } else this.skip()
        })

        it("Daniel should be sent to jail if lands on GO TO JAIL spot", async function () {
          if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(daniel)
          else this.skip()
        })

        it("Cards should work as expected if landed on them", async function () {
          if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
          else this.skip()
        })

        describe("AUCTION", function () {
          it("Daniel should be allowed to NOT BUY", async function () {
            if (c.isOwnable(spot) && !playerInJail && (await isUnowned(daniel, spot))) await dontBuy(daniel)
            else this.skip()
          })

          it("Daniel should have NOT BOUGHT and AUCTION in place", async function () {
            if (c.isOwnable(spot) && !decidedToBuy && (await isUnowned(daniel, spot))) await auctionShouldBeInPlace(daniel)
            else this.skip()
          })

          it("Players should be allowed to bid in auction", async function () {
            if (auction) await bid(eve)
            else this.skip()
          })

          it("Update auction details", async function () {
            if (auction) await updateAuctionDetails()
            else this.skip()
          })

          it("Players should NOT be allowed to bid when auction has ended and it should finish", async function () {
            if (auction) {
              await c.increaseTime(86400) // 1 day in seconds = 86400
              let price = await chainopoly.connect(alice).priceOf(spot)
              await chainopoly.connect(alice).bid(Number(price) + 500)
              const status = await chainopoly.connect(daniel).gameStatus()
              expect(status == "Playing")
            } else this.skip()
          })

          it("Highest bidder must own auctioned property after auction", async function () {
            if (auction) {
              let owner = await chainopoly.connect(daniel).ownerOf(spot)
              expect(owner).to.eq(highestBidder)
            } else this.skip()
          })

          it("Auction ended", async function () {
            if (auction) {
              const status = await chainopoly.connect(daniel).gameStatus
              expect(status == "Playing")
              auction = false
            } else this.skip()
          })
        })

        it("Bank should pay if player lands on or beyond Genesis Block", async function () {
          if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
            expect(await chainopoly.balanceOf(daniel.address)).to.be.gt(startingTurnBalance)
          else this.skip()
        })
      })

      describe("DOUBLES (WHEN TIME IS UP)", function () {
        it("Daniel should NOT be allowed to roll again if time is up (even if he got doubles)", async function () {
          if (doubles) {
            await c.increaseTime(86400)
            await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NoTimeLeft")
          } else this.skip()
        })
      })

      describe("ENDING TURN", function () {
        it("Daniel should be allowed to end her turn", async function () {
          await endTurn(daniel, "Daniel")
        })
      })
    })

    describe(" ************************* FIFTH TURN (EVE) ************************* ", function () {
      describe("FIRST ROLL", function () {
        it("Only Eve should be allowed to roll the dice", async function () {
          await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
          await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
            this.errors,
            "InvalidGameStatus"
          )
        })

        it("Sets up turn ", async function () {
          await startingTurnSetup(eve)
        })

        it("Rolls", async function () {
          await rollAndMove(eve, 1)
        })

        it("Waits for events", async function () {
          await waitForEvents()
        })

        it("Get Dice Rolled event", async function () {
          getDiceRolledEvent("doubles")
        })

        it("Update status after roll", async function () {
          await updateStatusAfterRoll(eve)
          logDiceRoll("Eve", 1)
        })

        it("Check post dice roll", async function () {
          await checkPostDiceRoll(eve)
        })

        it("Eve should be allowed to BUY", async function () {
          if (c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
          else this.skip()
        })

        it("Eve should have bought", async function () {
          if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
          else this.skip()
        })

        it("Eve should pay RENT", async function () {
          if (
            c.isOwnable(spot) &&
            (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
            (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
          )
            await payRent(eve)
          else this.skip()
        })

        it("Eve should pay TAXES", async function () {
          if (c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
            else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
          } else this.skip()
        })

        it("TAXES should been paid", async function () {
          if (c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
          } else this.skip()
        })

        it("Eve should be sent to jail if lands on GO TO JAIL spot", async function () {
          if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
          else this.skip()
        })

        it("Cards should work as expected if landed on them", async function () {
          if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
          else this.skip()
        })

        it("Bank should pay if player lands on or beyond Genesis Block", async function () {
          if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
            expect(await chainopoly.balanceOf(eve.address)).to.be.gt(startingTurnBalance)
          else this.skip()
        })
      })

      describe("DOUBLES", function () {
        it("Sets up turn (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await startingTurnSetup(eve)
          } else this.skip()
        })

        it("Rolls (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await rollAndMove(eve, 2)
          } else this.skip()
        })

        it("Waits for events (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await waitForEvents()
          } else this.skip()
        })

        it("Get Dice Rolled event (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            getDiceRolledEvent("twoDoubles")
          } else this.skip()
        })

        it("Update status after roll (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await updateStatusAfterRoll(eve)
            logDiceRoll("Eve", 2)
          } else this.skip()
        })

        it("Check post dice roll (DOUBLES)", async function () {
          if (doubles && !playerInJail) {
            await checkPostDiceRoll(eve)
          } else this.skip()
        })

        it("Eve should be allowed to BUY (DOUBLES)", async function () {
          if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
          else this.skip()
        })

        it("Eve should have bought (DOUBLES)", async function () {
          if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
          else this.skip()
        })

        it("Eve should pay RENT (DOUBLES)", async function () {
          if (
            doubles &&
            c.isOwnable(spot) &&
            (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
            (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
          )
            await payRent(eve)
          else this.skip()
        })

        it("Eve should pay TAXES (DOUBLES)", async function () {
          if (doubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
            else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
          } else this.skip()
        })

        it("TAXES should been paid (DOUBLES)", async function () {
          if (doubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
          } else this.skip()
        })

        it("Eve should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
          if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
          else this.skip()
        })

        it("Cards should work as expected if landed on them (DOUBLES)", async function () {
          if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
            await checkCards(landedSpot, events)
          else this.skip()
        })

        it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
          if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
            expect(await chainopoly.balanceOf(eve.address)).to.be.gt(startingTurnBalance)
          else this.skip()
        })
      })

      describe("SECOND TIME DOUBLES", function () {
        it("Sets up turn (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await startingTurnSetup(eve)
          } else this.skip()
        })

        it("Rolls (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await rollAndMove(eve, 3)
          } else this.skip()
        })

        it("Waits for events (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await waitForEvents()
          } else this.skip()
        })

        it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            getDiceRolledEvent("threeDoubles")
          } else this.skip()
        })

        it("Update status after roll (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await updateStatusAfterRoll(eve)
            logDiceRoll("Eve", 3)
          } else this.skip()
        })

        it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail) {
            await checkPostDiceRoll(eve)
          } else this.skip()
        })

        it("Eve should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
          else this.skip()
        })

        it("Eve should have bought (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
          else this.skip()
        })

        it("Eve should pay RENT (SECOND TIME DOUBLES)", async function () {
          if (
            twoDoubles &&
            c.isOwnable(spot) &&
            (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
            (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
          )
            await payRent(eve)
          else this.skip()
        })

        it("Eve should pay TAXES (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
            else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
          } else this.skip()
        })

        it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && c.isTax(spot)) {
            if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
          } else this.skip()
        })

        it("Eve should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
          else this.skip()
        })

        it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
          if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
            await checkCards(landedSpot, events)
          else this.skip()
        })

        it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
          if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
            expect(await chainopoly.balanceOf(eve.address)).to.be.gt(startingTurnBalance)
          else this.skip()
        })
      })

      describe("ENDING TURN", function () {
        it("Eve should be allowed to end her turn", async function () {
          await endTurn(eve, "Eve")
        })
      })
    })
  })

  // describe(" *********************************** ROUND 2 *********************************** ", function () {
  //   describe(" ************************* FIRST TURN (ALICE) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Alice should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(alice)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(alice, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(alice)
  //         logDiceRoll("Alice", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(alice)
  //       })

  //       it("Alice should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
  //         else this.skip()
  //       })

  //       it("Alice should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
  //         )
  //           await payRent(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(alice.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(alice)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(alice, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(alice)
  //           logDiceRoll("Alice", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
  //         else this.skip()
  //       })

  //       it("Alice should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
  //         )
  //           await payRent(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(alice.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(alice)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(alice, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(alice)
  //           logDiceRoll("Alice", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
  //         else this.skip()
  //       })

  //       it("Alice should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
  //         )
  //           await payRent(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(alice.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Alice should be allowed to end her turn", async function () {
  //         await endTurn(alice, "Alice")
  //       })
  //     })
  //   })

  //   describe(" ************************* SECOND TURN (BOB) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Bob should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(bob)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(bob, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(bob)
  //         logDiceRoll("Bob", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(bob)
  //       })

  //       it("Bob should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
  //         else this.skip()
  //       })

  //       it("Bob should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
  //         )
  //           await payRent(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(bob)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(bob, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(bob)
  //           logDiceRoll("Bob", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
  //         else this.skip()
  //       })

  //       it("Bob should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
  //         )
  //           await payRent(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(bob)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(bob, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(bob)
  //           logDiceRoll("Bob", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
  //         else this.skip()
  //       })

  //       it("Bob should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
  //         )
  //           await payRent(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Bob should be allowed to end her turn", async function () {
  //         await endTurn(bob, "Bob")
  //       })
  //     })
  //   })

  //   describe(" ************************* THIRD TURN (CARLA) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Carla should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(carla)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(carla, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(carla)
  //         logDiceRoll("Carla", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(carla)
  //       })

  //       it("Carla should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
  //         else this.skip()
  //       })

  //       it("Carla should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
  //         )
  //           await payRent(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(carla.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(carla)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(carla, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(carla)
  //           logDiceRoll("Carla", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
  //         else this.skip()
  //       })

  //       it("Carla should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
  //         )
  //           await payRent(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(carla.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(carla)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(carla, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(carla)
  //           logDiceRoll("Carla", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
  //         else this.skip()
  //       })

  //       it("Carla should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
  //         )
  //           await payRent(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(carla.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Carla should be allowed to end her turn", async function () {
  //         await endTurn(carla, "Carla")
  //       })
  //     })
  //   })

  //   describe(" ************************* FOURTH TURN (DANIEL) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Daniel should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(daniel)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(daniel, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(daniel)
  //         logDiceRoll("Daniel", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(daniel)
  //       })

  //       it("Daniel should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(daniel).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(daniel).ownerOf(spot)) != daniel.address
  //         )
  //           await payRent(daniel)
  //         else this.skip()
  //       })

  //       it("Daniel should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(daniel)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(daniel)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(daniel)
  //         } else this.skip()
  //       })

  //       it("Daniel should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(daniel)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       describe("AUCTION", function () {
  //         it("Daniel should be allowed to NOT BUY", async function () {
  //           if (c.isOwnable(spot) && !playerInJail && (await isUnowned(daniel, spot))) await dontBuy(daniel)
  //           else this.skip()
  //         })

  //         it("Daniel should have NOT BOUGHT and AUCTION in place", async function () {
  //           if (c.isOwnable(spot) && !decidedToBuy && (await isUnowned(daniel, spot))) await auctionShouldBeInPlace(daniel)
  //           else this.skip()
  //         })

  //         it("Players should be allowed to bid in auction", async function () {
  //           if (auction) await bid(carla)
  //           else this.skip()
  //         })

  //         it("Update auction details", async function () {
  //           if (auction) await updateAuctionDetails()
  //           else this.skip()
  //         })

  //         it("Players should NOT be allowed to bid when auction has ended and it should finish", async function () {
  //           if (auction) {
  //             await c.increaseTime(86400) // 1 day in seconds = 86400
  //             let price = await chainopoly.connect(alice).priceOf(spot)
  //             await chainopoly.connect(alice).bid(Number(price) + 500)
  //             gameOne = await chainopoly.games(c.firstGame)
  //             expect(gameOne.status == c.Status.Playing)
  //           } else this.skip()
  //         })

  //         it("Highest bidder must own auctioned property after auction", async function () {
  //           if (auction) {
  //             let owner = await chainopoly.connect(daniel).ownerOf(spot)
  //             expect(owner).to.eq(highestBidder)
  //           } else this.skip()
  //         })

  //         it("Auction ended", async function () {
  //           if (auction) {
  //             gameOne = await chainopoly.games(c.firstGame)
  //             expect(gameOne.status == c.Status.Playing)
  //             auction = false
  //           } else this.skip()
  //         })
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(daniel.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES (WHEN TIME IS UP)", function () {
  //       it("Daniel should NOT be allowed to roll again if time is up (even if he got doubles)", async function () {
  //         if (doubles) {
  //           await c.increaseTime(86400)
  //           await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NoTimeLeft")
  //         } else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Daniel should be allowed to end her turn", async function () {
  //         await endTurn(daniel, "Daniel")
  //       })
  //     })
  //   })

  //   describe(" ************************* FIFTH TURN (EVE) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Eve should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(eve)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(eve, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(eve)
  //         logDiceRoll("Eve", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(eve)
  //       })

  //       it("Eve should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
  //         else this.skip()
  //       })

  //       it("Eve should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
  //         )
  //           await payRent(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(eve.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(eve)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(eve, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(eve)
  //           logDiceRoll("Eve", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
  //         else this.skip()
  //       })

  //       it("Eve should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
  //         )
  //           await payRent(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(eve.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(eve)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(eve, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(eve)
  //           logDiceRoll("Eve", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
  //         else this.skip()
  //       })

  //       it("Eve should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
  //         )
  //           await payRent(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(eve.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Eve should be allowed to end her turn", async function () {
  //         await endTurn(eve, "Eve")
  //       })
  //     })
  //   })
  // })

  // describe(" *********************************** ROUND 3 *********************************** ", function () {
  //   describe(" ************************* FIRST TURN (ALICE) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Alice should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(alice)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(alice, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(alice)
  //         logDiceRoll("Alice", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(alice)
  //       })

  //       it("Alice should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
  //         else this.skip()
  //       })

  //       it("Alice should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
  //         )
  //           await payRent(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(alice.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(alice)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(alice, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(alice)
  //           logDiceRoll("Alice", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
  //         else this.skip()
  //       })

  //       it("Alice should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
  //         )
  //           await payRent(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(alice.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(alice)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(alice, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(alice)
  //           logDiceRoll("Alice", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
  //         else this.skip()
  //       })

  //       it("Alice should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
  //         )
  //           await payRent(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(alice.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Alice should be allowed to end her turn", async function () {
  //         await endTurn(alice, "Alice")
  //       })
  //     })
  //   })

  //   describe(" ************************* SECOND TURN (BOB) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Bob should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(bob)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(bob, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(bob)
  //         logDiceRoll("Bob", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(bob)
  //       })

  //       it("Bob should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
  //         else this.skip()
  //       })

  //       it("Bob should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
  //         )
  //           await payRent(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(bob)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(bob, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(bob)
  //           logDiceRoll("Bob", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
  //         else this.skip()
  //       })

  //       it("Bob should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
  //         )
  //           await payRent(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL) {
  //           let pat = await chainopoly.connect(bob).myTotalPatrimony()
  //           expect(pat).to.be.gt(totalPatrimony)
  //         } else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(bob)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(bob, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(bob)
  //           logDiceRoll("Bob", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
  //         else this.skip()
  //       })

  //       it("Bob should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
  //         )
  //           await payRent(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Bob should be allowed to end her turn", async function () {
  //         await endTurn(bob, "Bob")
  //       })
  //     })
  //   })

  //   describe(" ************************* THIRD TURN (CARLA) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Carla should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(carla)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(carla, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(carla)
  //         logDiceRoll("Carla", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(carla)
  //       })

  //       it("Carla should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
  //         else this.skip()
  //       })

  //       it("Carla should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
  //         )
  //           await payRent(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(carla.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(carla)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(carla, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(carla)
  //           logDiceRoll("Carla", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
  //         else this.skip()
  //       })

  //       it("Carla should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
  //         )
  //           await payRent(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(carla.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(carla)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(carla, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(carla)
  //           logDiceRoll("Carla", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
  //         else this.skip()
  //       })

  //       it("Carla should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
  //         )
  //           await payRent(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(carla.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Carla should be allowed to end her turn", async function () {
  //         await endTurn(carla, "Carla")
  //       })
  //     })
  //   })

  //   describe(" ************************* FOURTH TURN (DANIEL) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Daniel should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(daniel)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(daniel, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(daniel)
  //         logDiceRoll("Daniel", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(daniel)
  //       })

  //       it("Daniel should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(daniel).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(daniel).ownerOf(spot)) != daniel.address
  //         )
  //           await payRent(daniel)
  //         else this.skip()
  //       })

  //       it("Daniel should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(daniel)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(daniel)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(daniel)
  //         } else this.skip()
  //       })

  //       it("Daniel should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(daniel)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       describe("AUCTION", function () {
  //         it("Daniel should be allowed to NOT BUY", async function () {
  //           if (c.isOwnable(spot) && !playerInJail && (await isUnowned(daniel, spot))) await dontBuy(daniel)
  //           else this.skip()
  //         })

  //         it("Daniel should have NOT BOUGHT and AUCTION in place", async function () {
  //           if (c.isOwnable(spot) && !decidedToBuy && (await isUnowned(daniel, spot))) await auctionShouldBeInPlace(daniel)
  //           else this.skip()
  //         })

  //         it("Players should be allowed to bid in auction", async function () {
  //           if (auction) await bid(daniel)
  //           else this.skip()
  //         })

  //         it("Update auction details", async function () {
  //           if (auction) await updateAuctionDetails()
  //           else this.skip()
  //         })

  //         it("Players should NOT be allowed to bid when auction has ended and it should finish", async function () {
  //           if (auction) {
  //             await c.increaseTime(86400) // 1 day in seconds = 86400
  //             let price = await chainopoly.connect(alice).priceOf(spot)
  //             await chainopoly.connect(alice).bid(Number(price) + 500)
  //             gameOne = await chainopoly.games(c.firstGame)
  //             expect(gameOne.status == c.Status.Playing)
  //           } else this.skip()
  //         })

  //         it("Highest bidder must own auctioned property after auction", async function () {
  //           if (auction) {
  //             let owner = await chainopoly.connect(daniel).ownerOf(spot)
  //             expect(owner).to.eq(highestBidder)
  //           } else this.skip()
  //         })

  //         it("Auction ended", async function () {
  //           if (auction) {
  //             gameOne = await chainopoly.games(c.firstGame)
  //             expect(gameOne.status == c.Status.Playing)
  //             auction = false
  //           } else this.skip()
  //         })
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(daniel.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES (WHEN TIME IS UP)", function () {
  //       it("Daniel should NOT be allowed to roll again if time is up (even if he got doubles)", async function () {
  //         if (doubles) {
  //           await c.increaseTime(86400)
  //           await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NoTimeLeft")
  //         } else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Daniel should be allowed to end her turn", async function () {
  //         await endTurn(daniel, "Daniel")
  //       })
  //     })
  //   })

  //   describe(" ************************* FIFTH TURN (EVE) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Eve should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(eve)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(eve, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(eve)
  //         logDiceRoll("Eve", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(eve)
  //       })

  //       it("Eve should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
  //         else this.skip()
  //       })

  //       it("Eve should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
  //         )
  //           await payRent(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(eve.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(eve)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(eve, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(eve)
  //           logDiceRoll("Eve", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
  //         else this.skip()
  //       })

  //       it("Eve should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
  //         )
  //           await payRent(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(eve.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(eve)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(eve, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(eve)
  //           logDiceRoll("Eve", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
  //         else this.skip()
  //       })

  //       it("Eve should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
  //         )
  //           await payRent(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(eve.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Eve should be allowed to end her turn", async function () {
  //         await endTurn(eve, "Eve")
  //       })
  //     })
  //   })
  // })

  // describe(" *********************************** ROUND 4 *********************************** ", function () {
  //   describe(" ************************* FIRST TURN (ALICE) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Alice should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(alice)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(alice, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(alice)
  //         logDiceRoll("Alice", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(alice)
  //       })

  //       it("Alice should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
  //         else this.skip()
  //       })

  //       it("Alice should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
  //         )
  //           await payRent(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(alice.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(alice)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(alice, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(alice)
  //           logDiceRoll("Alice", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
  //         else this.skip()
  //       })

  //       it("Alice should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
  //         )
  //           await payRent(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(alice.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(alice)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(alice, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(alice)
  //           logDiceRoll("Alice", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
  //         else this.skip()
  //       })

  //       it("Alice should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
  //         )
  //           await payRent(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(alice.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Alice should be allowed to end her turn", async function () {
  //         await endTurn(alice, "Alice")
  //       })
  //     })
  //   })

  //   describe(" ************************* SECOND TURN (BOB) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Bob should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(bob)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(bob, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(bob)
  //         logDiceRoll("Bob", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(bob)
  //       })

  //       it("Bob should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
  //         else this.skip()
  //       })

  //       it("Bob should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
  //         )
  //           await payRent(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(bob)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(bob, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(bob)
  //           logDiceRoll("Bob", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
  //         else this.skip()
  //       })

  //       it("Bob should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
  //         )
  //           await payRent(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(bob)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(bob, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(bob)
  //           logDiceRoll("Bob", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
  //         else this.skip()
  //       })

  //       it("Bob should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
  //         )
  //           await payRent(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Bob should be allowed to end her turn", async function () {
  //         await endTurn(bob, "Bob")
  //       })
  //     })
  //   })

  //   describe(" ************************* THIRD TURN (CARLA) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Carla should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(carla)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(carla, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(carla)
  //         logDiceRoll("Carla", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(carla)
  //       })

  //       it("Carla should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
  //         else this.skip()
  //       })

  //       it("Carla should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
  //         )
  //           await payRent(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(carla.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(carla)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(carla, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(carla)
  //           logDiceRoll("Carla", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
  //         else this.skip()
  //       })

  //       it("Carla should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
  //         )
  //           await payRent(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(carla.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(carla)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(carla, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(carla)
  //           logDiceRoll("Carla", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
  //         else this.skip()
  //       })

  //       it("Carla should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
  //         )
  //           await payRent(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(carla.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Carla should be allowed to end her turn", async function () {
  //         await endTurn(carla, "Carla")
  //       })
  //     })
  //   })

  //   describe(" ************************* FOURTH TURN (DANIEL) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Daniel should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(daniel)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(daniel, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(daniel)
  //         logDiceRoll("Daniel", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(daniel)
  //       })

  //       it("Daniel should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(daniel).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(daniel).ownerOf(spot)) != daniel.address
  //         )
  //           await payRent(daniel)
  //         else this.skip()
  //       })

  //       it("Daniel should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(daniel)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(daniel)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(daniel)
  //         } else this.skip()
  //       })

  //       it("Daniel should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(daniel)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       describe("AUCTION", function () {
  //         it("Daniel should be allowed to NOT BUY", async function () {
  //           if (c.isOwnable(spot) && !playerInJail && (await isUnowned(daniel, spot))) await dontBuy(daniel)
  //           else this.skip()
  //         })

  //         it("Daniel should have NOT BOUGHT and AUCTION in place", async function () {
  //           if (c.isOwnable(spot) && !decidedToBuy && (await isUnowned(daniel, spot))) await auctionShouldBeInPlace(daniel)
  //           else this.skip()
  //         })

  //         it("Players should be allowed to bid in auction", async function () {
  //           if (auction) await bid(bob)
  //           else this.skip()
  //         })

  //         it("Update auction details", async function () {
  //           if (auction) await updateAuctionDetails()
  //           else this.skip()
  //         })

  //         it("Players should NOT be allowed to bid when auction has ended and it should finish", async function () {
  //           if (auction) {
  //             await c.increaseTime(86400) // 1 day in seconds = 86400
  //             let price = await chainopoly.connect(alice).priceOf(spot)
  //             await chainopoly.connect(alice).bid(Number(price) + 500)
  //             gameOne = await chainopoly.games(c.firstGame)
  //             expect(gameOne.status == c.Status.Playing)
  //           } else this.skip()
  //         })

  //         it("Highest bidder must own auctioned property after auction", async function () {
  //           if (auction) {
  //             let owner = await chainopoly.connect(daniel).ownerOf(spot)
  //             expect(owner).to.eq(highestBidder)
  //           } else this.skip()
  //         })

  //         it("Auction ended", async function () {
  //           if (auction) {
  //             gameOne = await chainopoly.games(c.firstGame)
  //             expect(gameOne.status == c.Status.Playing)
  //             auction = false
  //           } else this.skip()
  //         })
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(daniel.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES (WHEN TIME IS UP)", function () {
  //       it("Daniel should NOT be allowed to roll again if time is up (even if he got doubles)", async function () {
  //         if (doubles) {
  //           await c.increaseTime(86400)
  //           await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NoTimeLeft")
  //         } else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Daniel should be allowed to end her turn", async function () {
  //         await endTurn(daniel, "Daniel")
  //       })
  //     })
  //   })

  //   describe(" ************************* FIFTH TURN (EVE) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Eve should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(eve)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(eve, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(eve)
  //         logDiceRoll("Eve", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(eve)
  //       })

  //       it("Eve should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
  //         else this.skip()
  //       })

  //       it("Eve should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
  //         )
  //           await payRent(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(eve.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(eve)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(eve, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(eve)
  //           logDiceRoll("Eve", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
  //         else this.skip()
  //       })

  //       it("Eve should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
  //         )
  //           await payRent(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(eve.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(eve)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(eve, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(eve)
  //           logDiceRoll("Eve", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
  //         else this.skip()
  //       })

  //       it("Eve should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
  //         )
  //           await payRent(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(eve.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Eve should be allowed to end her turn", async function () {
  //         await endTurn(eve, "Eve")
  //       })
  //     })
  //   })
  // })

  // describe(" *********************************** ROUND 5 *********************************** ", function () {
  //   describe(" ************************* FIRST TURN (ALICE) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Alice should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(alice)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(alice, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(alice)
  //         logDiceRoll("Alice", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(alice)
  //       })

  //       it("Alice should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
  //         else this.skip()
  //       })

  //       it("Alice should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
  //         )
  //           await payRent(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL) {
  //           let pat = await chainopoly.connect(alice).myTotalPatrimony()
  //           expect(pat).to.be.gt(startingTurnBalance)
  //         } else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(alice)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(alice, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(alice)
  //           logDiceRoll("Alice", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
  //         else this.skip()
  //       })

  //       it("Alice should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
  //         )
  //           await payRent(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL) {
  //           let pat = await chainopoly.connect(alice).myTotalPatrimony()
  //           expect(pat).to.be.gt(startingTurnBalance)
  //         } else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(alice)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(alice, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(alice)
  //           logDiceRoll("Alice", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(alice, spot))) await buy(alice)
  //         else this.skip()
  //       })

  //       it("Alice should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(alice).ownerOf(spot)) != alice.address
  //         )
  //           await payRent(alice)
  //         else this.skip()
  //       })

  //       it("Alice should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(alice)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(alice)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(alice)
  //         } else this.skip()
  //       })

  //       it("Alice should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(alice)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL) {
  //           let pat = await chainopoly.connect(alice).myTotalPatrimony()
  //           expect(pat).to.be.gt(startingTurnBalance)
  //         } else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Alice should be allowed to end her turn", async function () {
  //         await endTurn(alice, "Alice")
  //       })
  //     })
  //   })

  //   describe(" ************************* SECOND TURN (BOB) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Bob should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(bob)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(bob, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(bob)
  //         logDiceRoll("Bob", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(bob)
  //       })

  //       it("Bob should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
  //         else this.skip()
  //       })

  //       it("Bob should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
  //         )
  //           await payRent(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(bob)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(bob, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(bob)
  //           logDiceRoll("Bob", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
  //         else this.skip()
  //       })

  //       it("Bob should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
  //         )
  //           await payRent(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(bob)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(bob, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(bob)
  //           logDiceRoll("Bob", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(bob, spot))) await buy(bob)
  //         else this.skip()
  //       })

  //       it("Bob should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(bob).ownerOf(spot)) != bob.address
  //         )
  //           await payRent(bob)
  //         else this.skip()
  //       })

  //       it("Bob should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(bob)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(bob)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(bob)
  //         } else this.skip()
  //       })

  //       it("Bob should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(bob)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(bob.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Bob should be allowed to end her turn", async function () {
  //         await endTurn(bob, "Bob")
  //       })
  //     })
  //   })

  //   describe(" ************************* THIRD TURN (CARLA) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Carla should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(carla)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(carla, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(carla)
  //         logDiceRoll("Carla", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         // this failed when coming out if jail
  //         await checkPostDiceRoll(carla)
  //       })

  //       it("Carla should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
  //         else this.skip()
  //       })

  //       it("Carla should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
  //         )
  //           await payRent(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL) {
  //           let pat = await chainopoly.connect(carla).myTotalPatrimony()
  //           expect(pat).to.be.gt(startingTurnBalance)
  //         } else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(carla)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(carla, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(carla)
  //           logDiceRoll("Carla", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
  //         else this.skip()
  //       })

  //       it("Carla should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
  //         )
  //           await payRent(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL) {
  //           let pat = await chainopoly.connect(carla).myTotalPatrimony()
  //           expect(pat).to.be.gt(startingTurnBalance)
  //         } else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(carla)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(carla, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(carla)
  //           logDiceRoll("Carla", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(carla, spot))) await buy(carla)
  //         else this.skip()
  //       })

  //       it("Carla should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(carla).ownerOf(spot)) != carla.address
  //         )
  //           await payRent(carla)
  //         else this.skip()
  //       })

  //       it("Carla should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(carla)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(carla)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(carla)
  //         } else this.skip()
  //       })

  //       it("Carla should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(carla)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(carla.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Carla should be allowed to end her turn", async function () {
  //         await endTurn(carla, "Carla")
  //       })
  //     })
  //   })

  //   describe(" ************************* FOURTH TURN (DANIEL) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Daniel should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(eve).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(daniel)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(daniel, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(daniel)
  //         logDiceRoll("Daniel", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(daniel)
  //       })

  //       it("Daniel should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(daniel).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(daniel).ownerOf(spot)) != daniel.address
  //         )
  //           await payRent(daniel)
  //         else this.skip()
  //       })

  //       it("Daniel should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(daniel)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(daniel)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(daniel)
  //         } else this.skip()
  //       })

  //       it("Daniel should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(daniel)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       describe("AUCTION", function () {
  //         it("Daniel should be allowed to NOT BUY", async function () {
  //           if (c.isOwnable(spot) && !playerInJail && (await isUnowned(daniel, spot))) await dontBuy(daniel)
  //           else this.skip()
  //         })

  //         it("Daniel should have NOT BOUGHT and AUCTION in place", async function () {
  //           if (c.isOwnable(spot) && !decidedToBuy && (await isUnowned(daniel, spot))) await auctionShouldBeInPlace(daniel)
  //           else this.skip()
  //         })

  //         it("Players should be allowed to bid in auction", async function () {
  //           if (auction) await bid(eve)
  //           else this.skip()
  //         })

  //         it("Update auction details", async function () {
  //           if (auction) await updateAuctionDetails()
  //           else this.skip()
  //         })

  //         it("Players should NOT be allowed to bid when auction has ended and it should finish", async function () {
  //           if (auction) {
  //             await c.increaseTime(86400) // 1 day in seconds = 86400
  //             let price = await chainopoly.connect(alice).priceOf(spot)
  //             await chainopoly.connect(alice).bid(Number(price) + 500)
  //             gameOne = await chainopoly.games(c.firstGame)
  //             expect(gameOne.status == c.Status.Playing)
  //           } else this.skip()
  //         })

  //         it("Highest bidder must own auctioned property after auction", async function () {
  //           if (auction) {
  //             let owner = await chainopoly.connect(daniel).ownerOf(spot)
  //             expect(owner).to.eq(highestBidder)
  //           } else this.skip()
  //         })

  //         it("Auction ended", async function () {
  //           if (auction) {
  //             gameOne = await chainopoly.games(c.firstGame)
  //             expect(gameOne.status == c.Status.Playing)
  //             auction = false
  //           } else this.skip()
  //         })
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(daniel.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES (WHEN TIME IS UP)", function () {
  //       it("Daniel should NOT be allowed to roll again if time is up (even if he got doubles)", async function () {
  //         if (doubles) {
  //           await c.increaseTime(86400)
  //           await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NoTimeLeft")
  //         } else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Daniel should be allowed to end her turn", async function () {
  //         await endTurn(daniel, "Daniel")
  //       })
  //     })
  //   })

  //   describe(" ************************* FIFTH TURN (EVE) ************************* ", function () {
  //     describe("FIRST ROLL", function () {
  //       it("Only Eve should be allowed to roll the dice", async function () {
  //         await expect(chainopoly.connect(alice).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(bob).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(daniel).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(carla).rollAndMove()).to.be.revertedWithCustomError(this.errors, "NotYourTurn")
  //         await expect(chainopoly.connect(nonPlayer).rollAndMove()).to.be.revertedWithCustomError(
  //           this.errors,
  //           "InvalidGameStatus"
  //         )
  //       })

  //       it("Sets up turn ", async function () {
  //         await startingTurnSetup(eve)
  //       })

  //       it("Rolls", async function () {
  //         await rollAndMove(eve, 1)
  //       })

  //       it("Waits for events", async function () {
  //         await waitForEvents()
  //       })

  //       it("Get Dice Rolled event", async function () {
  //         getDiceRolledEvent("doubles")
  //       })

  //       it("Update status after roll", async function () {
  //         await updateStatusAfterRoll(eve)
  //         logDiceRoll("Eve", 1)
  //       })

  //       it("Check post dice roll", async function () {
  //         await checkPostDiceRoll(eve)
  //       })

  //       it("Eve should be allowed to BUY", async function () {
  //         if (c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
  //         else this.skip()
  //       })

  //       it("Eve should have bought", async function () {
  //         if (c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay RENT", async function () {
  //         if (
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
  //         )
  //           await payRent(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay TAXES", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid", async function () {
  //         if (c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be sent to jail if lands on GO TO JAIL spot", async function () {
  //         if (landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them", async function () {
  //         if (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)) await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL)
  //           expect(await chainopoly.balanceOf(eve.address)).to.be.gt(startingTurnBalance)
  //         else this.skip()
  //       })
  //     })

  //     describe("DOUBLES", function () {
  //       it("Sets up turn (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await startingTurnSetup(eve)
  //         } else this.skip()
  //       })

  //       it("Rolls (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await rollAndMove(eve, 2)
  //         } else this.skip()
  //       })

  //       it("Waits for events (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           getDiceRolledEvent("twoDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await updateStatusAfterRoll(eve)
  //           logDiceRoll("Eve", 2)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (DOUBLES)", async function () {
  //         if (doubles && !playerInJail) {
  //           await checkPostDiceRoll(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be allowed to BUY (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
  //         else this.skip()
  //       })

  //       it("Eve should have bought (DOUBLES)", async function () {
  //         if (doubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay RENT (DOUBLES)", async function () {
  //         if (
  //           doubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
  //         )
  //           await payRent(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay TAXES (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (DOUBLES)", async function () {
  //         if (doubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be sent to jail if lands on GO TO JAIL spot (DOUBLES)", async function () {
  //         if (doubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (DOUBLES)", async function () {
  //         if (doubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL) {
  //           let pat = await chainopoly.connect(eve).myTotalPatrimony()
  //           expect(pat).to.be.gt(totalPatrimony)
  //         } else this.skip()
  //       })
  //     })

  //     describe("SECOND TIME DOUBLES", function () {
  //       it("Sets up turn (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await startingTurnSetup(eve)
  //         } else this.skip()
  //       })

  //       it("Rolls (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await rollAndMove(eve, 3)
  //         } else this.skip()
  //       })

  //       it("Waits for events (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await waitForEvents()
  //         } else this.skip()
  //       })

  //       it("Get Dice Rolled event (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           getDiceRolledEvent("threeDoubles")
  //         } else this.skip()
  //       })

  //       it("Update status after roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await updateStatusAfterRoll(eve)
  //           logDiceRoll("Eve", 3)
  //         } else this.skip()
  //       })

  //       it("Check post dice roll (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail) {
  //           await checkPostDiceRoll(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be allowed to BUY (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && (await isUnowned(eve, spot))) await buy(eve)
  //         else this.skip()
  //       })

  //       it("Eve should have bought (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && !playerInJail && c.isOwnable(spot) && decidedToBuy) await checkSuccessfulBuying(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay RENT (SECOND TIME DOUBLES)", async function () {
  //         if (
  //           twoDoubles &&
  //           c.isOwnable(spot) &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != ethers.constants.AddressZero &&
  //           (await chainopoly.connect(eve).ownerOf(spot)) != eve.address
  //         )
  //           await payRent(eve)
  //         else this.skip()
  //       })

  //       it("Eve should pay TAXES (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await payHighGasFees(eve)
  //           else if (spot == c.PROTOCOL_FEE) await payProtocolFee(eve)
  //         } else this.skip()
  //       })

  //       it("TAXES should been paid (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && c.isTax(spot)) {
  //           if (spot == c.HIGH_GAS_FEE) await expectTaxesPaid(eve)
  //         } else this.skip()
  //       })

  //       it("Eve should be sent to jail if lands on GO TO JAIL spot (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && landedSpot == c.GO_TO_JAIL) await playerShouldBeInJail(eve)
  //         else this.skip()
  //       })

  //       it("Cards should work as expected if landed on them (SECOND TIME DOUBLES)", async function () {
  //         if (twoDoubles && (c.isZeroKnowledgeChance(landedSpot) || c.isDefiBootyBag(landedSpot)))
  //           await checkCards(landedSpot, events)
  //         else this.skip()
  //       })

  //       it("Bank should pay if player lands on or beyond Genesis Block (SECOND TIME DOUBLES)", async function () {
  //         if (Number(spot) < Number(startingTurnSpot) && !playerInJail && landedSpot != c.GO_TO_JAIL) {
  //           let pat = await chainopoly.connect(eve).myTotalPatrimony()
  //           expect(pat).to.be.gt(totalPatrimony)
  //         } else this.skip()
  //       })
  //     })

  //     describe("ENDING TURN", function () {
  //       it("Eve should be allowed to end her turn", async function () {
  //         await endTurn(eve, "Eve")
  //       })
  //     })
  //   })
  // })

  describe("LOGS", function () {
    it("LOGS", async function () {
      await logBalancesAndProperties()
    })
  })
})

