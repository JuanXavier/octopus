import {
  Flex,
  SimpleGrid,
  Switch,
  Stack,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  FormLabel,
  NumberIncrementStepper,
  Slider,
  SliderTrack,
  Text,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  FormControl,
  Box,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  NumberDecrementStepper,
} from '@chakra-ui/react'
import { useContract, Web3Button, useSigner } from '@thirdweb-dev/react'
import { contracts } from '../../blockchain/post-deployment/addresses'

import { abi } from '../../blockchain/out/ChainopolyCenter.sol/ChainopolyCenter.json'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export default function CreateGame(props: any) {
  interface Variants {
    blocktrainTravel: boolean
    poorStart: boolean
    staggeredStart: boolean
    noEasyMonopolies: boolean
    firstInBankruptcyWins: boolean
    getAuctionMoney: boolean
    getStablecoinStationMoney: boolean
  }

  interface CustomGame {
    numberOfPlayers: number
    whitelistedPlayers: string[]
    minRounds: number
    minutesPerTurn: number
    minutesPerAuction: number
    blocktrainFee: number
    variants: Variants
  }

  /* **************************************************** */
  /*                     ETHERS SETUP                     */
  /* **************************************************** */
  const provider = new ethers.providers.JsonRpcProvider()
  const e_chainopolyCenter = new ethers.Contract(contracts.ChainopolyCenter, abi, provider)

  /* **************************************************** */
  /*                    THIRD WEB SETUP                    */
  /* **************************************************** */
  const signer: any = useSigner()
  const { contract: chainopolyCenter } = useContract(contracts.ChainopolyCenter, abi)

  /* ****************************************************** */
  /*                          STATE                         */
  /* ****************************************************** */
  const [inputValue, setInputValue] = useState(0)
  const [newGame, setNewGame] = useState<CustomGame>({
    numberOfPlayers: 2,
    whitelistedPlayers: [],
    minRounds: 10,
    minutesPerTurn: 10,
    minutesPerAuction: 10,
    blocktrainFee: 0,
    variants: {
      blocktrainTravel: false,
      poorStart: false,
      staggeredStart: false,
      noEasyMonopolies: false,
      firstInBankruptcyWins: false,
      getAuctionMoney: false,
      getStablecoinStationMoney: false,
    },
  })

  /* ****************************************************** */
  /*                    HELPER FUNCTIONS                    */
  /* ****************************************************** */
  async function createCustomGame(newGame: any): Promise<number> {
    return await e_chainopolyCenter
      .connect(props.signer)
      .createCustomGame(
        newGame.numberOfPlayers,
        newGame.whitelistedPlayers,
        newGame.minRounds,
        newGame.minutesPerTurn,
        newGame.minutesPerAuction,
        newGame.blocktrainFee,
        newGame.variants
      )
  }

  const handleVariant = (variantName: keyof Variants, value: boolean) => {
    setNewGame((prevGame) => ({
      ...prevGame,
      variants: {
        ...prevGame.variants,
        [variantName]: value,
      },
    }))
  }

  function handleWhitelistedPlayers(newWhitelistedPlayers: string[]) {
    setNewGame((prevGame) => ({
      ...prevGame,
      whitelistedPlayers: newWhitelistedPlayers,
    }))
  }

  const handleSliderChange = (newValue: any) => {
    setNewGame((prevGame) => ({
      ...prevGame,
      minutesPerTurn: newValue,
    }))
  }

  const handleInputChange = (event: any) => {
    const newValue = parseInt(event.target.value, 10)
    if (!isNaN(newValue) && newValue >= 2 && newValue <= 279620) {
      setNewGame((prevGame) => ({
        ...prevGame,
        minutesPerTurn: newValue,
      }))
    }
  }

  /* ****************************************************** */
  /*                       USE EFFECT                       */
  /* ****************************************************** */

  useEffect(() => {}, [props.signer, props.players])

  /* **************************************************** */
  /*                        RETURN                        */
  /* **************************************************** */

  return (
    <Flex py={8} border={'1px'}>
      <Stack>
        {/* CREATE CLASSIC GAME */}
        <Flex mb={1}>
          <Web3Button
            isDisabled={!chainopolyCenter}
            contractAddress={contracts.ChainopolyCenter}
            action={async () => await e_chainopolyCenter.connect(signer).createClassicGame(Number(inputValue))}
          >{`Create Classic Game`}</Web3Button>
          <NumberInput
            allowMouseWheel
            size="md"
            maxW={24}
            defaultValue={2}
            min={2}
            max={8}
            onChange={(e) => setInputValue(Number(e))}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>

          <Text alignContent={'center'}> Players</Text>
        </Flex>
        {/* CREATE CLASSIC GAME */}

        <Box>
          {/* CREATE CUSTOM GAME */}
          <Accordion allowMultiple>
            <AccordionItem>
              <h2>
                <AccordionButton>
                  <Box as="span" flex="1" textAlign="center" fontWeight="bold">
                    Custom Game Setup
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4}>
                {/* ********************************** VARIANTS ********************************** */}
                <Flex justifyContent="center" mb={'2'}>
                  <NumberInput
                    allowMouseWheel
                    size="md"
                    maxW={24}
                    defaultValue={2}
                    min={2}
                    max={8}
                    onChange={(value) => setNewGame({ ...newGame, numberOfPlayers: Number(value) })}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Web3Button
                    isDisabled={!chainopolyCenter}
                    style={{ backgroundColor: 'pink' }}
                    contractAddress={contracts.ChainopolyCenter}
                    action={async () => {
                      await createCustomGame(newGame)
                      console.log(newGame)
                    }}
                  >{`Create Custom Game`}</Web3Button>
                </Flex>
                <Flex>
                  <FormControl
                    as={SimpleGrid}
                    justifyContent={'center'}
                    alignItems={'center'}
                    justifyItems={'center'}
                    columns={{ base: 2, lg: 2 }}
                  >
                    <FormLabel>Poor Start</FormLabel>
                    <Switch onChange={(e) => handleVariant('poorStart', e.target.checked)} />

                    <FormLabel>Staggered Start</FormLabel>
                    <Switch onChange={(e) => handleVariant('staggeredStart', e.target.checked)} />

                    <FormLabel>Blocktrain Travel</FormLabel>
                    <Switch onChange={(e) => handleVariant('blocktrainTravel', e.target.checked)} />

                    <FormLabel>Get Auction Money</FormLabel>
                    <Switch onChange={(e) => handleVariant('getAuctionMoney', e.target.checked)} />

                    <FormLabel>No easy monopolies</FormLabel>
                    <Switch onChange={(e) => handleVariant('noEasyMonopolies', e.target.checked)} />

                    <FormLabel>Get Stablecoin Station Money</FormLabel>
                    <Switch onChange={(e) => handleVariant('getStablecoinStationMoney', e.target.checked)} />

                    <FormLabel>First in bankruptcy wins</FormLabel>
                    <Switch onChange={(e) => handleVariant('firstInBankruptcyWins', e.target.checked)} />
                  </FormControl>
                </Flex>
                {/* ********************************** VARIANTS ********************************** */}
                {/* ********************************** WHITESLISTED PLAYERS ********************************** */}
                <Box>
                  Whitelisted players
                  <Input
                    onChange={(event) => {
                      // Split the input value into an array of strings based on some delimiter (e.g., comma)
                      const newPlayers = event.target.value.split(',')
                      handleWhitelistedPlayers(newPlayers)
                    }}
                  ></Input>
                </Box>
                {/* ********************************** WHITESLISTED PLAYERS ********************************** */}

                <Box>
                  Minutes per turn
                  <Input
                    onChange={(e) => {
                      setNewGame((prevGame) => ({
                        ...prevGame,
                        minutesPerTurn: Number(e.target.value),
                      }))
                    }}
                  ></Input>
                </Box>
                <Box alignItems={'center'} maxW={'400'}>
                  <Slider
                    aria-label="slider-ex-3"
                    defaultValue={2}
                    min={2}
                    max={279620}
                    step={1}
                    size={'lg'}
                    onChange={handleSliderChange}
                  >
                    <Box>{}</Box>
                    <SliderTrack bg="red.100">
                      <Box position="relative" right={10} />
                      <SliderFilledTrack bg="cyan" />
                    </SliderTrack>
                    <SliderThumb boxSize={3} />
                  </Slider>
                </Box>
                <Box>
                  Minutes per auction
                  <Input
                    onChange={(e) => {
                      setNewGame((prevGame) => ({
                        ...prevGame,
                        minutesPerAuction: Number(e.target.value),
                      }))
                    }}
                  ></Input>
                </Box>

                <Flex>
                  <Box>
                    Minimum rounds
                    <Input
                      onChange={(e) => {
                        setNewGame((prevGame) => ({
                          ...prevGame,
                          minRounds: Number(e.target.value),
                        }))
                      }}
                    ></Input>
                  </Box>

                  <Box>
                    Blocktrain travel fee
                    <Input
                      onChange={(e) => {
                        setNewGame((prevGame) => ({
                          ...prevGame,
                          blocktrainFee: Number(e.target.value),
                        }))
                      }}
                    ></Input>
                  </Box>
                </Flex>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
          {/* CREATE CUSTOM GAME */}
        </Box>
      </Stack>
    </Flex>
  )
}
