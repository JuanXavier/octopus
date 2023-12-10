import {
  Flex,
  Card,
  CardHeader,
  Heading,
  CardBody,
  Box,
  Text,
  Spinner,
  FormControl,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Select,
  Input,
  Divider,
  Stack,
} from '@chakra-ui/react'
import { useContract, useContractRead, Web3Button, useAddress, useSigner } from '@thirdweb-dev/react'
import { contracts } from '../../../blockchain/post-deployment/addresses'
import { abi } from '../../../blockchain/out/ChainopolyCenter.sol/ChainopolyCenter.json'
import { abi as board_abi } from '../../../blockchain/out/ChainopolyBoard.sol/ChainopolyBoard.json'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import PropertySelector from './PropertySelector'

export default function Getters(props: any) {
  /* **************************************************** */
  /*                     ETHERS SETUP                     */
  /* **************************************************** */
  const provider = new ethers.providers.JsonRpcProvider()
  const e_chainopolyCenter = new ethers.Contract(contracts.ChainopolyCenter, abi, provider)

  /* **************************************************** */
  /*                    THIRD WEB SETUP                    */
  /* **************************************************** */
  const player = useAddress()
  const signer: any = useSigner()
  const { contract: chainopolyCenter } = useContract(contracts.ChainopolyCenter, abi)
  const { contract: board } = useContract(contracts.Board, board_abi)

  /* ****************************************************** */
  /*                          STATE                         */
  /* ****************************************************** */
  const [inputValue, setInputValue] = useState(0)
  const [inputString, setInputString] = useState('')
  const [price, setPrice] = useState(0)
  const [balance, setBalance] = useState(0)
  const [rent, setRent] = useState(0)
  const [rentLocationName, setRentLocationName] = useState('')
  const [playerToQuery, setPlayerToQuery] = useState('')
  const [locationName, setLocationName] = useState('')
  const [ownerOfProperty, setOwnerOfProperty] = useState('')
  const [propertyOwned, setPropertyOwned] = useState('')
  const [zkChanceCard, setZkChanceCard] = useState('')
  const [defiBootyBag, setDefiBootyBag] = useState('')
  const [inputAddressIsValid, setInputAddressIsValid] = useState(false)
  const [housesInProperty, setHousesInProperty] = useState(5)
  const [propertyCard, setPropertyCard] = useState({
    name: '',
    price: 0,
    rentNoHouse: 0,
    pricePerBuilding: 0,
    rentOneHouse: 0,
    rentTwoHouses: 0,
    rentThreeHouses: 0,
    rentFourHouses: 0,
    rentHotel: 0,
  })

  function sliceAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }
  const [otherPlayerHasThis, setOtherPlayerHasThis] = useState({ props: [], names: [] })

  const handlePlayerToQuery = (e: any) => setPlayerToQuery(e.target.value)

  async function whatDoesThisPlayerHave(player: any): Promise<void> {
    const [props, names] = await e_chainopolyCenter.connect(signer).whatDoesThisPlayerHave(player)
    setOtherPlayerHasThis({ props, names })
  }

  async function getUsername(player: any): Promise<string> {
    let username = await e_chainopolyCenter.connect(signer).getUsername(player)
    return username
  }

  async function getPropertyCard(property: number): Promise<void> {
    const propCard = await e_chainopolyCenter.connect(signer).propertyCard(property)
    setPropertyCard({
      name: propCard.name,
      price: Number(propCard.price),
      rentNoHouse: Number(propCard.rent),
      pricePerBuilding: Number(propCard.pricePerHouse),
      rentOneHouse: Number(propCard.rentOneHouse),
      rentTwoHouses: Number(propCard.rentTwoHouses),
      rentThreeHouses: Number(propCard.rentThreeHouses),
      rentFourHouses: Number(propCard.rentFourHouses),
      rentHotel: Number(propCard.rentHotel),
    })
  }

  async function getHousesInProperty(property: number): Promise<void> {
    const houses = await e_chainopolyCenter.connect(signer).housesInProperty(property)
    setHousesInProperty(Number(houses))
  }

  /* ****************************************************** */
  /*                       USE EFFECT                       */
  /* ****************************************************** */

  useEffect(() => {
    const interval = setInterval(() => {}, 500)
    return () => clearInterval(interval)
  }, [player])

  /* **************************************************** */
  /*                        RETURN                        */
  /* **************************************************** */
  return (
    <Flex py={8} border={'1px'}>
      <Accordion allowToggle>
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as="span" flex="1" width={'350px'} textAlign="center">
                Getters
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Stack>
              {/* BALANCE OF */}
              <Flex>
                <Web3Button
                  isDisabled={!chainopolyCenter}
                  contractAddress={contracts.ChainopolyCenter}
                  action={async () => {
                    if (ethers.utils.isAddress(inputString)) {
                      setInputAddressIsValid(true)
                      const balance = Number(await e_chainopolyCenter.connect(signer).balanceOf(inputString))
                      setPlayerToQuery(inputString)
                      setBalance(balance)
                    } else setInputAddressIsValid(false)
                  }}
                >{`Balance of`}</Web3Button>
                <Input type="text" isRequired={true} onChange={(e) => setInputString(e.target.value)} />
              </Flex>
              {inputAddressIsValid ? (
                <Text align={'center'}>
                  Balance of {playerToQuery.slice(0, 4)}...{playerToQuery.slice(-4)} is {balance}
                </Text>
              ) : (
                <></>
              )}
              {/* BALANCE OF */}
              {/* What does this player have */}
              <Flex>
                <Web3Button
                  contractAddress={contracts.ChainopolyCenter}
                  action={async () => await whatDoesThisPlayerHave(playerToQuery)}
                >
                  Properties of
                </Web3Button>
                <Input type="text" value={playerToQuery} onChange={handlePlayerToQuery} />
              </Flex>
              {ethers.utils.isAddress(playerToQuery) && otherPlayerHasThis.props.length > 0 ? (
                <Text>
                  {otherPlayerHasThis.names} ({otherPlayerHasThis.props})
                </Text>
              ) : (
                <Text>{sliceAddress(playerToQuery)} has no properties</Text>
              )}
              {/* What does this player have */}

              {/* OWNER OF */}
              <Flex>
                <Web3Button
                  isDisabled={!chainopolyCenter}
                  contractAddress={contracts.ChainopolyCenter}
                  action={async () => {
                    setPropertyOwned(String(await board?.call('location', [Number(inputValue)])))
                    const owner = await e_chainopolyCenter.connect(signer).ownerOf(Number(inputValue))
                    const ownerUsername = await e_chainopolyCenter.connect(signer).getUsername(owner)
                    if (ownerUsername != '' && ownerUsername != undefined) setOwnerOfProperty(ownerUsername)
                    else setOwnerOfProperty(owner)
                  }}
                >{`Owner of`}</Web3Button>

                <FormControl>
                  <Select placeholder="Select property" onChange={(e) => setInputValue(Number(e.target.value))}>
                    <option value={1}>Alchemy Valley</option>
                    <option value={3}>Infura Avenue</option>
                    <option value={5}>Remix Blocktrain</option>
                    <option value={6}>IMX Avenue</option>
                    <option value={8}>OpenSea Lake</option>
                    <option value={9}>Rarible Park</option>
                    <option value={11}>Uniswap Square</option>
                    <option value={12}>Hot Wallet</option>
                    <option value={13}>Aave Triangle</option>
                    <option value={14}>SushiSwap Street</option>
                    <option value={15}>Truffle Blocktrain</option>
                    <option value={16}>Avalanche Mountain</option>
                    <option value={18}>Optimism Bridge</option>
                    <option value={19}>Arbitrum Expressway</option>
                    <option value={21}>NFT Explanade</option>
                    <option value={23}>Compound Boulevard</option>
                    <option value={24}>Polygon Plaza</option>
                    <option value={25}>Hardhat Blocktrain</option>
                    <option value={26}>OpenZeppelin Library</option>
                    <option value={27}>Chainlink Resource Center</option>
                    <option value={28}>Cold Wallet</option>
                    <option value={29}>Curve Curb</option>
                    <option value={31}>Lido Embassy</option>
                    <option value={32}>Maker Terrace</option>
                    <option value={34}>Binance Cafe</option>
                    <option value={35}>Foundry Blocktrain</option>
                    <option value={37}>Ethereum Dark Forest</option>
                    <option value={39}>Bitcoin Mystic Lane</option>
                  </Select>
                </FormControl>
              </Flex>
              {ownerOfProperty === '' ? (
                <></>
              ) : (
                <Text align={'center'}>
                  {ownerOfProperty == ethers.constants.AddressZero ? (
                    <Text>{propertyOwned} has no owner!</Text>
                  ) : (
                    <Text>
                      Owner of {propertyOwned} is {ownerOfProperty}
                    </Text>
                  )}
                </Text>
              )}
              {/* OWNER OF */}
              {/* PRICE OF */}
              <Flex>
                <Web3Button
                  isDisabled={!chainopolyCenter}
                  contractAddress={contracts.ChainopolyCenter}
                  action={async (chainopolyCenter) => {
                    setPrice(Number(await chainopolyCenter.call('priceOf', [Number(inputValue)])))
                    setLocationName(String(await board?.call('location', [Number(inputValue)])))
                  }}
                >{`Price of`}</Web3Button>
                <FormControl>
                  <Select placeholder="Select property" onChange={(e) => setInputValue(Number(e.target.value))}>
                    <option value={1}>Alchemy Valley</option>
                    <option value={3}>Infura Avenue</option>
                    <option value={5}>Remix Blocktrain</option>
                    <option value={6}>IMX Avenue</option>
                    <option value={8}>OpenSea Lake</option>
                    <option value={9}>Rarible Park</option>
                    <option value={11}>Uniswap Square</option>
                    <option value={12}>Hot Wallet</option>
                    <option value={13}>Aave Triangle</option>
                    <option value={14}>SushiSwap Street</option>
                    <option value={15}>Truffle Blocktrain</option>
                    <option value={16}>Avalanche Mountain</option>
                    <option value={18}>Optimism Bridge</option>
                    <option value={19}>Arbitrum Expressway</option>
                    <option value={21}>NFT Explanade</option>
                    <option value={23}>Compound Boulevard</option>
                    <option value={24}>Polygon Plaza</option>
                    <option value={25}>Hardhat Blocktrain</option>
                    <option value={26}>OpenZeppelin Library</option>
                    <option value={27}>Chainlink Resource Center</option>
                    <option value={28}>Cold Wallet</option>
                    <option value={29}>Curve Curb</option>
                    <option value={31}>Lido Embassy</option>
                    <option value={32}>Maker Terrace</option>
                    <option value={34}>Binance Cafe</option>
                    <option value={35}>Foundry Blocktrain</option>
                    <option value={37}>Ethereum Dark Forest</option>
                    <option value={39}>Bitcoin Mystic Lane</option>
                  </Select>
                </FormControl>
              </Flex>

              {locationName.length == 0 || locationName === '' ? (
                <></>
              ) : (
                <Text align={'center'}>
                  {locationName} costs ${price > 0 ? price : 0}
                </Text>
              )}
              {/* PRICE OF */}
              {/* HOUSES IN */}
              <Flex>
                <Web3Button
                  isDisabled={!chainopolyCenter}
                  contractAddress={contracts.ChainopolyCenter}
                  action={async () => await getHousesInProperty(inputValue)}
                >{`Houses in`}</Web3Button>
                <FormControl>
                  <Select placeholder="Select property" onChange={(e) => setInputValue(Number(e.target.value))}>
                    <option value={1}>Alchemy Valley</option>
                    <option value={3}>Infura Avenue</option>
                    <option value={6}>IMX Avenue</option>
                    <option value={8}>OpenSea Lake</option>
                    <option value={9}>Rarible Park</option>
                    <option value={11}>Uniswap Square</option>
                    <option value={13}>Aave Triangle</option>
                    <option value={14}>SushiSwap Street</option>
                    <option value={16}>Avalanche Mountain</option>
                    <option value={18}>Optimism Bridge</option>
                    <option value={19}>Arbitrum Expressway</option>
                    <option value={21}>NFT Explanade</option>
                    <option value={23}>Compound Boulevard</option>
                    <option value={24}>Polygon Plaza</option>
                    <option value={26}>OpenZeppelin Library</option>
                    <option value={27}>Chainlink Resource Center</option>
                    <option value={29}>Curve Curb</option>
                    <option value={31}>Lido Embassy</option>
                    <option value={32}>Maker Terrace</option>
                    <option value={34}>Binance Cafe</option>
                    <option value={37}>Ethereum Dark Forest</option>
                    <option value={39}>Bitcoin Mystic Lane</option>
                  </Select>
                </FormControl>
              </Flex>
              <Text>{housesInProperty < 5 ? (housesInProperty == 0 ? `No houses` : housesInProperty) : ``}</Text>
              {/* HOUSES IN */}
              {/* CALCULATE RENT */}
              <Flex>
                <Web3Button
                  isDisabled={!chainopolyCenter}
                  contractAddress={contracts.ChainopolyCenter}
                  action={async () => {
                    setRentLocationName(String(await board?.call('location', [Number(inputValue)])))
                    setRent(Number(await e_chainopolyCenter.connect(signer).calculateRent(inputValue)))
                    console.log(Number(await e_chainopolyCenter.connect(signer).calculateRent(inputValue)))
                  }}
                >{`Calculate rent`}</Web3Button>

                <FormControl>
                  <Select placeholder="Select property" onChange={(e) => setInputValue(Number(e.target.value))}>
                    <option value={1}>Alchemy Valley</option>
                    <option value={3}>Infura Avenue</option>
                    <option value={5}>Remix Blocktrain</option>
                    <option value={6}>IMX Avenue</option>
                    <option value={8}>OpenSea Lake</option>
                    <option value={9}>Rarible Park</option>
                    <option value={11}>Uniswap Square</option>
                    <option value={12}>Hot Wallet</option>
                    <option value={13}>Aave Triangle</option>
                    <option value={14}>SushiSwap Street</option>
                    <option value={15}>Truffle Blocktrain</option>
                    <option value={16}>Avalanche Mountain</option>
                    <option value={18}>Optimism Bridge</option>
                    <option value={19}>Arbitrum Expressway</option>
                    <option value={21}>NFT Explanade</option>
                    <option value={23}>Compound Boulevard</option>
                    <option value={24}>Polygon Plaza</option>
                    <option value={25}>Hardhat Blocktrain</option>
                    <option value={26}>OpenZeppelin Library</option>
                    <option value={27}>Chainlink Resource Center</option>
                    <option value={28}>Cold Wallet</option>
                    <option value={29}>Curve Curb</option>
                    <option value={31}>Lido Embassy</option>
                    <option value={32}>Maker Terrace</option>
                    <option value={34}>Binance Cafe</option>
                    <option value={35}>Foundry Blocktrain</option>
                    <option value={37}>Ethereum Dark Forest</option>
                    <option value={39}>Bitcoin Mystic Lane</option>
                  </Select>
                </FormControl>
              </Flex>
              {rentLocationName === '' ? (
                <></>
              ) : (
                <Text align={'center'}>
                  Rent for {rentLocationName} is {rent > 0 ? rent : 0}
                </Text>
              )}
              <Flex>
                {/* ZK CARD */}
                <Web3Button
                  isDisabled={!chainopolyCenter}
                  contractAddress={contracts.ChainopolyCenter}
                  action={async (chainopolyCenter) => {
                    setZkChanceCard(String(await chainopolyCenter.call('zeroKnowledgeChance', [Number(inputValue)])))
                  }}
                >{`ZK Chance Card`}</Web3Button>
                <Input isRequired={true} onChange={(e) => setInputValue(Number(e.target.value))} />
              </Flex>
              {zkChanceCard === '' ? <></> : <Text align={'center'}>Description: {zkChanceCard}</Text>}
              <Divider />
              <Flex>
                {/* DEFI BOOTY BAG */}
                <Web3Button
                  isDisabled={!chainopolyCenter}
                  contractAddress={contracts.ChainopolyCenter}
                  action={async (chainopolyCenter) => {
                    setDefiBootyBag(String(await chainopolyCenter.call('defiBootyBag', [Number(inputValue)])))
                  }}
                >{`DeFi Booty Bag Card`}</Web3Button>
                <Input isRequired={true} onChange={(e) => setInputValue(Number(e.target.value))} />
              </Flex>
              {defiBootyBag === '' ? <></> : <Text align={'center'}>Description: {defiBootyBag}</Text>}

              {/* show property card */}
              <Flex>
                <Web3Button
                  contractAddress={contracts.ChainopolyCenter}
                  action={async () => await getPropertyCard(inputValue)}
                >
                  Show property card
                </Web3Button>
                <FormControl>
                  <Select placeholder="Select property" onChange={(e) => setInputValue(Number(e.target.value))}>
                    <option value={1}>Alchemy Valley</option>
                    <option value={3}>Infura Avenue</option>
                    <option value={5}>Remix Blocktrain</option>
                    <option value={6}>IMX Avenue</option>
                    <option value={8}>OpenSea Lake</option>
                    <option value={9}>Rarible Park</option>
                    <option value={11}>Uniswap Square</option>
                    <option value={12}>Hot Wallet</option>
                    <option value={13}>Aave Triangle</option>
                    <option value={14}>SushiSwap Street</option>
                    <option value={15}>Truffle Blocktrain</option>
                    <option value={16}>Avalanche Mountain</option>
                    <option value={18}>Optimism Bridge</option>
                    <option value={19}>Arbitrum Expressway</option>
                    <option value={21}>NFT Explanade</option>
                    <option value={23}>Compound Boulevard</option>
                    <option value={24}>Polygon Plaza</option>
                    <option value={25}>Hardhat Blocktrain</option>
                    <option value={26}>OpenZeppelin Library</option>
                    <option value={27}>Chainlink Resource Center</option>
                    <option value={28}>Cold Wallet</option>
                    <option value={29}>Curve Curb</option>
                    <option value={31}>Lido Embassy</option>
                    <option value={32}>Maker Terrace</option>
                    <option value={34}>Binance Cafe</option>
                    <option value={35}>Foundry Blocktrain</option>
                    <option value={37}>Ethereum Dark Forest</option>
                    <option value={39}>Bitcoin Mystic Lane</option>
                  </Select>
                </FormControl>
              </Flex>
              {/* Property Card Information */}
              <Card alignItems={'center'} fontSize={'md'}>
                <CardHeader>
                  <Heading size="md">{propertyCard.name}</Heading>
                </CardHeader>
                <Divider />
                <CardBody>
                  <Stack alignItems={'center'}>
                    <Box>Price: {propertyCard.price}</Box>
                    <Box>Rent (No House): {propertyCard.rentNoHouse}</Box>
                    <Box>Price Per Building: {propertyCard.pricePerBuilding}</Box>
                    <Box>Rent (One House): {propertyCard.rentOneHouse}</Box>
                    <Box>Rent (Two Houses): {propertyCard.rentTwoHouses}</Box>
                    <Box>Rent (Three Houses): {propertyCard.rentThreeHouses}</Box>
                    <Box>Rent (Four Houses): {propertyCard.rentFourHouses}</Box>
                    <Box>Rent (Hotel): {propertyCard.rentHotel}</Box>
                  </Stack>
                </CardBody>
              </Card>
              {/* Property Card Information */}
            </Stack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Flex>
  )
}
