import { useContract, useContractRead, useAddress } from '@thirdweb-dev/react'
import { contracts } from '../../blockchain/post-deployment/addresses'
import { abi } from '../../blockchain/artifacts/contracts/ChainopolyCenter.sol/ChainopolyCenter.json'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { toUtf8Bytes } from '@ethersproject/strings'
import { useToast } from '@chakra-ui/react'

/* **************************************************** */
/*                     ETHERS SETUP                     */
/* **************************************************** */
const provider = new ethers.providers.JsonRpcProvider()
const e_chainopolyCenter = new ethers.Contract(contracts.ChainopolyCenter, abi, provider)
const signer = provider.getSigner()

const player = useAddress()
const { contract: chainopolyCenter } = useContract(contracts.ChainopolyCenter, abi)

/* **************************************************** */
/*                        EVENTS                        */
/* **************************************************** */
let events: any = []
const [lastDiceRoll, setLastDiceRoll] = useState(0)
const [landlord, setLandlord] = useState('')
const [rentPaid, setRentPaid] = useState(0)
const [newPosition, setNewPosition] = useState(0)
const [doubles, setDoubles] = useState(false)
const [playerEnding, setPlayerEnding] = useState('')
const [transferAmount, setTransferAmount] = useState(0)
const [from, setFrom] = useState('')
const [to, setTo] = useState('')
const [nextPlayer, setNextPlayer] = useState('')

const toast = useToast()

let lastEventIndex = 0

export default async function getEvents(): Promise<void> {
  const amountOfEventsBeforeAction = events.length
  events = await chainopolyCenter?.events.getAllEvents({ order: 'asc' })
  const newEvents = events.length - amountOfEventsBeforeAction
  if (events.length - 1 > lastEventIndex) {
    decodeEvents(amountOfEventsBeforeAction, events.length - amountOfEventsBeforeAction)
    lastEventIndex = events.length - 1
  }
}

async function decodeEvents(eventsBefore: number, amountOfEvents: number) {
  const hash = ethers.utils.keccak256
  const DiceRolled = hash(toUtf8Bytes('DiceRolled(uint256,bool)'))
  const PlayerMoved = hash(toUtf8Bytes('PlayerMoved(address,uint256)'))
  const PlayerHasToDecideToBuyOrNot = hash(toUtf8Bytes('PlayerHasToDecideToBuyOrNot(address,uint256,string)'))
  const AuctionStarted = hash(toUtf8Bytes('AuctionStarted(uint256,uint256)'))
  const AuctionWon = hash(toUtf8Bytes('AuctionWon(address,uint256,uint256)'))
  const IncomeTaxPaid = hash(toUtf8Bytes('IncomeTaxPaid(address,uint256)'))
  const LuxuryTaxPaid = hash(toUtf8Bytes('LuxuryTaxPaid(address,uint256)'))
  const Transfer = hash(toUtf8Bytes('Transfer(address,address,uint256)'))
  const RentPaid = hash(toUtf8Bytes('RentPaid(address,address,uint256)'))
  const TurnEnded = hash(toUtf8Bytes('TurnEnded(address,address)'))
  const DefiBootyBagCardDrawn = hash(toUtf8Bytes('DefiBootyBagCardDrawn(address,uint256)'))
  const PlayerUsedBlocktrain = hash(toUtf8Bytes('PlayerUsedBlocktrain(address,uint256,uint256)'))
  const PlayerSentToJail = hash(toUtf8Bytes('PlayerSentToJail(address)'))
  const RolledOutOfJail = hash(toUtf8Bytes('RolledOutOfJail(address)'))
  const GetOutOfJailCardUsed = hash(toUtf8Bytes('GetOutOfJailCardUsed(address)'))
  const OfferMade = hash(toUtf8Bytes('OfferMade(address,address,uint256)'))
  const OfferCancelled = hash(toUtf8Bytes('OfferCancelled(uint256)'))
  const OfferRejected = hash(toUtf8Bytes('OfferRejected(uint256)'))
  const OfferAccepted = hash(toUtf8Bytes('OfferAccepted(uint256)'))
  const ZeroKnowledgeChanceCardDrawn = hash(toUtf8Bytes('ZeroKnowledgeChanceCardDrawn(address,uint256)'))
  const PropertyBought = hash(toUtf8Bytes('PropertyBought(address,uint256,string,uint256)'))
  const PropertySold = hash(toUtf8Bytes('PropertySold(address,uint256,uint256)'))

  for (let i = eventsBefore; i < amountOfEvents; i++) {
    if (events[i].transaction.topics[0] == DiceRolled) {
      const numberRolled = events[i].transaction.topics[1]
      const doubles = events[i].transaction.topics[2]
      setLastDiceRoll(Number(numberRolled))
      setDoubles(Boolean(doubles))
    } else if (events[i].transaction.topics[0] == PlayerMoved) {
      const player = events[i].transaction.topics[1]
      const newPosition = events[i].transaction.topics[2]
      if (player == signer.getAddress()) setNewPosition(Number(newPosition))
    } else if (events[i].transaction.topics[0] == PlayerHasToDecideToBuyOrNot) {
      const player = events[i].transaction.topics[1]
      const property = events[i].transaction.topics[2]
      const propertyName = events[i].transaction.topics[3]
    } else if (events[i].transaction.topics[0] == AuctionStarted) {
      const property = events[i].transaction.topics[1]
      const initialPrice = events[i].transaction.topics[2]
    } else if (events[i].transaction.topics[0] == AuctionWon) {
      const winner = events[i].transaction.topics[1]
      const property = events[i].transaction.topics[2]
      const highestBid = events[i].transaction.topics[3]
    } else if (events[i].transaction.topics[0] == RentPaid) {
      const player = decodeAddress(events[i].transaction.topics[1])
      const landlord = decodeAddress(events[i].transaction.topics[2])
      const rent = Number(events[i].transaction.topics[3])

      setRentPaid(rent)
      setLandlord(landlord)

      if (player == (await signer.getAddress()) || landlord == (await signer.getAddress())) {
        toast({
          title: 'Rent Paid',
          description: `${sliceAddress(player)} paid $${rent} in rent to ${sliceAddress(landlord)}`,
          status: 'success',
          duration: 1000,
          isClosable: true,
        })
      }
    } else if (events[i].transaction.topics[0] == PropertyBought) {
      const buyer = events[i].transaction.topics[1]
      const property = events[i].transaction.topics[2]
      const propertyName = events[i].transaction.topics[3]
      const pricePaid = events[i].transaction.topics[4]
    } else if (events[i].transaction.topics[0] == TurnEnded) {
      const playerEnding = decodeAddress(events[i].transaction.topics[1])
      const nextPlayer = decodeAddress(events[i].transaction.topics[2])

      setPlayerEnding(playerEnding)
      setNextPlayer(nextPlayer)
      const ending = 'ending'
      if (!toast.isActive(ending)) {
        toast({
          title: 'Turn ended',
          description: `${sliceAddress(playerEnding)} passes turn to ${sliceAddress(nextPlayer)}`,
          status: 'success',
          duration: 1000,
          isClosable: true,
          id: 'ending',
        })
      }
    } else if (events[i].transaction.topics[0] == Transfer) {
      setFrom(decodeAddress(events[i].transaction.topics[1]))
      setTo(decodeAddress(events[i].transaction.topics[2]))
      setTransferAmount(Number(events[i].transaction.topics[3]))
      const transfer = 'transfer'
      if (!toast.isActive(transfer)) {
        toast({
          title: 'Transfer',
          description: `${sliceAddress(from)} transferred $${transferAmount} to ${sliceAddress(to)}`,
          status: 'success',
          duration: 1000,
          id: 'transfer',
          isClosable: true,
        })
      }
    }
  }
}

function sliceAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

function decodeAddress(address: string): string {
  return '0x' + address.slice(26)
}

// /* **************************************************** */
// /*                      USE EFFECT                      */
// /* **************************************************** */
// useEffect(() => {
//   const interval = setInterval(() => {
//     if (events.length - 1 > lastEventIndex) getEvents()
//   }, 500)
//   return () => clearInterval(interval)
// }, [player, mins, secs])
