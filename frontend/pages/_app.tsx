import type { AppProps } from 'next/app'
import { ThirdwebProvider } from '@thirdweb-dev/react'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import Navbar from '../components/Navbar'
const activeChain = 'localhost'
import theme from '../components/Theme'
import { MyContextProvider } from '../components/MyContext'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <MyContextProvider>
      <ThirdwebProvider activeChain={activeChain}>
        <ChakraProvider theme={theme.ThemeConfig}>
          <ColorModeScript initialColorMode="dark" />
          <Navbar />
          <Component {...pageProps} />
        </ChakraProvider>
      </ThirdwebProvider>
    </MyContextProvider>
  )
}
