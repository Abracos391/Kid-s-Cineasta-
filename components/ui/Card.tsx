import React from 'react';

interface CardProps {
  children: React.ReactNode;
  color?: 'white' | 'yellow' | 'purple' | 'orange' | 'pink' | 'green' | 'blue';
  className?: string;
  title?: string;
  rotate?: boolean;
}

const Card: React.FC<CardProps> = ({ children, color = 'white', className = '', title, rotate = false }) => {
  const colors = {
    white: 'bg-white',
    yellow: 'bg-cartoon-yellow',
    purple: 'bg-cartoon-purple text-white',
    orange: 'bg-cartoon-orange',
    pink: 'bg-cartoon-pink text-white',
    green: 'bg-cartoon-green',
    blue: 'bg-cartoon-blue',
  };

  // Add a slight random rotation class logic if needed, or fixed specific rotation
  const rotationClass = rotate ? (Math.random() > 0.5 ? 'rotate-1' : '-rotate-1') : '';

  return (
    <div className={`relative rounded-3xl border-4 border-black shadow-cartoon-lg ${colors[color]} p-6 md:p-8 ${rotationClass} transition-transform hover:scale-[1.01] ${className}`}>
      {title && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white px-6 py-2 rounded-xl font-heading font-bold text-lg uppercase border-4 border-white shadow-md whitespace-nowrap z-10">
          {title}
        </div>
      )}
      <div className="relative z-0 h-full flex flex-col">
        {children}
      </div>
      
      {/* Decorative shine/highlight */}
      <div className="absolute top-4 right-4 w-4 h-4 bg-white rounded-full opacity-50 border-2 border-black pointer-events-none"></div>
    </div>
  );
};

export default Card;