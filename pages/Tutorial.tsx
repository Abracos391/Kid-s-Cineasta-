import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

// Imagens provisórias da internet para não deixar o app quebrado
const FALLBACK_IMAGES: Record<string, string> = {
    '/print_cadastro.png': 'https://images.unsplash.com/photo-1614036634955-897d51970663?auto=format&fit=crop&w=800&q=80', // Ex: Tela de Login
    '/print_avatar.png': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',   // Ex: Livro/Criação
    '/print_historia.png': 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80', // Ex: Montanhas/História
    '/print_leitura.png': 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?auto=format&fit=crop&w=800&q=80',  // Ex: Leitura
    '/print_escola.png': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80'    // Ex: Escola
};

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
                <li>Digite um e-mail válido ou WhatsApp.</li>
                <li>Crie uma senha secreta!</li>
            </ul>
            <TutorialImage 
                src="/print_cadastro.png" 
                label="Tela de Cadastro" 
            />
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
            <TutorialImage 
                src="/print_avatar.png" 
                label="Tela de Criação de Avatar" 
            />
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
            <TutorialImage 
                src="/print_historia.png" 
                label="Tela de Criação de História" 
            />
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
                <li>Clicar em <strong>"🎥 Gerar Filme"</strong> para criar um vídeo MP4!</li>
                <li>No final, clicar em <strong>"📚 Baixar PDF"</strong> para imprimir seu livro!</li>
            </ul>
            <TutorialImage 
                src="/print_leitura.png" 
                label="Tela de Leitura e Vídeo" 
            />
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
                <TutorialImage 
                    src="/print_escola.png" 
                    label="Tela da Sala de Aula" 
                />
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

// Componentes Auxiliares

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

// Componente de imagem inteligente
// Se não encontrar o arquivo no computador, usa uma imagem da internet (Fallback)
const TutorialImage: React.FC<{src: string, label: string}> = ({ src, label }) => {
    const [imgSrc, setImgSrc] = useState(src);
    const [hasError, setHasError] = useState(false);

    const handleError = () => {
        // Se der erro ao carregar o arquivo local, tenta o fallback da web
        if (!hasError && FALLBACK_IMAGES[src]) {
            setImgSrc(FALLBACK_IMAGES[src]);
            setHasError(true); 
        }
    };

    return (
        <div className="mt-6 rounded-xl border-4 border-black overflow-hidden shadow-lg transform rotate-1 hover:rotate-0 transition-transform bg-white relative group">
            <img 
                src={imgSrc} 
                alt={label} 
                className="w-full h-auto object-cover max-h-80"
                onError={handleError}
                loading="lazy"
            />
            
            {hasError && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] p-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    (Imagem ilustrativa. Adicione o arquivo '{src}' na pasta 'public' para ver o original)
                </div>
            )}
        </div>
    );
};

export default Tutorial;