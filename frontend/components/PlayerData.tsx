import { Flex, Table, Tbody, Tr, Th, Td, Stack, Box, Divider } from '@chakra-ui/react'
import { useContract, useAddress, useSigner } from '@thirdweb-dev/react'
import { contracts } from '../../blockchain/post-deployment/addresses'
import { abi } from '../../blockchain/out/ChainopolyCenter.sol/ChainopolyCenter.json'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Buildings from './Buildings'
import Voting from './Voting'

import { Stat, StatLabel, StatNumber, StatHelpText, StatArrow, StatGroup } from '@chakra-ui/react'

export default function PlayerData(props: any) {
  /* **************************************************** */
  /*                     ETHERS SETUP                     */
  /* **************************************************** */
  const provider = new ethers.providers.JsonRpcProvider()
  const e_chainopolyCenter = new ethers.Contract(contracts.ChainopolyCenter, abi, provider)

  let player: any = useAddress()
  let signer: any = useSigner()
  const { contract: chainopolyCenter } = useContract(contracts.ChainopolyCenter, abi)

  /* ****************************************************** */
  /*                    HELPER FUNCTIONS                    */
  /* ****************************************************** */
  async function getPlayerGameID(): Promise<number> {
    return await e_chainopolyCenter.connect(signer).getPlayerGameID(signer.getAddress())
  }

  const checkSigner = async () => {
    if (signer) await signer.getAddress()
    else {
      signer = provider.getSigner()
      player = signer.getAddress()
    }
  }

  async function whereAmI(): Promise<[number, string]> {
    if ((await getPlayerGameID()) > 0) {
      let [place, name] = await e_chainopolyCenter.connect(signer).whereAmI()
      setLocation(place)
      setLocationName(name)
      return [place, name]
    } else return [0, '']
  }

  function sliceAddress(address: string) {
    return address.slice(0, 6) + '...' + address.slice(-4)
  }

  async function getPlayerBalance(): Promise<number> {
    if (props.playerGameID > 0) {
      const balance = await e_chainopolyCenter.connect(signer).myBalance()
      setBalance(Number(balance))
      return balance
    }
    return 0
  }

  const [invites, setInvites] = useState([])
  const [propertiesToBuildIn, setPropertiesToBuildIn] = useState([])

  async function whereCanIBuild(): Promise<void> {
    if ((await getPlayerGameID()) > 0) {
      const hereYouCanBuild = await e_chainopolyCenter.connect(signer).whereCanIBuildHouses()
      if (hereYouCanBuild.length > 0) setPropertiesToBuildIn(hereYouCanBuild)
    }
  }

  async function getMyInvites(): Promise<void> {
    if (props.playerGameID == 0) {
      const invites = await e_chainopolyCenter.connect(signer).myInvites()
      setInvites(invites)
    }
  }

  async function getPlayerDetails(): Promise<Object> {
    if (props.playerGameID > 0) {
      const playerDetails = await e_chainopolyCenter.connect(signer).whatDoIHave()
      setPlayerDetails(playerDetails)
      setOwnedPropertiesNames(playerDetails[1])
      setStrikes(Number(playerDetails[0][1]))
      setHouses(Number(playerDetails[0][2]))
      setHotels(Number(playerDetails[0][3]))
      setUtilities(Number(playerDetails[0][4]))
      setBlocktrains(Number(playerDetails[0][5]))
      setOutOfJailCards(Number(playerDetails[0][6]))
      setTurnsLeftInJail(Number(playerDetails[0][7]))
      setPropertiesPatrimony(Number(playerDetails[0][8]))
      setBuildingsPatrimony(Number(playerDetails[0][9]))
      setDebtWith(playerDetails[0][10])
      setDebt(Number(playerDetails[0][11]))
      setOwnedProperties(playerDetails[0][12])
      await getMortgagedProperties()
      setIsLoading(false)
      return playerDetails
    }
    return {}
  }

  async function isMortgaged(property: number): Promise<boolean> {
    return await e_chainopolyCenter.connect(signer).isMortgaged(property)
  }

  async function getMortgagedProperties() {
    let i: number = 0
    const mortgagedProperties: [] = []
    // for (; i < ownedPropertiesNames.length; i++) {
    //   if (await isMortgaged(Number(ownedPropertiesNames[i]))) mortgagedProperties.push(ownedPropertiesNames[i])
    // }
    setMortgagedProperties(mortgagedProperties)
  }
  /* **************************************************** */
  /*                      REACT STATE                     */
  /* **************************************************** */
  /* ---------------------- STRINGS --------------------- */

  const [location, setLocation] = useState('')
  const [locationName, setLocationName] = useState('')
  const [balance, setBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [playerDetails, setPlayerDetails] = useState([])
  const [strikes, setStrikes] = useState(0)
  const [houses, setHouses] = useState(0)
  const [mortgagedProperties, setMortgagedProperties] = useState([])
  const [hotels, setHotels] = useState(0)
  const [utilities, setUtilities] = useState(0)
  const [blocktrains, setBlocktrains] = useState(0)
  const [outOfJailCards, setOutOfJailCards] = useState(0)
  const [turnsLeftInJail, setTurnsLeftInJail] = useState(0)
  const [propertiesPatrimony, setPropertiesPatrimony] = useState(0)
  const [buildingsPatrimony, setBuildingsPatrimony] = useState(0)
  const [ownedPropertiesNames, setOwnedPropertiesNames] = useState([])
  const [ownedProperties, setOwnedProperties] = useState([])
  const [debt, setDebt] = useState(0)
  const [debtWith, setDebtWith] = useState('')
  /* **************************************************** */
  /*                      USE EFFECT                      */
  /* **************************************************** */

  useEffect(() => {
    const interval = setInterval(() => {
      if (!signer) return
      if (props.playerGameID > 0) {
        checkSigner()
        whereAmI()
        getPlayerBalance()
        getPlayerDetails()
        getMyInvites()
        // whereCanIBuild()
      }
    }, 500)
    return () => clearInterval(interval)
  }, [location, props.username])

  /* ****************************************************** */
  /*                         RETURN                         */
  /* ****************************************************** */

  let isReady: boolean = !isLoading && Number(props.playerGameID) > 0

  return (
    <Flex p={4} border={'1px'}>
      <Stack align={'center'}>
        <Box fontSize={'2xl'} fontWeight={'bold'}>
          {isReady && props.username != '' && props.username != undefined
            ? `${props.username}`
            : `${sliceAddress(String(player))}`}
        </Box>
        <Divider />
        <Flex>{invites}</Flex>

        <Table variant="striped" fontSize={'xs'}>
          <Tbody>
            {/* <StatGroup>
              <Stat>
                <StatLabel>Balance</StatLabel>
                <StatNumber>$ {balance}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  9.05%
                </StatHelpText>
              </Stat>
            </StatGroup> */}

            <Tr fontWeight={'bold'}>
              <Td>Last dice roll: </Td>
              <Td>
                {props.lastDiceRoll} {props.doubles == 1 ? `(doubles)` : `(no doubles)`}{' '}
              </Td>
            </Tr>

            <Tr fontWeight={'bold'}>
              <Td>Balance: </Td>
              <Td>$ {balance} </Td>
            </Tr>

            <Tr>
              <Td>Position: </Td>
              <Td>
                {locationName} ({Number(location)})
              </Td>
            </Tr>

            <Tr>
              <Td>Turns left in jail: </Td>
              <Td>{turnsLeftInJail} </Td>
            </Tr>
            <Tr>
              <Td>Strikes: </Td>
              <Td>{strikes} </Td>
            </Tr>
            <Tr>
              <Td>
                Owned <br /> properties:
              </Td>
              <Td>
                {ownedPropertiesNames.map((property, index) => (
                  <div key={index}>
                    {property} {`(${ownedProperties[index]})`}
                  </div>
                ))}
              </Td>
            </Tr>
            <Tr>
              <Td>Mortgaged properties: </Td>
              <Td>{mortgagedProperties} </Td>
            </Tr>
            <Tr>
              <Td>Properties patrimony: </Td>
              <Td>$ {propertiesPatrimony} </Td>
            </Tr>
            {/* <Tr>
              <Td>Utilities: </Td>
              <Td>{utilities} </Td>
            </Tr>
            <Tr>
              <Td>Blocktrains: </Td>
              <Td>{blocktrains} </Td>
            </Tr> */}
            <Tr>
              <Td>Houses: </Td>
              <Td>{houses} </Td>
            </Tr>
            <Tr>
              <Td>Hotels: </Td>
              <Td>{hotels} </Td>
            </Tr>
            <Tr>
              <Td>Buildings patrimony: </Td>
              <Td>{buildingsPatrimony} </Td>
            </Tr>

            <Tr>
              <Td>Out of jail cards: </Td>
              <Td>{outOfJailCards} </Td>
            </Tr>
            <Tr>
              <Td>Total debt: </Td>
              <Td>{debt} </Td>
            </Tr>
            {propertiesToBuildIn.length > 0 ? (
              <Tr>
                <Td>You can build in: </Td>
                <Td>{propertiesToBuildIn} </Td>
              </Tr>
            ) : (
              <></>
            )}
            <Tr>
              <Td>In debt with: </Td>
              <Td>
                {debtWith.slice(0, 4)}...{debtWith.slice(-4)}
              </Td>
            </Tr>
          </Tbody>
        </Table>

        <Buildings />
        <Voting playerGameID={props.playerGameID} />
      </Stack>
    </Flex>
  )
}
