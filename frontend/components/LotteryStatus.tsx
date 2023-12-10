import { Box, Card, Input, Stack, Text } from '@chakra-ui/react'
import { Web3Button, useContract, useContractRead } from '@thirdweb-dev/react'
import { useState } from 'react'
import { contracts } from '../../blockchain/post-deployment/addresses'
import { abi } from '../../blockchain/artifacts/contracts/ChainopolyCenter.sol/ChainopolyCenter.json'

export default function AdminLotteryStatusCard() {
  const { contract } = useContract(contracts.ChainopolyCenter, abi)

  const { data: lotteryStatus } = useContractRead(contract, 'lotteryStatus')

  const [contractAddress, setContractAddress] = useState('')
  const [tokenId, setTokenId] = useState(0)

  function reset() {
    setContractAddress('')
    setTokenId(0)
  }

  return (
    <Card p={4} mt={4} mr={10} w={'25%'}>
      <Text fontWeight={'bold'} mb={4} fontSize={'xl'}>
        Raffle Status
      </Text>
      {!lotteryStatus ? (
        <Stack spacing={4} mt={4}>
          <Box>
            <Text>Prize Contract Address:</Text>
            <Input
              placeholder={'0x00000'}
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
            />
          </Box>
          <Box>
            <Text>Prize Token ID:</Text>
            <Input
              placeholder={'0'}
              type="number"
              value={tokenId}
              onChange={(e) => setTokenId(parseInt(e.target.value))}
            />
          </Box>
          <Web3Button
            contractAddress={contracts.ChainopolyCenter}
            action={(contract) => contract.call('startLottery', [contractAddress, tokenId])}
            onSuccess={reset}
          >
            Start Raffle
          </Web3Button>
        </Stack>
      ) : (
        <Stack spacing={4} mt={4}>
          <Web3Button contractAddress={contracts.ChainopolyCenter} action={(contract) => contract.call('endLottery')}>
            End Raffle
          </Web3Button>
        </Stack>
      )}
    </Card>
  )
}
