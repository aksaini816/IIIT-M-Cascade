import { TraceTrustProvider } from './context/TraceTrustContext'
import { Layout } from './components/Layout'
import './index.css'

function App() {
  return (
    <TraceTrustProvider>
      <Layout />
    </TraceTrustProvider>
  )
}

export default App
