import {
  Flex,
  Input,
  Stack,
  Divider,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  FormControl,
  Box,
  Select,
  NumberDecrementStepper,
} from '@chakra-ui/react'
import { useContract, useContractRead, Web3Button, useAddress, useSigner } from '@thirdweb-dev/react'
import { contracts } from '../../blockchain/post-deployment/addresses'
import { abi } from '../../blockchain/out/ChainopolyCenter.sol/ChainopolyCenter.json'
import { abi as helpersAbi } from '../../blockchain/artifacts/contracts/libraries/ChainopolyHelpers.sol/ChainopolyHelpers.json'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Text } from '@chakra-ui/react'
import Jail from './Jail'
import CreateGame from './CreateGame'

export default function Buttons(props: any) {
  /* **************************************************** */
  /*                     ETHERS SETUP                     */
  /* **************************************************** */
  const provider = new ethers.providers.JsonRpcProvider()
  const e_chainopolyCenter = new ethers.Contract(contracts.ChainopolyCenter, abi, provider)

  /* **************************************************** */
  /*                    THIRD WEB SETUP                    */
  /* **************************************************** */
  const signer: any = useSigner()
  const { contract: chainopolyCenter } = useContract(contracts.ChainopolyCenter, abi)
  const { contract: chainopolyHelpers } = useContract(contracts.ChainopolyHelpers, helpersAbi)
  const { data: rollData, isLoading, error } = useContractRead(chainopolyHelpers, 'rollDice')

  async function rollDice(): Promise<void> {
    const [roll, doubles] = await chainopolyHelpers?.call('rollDice')
    console.log('Roll of dice', Number(roll), doubles)
  }
  async function getDebt(): Promise<number> {
    if (props.playerGameID > 0) {
      const playerDetails = await chainopolyCenter?.call('whatDoIHave')
      const debt = playerDetails[0][11]
      setDebt(debt)
      return debt
    }
    return 0
  }

  const [turnsLeftInJail, setTurnsLeftInJail] = useState(0)

  async function getTurnsLeftInJail(): Promise<void> {
    // const turnsInJail = await e_chainopolyCenter.connect(signer).turnsLeftInJail(signer.getAddress())
    const turnsInJail = await chainopolyCenter?.call('turnsLeftInJail', [signer.getAddress()])
    setTurnsLeftInJail(Number(turnsInJail))
  }

  /* ****************************************************** */
  /*                          STATE                         */
  /* ****************************************************** */
  const [inputValue, setInputValue] = useState(0)
  const [usernameInput, setUsernameInput] = useState('')
  const [debt, setDebt] = useState(0)

  async function rollAndMove(): Promise<void> {
    // await rollDice()
    let receipt

    if (false || chainopolyCenter != undefined) {
      console.log('A')
      receipt = await chainopolyCenter?.call('rollAndMove')
      console.log('Receipt is', receipt.receipt)
      await getEvents(receipt.receipt)
    } else {
      console.log('B')

      receipt = await e_chainopolyCenter.connect(signer).rollAndMove()
      const tx = await receipt.wait()
      console.log('Receipt is', tx)
      await getEvents(tx)
    }
    // console.log('New events', receipt.receipt.events.length)
  }

  const [mins, setMins] = useState(0)
  const [secs, setSecs] = useState(0)

  async function whoseTurnIsIt(): Promise<void> {
    // const [, mins, secs] = await e_chainopolyCenter.connect(signer).whoseTurnIsIt()
    const [, mins, secs] = await chainopolyCenter?.call('whoseTurnIsIt')

    setMins(Number(mins))
    setSecs(Number(secs))
  }

  async function pickCard(): Promise<void> {
    const receipt = await chainopolyCenter?.call('pickCard')
    console.log('Full receipt', receipt)
    console.log(receipt.receipt.events[0].topics, receipt.receipt.events[1].topics)
  }

  async function getEvents(event: any): Promise<void> {
    await props.getEvents(event)
  }

  /* ****************************************************** */
  /*                       USE EFFECT                       */
  /* ****************************************************** */
  const player = useAddress()

  useEffect(() => {
    const interval = setInterval(() => {
      getTurnsLeftInJail()

      if (props.playerGameID > 0) getDebt()
    }, 200)
    return () => clearInterval(interval)
  }, [props.playerInTurn, mins, secs, props.signer])

  /* **************************************************** */
  /*                        RETURN                        */
  /* **************************************************** */

  // 3 events when rolling from 10 to 18 (millersplanet)
  // 1 when buying
  return (
    <Flex py={8} border={'1px'}>
      <Stack>
        {/* SET USERNAME */}
        {props.username == '' || props.username == undefined ? (
          <Flex>
            <Web3Button
              style={{ backgroundColor: 'cyan' }}
              isDisabled={!chainopolyCenter}
              contractAddress={contracts.ChainopolyCenter}
              action={async (chainopolyCenter) => await chainopolyCenter.call('setUsername', [usernameInput])}
            >{`Set username`}</Web3Button>
            <FormControl>
              <Input isRequired type="text" onChange={(e) => setUsernameInput(e.target.value)} />
            </FormControl>
          </Flex>
        ) : (
          <></>
        )}
        {/* SET USERNAME */}
        {/* START GAME */}
        {props.playerGameID > 0 ? (
          <>
            {props.gameStatus == 'Ready To Start' ? (
              <Web3Button
                style={{ backgroundColor: 'pink' }}
                isDisabled={!chainopolyCenter || props.gameStatus != 'Ready To Start'}
                contractAddress={contracts.ChainopolyCenter}
                action={async (chainopolyCenter) => await chainopolyCenter.call('startGame')}
                onError={(err) => console.log(err)}
              >{`Start Game`}</Web3Button>
            ) : (
              <></>
            )}
          </>
        ) : (
          <>
            <CreateGame signer={props.signer} />
            {/* JOIN GAME */}
            <Flex>
              <Input onChange={(e) => setInputValue(Number(e.target.value))} />
              <Web3Button
                isDisabled={!chainopolyCenter}
                contractAddress={contracts.ChainopolyCenter}
                action={async (chainopolyCenter) => await chainopolyCenter.call('joinGame', [inputValue])}
                onError={(error) => console.log(error)}
              >{`Join Game`}</Web3Button>
            </Flex>
            {/* JOIN GAME */}
          </>
        )}
        <Stack>
          {/* ROLL AND MOVE */}
          {(props.playerInTurn == player && !props.diceRolledThisTurn) ||
          (props.playerInTurn == player &&
            props.diceRolledThisTurn &&
            props.doublesCount > 0 &&
            props.doublesCount < 3) ? (
            <Stack>
              <Web3Button
                style={{ backgroundColor: 'violet', fontStyle: 'italic' }}
                isDisabled={!chainopolyCenter}
                contractAddress={contracts.ChainopolyCenter}
                overrides={{
                  gasLimit: 5000000, // The maximum amount of gas this transaction is permitted to use.
                  maxFeePerGas: 5000000, // The maximum price (in wei) per unit of gas this transaction will pay
                }}
                action={async (chainopolyCenter) => await chainopolyCenter.call('rollAndMove')}
                onError={async (error) => console.log('Error', error)}
              >{`Roll and Move`}</Web3Button>

              <Flex>
                <Web3Button
                  isDisabled={!chainopolyCenter}
                  contractAddress={contracts.ChainopolyCenter}
                  action={async () => {
                    // const receipt = await e_chainopolyCenter.connect(signer).useBlocktrain(inputValue)
                    const receipt = await chainopolyCenter?.call('useBlocktrain', [inputValue])
                    await getEvents(receipt.receipt)
                  }}
                >{`Use Blocktrain Travel`}</Web3Button>

                <FormControl>
                  <Select placeholder="Select Destination" onChange={(e) => setInputValue(Number(e.target.value))}>
                    <option value={5}>Remix Blocktrain</option>
                    <option value={15}>Truffle Blocktrain</option>
                    <option value={25}>Hardhat Blocktrain</option>
                    <option value={35}>Foundry Blocktrain</option>
                  </Select>
                </FormControl>
              </Flex>
            </Stack>
          ) : (
            <></>
          )}
          {/* ROLL AND MOVE */}
          {/*BLOCKTRAIN TRAVEL*/}

          {/*BLOCKTRAIN TRAVEL*/}
        </Stack>

        {/*Player has to decide */}
        {props.gameStatus == 'Player Has To Decide' ? (
          <Flex justifyContent={'space-between'}>
            {/* BUY */}
            <Web3Button
              isDisabled={!chainopolyCenter}
              style={{ backgroundColor: 'lightgreen' }}
              contractAddress={contracts.ChainopolyCenter}
              action={async (chainopolyCenter) => {
                const receipt = await chainopolyCenter.call('buyOrNot', [true])
                console.log('receipt', receipt)
                await getEvents(receipt.receipt)
              }}
              onError={async (error) => await console.log('Error', error)}
            >{`Buy`}</Web3Button>
            {/* BUY */}
            {/* DONT BUY */}
            <Web3Button
              isDisabled={!chainopolyCenter}
              style={{ backgroundColor: 'pink' }}
              contractAddress={contracts.ChainopolyCenter}
              action={async (chainopolyCenter) => {
                const receipt = await chainopolyCenter.call('buyOrNot', [false])
                console.log(receipt)
                await getEvents(receipt.receipt)
              }}
            >{`Dont Buy`}</Web3Button>
            {/* DONT BUY */}
          </Flex>
        ) : (
          <> </>
        )}
        {/*Player has to decide */}

        {/*INCOME TAX*/}
        {props.gameStatus == 'Player Has To Pay High Gas Fees' ? (
          <Box>
            <Flex justifyContent={'space-between'}>
              <Web3Button
                style={{ backgroundColor: 'deepskyblue' }}
                isDisabled={!chainopolyCenter}
                contractAddress={contracts.ChainopolyCenter}
                action={async (chainopolyCenter) => {
                  const receipt = await chainopolyCenter.call('payHighGasFees', [true])
                  await getEvents(receipt.receipt)
                  console.log('New events', receipt.receipt.events.length)
                  console.log(receipt.receipt.events)
                }}
              >{`Pay 10% of patrimony`}</Web3Button>
              <Web3Button
                style={{ backgroundColor: 'lightseagreen' }}
                isDisabled={!chainopolyCenter}
                contractAddress={contracts.ChainopolyCenter}
                action={async (chainopolyCenter) => {
                  const receipt = await chainopolyCenter.call('payHighGasFees', [false])
                  await getEvents(receipt.receipt)
                }}
              >{`Pay $200`}</Web3Button>
            </Flex>
          </Box>
        ) : (
          <></>
        )}
        {/*INCOME TAX*/}

        {/* NEXT TURN */}
        {props.playerInTurn == player || (mins == 0 && secs == 0) ? (
          <Web3Button
            isDisabled={!chainopolyCenter}
            contractAddress={contracts.ChainopolyCenter}
            action={async (chainopolyCenter) => {
              const receipt = await chainopolyCenter.call('nextTurn')
              await getEvents(receipt.receipt)
            }}
          >{`End turn`}</Web3Button>
        ) : (
          <></>
        )}
        {/* NEXT TURN */}

        {/* PAY MY DEBT */}
        {debt > 0 ? (
          <Web3Button
            isDisabled={!chainopolyCenter}
            contractAddress={contracts.ChainopolyCenter}
            action={async (chainopolyCenter) => await chainopolyCenter.call('payMyDebt')}
          >{`Pay my debt`}</Web3Button>
        ) : (
          <></>
        )}

        {/* PICK A CARD */}
        {props.gameStatus == 'Player Has To Pick Card' ? (
          <Web3Button
            isDisabled={!chainopolyCenter}
            contractAddress={contracts.ChainopolyCenter}
            action={async (chainopolyCenter) => await pickCard()}
          >{`Pick a card`}</Web3Button>
        ) : (
          <></>
        )}

        {/*MORTGAGE / UNMORTGAGE PROPERTY*/}
        <Flex>
          <NumberInput size="md" maxW={24} defaultValue={1} min={1} max={39} onChange={(e) => setInputValue(Number(e))}>
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Web3Button
            isDisabled={!chainopolyCenter}
            contractAddress={contracts.ChainopolyCenter}
            action={async (chainopolyCenter) => await chainopolyCenter.call('mortgageMyProperty', [inputValue])}
          >{`Mortgage`}</Web3Button>
          <Web3Button
            isDisabled={!chainopolyCenter}
            contractAddress={contracts.ChainopolyCenter}
            action={async (chainopolyCenter) => await chainopolyCenter.call('unmortgageMyProperty', [inputValue])}
          >{`Unmortgage`}</Web3Button>
        </Flex>
        {/*UNMORTGAGE PROPERTY*/}

        {/* JAIL */}
        {turnsLeftInJail > 0 ? <Jail /> : <></>}
        {/* JAIL */}
      </Stack>
    </Flex>
  )
}
