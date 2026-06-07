import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Pricing from './pages/Pricing';


function App() {
  return (
    <BrowserRouter>
        <Routes>
            <Route path= '/' element={<Home/>}/>
            <Route path= '/pricing' element={<Pricing/>}/>
        </Routes>
    </BrowserRouter>
  );
}

export default App;