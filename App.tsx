import React from 'react';
import NeonInvaders from './components/NeonInvaders';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-black flex flex-col items-center justify-center font-['Orbitron'] text-white overflow-hidden">
      <NeonInvaders />
    </div>
  );
};

export default App;