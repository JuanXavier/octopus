import {
  Text,
  Flex,
  Stack,
  Box,
  Divider,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Heading,
} from '@chakra-ui/react'
import { useContract, useAddress, useSigner, Web3Button } from '@thirdweb-dev/react'
import { contracts } from '../../blockchain/constants/post-deployment/addresses'
// import { abi } from '../../blockchain/artifacts/contracts/ChainopolyCenter.sol/ChainopolyCenter.json'
import { abi } from '../../blockchain/out/ChainopolyCenter.sol/ChainopolyCenter.json'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export default function Auction(props: any) {
  /* **************************************************** */
  /*                     ETHERS SETUP                     */
  /* **************************************************** */
  const provider = new ethers.providers.JsonRpcProvider()
  const e_chainopolyCenter = new ethers.Contract(contracts.ChainopolyCenter, abi, provider)

  /* **************************************************** */
  /*                    THIRDWEB SETUP                    */
  /* **************************************************** */
  let signer: any = useSigner()
  const { contract: chainopolyCenter } = useContract(contracts.ChainopolyCenter, abi)

  function sliceAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  /* **************************************************** */
  /*                      REACT STATE                     */
  /* **************************************************** */

  const [propertyInAuction, setPropertyInAuction] = useState('')
  const [propertiesInAuction, setPropertiesInAuction] = useState([])
  const [highestBid, setHighestBid] = useState(0)
  const [starter, setStarter] = useState('')
  const [highestBidder, setHighestBidder] = useState('')
  const [maxTimespanBetweenBids, setMaxTimespanBetweenBids] = useState(0)
  const [auctionSecs, setAuctionSecs] = useState(0)
  const [auctionMins, setAuctionMins] = useState(0)
  const [timePerAuction, setTimePerAuction] = useState(0)

  const [inputValue, setInputValue] = useState(0)

  /* ****************************************************** */
  /*                    HELPER FUNCTIONS                    */
  /* ****************************************************** */
  const checkSigner = async () => {
    if (signer) await signer.getAddress()
    else {
      console.log('No signer available.')
      signer = provider.getSigner()
    }
    while (!signer) {
      console.log('No signer yet...')
      await new Promise((resolve) => setTimeout(resolve, 1000))
      signer = provider.getSigner()
    }
  }

  async function getAuctionDetails(): Promise<void> {
    const auctionDetails = await e_chainopolyCenter.connect(signer).auctionDetails()
    setPropertyInAuction(auctionDetails[0])
    setPropertiesInAuction(auctionDetails[1][6])

    setStarter(auctionDetails[1][0])
    setHighestBidder(auctionDetails[1][4])

    setHighestBid(Number(auctionDetails[1][1]))
    setMaxTimespanBetweenBids(Number(auctionDetails[1][2]))
    setTimePerAuction(Number(auctionDetails[1][3]))
  }

  async function getTimeLeft(): Promise<void> {
    const [mins, secs] = await e_chainopolyCenter.connect(signer).auctionEndsIn()
    setAuctionMins(Number(mins))
    setAuctionSecs(Number(secs))
  }

  async function finalizeAuction(): Promise<void> {
    await e_chainopolyCenter.connect(signer).endAuction()
  }

  /* **************************************************** */
  /*                      USE EFFECT                      */
  /* **************************************************** */
  useEffect(() => {
    const interval = setInterval(() => {
      getTimeLeft()
    }, 500)
    getAuctionDetails()

    return () => clearInterval(interval)
  }, [getTimeLeft()])

  /* ****************************************************** */
  /*                         RETURN                         */
  /* ****************************************************** */

  return (
    <Flex p={4} border={'1px'}>
      <Stack>
        {true ? (
          <>
            <Card fontSize={'md'} alignItems={'center'}>
              <CardHeader>
                <Heading size="md">{propertyInAuction}</Heading>
              </CardHeader>
              <Divider />
              <CardBody>
                <Stack alignItems={'center'}>
                  <Box>
                    {auctionMins == 0 && auctionSecs == 0 ? (
                      <Text fontWeight={'bold'}>No time left</Text>
                    ) : auctionSecs > 9 ? (
                      `${auctionMins} : ${auctionSecs}`
                    ) : (
                      `${auctionMins} : 0${auctionSecs}`
                    )}
                  </Box>
                  <Box>Highest Bid: ${highestBid}</Box>
                  <Box>
                    Highest bidder:
                    {highestBidder == ethers.constants.AddressZero ? ' No bidder yet' : sliceAddress(highestBidder)}
                  </Box>
                  <Box>Starter: {starter == ethers.constants.AddressZero ? <> Bank</> : sliceAddress(starter)}</Box>
                  <Box>Max minutes between bids: {maxTimespanBetweenBids / 60}</Box>
                  <Box>Minutes per auction {timePerAuction / 60}</Box>
                </Stack>
              </CardBody>
              <Stack>
                <Flex>
                  <NumberInput size="md" maxW={24} min={60} max={50000} onChange={(e) => setInputValue(Number(e))}>
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Web3Button
                    theme="dark"
                    isDisabled={!chainopolyCenter}
                    contractAddress={contracts.ChainopolyCenter}
                    action={async () => await e_chainopolyCenter.connect(signer).bid(Number(inputValue))}
                  >
                    Bid
                  </Web3Button>
                </Flex>
                <Web3Button
                  theme="light"
                  isDisabled={!chainopolyCenter}
                  contractAddress={contracts.ChainopolyCenter}
                  action={async () => await finalizeAuction()}
                >{`End auction`}</Web3Button>
              </Stack>
            </Card>
          </>
        ) : (
          <></>
        )}
      </Stack>
    </Flex>
  )
}
