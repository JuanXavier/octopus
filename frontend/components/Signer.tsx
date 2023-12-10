import { useEffect } from 'react'
import { useSigner, Web3Button } from '@thirdweb-dev/react'
import { contracts } from '../../blockchain/post-deployment/addresses'

export default function SignerChecker() {
  const signer = useSigner()

  useEffect(() => {
    checkSigner()
    return () => {}
  }, [signer])

  const checkSigner = async () => {
    if (signer) console.log('Signer address:', await signer.getAddress())
    else console.log('No signer available.')
  }

  return (
    <div>
      <Web3Button contractAddress={contracts.ChainopolyCenter} action={checkSigner}>
        Check Signer
      </Web3Button>
    </div>
  )
}
