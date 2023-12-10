import { ethers } from "hardhat"
import * as fs from "fs"
import { execSync } from "child_process"
import dotenv from "dotenv"
import "../constants/tokens.json"
import { chainlinkAggregators } from "../constants/chainlinkAggregators.json"
import { airnode } from "../constants/airnode.json"
import { ccip } from "../constants/ccip.json"

let contractAddresses = {
  converter: "",
  sponsorWallet: "",
  chainopolyBoard: "",
  chainopolyErrors: "",
  chainopolyEvents: "",
  chainopolyAuction: "",
  chainopolyCore: "",
  chainopolySwaps: "",
  chainopolyCards: "",
  chainopolyHelpers: "",
  chainopoly: "",
  ticketCenter: "",
  octopusFactory: "",
  octopusTicketCenter: "",
}

/* ****************************************************** */
/*                          MAIN                          */
/* ****************************************************** */

async function main() {
  // await deployConverter()
  // await deployChainopoly()
  // await deployOctopusTicketCenterFactory()
  await deployOctopusTicketCenter()
  logAndExportAddresses()
}

/* ***************************************************** */
/*                        HELPERS                        */
/* ***************************************************** */
function logAndExportAddresses() {
  console.log(contractAddresses)
  const addresses = `export const contracts = ${JSON.stringify(contractAddresses, null, 2)};\n`
  fs.writeFileSync("./constants/post-deployment/sepolia_addresses.js", addresses)
}

function extractAddress(sentence: string): any {
  const addressStartIndex = sentence.indexOf("0x")
  if (addressStartIndex !== -1) return sentence.slice(addressStartIndex, addressStartIndex + 42)
  return null
}

const wait = (seconds: any) => {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000)
  })
}

async function verifyWithoutConstructor(address: any) {
  try {
    await wait(20)
    const verifyCommand = `npx hardhat verify --network mumbai ${address}`
    execSync(verifyCommand, { encoding: "utf-8" })
  } catch (error: any) {
    console.error(error.message)
  }
}

async function transferETH(recipient: any) {
  let privateKey: any = process.env.PRIVATE_KEY
  const provider = new ethers.providers.JsonRpcProvider(process.env.MUMBAI_RPC)
  let sender = new ethers.Wallet(privateKey, provider)
  const tx = await sender.sendTransaction({
    to: recipient,
    value: ethers.utils.parseEther("0.01"),
  })
  await tx.wait()
}
/* ****************************************************** */
/*                      1. CONVERTER                      */
/* ****************************************************** */
async function deployConverter() {
  const FixedPointMath = await ethers.getContractFactory("FixedPointMath")
  const fixedPointMath = await (await FixedPointMath.deploy()).deployed()
  verifyWithoutConstructor(fixedPointMath.address)

  const Converter = await ethers.getContractFactory("TestnetOctopusConverter", {
    libraries: { FixedPointMath: fixedPointMath.address },
  })
  const converter = await (
    await Converter.deploy(
      chainlinkAggregators.mumbai.ETH_USD,
      chainlinkAggregators.mumbai.BTC_USD,
      chainlinkAggregators.mumbai.DAI_USD,
      chainlinkAggregators.mumbai.USDC_USD,
      chainlinkAggregators.mumbai.LINK_USD
    )
  ).deployed()

  try {
    await wait(20)
    const verifyConverter = `npx hardhat verify --network mumbai ${converter.address} ${chainlinkAggregators.mumbai.ETH_USD} ${chainlinkAggregators.mumbai.BTC_USD} ${chainlinkAggregators.mumbai.DAI_USD} ${chainlinkAggregators.mumbai.USDC_USD} ${chainlinkAggregators.mumbai.LINK_USD}`
    execSync(verifyConverter, { encoding: "utf-8" })
  } catch (error: any) {
    console.error(error.message)
  }

  contractAddresses = { ...contractAddresses, converter: converter.address }
}

/* ****************************************************** */
/*                      2. CHAINOPOLY                     */
/* ****************************************************** */

async function deployChainopoly() {
  /* ----------------------- BOARD ---------------------- */
  const Board = await ethers.getContractFactory("ChainopolyBoard")
  const board = await (await Board.deploy()).deployed()
  await verifyWithoutConstructor(board.address)

  /* ---------------------- ERRORS ---------------------- */
  const Errors = await ethers.getContractFactory("ChainopolyErrors")
  const errors = await (await Errors.deploy()).deployed()
  await verifyWithoutConstructor(errors.address)

  /* ---------------------- EVENTS ---------------------- */
  const Events = await ethers.getContractFactory("ChainopolyEvents")
  const events = await (await Events.deploy()).deployed()
  await verifyWithoutConstructor(events.address)

  /* ----------------------- AUCTION ---------------------- */
  const ChainopolyAuction = await ethers.getContractFactory("ChainopolyAuction")
  const chainopolyAuction = await (await ChainopolyAuction.deploy()).deployed()
  await verifyWithoutConstructor(events.address)

  /* ------------------------ CORE ------------------------ */
  const ChainopolyCore = await ethers.getContractFactory("ChainopolyCore", {
    libraries: { ChainopolyAuction: chainopolyAuction.address },
  })
  const core = await (await ChainopolyCore.deploy()).deployed()
  await verifyWithoutConstructor(core.address)

  /* ----------------------- SWAPS ----------------------- */
  const ChainopolySwaps = await ethers.getContractFactory("ChainopolySwaps", {
    libraries: { ChainopolyCore: core.address },
  })
  const swaps = await (await ChainopolySwaps.deploy()).deployed()
  await verifyWithoutConstructor(swaps.address)

  /* ----------------------- CARDS ---------------------- */
  const ChainopolyCards = await ethers.getContractFactory("ChainopolyCards", {
    libraries: {
      ChainopolyCore: core.address,
      ChainopolyAuction: chainopolyAuction.address,
    },
  })
  const cards = await (await ChainopolyCards.deploy()).deployed()
  await verifyWithoutConstructor(cards.address)

  /* --------------------- HELPERS --------------------- */
  const ChainopolyHelpers = await ethers.getContractFactory("ChainopolyHelpers", {
    libraries: {
      ChainopolyCore: core.address,
      ChainopolyCards: core.address,
      ChainopolyAuction: chainopolyAuction.address,
    },
  })
  const helpers = await (await ChainopolyHelpers.deploy()).deployed()
  await verifyWithoutConstructor(helpers.address)

  /* -------------------- CHAINOPOLY -------------------- */
  const Chainopoly = await ethers.getContractFactory("Chainopoly", {
    libraries: {
      ChainopolyCore: core.address,
      ChainopolyHelpers: helpers.address,
      ChainopolySwaps: swaps.address,
      ChainopolyCards: cards.address,
      ChainopolyAuction: chainopolyAuction.address,
    },
  })
  const chainopoly = await (await Chainopoly.deploy(airnode.RrpV0.mumbai)).deployed()

  /* --------------- DERIVE SPONSOR WALLET -------------- */
  try {
    const command = `npx @api3/airnode-admin derive-sponsor-wallet-address --airnode-xpub ${airnode.xpub} --airnode-address ${airnode.testnetAirnode} --sponsor-address ${chainopoly.address}`
    const result: any = execSync(command, { encoding: "utf-8" })
    const sponsorWallet = await extractAddress(result)
    await chainopoly.setAirnodeParams(sponsorWallet, airnode.testnetAirnode, airnode.endpointIdUint256)
    await transferETH(sponsorWallet)
    contractAddresses = { ...contractAddresses, sponsorWallet: sponsorWallet }
  } catch (error: any) {
    console.error(error.message)
  }

  /* ------------------ STORE ADDRESSES ----------------- */
  contractAddresses = {
    ...contractAddresses,
    chainopolyBoard: board.address,
    chainopolyErrors: errors.address,
    chainopolyEvents: events.address,
    chainopolyCore: core.address,
    chainopolySwaps: swaps.address,
    chainopolyCards: cards.address,
    chainopolyHelpers: helpers.address,
    chainopoly: chainopoly.address,
  }

  await chainopoly.setGameConfig(contractAddresses.chainopolyBoard, 0, 0, 10, 2, 10, 24)
}

/* ****************************************************** */
/*            3. OCTOPUS TICKET CENTER FACTORY             */
/* ****************************************************** */
async function deployOctopusTicketCenterFactory() {
  const saltString = "OctopusProtocol_v0.1"
  const salt = "0x4f63746f70757350726f746f636f6c5f76302e31000000000000000000000000"
  const OctopusFactory = await ethers.getContractFactory("OctopusTicketCenterFactory")
  const octopusFactory = await (await OctopusFactory.deploy()).deployed()
  await verifyWithoutConstructor(octopusFactory.address)
  await octopusFactory.deploy(salt)
  contractAddresses = { ...contractAddresses, octopusFactory: octopusFactory.address }
  // const octopusTicketCenter = await octopusFactory.deployedContracts(0)
  // await verifyWithoutConstructor(octopusTicketCenter)
}

/* ****************************************************** */
/*            3.1 OCTOPUS TICKET CENTER              */
/* ****************************************************** */

async function deployOctopusTicketCenter() {
  const OctopusTicketCenter = await ethers.getContractFactory("OctopusTicketCenter")
  const ticketCenter = await (await OctopusTicketCenter.deploy()).deployed()
  await verifyWithoutConstructor(ticketCenter.address)
  contractAddresses = { ...contractAddresses, octopusTicketCenter: ticketCenter.address }
  await ticketCenter.setCcipParams(ccip.router.sepolia, ccip.feeTokens.sepolia.link)
  await ticketCenter.allowlistSourceChain(ccip.chainSelector.mumbai, true)
  // await ticketCenter.allowlistSender(contracts.octopusTicketCenter, true)
  await transferETH(ticketCenter.address)
  // transfer the TOKENS TO THE TICKET CENTER ON MUMBAI
}
/* ****************************************************** */
/*                          MAIN                          */
/* ****************************************************** */
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
