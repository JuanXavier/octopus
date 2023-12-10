import {
  Card,
  CardHeader,
  CardBody,
  Flex,
  Text,
  Stack,
  SimpleGrid,
  Box,
  Divider,
  Table,
  Thead,
  Input,
  Tbody,
  Tfoot,
  Tr,
  Th,
  FormLabel,
  Td,
  TableCaption,
  TableContainer,
  Heading,
  Badge,
  FormControl,
  Select,
} from '@chakra-ui/react'
import { useContract, useContractRead, useAddress, Web3Button } from '@thirdweb-dev/react'
import { contracts } from '../../blockchain/post-deployment/addresses'

import { abi } from '../../blockchain/out/ChainopolyCenter.sol/ChainopolyCenter.json'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export default function Offers(props: any) {
  /* **************************************************** */
  /*                     ETHERS SETUP                     */
  /* **************************************************** */
  const provider = new ethers.providers.JsonRpcProvider()
  const e_chainopolyCenter = new ethers.Contract(contracts.ChainopolyCenter, abi, provider)
  const signer = provider.getSigner()

  /* **************************************************** */
  /*                    THIRD WEB SETUP                    */
  /* **************************************************** */
  const player = useAddress()
  const { contract: chainopolyCenter } = useContract(contracts.ChainopolyCenter, abi)

  /* ****************************************************** */
  /*                    HELPER FUNCTIONS                    */
  /* ****************************************************** */
  type Offer = {
    fromPlayer: string
    toPlayer: string
    status: number
    cashOffered: number
    cashWanted: number
    outOfJailCardsOffered: number
    outOfJailCardsWanted: number
    propertiesOffered: number[]
    propertiesWanted: number[]
  }

  /**
   *   enum OfferStatus {
    Pending,
    Accepted,
    Rejected,
    Canceled
  }
   */
  async function iOfferYouThis(offer: Offer): Promise<void> {
    return await chainopolyCenter?.call('iOfferYouThis', [
      offer.toPlayer,
      offer.propertiesOffered,
      offer.propertiesWanted,
      offer.cashOffered,
      offer.cashWanted,
      offer.outOfJailCardsOffered,
      offer.outOfJailCardsWanted,
    ])
  }
  const [queriedOffer, setQueriedOffer] = useState<Offer>({
    fromPlayer: '',
    toPlayer: '',
    status: 0,
    cashOffered: 0,
    cashWanted: 0,
    outOfJailCardsOffered: 0,
    outOfJailCardsWanted: 0,
    propertiesOffered: [],
    propertiesWanted: [],
  })

  const [newOffer, setNewOffer] = useState<Offer>({
    fromPlayer: '',
    toPlayer: '',
    status: 0,
    cashOffered: 0,
    cashWanted: 0,
    outOfJailCardsOffered: 0,
    outOfJailCardsWanted: 0,
    propertiesOffered: [],
    propertiesWanted: [],
  })

  async function getOfferDetails(offerID: number): Promise<void> {
    const offer = await e_chainopolyCenter.connect(props.signer).offerDetails(offerID)
    setQueriedOffer(offer)
  }

  async function iCancelMyOffer(offerID: number) {
    await e_chainopolyCenter.connect(props.signer).iCancelMyOffer(offerID)
  }
  async function iAcceptYourOffer(offerID: number) {
    await e_chainopolyCenter.connect(props.signer).iAcceptYourOffer(offerID)
  }
  async function iRejectYourOffer(offerID: number) {
    await e_chainopolyCenter.connect(props.signer).iRejectYourOffer(offerID)
  }
  /* **************************************************** */
  /*                      REACT STATE                     */
  /* **************************************************** */

  const [input, setInput] = useState('')
  const [cancelOfferID, setCancelOfferID] = useState(0)
  const [acceptedOfferID, setAcceptedOfferID] = useState(0)
  const [rejectedOfferID, setRejectedOfferID] = useState(0)
  const [queriedOfferID, setQueriedOfferID] = useState(0)

  const isError = input === ''
  /* **************************************************** */
  /*                      USE EFFECT                      */
  /* **************************************************** */
  useEffect(() => {
    const interval = setInterval(() => {
      if (props.playerGameID > 0) {
      }
    }, 500)
    return () => clearInterval(interval)
  }, [player, props.playerInTurn, props.mins, props.secs])

  /* ****************************************************** */
  /*                         RETURN                         */
  /* ****************************************************** */

  return (
    <Box fontSize={'2xl'} alignContent={'center'} p={4} border={'1px'}>
      {/* CREATE OFFER */}
      <Flex mb={1}>
        <Web3Button contractAddress={contracts.ChainopolyCenter} action={async () => await iOfferYouThis(newOffer)}>
          Offer this
        </Web3Button>
        <Stack>
          <FormControl>
            <Input placeholder={'to'} onChange={(e) => setNewOffer({ ...newOffer, toPlayer: e.target.value })}></Input>
            <Input
              placeholder={'Properties Offered'}
              onChange={(e) => setNewOffer({ ...newOffer, propertiesOffered: e.target.value.split(',').map(Number) })}
            ></Input>
            <Input
              placeholder={'Properties Wanted'}
              onChange={(e) => setNewOffer({ ...newOffer, propertiesWanted: e.target.value.split(',').map(Number) })}
            ></Input>

            <Input
              placeholder={'Cash offered'}
              onChange={(e) => setNewOffer({ ...newOffer, cashOffered: Number(e.target.value) })}
            ></Input>
            <Input
              placeholder={'Cash wanted'}
              onChange={(e) => setNewOffer({ ...newOffer, cashWanted: Number(e.target.value) })}
            ></Input>
            <Input
              placeholder={'Out of jail cards wanted'}
              onChange={(e) => setNewOffer({ ...newOffer, outOfJailCardsWanted: Number(e.target.value) })}
            ></Input>
            <Input
              placeholder={'Out of jail cards offered'}
              onChange={(e) => setNewOffer({ ...newOffer, outOfJailCardsOffered: Number(e.target.value) })}
            ></Input>
          </FormControl>
        </Stack>
      </Flex>
      {/* CREATE OFFER */}

      {/* CANCEL MY OFFER */}
      <Flex>
        <Web3Button
          contractAddress={contracts.ChainopolyCenter}
          action={async () => {
            console.log(cancelOfferID)
            await iCancelMyOffer(cancelOfferID)
          }}
        >
          Cancel my offer
        </Web3Button>
        <FormControl isInvalid={isError}>
          <Input placeholder={'Offer ID'} onChange={(e) => setCancelOfferID(Number(e.target.value))}></Input>
        </FormControl>
      </Flex>
      {/* CANCEL MY OFFER */}
      {/* ACCEPT OFFER */}
      <Flex my={1}>
        <Web3Button
          contractAddress={contracts.ChainopolyCenter}
          action={async () => await iAcceptYourOffer(acceptedOfferID)}
        >
          Accept this offer
        </Web3Button>
        <FormControl isInvalid={isError}>
          <Input placeholder={'Offer ID'} onChange={(e) => setAcceptedOfferID(Number(e.target.value))}></Input>
        </FormControl>
      </Flex>
      {/* ACCEPT OFFER */}
      {/* REJECT OFFER */}
      <Flex>
        <Web3Button
          contractAddress={contracts.ChainopolyCenter}
          action={async () => await iRejectYourOffer(rejectedOfferID)}
        >
          Reject this offer
        </Web3Button>
        <FormControl isInvalid={isError}>
          <Input placeholder={'Offer ID'} onChange={(e) => setRejectedOfferID(Number(e.target.value))}></Input>
        </FormControl>
      </Flex>
      {/* REJECT OFFER */}
      {/* GET OFFER */}
      <Flex my={1}>
        <Web3Button
          contractAddress={contracts.ChainopolyCenter}
          action={async () => await getOfferDetails(queriedOfferID)}
        >
          Get offer
        </Web3Button>
        <FormControl isInvalid={isError}>
          <Input placeholder={'Offer ID'} onChange={(e) => setQueriedOfferID(Number(e.target.value))}></Input>
        </FormControl>
      </Flex>
      <Box>
        <ul>
          <li>To: {queriedOffer.toPlayer}</li>
          <li>Properties Offered: {queriedOffer.propertiesOffered.join(', ')}</li>
          <li>Properties Wanted: {queriedOffer.propertiesWanted.join(', ')}</li>
          <li>Cash Offered: {queriedOffer.cashOffered}</li>
          <li>Cash Wanted: {queriedOffer.cashWanted}</li>
          <li>Out of Jail Cards Offered: {queriedOffer.outOfJailCardsOffered}</li>
          <li>Out of Jail Cards Wanted: {queriedOffer.outOfJailCardsWanted}</li>
        </ul>
      </Box>

      {/* GET OFFER */}
    </Box>
  )
}
