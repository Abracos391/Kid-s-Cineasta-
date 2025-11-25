
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
import SchoolRoom from './pages/SchoolRoom';
import SchoolLogin from './pages/SchoolLogin';
import SchoolLibrary from './pages/SchoolLibrary';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen pb-12">
          <Navbar />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            
            {/* Rota Pública (Porteiro da Escola) */}
            <Route path="/school-login" element={<SchoolLogin />} />

            {/* Página Inicial agora é protegida (redireciona para login se não logado) */}
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            
            <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
            
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
            
            {/* Rota Protegida (Modo Escola) */}
            <Route path="/school" element={
              <ProtectedRoute>
                <SchoolRoom />
              </ProtectedRoute>
            } />
            
            {/* Rota Protegida (Biblioteca Escolar) */}
            <Route path="/school-library" element={
              <ProtectedRoute>
                <SchoolLibrary />
              </ProtectedRoute>
            } />
            
            <Route path="/story/:id" element={
              <ProtectedRoute>
                <StoryReader />
              </ProtectedRoute>
            } />
            
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
