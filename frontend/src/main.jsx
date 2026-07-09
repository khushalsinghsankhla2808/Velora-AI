// PATH: frontend/src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
import store from './redux/store'

import { PersistGate } from 'redux-persist/integration/react'
import { persistStore } from 'redux-persist'
import axios from 'axios'
import { removeUserData } from './redux/userSlice'

// Configure global Axios interceptor for Bearer token fallback auth
axios.interceptors.request.use(
  (config) => {
    try {
      const persistRoot = localStorage.getItem('persist:ai-website-builder');
      if (persistRoot) {
        const rootState = JSON.parse(persistRoot);
        const userState = rootState.user ? JSON.parse(rootState.user) : null;
        const token = userState?.userData?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error("Error setting Authorization header:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Configure global Axios interceptor for handling 401 Invalid Token redirects
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const errCode = error.response.data?.error?.code;
      if (errCode === "INVALID_TOKEN" || errCode === "TOKEN_NOT_FOUND" || errCode === "USER_NOT_FOUND") {
        store.dispatch(removeUserData());
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

if (window.location.hostname === '127.0.0.1') {
  window.location.replace(
    window.location.href.replace('127.0.0.1', 'localhost'),
  )
}

const persistor = persistStore(store)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor} >
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>,
)
