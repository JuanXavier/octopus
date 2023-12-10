import { Box, Card, Heading, Spinner, Stack, Text } from '@chakra-ui/react'
import { ThirdwebNftMedia, useContract, useContractMetadata, useContractRead, useNFT } from '@thirdweb-dev/react'
import { contracts } from '../../blockchain/post-deployment/addresses'
import { abi } from '../../blockchain/artifacts/contracts/ChainopolyCenter.sol/ChainopolyCenter.json'

export default function PrizeNFT() {
  const { contract: lotteryContract } = useContract(contracts.ChainopolyCenter, abi)

  const { data: nftContractAddress } = useContractRead(lotteryContract, 'nftContract')
  const { data: nftTokenId } = useContractRead(lotteryContract, 'tokenId')

  const { contract: nftContract } = useContract(nftContractAddress)
  const { data: nftContractMetadata, isLoading: nftContractMetadataLoading } = useContractMetadata(nftContract)

  const { data: nft, isLoading: nftLoading } = useNFT(nftContract, nftTokenId)

  return (
    <Card p={'5%'}>
      <Heading>Prize NFT</Heading>
      {!nftContractMetadataLoading && !nftLoading ? (
        <Stack spacing={'20px'} textAlign={'center'}>
          <Box>
            <ThirdwebNftMedia metadata={nft?.metadata!} height="100%" width="100%" />
          </Box>
          <Box>
            <Text fontSize={'2xl'} fontWeight={'bold'}>
              {nftContractMetadata.name}
            </Text>
            <Text fontWeight={'bold'}>{nft?.metadata.name}</Text>
          </Box>
        </Stack>
      ) : (
        <Spinner />
      )}
    </Card>
  )
}
