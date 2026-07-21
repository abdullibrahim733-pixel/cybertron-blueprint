import { ApolloClient, InMemoryCache, createHttpLink, ApolloProvider } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { RouterProvider, createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { Dashboard } from './pages/Dashboard';
import { ProjectView } from './pages/ProjectView';
import { PartsSearch } from './pages/PartsSearch';
import { AiDesign } from './pages/AiDesign';
import { Login } from './pages/Login';

// Apollo Client setup
const httpLink = createHttpLink({
  uri: '/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('cybertron-token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

// Router setup
const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
});

const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/project/$projectId',
  component: ProjectView,
});

const partsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/parts',
  component: PartsSearch,
});

const aiDesignRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ai/$projectId',
  component: AiDesign,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectRoute,
  partsRoute,
  aiDesignRoute,
  loginRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function Main() {
  return (
    <ApolloProvider client={apolloClient}>
      <RouterProvider router={router} />
    </ApolloProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
