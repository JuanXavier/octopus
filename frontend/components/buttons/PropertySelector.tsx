import { Flex, FormControl, Select } from '@chakra-ui/react'
import { useState, useEffect } from 'react'

export default function PropertySelector() {
  const [inputValue, setInputValue] = useState(0)

  return (
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
  )
}
