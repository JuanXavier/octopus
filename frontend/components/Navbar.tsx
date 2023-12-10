import Link from 'next/link'
import { useColorMode, Container, Flex, Text, Button } from '@chakra-ui/react'
import { ConnectWallet, useContract } from '@thirdweb-dev/react'
import { abi } from '../../blockchain/out/ChainopolyCenter.sol/ChainopolyCenter.json'
import { contracts } from '../../blockchain/post-deployment/addresses'

export default function Navbar() {
  const { colorMode, toggleColorMode } = useColorMode()
  const { contract } = useContract(contracts.ChainopolyCenter, abi)

  return (
    <Container maxW={'1440px'} py={8}>
      <Flex flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'} border={'1px'}>
        <Link href={'/'}>
          <Text fontSize={'4xl'} fontFamily={'Fira Code'} fontWeight={'bold'} border={'1px'}>
            Chainopoly
          </Text>
        </Link>
        <Text>Contract deployed at: {contract?.getAddress()} </Text>
        <Button onClick={toggleColorMode}>{colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}</Button>
        <Flex flexDirection={'row'} alignItems={'center'} border={'1px'}>
          <ConnectWallet theme="dark" />
        </Flex>
      </Flex>
    </Container>
  )
}
