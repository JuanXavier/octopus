import { Flex, Divider, Text, Stack, SimpleGrid, Box, Table, Tbody, Tr, Td, Badge } from '@chakra-ui/react'
import { useContract, useContractRead, useAddress } from '@thirdweb-dev/react'
import { contracts } from '../../blockchain/post-deployment/addresses'

import { abi } from '../../blockchain/out/ChainopolyCenter.sol/ChainopolyCenter.json'

import { useState, useEffect } from 'react'
import Auction from './Auction'
import { ethers } from 'ethers'
import { toUtf8Bytes } from '@ethersproject/strings'
import { useToast } from '@chakra-ui/react'

export default function GameData(props: any) {
  /* **************************************************** */
  /*                     ETHERS SETUP                     */
  /* **************************************************** */
  const provider = new ethers.providers.JsonRpcProvider()
  const e_chainopolyCenter = new ethers.Contract(contracts.ChainopolyCenter, abi, provider)
  const signer = provider.getSigner()

  /* **************************************************** */
  /*                    THIRD WEB SETUP                    */
  /* **************************************************** */
  const player = useAddress()
  const { contract: chainopolyCenter } = useContract(contracts.ChainopolyCenter, abi)
  let { data: playerGameID, isLoading: loadingID } = useContractRead(chainopolyCenter, 'getPlayerGameID', [player])

  /* ****************************************************** */
  /*                    HELPER FUNCTIONS                    */
  /* ****************************************************** */

  function sliceAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }
  function decodeAddress(address: string): string {
    return '0x' + address.slice(26)
  }
  async function whoseTurnIsIt(): Promise<void> {
    try {
      const [playerInTurn, mins, secs] = await e_chainopolyCenter.connect(signer).whoseTurnIsIt()
      props.setPlayerInTurn(playerInTurn)
      setPlayerInTurn(playerInTurn)
      setMins(Number(mins))
      setSecs(Number(secs))
      setPlayerInTurnUsername(await getUsername(playerInTurn))
    } catch (error) {
      setPlayerInTurn(ethers.constants.AddressZero)
    }
  }

  async function getHousesAndHotelsLeft(): Promise<{ houses: number; hotels: number }> {
    if (chainopolyCenter && playerGameID > 0 && !loadingID) {
      const [houses, hotels] = await chainopolyCenter.call('housesAndHotelsLeft')
      setHousesAndHotelsLeft({ houses, hotels })
      return { houses, hotels }
    } else return { houses: 0, hotels: 0 }
  }

  async function getStablecoinStationCash(): Promise<number> {
    if (props.playerGameID > 0) {
      const cash = await e_chainopolyCenter.connect(signer).cashInFreeStablecoinStation()
      setCashInStablecoinStation(cash)
      return cash
    }
    return 0
  }

  async function getUsername(player: any): Promise<string> {
    let username = await e_chainopolyCenter.connect(signer).getUsername(player)
    return username
  }

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

  async function getEvents(): Promise<void> {
    const amountOfEventsBeforeAction = events.length
    events = await chainopolyCenter?.events.getAllEvents({ order: 'asc' })
    if (events.length - 1 > lastEventIndex) {
      decodeEvents(amountOfEventsBeforeAction, events.length - amountOfEventsBeforeAction)
      lastEventIndex = events.length - 1
    }
  }

  function decodeEvents(eventsBefore: number, amountOfEvents: number) {
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
        if (player == props.signer.getAddress()) setNewPosition(Number(newPosition))
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

        if (player == props.signer.getAddress() || landlord == props.signer.getAddress()) {
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

  /* **************************************************** */
  /*                      REACT STATE                     */
  /* **************************************************** */

  const [playerInTurnUsername, setPlayerInTurnUsername] = useState('')
  const [playerInTurn, setPlayerInTurn] = useState('')
  const [secs, setSecs] = useState(0)
  const [mins, setMins] = useState(0)
  const [playerToQuery, setPlayerToQuery] = useState('')
  const [cashInStablecoinStation, setCashInStablecoinStation] = useState(0)
  const [housesAndHotelsLeft, setHousesAndHotelsLeft] = useState({ houses: 0, hotels: 0 })

  /* **************************************************** */
  /*                      USE EFFECT                      */
  /* **************************************************** */
  useEffect(() => {
    const interval = setInterval(() => {
      getHousesAndHotelsLeft()
      getStablecoinStationCash()
      whoseTurnIsIt()
      if (events.length - 1 > lastEventIndex) getEvents()
    }, 500)
    return () => clearInterval(interval)
  }, [player, mins, secs])

  /* ****************************************************** */
  /*                         RETURN                         */
  /* ****************************************************** */
  return (
    <Flex fontSize={'2xl'} alignContent={'center'} p={4} border={'1px'}>
      <Stack align={'center'}>
        {/* GAME STATUS */}
        <Text fontSize="2xl" align={'center'}>{`Game #${props.playerGameID}`}</Text>
        <Divider />
        <Badge fontSize="2xl" colorScheme="purple">
          {props.gameStatus}
        </Badge>
        {/* GAME VARIANTS */}
        <Box>
          {sliceAddress(from)}
          {sliceAddress(to)}
          {Number(playerGameID) > 0 && (
            <SimpleGrid columns={1}>
              {Object.entries(props.variants).map(([variant, isActive]) =>
                isActive ? (
                  <Badge m={1} colorScheme="green" key={variant}>
                    {variant}
                  </Badge>
                ) : (
                  <Badge m={1} colorScheme="red" key={variant}>
                    {variant}
                  </Badge>
                )
              )}
            </SimpleGrid>
          )}
        </Box>
        <Table variant="striped" fontSize={'xs'}>
          <Tbody>
            <Tr>
              <Td>Current turn: </Td>
              <Td>
                {playerInTurn == player
                  ? `Your turn!`
                  : playerInTurnUsername == ''
                  ? `It's ${sliceAddress(playerInTurn)}'s turn`
                  : `It's ${playerInTurnUsername}'s turn`}
              </Td>
            </Tr>

            <Tr>
              <Td>Time left for current turn: </Td>
              <Td fontWeight={'bold'}>
                {mins == 0 && secs == 0 ? `No time left` : secs > 9 ? `${mins} : ${secs}` : `${mins} : 0${secs}`}
              </Td>
            </Tr>
            {props.joinedPlayers.length > 0 ? (
              <Tr>
                <Td>Joined players: </Td>
                <Td>
                  {props.joinedPlayers.map((player: any, index: number) => (
                    <div key={index}>
                      {index + 1}. {sliceAddress(player)}
                    </div>
                  ))}
                </Td>
              </Tr>
            ) : (
              <></>
            )}

            <Tr>
              <Td>Rounds: </Td>
              <Td>{props.currentRounds}</Td>
            </Tr>

            <Tr>
              <Td>Dice rolled: </Td>
              <Td>{String(props.diceRolledThisTurn)}</Td>
            </Tr>
            <Tr>
              <Td>Doubles count: </Td>
              <Td>{props.doublesCount}</Td>
            </Tr>

            <Tr>
              <Td>Cash in Stablecoin Station</Td>
              <Td> ${Number(cashInStablecoinStation)}</Td>
            </Tr>

            <Tr>
              <Td>Houses: </Td>
              <Td>{Number(housesAndHotelsLeft.houses)}</Td>
            </Tr>

            <Tr>
              <Td>Hotels: </Td>
              <Td>{Number(housesAndHotelsLeft.hotels)}</Td>
            </Tr>

            <Tr>
              <Td>Player near bankruptcy</Td>
              <Td>{sliceAddress(props.playerNearBankruptcy)}</Td>
            </Tr>

            <Tr>
              <Td>Time per turn: </Td>
              <Td>{props.timePerTurn / 60} minutes</Td>
            </Tr>

            <Tr>
              <Td>Blocktrain fee: </Td>
              <Td>${props.blocktrainFee}</Td>
            </Tr>
            <Tr>
              <Td>Minimum rounds: </Td>
              <Td>{props.minimumRounds}</Td>
            </Tr>
          </Tbody>
        </Table>
        {props.gameStatus == 'Auctioning' ? <Auction gameStatus={props.gameStatus} /> : <></>}
      </Stack>
    </Flex>
  )
}
