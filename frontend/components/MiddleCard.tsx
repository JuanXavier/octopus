import { Box, Button, ChakraProvider, Container, Flex, Input, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { MediaRenderer, Web3Button, useAddress, useContract, useContractRead } from '@thirdweb-dev/react'
import { contracts } from '../../blockchain/post-deployment/addresses'
import { abi } from '../../blockchain/artifacts/contracts/ChainopolyCenter.sol/ChainopolyCenter.json'
import { ethers } from 'ethers'
import { useState } from 'react'

export default function MiddleCard() {
  const { contract } = useContract(contracts.ChainopolyCenter, abi)
  const { data: lotteryStatus } = useContractRead(contract, 'gamesCount')
  const address = useAddress()

  const { data: ticketCost, isLoading: ticketCostLoading } = useContractRead(contract, 'gamesCount')
  const ticketCostInEther = ticketCost ? ethers.utils.formatEther(ticketCost) : '0'
  const [ticketAmount, setTicketAmount] = useState(0)
  const ticketCostSubmit = parseFloat(ticketCostInEther) * ticketAmount

  const totalEntries = 69
  const totalEntriesLoading = false

  function increaseTicketAmount() {
    setTicketAmount(ticketAmount + 1)
  }

  function decreaseTicketAmount() {
    if (ticketAmount > 0) setTicketAmount(ticketAmount - 1)
  }
  return (
    <Flex justifyContent={'center'} alignItems={'center'} p={'5%'}>
      <Stack spacing={10}>
        <Box>
          <Text align={'center'} fontSize={'xl'}>
            Chainopoly Game
          </Text>
          <Text align={'center'} fontSize={'4xl'} fontWeight={'bold'}>
            Build your own empire and gain rewards!
          </Text>
        </Box>

        <Text align={'center'} fontSize={'xl'}>
          Play the game
        </Text>

        {!ticketCostLoading && (
          <Text fontSize={'2xl'} fontWeight={'bold'}>
            Cost Per Ticket: {ticketCostInEther} MATIC
          </Text>
        )}
        {address ? (
          <Flex flexDirection={'row'}>
            <Flex flexDirection={'row'} w={'25%'} mr={'40px'}>
              <Button onClick={decreaseTicketAmount}>-</Button>
              <Input
                value={ticketAmount}
                type={'number'}
                onChange={(e) => setTicketAmount(parseInt(e.target.value))}
                textAlign={'center'}
                mx={2}
              />
              <Button onClick={increaseTicketAmount}>+</Button>
            </Flex>

            <Web3Button
              contractAddress={contracts.ChainopolyCenter}
              action={(contract) =>
                contract.call('buyTicket', [ticketAmount], {
                  value: ethers.utils.parseEther(ticketCostSubmit.toString()),
                })
              }
              isDisabled={!lotteryStatus}
            >{`Buy Ticket(s)`}</Web3Button>
          </Flex>
        ) : (
          <Text>Connect wallet to buy ticket.</Text>
        )}
        {!totalEntriesLoading && <Text>Total Entries: {totalEntries.toString()}</Text>}
      </Stack>
    </Flex>
  )
}
