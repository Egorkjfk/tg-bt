// App.js
import React from 'react'
import { WebAppProvider } from '@vkruglikov/react-telegram-web-app'
import UserDataLoaderWrapper from './UserDataLoaderWrapper'
import './App.css'

function App() {
	return (
		<WebAppProvider>
			<UserDataLoaderWrapper />
		</WebAppProvider>
	)
}

export default App
