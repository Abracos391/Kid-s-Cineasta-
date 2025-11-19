import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AvatarCreator from './pages/AvatarCreator';
import StoryWizard from './pages/StoryWizard';
import StoryReader from './pages/StoryReader';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen pb-12">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/avatars" element={<AvatarCreator />} />
          <Route path="/create-story" element={<StoryWizard />} />
          <Route path="/story/:id" element={<StoryReader />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;