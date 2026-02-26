import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import CinemaFilmsPage from './pages/CinemaFilmsPage'
import FilmDetailsPage from './pages/FilmDetailsPage'
import SessionSelectionPage from './pages/SessionSelectionPage'
import './styles/App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/cinema/:cinemaId" element={<CinemaFilmsPage />} />
            <Route path="/film/:filmId" element={<FilmDetailsPage />} />
            <Route path="/film/:filmId/sessions" element={<SessionSelectionPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
