import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Home: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-20 overflow-visible">
      
      {/* Hero Section: Imaginative & Chaotic */}
      <section className="relative text-center py-16">
        
        {/* Floating elements */}
        <div className="absolute top-0 left-[10%] text-7xl animate-float opacity-80 rotate-12">🪐</div>
        <div className="absolute bottom-10 right-[10%] text-7xl animate-float opacity-80 -rotate-12" style={{animationDelay: '1s'}}>🖍️</div>
        <div className="absolute top-20 right-[20%] text-6xl animate-spin-slow text-cartoon-yellow">★</div>

        <div className="relative inline-block z-10">
          {/* Background Splash */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[120%] h-[150%] bg-white border-[3px] border-black rounded-blob -z-10 rotate-3 shadow-doodle"></div>
          
          <h1 className="font-comic text-7xl md:text-9xl text-cartoon-blue text-stroke-black drop-shadow-md leading-none p-6 transform -rotate-2">
            CINEASTA <br/>
            <span className="text-cartoon-pink">KID'S</span>
          </h1>
        </div>

        <div className="mt-8 relative z-10">
            <span className="inline-block bg-cartoon-yellow border-[3px] border-black rounded-hand px-8 py-4 font-comic text-3xl text-black transform rotate-2 shadow-doodle">
                Onde sua imaginação vira filme! 🎬
            </span>
        </div>
        
        <div className="flex flex-wrap justify-center gap-8 mt-16 relative z-20">
          <Link to="/avatars" className="transform hover:-rotate-3 transition-transform group">
             <div className="bg-white p-2 border-[3px] border-black rounded-hand group-hover:bg-cartoon-green transition-colors">
                <Button size="lg" variant="primary" className="pointer-events-none">
                <span className="text-3xl block">🤪</span> Criar Meu Avatar
                </Button>
             </div>
          </Link>
          <Link to="/create-story" className="transform hover:rotate-3 transition-transform group">
            <div className="bg-white p-2 border-[3px] border-black rounded-hand group-hover:bg-cartoon-blue transition-colors">
                <Button size="lg" variant="danger" className="pointer-events-none">
                <span className="text-3xl block">🚀</span> Criar História
                </Button>
            </div>
          </Link>
        </div>
      </section>

      {/* How it works: Thought Bubbles style */}
      <section className="relative mt-24">
        <h2 className="text-center font-comic text-5xl mb-16 text-white text-stroke-black">Como funciona a mágica?</h2>
        
        <div className="grid md:grid-cols-3 gap-12 px-4">
            
            {/* Step 1 */}
            <div className="relative group">
                <div className="w-full bg-white border-[3px] border-black p-8 rounded-hand-2 shadow-doodle transform -rotate-2 group-hover:scale-105 transition-transform text-center">
                    <div className="text-6xl mb-4">📸</div>
                    <h3 className="font-comic text-2xl mb-2">1. Foto Maluca</h3>
                    <p className="font-sans text-lg font-bold">Tire uma foto fazendo careta. O computador vai te desenhar!</p>
                </div>
            </div>

             {/* Step 2 */}
             <div className="relative group mt-12 md:mt-0">
                <div className="w-full bg-cartoon-cream border-[3px] border-black p-8 rounded-hand shadow-doodle transform rotate-2 group-hover:scale-105 transition-transform text-center">
                    <div className="text-6xl mb-4">🤖</div>
                    <h3 className="font-comic text-2xl mb-2">2. Robô Artista</h3>
                    <p className="font-sans text-lg font-bold">Nossa IA transforma você em um personagem de desenho animado.</p>
                </div>
            </div>

             {/* Step 3 */}
             <div className="relative group mt-12 md:mt-0">
                <div className="w-full bg-white border-[3px] border-black p-8 rounded-hand-2 shadow-doodle transform -rotate-1 group-hover:scale-105 transition-transform text-center">
                    <div className="text-6xl mb-4">🍿</div>
                    <h3 className="font-comic text-2xl mb-2">3. Show Time!</h3>
                    <p className="font-sans text-lg font-bold">Escolha o que acontece e assista sua aventura narrada.</p>
                </div>
            </div>

        </div>
      </section>

      {/* Education Area - Sticker Style */}
      <div className="mt-20 relative">
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-cartoon-orange text-white font-comic px-8 py-2 border-[3px] border-black rotate-[-2deg] shadow-doodle z-10 text-2xl">
            Área dos Professores 🍎
        </div>
        <Card color="white" className="border-dashed border-4 border-gray-400 pt-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="bg-cartoon-purple p-6 rounded-blob border-[3px] border-black shadow-doodle shrink-0 animate-wobble-slow">
              <span className="text-6xl">🏫</span>
            </div>
            <div>
              <h2 className="font-comic text-4xl text-cartoon-purple mb-4">Modo Escola</h2>
              <p className="font-sans text-xl font-bold text-gray-800 leading-relaxed">
                Ambiente exclusivo para educadores criarem sequências didáticas, fábulas baseadas na BNCC e material de apoio.
              </p>
              <div className="mt-6 flex gap-4">
                <Link to="/school-login">
                    <Button size="sm" variant="success" className="-rotate-1">
                        🔐 Acesso do Educador
                    </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Footer */}
      <div className="text-center pt-16 pb-8">
        <p className="font-comic text-xl text-black/60">
            Feito com muito 🍫 e 🧃 para crianças de todas as idades.
        </p>
      </div>
    </div>
  );
};

export default Home;