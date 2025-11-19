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
  
  // Base styles: Thick border, heavy shadow, rounded-full or large rounded
  const baseStyles = "font-heading font-bold tracking-wide border-4 border-black shadow-cartoon transition-all active:translate-x-[3px] active:translate-y-[3px] active:shadow-cartoon-hover disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none rounded-2xl uppercase transform hover:-rotate-1";
  
  const variants = {
    primary: "bg-cartoon-pink text-white hover:bg-pink-400",
    secondary: "bg-white text-black hover:bg-gray-100",
    success: "bg-cartoon-green text-black hover:bg-green-400",
    danger: "bg-cartoon-orange text-black hover:bg-orange-400",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-8 py-3 text-lg",
    lg: "px-10 py-5 text-2xl",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${pulse ? 'animate-pulse' : ''} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <span className="animate-spin text-2xl">🌀</span>
          <span>Carregando...</span>
        </div>
      ) : children}
    </button>
  );
};

export default Button;