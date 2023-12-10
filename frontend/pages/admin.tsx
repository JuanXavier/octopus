// import { Box, Card, Container, Divider, Flex, Heading, Spinner, Stack, Text } from '@chakra-ui/react'
// import { Web3Button, useContract, useContractRead } from '@thirdweb-dev/react'
// import { CHAINOPOLY_CENTER } from '../const/addresses'
// import { ethers } from 'ethers'
// import AdminLotteryStatusCard from '../components/LotteryStatus'
// import AdminTicketPriceCard from '../components/TicketPrice'
// import AdminRaffleWinnerCard from '../components/RaffleWinner'

// import ChainopolyCenter from '../../artifacts/contracts/ChainopolyCenter.sol/ChainopolyCenter.json'
// const ABI = ChainopolyCenter.abi

// export default function Admin() {
//   const { contract } = useContract(CHAINOPOLY_CENTER, ABI)

//   return (
//     <Container maxW={'1440px'} py={8}>
//       <Heading>Admin Dashboard</Heading>
//       <Flex flexDirection={'row'}>
//         <AdminLotteryStatusCard />
//         <Card p={4} mt={4} mr={10} w={'25%'}>
//           <Stack spacing={4}>
//             <AdminTicketPriceCard />
//             <Divider />
//             <Box>
//               <Text fontWeight={'bold'} mb={4} fontSize={'xl'}>
//                 Contract Balance
//               </Text>
//               {/* {!contractBalanceLoading ? (
//                 <Text fontSize={'xl'}>{ethers.utils.formatEther(contractBalance)} MATIC</Text>
//               ) : (
//                 <Spinner />
//               )} */}
//             </Box>
//             <Web3Button contractAddress={CHAINOPOLY_CENTER} action={(contract) => contract.call('withdrawBalance')}>
//               Withdraw Balance
//             </Web3Button>
//           </Stack>
//         </Card>
//         <AdminRaffleWinnerCard />
//       </Flex>
//     </Container>
//   )
// }
