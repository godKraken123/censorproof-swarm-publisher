import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { installLoopbackFetchSupport } from './swarm/loopbackFetch'
import './styles.css'

installLoopbackFetchSupport()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
