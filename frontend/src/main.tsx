import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import './index.css'
import App from './App.tsx'
import { getGraphqlHttpUri } from './graphqlEndpoint'

const graphqlUrl = getGraphqlHttpUri()

const client = new ApolloClient({
  link: new HttpLink({ uri: graphqlUrl, credentials: 'include' }),
  cache: new InMemoryCache(),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </StrictMode>,
)
