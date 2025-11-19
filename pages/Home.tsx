import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Home: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-16">
      
      {/* Hero Section: Explosão Visual */}
      <section className="relative text-center space-y-8 py-12">
        
        {/* Elementos decorativos de fundo */}
        <div className="absolute top-0 left-10 text-6xl animate-wiggle opacity-60">⭐</div>
        <div className="absolute bottom-0 right-10 text-6xl animate-bounce-slow opacity-60">🎈</div>
        <div className="absolute top-20 right-20 text-4xl rotate-12 text-cartoon-yellow">⚡</div>

        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-cartoon-yellow rounded-[3rem] rotate-2 border-4 border-black shadow-cartoon-lg -z-10"></div>
          <h1 className="font-heading text-6xl md:text-8xl text-black drop-shadow-md leading-tight p-4">
            CINEASTA <br/><span className="text-white text-stroke-3 paint-order-stroke">KID'S</span>
          </h1>
        </div>

        <p className="font-heading text-2xl md:text-3xl text-black max-w-3xl mx-auto bg-white p-4 border-4 border-black rounded-2xl shadow-cartoon rotate-1">
          Crie desenhos animados onde <span className="text-cartoon-pink font-bold">VOCÊ</span> é o herói! 🚀
        </p>
        
        <div className="flex flex-wrap justify-center gap-8 mt-10">
          <Link to="/avatars" className="transform hover:-rotate-3 transition-transform">
            <Button size="lg" variant="primary" pulse>
              <span className="text-3xl block">🎨</span> Criar Avatar
            </Button>
          </Link>
          <Link to="/create-story" className="transform hover:rotate-3 transition-transform">
            <Button size="lg" variant="success">
              <span className="text-3xl block">🎬</span> Nova História
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works Steps */}
      <section className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
        {/* Linha pontilhada de conexão (apenas visual desktop) */}
        <div className="hidden md:block absolute top-1/2 left-0 w-full h-2 border-t-4 border-dashed border-black -z-10 transform -translate-y-1/2"></div>

        <div className="transform -rotate-2">
          <Card color="yellow" title="Passo 1">
            <div className="text-center flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-white rounded-full border-4 border-black flex items-center justify-center text-5xl shadow-cartoon">📸</div>
              <h3 className="font-heading font-bold text-2xl">Tire uma Foto</h3>
              <p className="font-sans font-bold text-lg">Faça uma careta ou sorria! Vamos te transformar em desenho.</p>
            </div>
          </Card>
        </div>

        <div className="transform rotate-2 mt-8 md:mt-0">
          <Card color="pink" title="Passo 2">
            <div className="text-center flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-white rounded-full border-4 border-black flex items-center justify-center text-5xl shadow-cartoon">🤖</div>
              <h3 className="font-heading font-bold text-2xl">Mágica da IA</h3>
              <p className="font-sans font-bold text-lg">Nossos robôs artistas vão desenhar uma caricatura incrível sua.</p>
            </div>
          </Card>
        </div>

        <div className="transform -rotate-1 mt-8 md:mt-0">
          <Card color="blue" title="Passo 3">
            <div className="text-center flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-white rounded-full border-4 border-black flex items-center justify-center text-5xl shadow-cartoon">🍿</div>
              <h3 className="font-heading font-bold text-2xl">Ação!</h3>
              <p className="font-sans font-bold text-lg">Escolha um tema maluco e assista sua história narrada.</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Education Mode Banner */}
      <div className="mt-12">
        <Card color="white" className="border-dashed border-4 border-cartoon-purple">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="bg-cartoon-purple p-6 rounded-full border-4 border-black shadow-cartoon shrink-0">
              <span className="text-5xl">🎓</span>
            </div>
            <div>
              <h2 className="font-heading font-bold text-3xl text-cartoon-purple mb-2">Para Professores e Escolas</h2>
              <p className="font-sans text-xl font-bold text-gray-800">
                Transforme a sala de aula em um estúdio de cinema! Crie roteiros educativos onde os alunos são os protagonistas. Estimule a criatividade e a leitura de forma lúdica.
              </p>
              <div className="mt-4">
                <Button size="sm" variant="secondary">Saiba mais sobre Planos Escolares</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Footer Decor */}
      <div className="text-center pt-12 pb-4">
        <p className="font-heading text-black opacity-50">Cineasta Kid's © 2025 • Feito com 💖 e 🤖</p>
      </div>
    </div>
  );
};

export default Home;