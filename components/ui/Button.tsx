import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  pulse?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  className = '', 
  disabled,
  pulse = false,
  ...props 
}) => {
  
  // Base styles: Wobbly border, comic font
  const baseStyles = "font-comic tracking-wider border-[3px] border-black shadow-doodle transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-doodle-hover disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none transform hover:-rotate-1";
  
  // Using irregular border radius for hand-drawn feel
  const shapeStyles = "rounded-hand";

  const variants = {
    primary: "bg-cartoon-pink text-white hover:bg-pink-400",
    secondary: "bg-white text-black hover:bg-gray-100",
    success: "bg-cartoon-green text-black hover:bg-green-400",
    danger: "bg-cartoon-orange text-white hover:bg-orange-500",
  };

  const sizes = {
    sm: "px-4 py-1 text-lg",
    md: "px-8 py-2 text-2xl",
    lg: "px-10 py-4 text-4xl",
  };

  return (
    <button 
      className={`${baseStyles} ${shapeStyles} ${variants[variant]} ${sizes[size]} ${pulse ? 'animate-pulse' : ''} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <span className="animate-spin">🌀</span>
          <span>Carregando...</span>
        </div>
      ) : children}
    </button>
  );
};

export default Button;