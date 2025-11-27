
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Tutorial: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cartoon-blue p-4 md:p-8 font-comic">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-12 text-center">
        <h1 className="text-6xl text-white text-stroke-black drop-shadow-md mb-4 animate-bounce-slow">
          Guia do Cineasta 🎬
        </h1>
        <p className="text-xl text-white font-bold bg-black/20 inline-block px-4 py-2 rounded-xl">
          Aprenda a usar o aplicativo passo-a-passo!
        </p>
        <div className="mt-8">
            <Button onClick={() => navigate(-1)} variant="secondary" className="border-2 shadow-none">
                ⬅️ Voltar
            </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-16">

        {/* PASSO 1: CADASTRO */}
        <Section 
            number="1" 
            title="O Passaporte Mágico (Cadastro)" 
            color="yellow"
            emoji="🎫"
        >
            <p>Antes de começar a diversão, você precisa do seu passaporte! Na tela inicial, escolha <strong>"Criar Conta"</strong>.</p>
            <ul className="list-disc pl-6 space-y-2 mt-2 font-sans font-bold text-gray-700">
                <li>Coloque o nome do seu responsável (Papai ou Mamãe).</li>
                <li>Digite um e-mail válido.</li>
                <li>Crie uma senha secreta!</li>
            </ul>
            <ImagePlaceholder label="Print da Tela de Cadastro (Auth.tsx)" />
        </Section>

        {/* PASSO 2: AVATARES */}
        <Section 
            number="2" 
            title="Fábrica de Avatares" 
            color="green"
            emoji="👾"
        >
            <p>Agora vamos criar os atores do seu filme! Clique em <strong>"Avatares"</strong> no menu.</p>
            <p className="mt-2">Você tem duas opções:</p>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="bg-white p-4 rounded-xl border-2 border-black">
                    <span className="text-2xl">📸</span> <strong>Câmera:</strong> Tire uma foto na hora fazendo careta!
                </div>
                <div className="bg-white p-4 rounded-xl border-2 border-black">
                    <span className="text-2xl">📂</span> <strong>Galeria:</strong> Escolha uma foto que já existe no computador.
                </div>
            </div>
            <p className="mt-4 text-sm bg-yellow-100 p-2 rounded border border-yellow-500">
                💡 <strong>Dica:</strong> O robô vai transformar sua foto em desenho 3D automaticamente!
            </p>
            <ImagePlaceholder label="Print da Tela de Criação de Avatar (AvatarCreator.tsx)" />
        </Section>

        {/* PASSO 3: CRIAR HISTÓRIA */}
        <Section 
            number="3" 
            title="Escrevendo o Roteiro" 
            color="pink"
            emoji="✍️"
        >
            <p>Vá para <strong>"Criar História"</strong>. Aqui a mágica acontece!</p>
            <ol className="list-decimal pl-6 space-y-2 mt-4 font-sans font-bold text-gray-700">
                <li>Escolha até 3 amigos (clique nos avatares).</li>
                <li>Escreva sua ideia na caixa de texto. Pode ser qualquer coisa! <br/><em>Ex: "Uma viagem para a lua feita de queijo".</em></li>
                <li>Clique no botão gigante <strong>CRIAR HISTÓRIA</strong>.</li>
            </ol>
            <ImagePlaceholder label="Print da Tela StoryWizard com avatares selecionados" />
        </Section>

        {/* PASSO 4: LENDO E OUVINDO */}
        <Section 
            number="4" 
            title="Luz, Câmera, Ação!" 
            color="blue"
            emoji="🍿"
        >
            <p>Sua história ficou pronta! Agora você pode:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2 font-sans font-bold text-gray-700">
                <li>Ler os capítulos ilustrados.</li>
                <li>Clicar em <strong>"🔊 Narrar"</strong> para o computador ler para você.</li>
                <li>No final, clicar em <strong>"📚 Baixar PDF"</strong> para imprimir seu livro!</li>
            </ul>
            <ImagePlaceholder label="Print da Tela de Leitura (StoryReader) mostrando a imagem e texto" />
        </Section>

        {/* EXTRA: MODO ESCOLA */}
        <div className="border-t-4 border-dashed border-black/20 pt-12">
            <Section 
                number="Extra" 
                title="Para Professores (Modo Escola)" 
                color="white"
                emoji="🍎"
            >
                <p>O <strong>Cineasta Kids</strong> também é uma ferramenta de ensino!</p>
                <p className="mt-2">Para acessar:</p>
                <ol className="list-decimal pl-6 space-y-2 mt-2 font-sans text-gray-700">
                    <li>Na tela inicial (antes de logar), clique em <strong>"Acesso do Educador"</strong>.</li>
                    <li>Faça o cadastro da sua Escola.</li>
                    <li>Na <strong>Sala de Aula</strong>, organize os alunos nas cadeiras.</li>
                    <li>Use a <strong>Lousa Mágica</strong> para criar fábulas educativas baseadas na BNCC.</li>
                </ol>
                <ImagePlaceholder label="Print da Sala de Aula (SchoolRoom.tsx)" />
            </Section>
        </div>

        {/* RODAPÉ */}
        <div className="text-center pb-12">
            <h3 className="font-heading text-3xl text-white text-stroke-black mb-6">Pronto para começar?</h3>
            <Link to="/auth">
                <Button size="lg" variant="success" className="animate-pulse">
                    🚀 IR PARA O APLICATIVO
                </Button>
            </Link>
        </div>

      </div>
    </div>
  );
};

// Componentes Auxiliares para o Tutorial

const Section: React.FC<{number: string, title: string, color: any, emoji: string, children: React.ReactNode}> = ({ number, title, color, emoji, children }) => (
    <Card color={color} className="relative overflow-visible">
        <div className="absolute -top-6 -left-6 w-16 h-16 bg-black text-white rounded-full flex items-center justify-center font-comic text-3xl border-4 border-white shadow-lg transform -rotate-12 z-10">
            {number}
        </div>
        <div className="ml-8">
            <h2 className="font-heading text-3xl mb-4 flex items-center gap-2">
                <span className="text-4xl">{emoji}</span> {title}
            </h2>
            <div className="text-lg leading-relaxed">
                {children}
            </div>
        </div>
    </Card>
);

const ImagePlaceholder: React.FC<{label: string}> = ({ label }) => (
    <div className="mt-6 w-full h-64 border-4 border-dashed border-black/30 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center p-4 group hover:bg-gray-100 transition-colors cursor-help">
        <div className="text-6xl opacity-20 mb-2 group-hover:scale-110 transition-transform">📷</div>
        <p className="font-bold text-gray-400 uppercase tracking-widest text-sm">{label}</p>
        <p className="text-xs text-gray-400 mt-2">(Substitua esta área por um print real do app)</p>
    </div>
);

export default Tutorial;
