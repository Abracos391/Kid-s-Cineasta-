
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Pricing from './pages/Pricing';
import AvatarCreator from './pages/AvatarCreator';
import StoryWizard from './pages/StoryWizard';
import StoryReader from './pages/StoryReader';
import Library from './pages/Library';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen pb-12">
          <Navbar />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
            
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            
            <Route path="/avatars" element={
              <ProtectedRoute>
                <AvatarCreator />
              </ProtectedRoute>
            } />
            
            <Route path="/create-story" element={
              <ProtectedRoute>
                <StoryWizard />
              </ProtectedRoute>
            } />
            
            <Route path="/story/:id" element={
              <ProtectedRoute>
                <StoryReader />
              </ProtectedRoute>
            } />
            
            {/* Biblioteca exige Premium? O prompt diz que Free não pode SALVAR, mas não explicitamente que não pode VER. 
                Porém, como não salva, a biblioteca estaria vazia. Vou proteger como rota comum, 
                mas dentro dela ou no Wizard o salvamento é bloqueado. */}
            <Route path="/library" element={
              <ProtectedRoute>
                <Library />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
