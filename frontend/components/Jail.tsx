import { Flex, FormControl, Select } from '@chakra-ui/react'
import { useState } from 'react'
import { useContract, Web3Button } from '@thirdweb-dev/react'
import { contracts } from '../../blockchain/post-deployment/addresses'

import { abi } from '../../blockchain/out/ChainopolyCenter.sol/ChainopolyCenter.json'

export default function Jail() {
  const [functionToCall, setFunctionToCall] = useState('')
  const { contract: chainopolyCenter } = useContract(contracts.ChainopolyCenter, abi)

  return (
    <Flex>
      <Web3Button
        isDisabled={!chainopolyCenter}
        contractAddress={contracts.ChainopolyCenter}
        action={async (chainopolyCenter) => {
          if (functionToCall != '') await chainopolyCenter.call(`${functionToCall}`)
        }}
      >{`Be free!`}</Web3Button>
      <FormControl>
        <Select placeholder="Select action" onChange={async (e) => await setFunctionToCall(String(e.target.value))}>
          <option value={'payToBeFree'}>Pay $50 fine to get out</option>
          <option value={'redeemJailCard'}>Redeem "Get Out Of Jail" card</option>
        </Select>
      </FormControl>
    </Flex>
  )
}
