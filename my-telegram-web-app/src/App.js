import React from 'react'
import { WebAppProvider } from '@vkruglikov/react-telegram-web-app'
import UserDataLoaderWrapper from './UserDataLoaderWrapper'
import PhotoChecklistsPage from './FotosChecklistPage' // Изменил импорт
import './App.css'

function App() {
  // Проверяем путь
  // const pathname = window.location.pathname;
  
  // if (pathname === '/fotosChekList') {
  //   return (
  //     <WebAppProvider>
  //       <PhotoChecklistsPage /> 
  //     </WebAppProvider>
  //   )
  // }
  
  // Обычное приложение для Telegram
  return (
    <WebAppProvider>
      <UserDataLoaderWrapper />
    </WebAppProvider>
  )
}

export default App