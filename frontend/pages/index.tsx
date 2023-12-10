import type { NextPage } from 'next'
import { Container, SimpleGrid, Stack } from '@chakra-ui/react'
import { useContract, useContractRead, useAddress, useSigner } from '@thirdweb-dev/react'
import { abi } from '../../blockchain/out/ChainopolyCenter.sol/ChainopolyCenter.json'
import { contracts } from '../../blockchain/post-deployment/addresses'
import { ethers } from 'ethers'
import { useState, useEffect } from 'react'
import Buttons from '../components/Buttons'
import Getters from '../components/buttons/Getters'
import PlayerData from '../components/PlayerData'
import GameData from '../components/GameData'
import Offers from '../components/Offers'
import { toUtf8Bytes } from '@ethersproject/strings'
import { useToast } from '@chakra-ui/react'

const Home: NextPage = () => {
  function sliceAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }
  function decodeAddress(address: string): string {
    return '0x' + address.slice(26)
  }

  async function getPropertyName(property: number): Promise<string> {
    /**
     *       string memory name,
      uint256 price,
      uint256 rent,
      uint256 pricePerHouse,
      uint256 rentOneHouse,
      uint256 rentTwoHouses,
      uint256 rentThreeHouses,
      uint256 rentFourHouses,
      uint256 rentHotel
     */
    const [name, , , , , , , ,] = await chainopolyCenter?.call('propertyCard', [property])
    return name
  }
  const player = useAddress()
  const { contract: chainopolyCenter } = useContract(contracts.ChainopolyCenter, abi)
  let { data: playerGameID, isLoading: loadingID } = useContractRead(chainopolyCenter, 'getPlayerGameID', [player])

  const provider = new ethers.providers.JsonRpcProvider()
  const e_chainopolyCenter = new ethers.Contract(contracts.ChainopolyCenter, abi, provider)
  let signer: any = useSigner()

  async function getPlayerGameID(): Promise<void> {
    return await e_chainopolyCenter.connect(signer).getPlayerGameID(signer.getAddress())
  }
  /* ****************************************************** */
  /*                       REACT STATE                      */
  /* ****************************************************** */
  const [currentRounds, setCurrentRounds] = useState(0)
  const [timePerTurn, setTimePerTurn] = useState(0)
  const [numberOfPlayers, setNumberOfPlayers] = useState(0)
  const [blocktrainFee, setBlocktrainFee] = useState(0)
  const [minimumRounds, setMinimumRounds] = useState(0)
  const [doublesCount, setDoublesCount] = useState(0)
  const [diceRolledThisTurn, setDiceRolledThisTurn] = useState(false)
  const [playerNearBankruptcy, setPlayerNearBankruptcy] = useState(ethers.constants.AddressZero)
  const [gameStatus, setGameStatus] = useState('')
  const [winner, setWinner] = useState('')
  const [playerInTurn, setPlayerInTurn] = useState('')
  const [username, setUsername] = useState('')
  const [joinedPlayers, setJoinedPlayers] = useState([])

  const [variants, setVariants] = useState({
    poorStart: false,
    staggeredStart: false,
    blocktrainTravel: false,
    noEasyMonopolies: false,
    firstInBankruptcyWins: false,
    getStablecoinStationMoney: false,
    getAuctionMoney: false,
  })

  /* ------------------------------------------------------ */

  const [lastDiceRoll, setLastDiceRoll] = useState(0)
  const [doubles, setDoubles] = useState(0)
  const [landlord, setLandlord] = useState('')
  const [rentPaid, setRentPaid] = useState(0)
  const [newPosition, setNewPosition] = useState(0)
  const [playerEnding, setPlayerEnding] = useState('')
  const [transferAmount, setTransferAmount] = useState(0)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [nextPlayer, setNextPlayer] = useState('')

  const toast = useToast()

  async function getEvents(receipt: any): Promise<void> {
    await decodeEvents(receipt)
  }

  async function decodeEvents(receipt: any) {
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

    const events = receipt.events
    const amountOfEvents = receipt.events.length

    for (let i = 0; i < amountOfEvents; i++) {
      console.log('loop')
      if (events[i].topics[0] == DiceRolled) {
        const numberRolled = Number(events[i].topics[1])
        const doubles = Number(events[i].topics[2])
        setLastDiceRoll(numberRolled)
        setDoubles(doubles)
        console.log('Rolled', numberRolled, Boolean(doubles))
      } else if (events[i].topics[0] == PlayerMoved) {
        const player = decodeAddress(events[i].topics[1])
        const newPosition = Number(events[i].topics[2])

        if (player == signer.getAddress()) {
          setNewPosition(newPosition)

          toast({
            title: 'Player moved!',
            description: `${sliceAddress(player)} moved to ${newPosition}`,
            status: 'success',
            duration: 5000,
            isClosable: true,
            id: 'moved',
          })
        }
      } else if (events[i].topics[0] == PlayerHasToDecideToBuyOrNot) {
        const player = events[i].topics[1]
        const property = events[i].topics[2]
        const propertyName = events[i].topics[3]
      } else if (events[i].topics[0] == AuctionStarted) {
        const property = events[i].topics[1]
        const initialPrice = events[i].topics[2]
      } else if (events[i].topics[0] == AuctionWon) {
        const winner = events[i].topics[1]
        const property = events[i].topics[2]
        const highestBid = events[i].topics[3]
      } else if (events[i].topics[0] == RentPaid) {
        const player = decodeAddress(events[i].topics[1])
        const landlord = decodeAddress(events[i].topics[2])
        const rent = Number(events[i].topics[3])
        setRentPaid(rent)
        setLandlord(landlord)
        if (player == signer.getAddress() || landlord == signer.getAddress()) {
          toast({
            title: 'Rent Paid',
            description: `${sliceAddress(player)} paid $${rent} in rent to ${sliceAddress(landlord)}`,
            status: 'success',
            duration: 5000,

            isClosable: true,
          })
        }
      } else if (events[i].topics[0] == PropertyBought) {
        const buyer = decodeAddress(events[i].topics[1])
        const pricePaid = Number(events[i].topics[3])
        const property = Number(events[i].topics[2])
        toast({
          title: 'Property Bought',
          description: `${sliceAddress(buyer)} paid $${pricePaid} to buy ${await getPropertyName(
            property
          )} (${property})`,
          status: 'success',
          duration: 5000,

          isClosable: true,
        })
      } else if (events[i].topics[0] == TurnEnded) {
        const playerEnding = decodeAddress(events[i].topics[1])
        const nextPlayer = decodeAddress(events[i].topics[2])
        setPlayerEnding(playerEnding)
        setNextPlayer(nextPlayer)
        const ending = 'ending'
        if (!toast.isActive(ending)) {
          toast({
            title: 'Turn ended',
            description: `${sliceAddress(playerEnding)} passes turn to ${sliceAddress(nextPlayer)}`,
            status: 'success',
            duration: 100000,
            isClosable: true,
            id: 'ending',
          })
        }
      } else if (events[i].topics[0] == Transfer) {
        setFrom(decodeAddress(events[i].topics[1]))
        setTo(decodeAddress(events[i].topics[2]))
        setTransferAmount(Number(events[i].topics[3]))
        const transfer = 'transfer'
        if (!toast.isActive(transfer)) {
          toast({
            title: 'Transfer',
            description: `${sliceAddress(from)} transferred $${transferAmount} to ${sliceAddress(to)}`,
            status: 'success',
            duration: 5000,
            id: 'transfer',
            isClosable: true,
          })
        }
      }
    }
  }

  //
  /* ------------------------------------------------------ */

  async function getGameDetails() {
    const [
      gameVariants,
      status,
      initialNumberOfPlayers,
      joinedPlayers,
      timePerTurn,
      blocktrainTravelFee,
      minimumRounds,
      currentNumberOfRounds,
      doublesCount,
      diceRolledThisTurn,
      _playerNearBankruptcy,
      winner,
    ] = await e_chainopolyCenter.connect(signer).allGameDetails(playerGameID)

    setVariants({
      poorStart: Boolean(gameVariants.poorStart),
      staggeredStart: Boolean(gameVariants.staggeredStart),
      blocktrainTravel: Boolean(gameVariants.blocktrainTravel),
      noEasyMonopolies: Boolean(gameVariants.noEasyMonopolies),
      firstInBankruptcyWins: Boolean(gameVariants.firstInBankruptcyWins),
      getStablecoinStationMoney: Boolean(gameVariants.getStablecoinStationMoney),
      getAuctionMoney: Boolean(gameVariants.getAuctionMoney),
    })

    let username = await e_chainopolyCenter.connect(signer).getUsername(signer.getAddress())
    setUsername(username)
    await getPlayerGameID()
    setGameStatus(status)
    setNumberOfPlayers(Number(initialNumberOfPlayers))
    setTimePerTurn(Number(timePerTurn))
    setBlocktrainFee(Number(blocktrainTravelFee))
    setCurrentRounds(Number(currentNumberOfRounds))
    setJoinedPlayers(joinedPlayers)
    setMinimumRounds(Number(minimumRounds))
    setDoublesCount(Number(doublesCount))
    setDiceRolledThisTurn(diceRolledThisTurn)
    setPlayerNearBankruptcy(_playerNearBankruptcy)
    setWinner(winner)
  }

  const getGameDetailsIfPossible = async () => {
    if (!loadingID && playerGameID > 0) await getGameDetails()
  }

  useEffect(() => {
    getGameDetailsIfPossible()
  }, [username, player, signer, getPlayerGameID, gameStatus, loadingID, playerGameID, getGameDetails])

  return (
    <Container maxW={'2560px'}>
      {loadingID ? (
        <></>
      ) : (
        <SimpleGrid textAlign={'center'} columns={3} spacing={1} minH={'60vh'} border={'1px'} borderColor={'red'}>
          {/* 1 */}
          <PlayerData
            lastDiceRoll={lastDiceRoll}
            username={username}
            gameStatus={gameStatus}
            doubles={doubles}
            playerGameID={Number(playerGameID)}
          />

          <GameData
            playerInTurn={playerInTurn}
            setPlayerInTurn={setPlayerInTurn}
            gameStatus={gameStatus}
            playerGameID={Number(playerGameID)}
            username={username}
            joinedPlayers={joinedPlayers}
            playerNearBankruptcy={playerNearBankruptcy}
            variants={variants}
            currentRounds={currentRounds}
            timePerTurn={timePerTurn}
            numberOfPlayers={Number(numberOfPlayers)}
            blocktrainFee={Number(blocktrainFee)}
            minimumRounds={Number(minimumRounds)}
            doublesCount={doublesCount}
            diceRolledThisTurn={diceRolledThisTurn}
            winner={winner}
            signer={signer}
          />
          {/* 3 */}

          <Stack mt={'40px'} textAlign={'center'} border={'1px'}>
            <Buttons
              getEvents={getEvents}
              playerInTurn={playerInTurn}
              username={username}
              gameStatus={gameStatus}
              signer={signer}
              playerGameID={Number(playerGameID)}
              diceRolledThisTurn={diceRolledThisTurn}
              doublesCount={doublesCount}
            />
            <Getters username={username} />
            <Offers signer={signer} />
          </Stack>
        </SimpleGrid>
      )}
    </Container>
  )
}

export default Home
