import {
  Flex,
  Spinner,
  Stack,
  Box,
  Divider,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Heading,
  Badge,
} from '@chakra-ui/react'
import { useContract, useContractRead, useAddress, useSigner, Web3Button } from '@thirdweb-dev/react'
import { contracts } from '../../blockchain/post-deployment/addresses'

import { abi } from '../../blockchain/out/ChainopolyCenter.sol/ChainopolyCenter.json'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

/**
 * 73a0b0f0 => clearMyGameID()
57dcec2f => clearPlayersInGame(uint256)
 */

export default function Voting(props: any) {
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

  /* **************************************************** */
  /*                      REACT STATE                     */
  /* **************************************************** */
  const [votingResults, setVotingResults] = useState(false)
  const [votes, setVotes] = useState(0)
  /* ****************************************************** */
  /*                    HELPER FUNCTIONS                    */
  /* ****************************************************** */

  async function voteToEndGame(decision: boolean): Promise<void> {
    await e_chainopolyCenter.connect(signer).voteToEndGame(decision)
  }

  async function giveUp(): Promise<void> {
    await e_chainopolyCenter.connect(signer).giveUp()
  }
  async function endGame(): Promise<void> {
    await e_chainopolyCenter.connect(signer).endGame()
  }

  async function getVotingResults(): Promise<void> {
    const [votes, result] = await e_chainopolyCenter.connect(signer).endGameVotingResult()
    setVotes(Number(votes))
    setVotingResults(result)
  }

  /* **************************************************** */
  /*                      USE EFFECT                      */
  /* **************************************************** */
  useEffect(() => {
    const interval = setInterval(() => {
      // getVotingResults()
    }, 500)
    return () => clearInterval(interval)
  }, [signer])

  /* ****************************************************** */
  /*                         RETURN                         */
  /* ****************************************************** */

  if (!signer) return <Spinner />

  return (
    <Box p={4} border={'1px'}>
      <Card alignItems={'center'}>
        <CardHeader>
          <Heading size="md">Voting</Heading>
        </CardHeader>
        <Divider />
        <CardBody>
          <Badge>{votes}</Badge>
          {votingResults == false ? `votes so game goes on` : `so game can end now`}
        </CardBody>
        {votingResults == false ? (
          <Flex>
            <Web3Button
              isDisabled={!chainopolyCenter}
              contractAddress={contracts.ChainopolyCenter}
              action={async () => await voteToEndGame(true)}
            >
              Vote to end
            </Web3Button>
            <Web3Button
              isDisabled={!chainopolyCenter}
              contractAddress={contracts.ChainopolyCenter}
              action={async () => await endGame()}
            >
              Vote to continue
            </Web3Button>
          </Flex>
        ) : (
          <Web3Button
            isDisabled={!chainopolyCenter}
            contractAddress={contracts.ChainopolyCenter}
            action={async () => await endGame()}
          >
            End game
          </Web3Button>
        )}

        {/* GIVE UP */}
        <Flex mt={1}>
          <Web3Button
            style={{ backgroundColor: 'red', fontWeight: '800' }}
            isDisabled={!chainopolyCenter || props.playerGameID == 0}
            contractAddress={contracts.ChainopolyCenter}
            action={async () => await giveUp()}
          >{`Give up`}</Web3Button>
          {/* GIVE UP */}
        </Flex>
      </Card>
    </Box>
  )
}
