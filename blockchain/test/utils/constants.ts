import { ethers } from "hardhat"

export const firstGame = 1
export const INITIAL_AMOUNT = 1500
export const HG_FEE = 200
export const GENESIS_BONUS = 200
export const P_FEE = 75

export const HIGH_GAS_FEE = 4
export const PROTOCOL_FEE = 38

export const GENESIS_BLOCK = 0
export const JAIL = 10
export const FREE_STABLECOIN_STATION = 20
export const GO_TO_JAIL = 30

export const REMIX_BLOCKTRAIN = 5
export const UNISWAP_SQUARE = 11
export const POLYGON_PLAZA = 24
export const BITCOIN_MYSTIC_LANE = 39

export const numberOfPlayers = 5
export const minimumRounds = 5
export const minutesPerTurn = 60
export const minutesPerAuction = 5
export const poorStart = false
export const staggeredStart = false
export const blocktrainTravel = true
export const blocktrainTravelFee = 50
export const noEasyMonopolies = false
export const firstInBankruptcyWins = false
export const getFreeParkingMoney = false
export const playersGetAuctionMoney = false

export enum Status {
  Inactive,
  WaitingToJoin,
  ReadyToStart,
  Playing, //2
  Auctioning,
  PlayerIsNearBankruptcy,
  PlayerHasToDecide, // 5
  PlayerHasToPayIncomeTax, // 6
  Finished,
}

/* ---------------------- FUNCTIONS --------------------- */

export const increaseTime = async (time: number): Promise<void> => {
  await ethers.provider.send("evm_increaseTime", [time])
  await ethers.provider.send("evm_mine", [])
}

export const isTax = function (spot: number): boolean {
  if (spot == 4 || spot == 38) return true
  else return false
}

export function isZeroKnowledgeChance(spot: number): boolean {
  return spot == 7 || spot == 22 || spot == 36
}

export function isDefiBootyBag(spot: number): boolean {
  return spot == 2 || spot == 17 || spot == 33
}

export function isCard(spot: number): boolean {
  return spot == 2 || spot == 17 || spot == 33 || spot == 7 || spot == 22 || spot == 36
}

export function isUtility(spot: number): boolean {
  return spot == 12 || spot == 28
}

export function isBlocktrain(spot: number): boolean {
  return spot == 5 || spot == 15 || spot == 25 || spot == 35
}

export function isOwnable(spot: number): boolean {
  return (
    spot > 0 &&
    spot < 40 &&
    spot != 0 &&
    spot != 2 &&
    spot != 4 &&
    spot != 7 &&
    spot != 10 &&
    spot != 17 &&
    spot != 20 &&
    spot != 22 &&
    spot != 30 &&
    spot != 33 &&
    spot != 36 &&
    spot != 38
  )
}
