import React from 'react';

interface CardProps {
  children: React.ReactNode;
  color?: 'white' | 'yellow' | 'purple' | 'orange' | 'pink' | 'green' | 'blue';
  className?: string;
  title?: string;
  rotate?: boolean;
  tape?: boolean; // New prop for scotch tape effect
}

const Card: React.FC<CardProps> = ({ children, color = 'white', className = '', title, rotate = false, tape = false }) => {
  const colors = {
    white: 'bg-white',
    yellow: 'bg-cartoon-yellow',
    purple: 'bg-cartoon-purple text-white',
    orange: 'bg-cartoon-orange',
    pink: 'bg-cartoon-pink text-white',
    green: 'bg-cartoon-green',
    blue: 'bg-cartoon-blue',
  };

  // Use custom hand-drawn border radius
  const shapeClass = rotate ? 'rounded-hand-2 rotate-1' : 'rounded-hand -rotate-1';

  return (
    <div className={`relative border-[3px] border-black shadow-doodle ${colors[color]} p-6 md:p-8 transition-transform hover:scale-[1.02] ${shapeClass} ${className}`}>
      
      {/* Scotch Tape Effect */}
      {tape && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-white/40 border-l border-r border-white/60 rotate-2 backdrop-blur-sm shadow-sm z-20"></div>
      )}

      {title && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white px-6 py-2 rounded-hand font-comic text-xl tracking-wide border-2 border-white shadow-md whitespace-nowrap z-10 rotate-1">
          {title}
        </div>
      )}
      
      <div className="relative z-0 h-full flex flex-col">
        {children}
      </div>
      
      {/* Doodle detail in corner */}
      <div className="absolute bottom-2 right-2 opacity-20 font-comic text-4xl pointer-events-none text-black rotate-12">
        #
      </div>
    </div>
  );
};

export default Card;