import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Tooltip } from 'react-bootstrap';

import HomePage from './routes/HomePage';
import AskPassPage from './routes/AskPassPage';

function App() {
  useEffect(() => {
    // Configure Bootstrap tooltips globally
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
      // Bootstrap tooltip initialization would go here if needed
    });
  }, []);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/password" element={<AskPassPage />} />
    </Routes>
  );
}

export default App;
