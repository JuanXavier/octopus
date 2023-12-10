import {
  Flex,
  Stack,
  Select,
  FormControl,
  NumberInput,
  NumberInputField,
  Heading,
  Divider,
  Button,
  NumberInputStepper,
  Box,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useContract, Web3Button } from '@thirdweb-dev/react'
import { contracts } from '../../blockchain/post-deployment/addresses'
import { abi } from '../../blockchain/out/ChainopolyCenter.sol/ChainopolyCenter.json'

type ComponentItem = {
  property: number
  quantity: number
}

/**
 * 4d8ac657 => buildHotels(uint256[])
eab6d620 => sellHotels(uint256[])
cb43d6c7 => hasHotel(uint256)
1518040f => housesInProperty(uint256)

//whatDoesThisPlayerHave
*/

export default function Buildings() {
  const { contract: chainopolyCenter } = useContract(contracts.ChainopolyCenter, abi)
  const [property, setProperty] = useState(0) // Separate state for property
  const [quantity, setQuantity] = useState(0) // Separate state for quantity
  const [components, setComponents] = useState<ComponentItem[]>([]) // Specify the type for components
  const [propertiesArray, setPropertiesArray] = useState<number[]>([]) // Array for properties
  const [housesArray, setHousesArray] = useState<number[]>([]) // Array for amount of houses

  useEffect(() => {
    handleArrayPopulation()
  }, [components])

  function handleArrayPopulation() {
    const properties: number[] = []
    const houses: number[] = []

    if (components.length == 0) {
      setPropertiesArray(properties)
      setHousesArray(houses)
      return
    }

    console.log(components.length)

    components.forEach((component) => {
      if (component.property !== 0 && component.quantity !== 0) {
        properties.push(component.property)
        houses.push(component.quantity)
      }
    })

    if (Number(property) !== 0) {
      properties.push(Number(property))
      houses.push(quantity)
    }

    setPropertiesArray(properties)
    setHousesArray(houses)
  }

  function createField() {
    setComponents((prev: ComponentItem[]) => [...prev, { property, quantity }])
    setProperty(0)
    setQuantity(0)
  }

  function deleteLastField() {
    setComponents((prev: ComponentItem[]) => prev.slice(0, prev.length - 1))
    setPropertiesArray((prev: number[]) => prev.slice(0, prev.length - 1))
    setHousesArray((prev: number[]) => prev.slice(0, prev.length - 1))
  }

  return (
    <Box>
      <Divider />
      <Flex justifyContent={'center'}>
        <Stack>
          <Heading size={'sm'}>BUILDINGS</Heading>
        </Stack>
      </Flex>

      <Flex justifyContent={'center'}>
        <Button width={'15px'} colorScheme="green" onClick={createField}>
          +
        </Button>
        <Button width={'15px'} colorScheme="red" onClick={deleteLastField}>
          -
        </Button>
      </Flex>

      {components.map((component, index) => (
        <Flex key={index}>
          <FormControl>
            <Select placeholder="Select property" onChange={(e) => setProperty(Number(e.target.value))}>
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
          <NumberInput size="md" maxW={24} min={1} max={4} onChange={(value) => setQuantity(Number(value))}>
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </Flex>
      ))}

      <div>Properties Array: {JSON.stringify(propertiesArray)}</div>
      <div>Houses Array: {JSON.stringify(housesArray)}</div>

      <Web3Button
        isDisabled={!chainopolyCenter}
        contractAddress={contracts.ChainopolyCenter}
        action={async (chainopolyCenter) => {
          handleArrayPopulation()
          await chainopolyCenter.call(`buildHouses`, [propertiesArray, housesArray])
        }}
      >{`Build houses`}</Web3Button>

      <Web3Button
        isDisabled={!chainopolyCenter}
        contractAddress={contracts.ChainopolyCenter}
        action={async (chainopolyCenter) => {
          handleArrayPopulation()
          await chainopolyCenter.call(`sellHouses`, [propertiesArray, housesArray])
        }}
      >{`Sell houses`}</Web3Button>
    </Box>
  )
}
