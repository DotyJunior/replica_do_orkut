import { Album } from '../types';

export const getInitialAlbums = (): Album[] => {
  return [
    // ------------------ ME: JUNIOR SOMBRA ------------------
    {
      id: 'me_rol_2008',
      profileId: 'me',
      name: 'Rolês de Lan House (2008)',
      description: 'Lembranças da época de ouro em Curitiba! Focando em overclocking, CS 1.6 com a galera e pizzas de madrugada com código fonte aberto.',
      theme: 'neon-hacker',
      createdAt: '12/05/2026',
      photos: [
        {
          id: 'me_photo_1',
          url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600',
          caption: 'Primeiro modding completo que fiz no meu gabinete! Neon verde fluorescente sob acrílico, muito chapa!',
          song: 'Linkin Park - Papercut',
          gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWZscDBsbnFlN3pqa3FjcndwNWZ5M3YweHFtNmxyZ2MzbzlwdjI4NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Y2pC52M48T9v2/giphy.gif',
          likes: 7,
          comments: [
            {
              id: 'c1_1',
              authorName: 'Alexandre Curi',
              authorAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
              text: 'Gabinete de alta estirpe, Júnior! Parece o painel de controle da usina do Paraná.',
              date: '14/05/2026 - 16:30'
            },
            {
              id: 'c1_2',
              authorName: 'H3_Elit3_Hacker',
              authorAvatar: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150',
              text: 'Isso brilha mais do que o banco de dados do provedor antigo. Curti o cable management!',
              date: '15/05/2026 - 18:10'
            }
          ],
          date: '12/05/2026'
        },
        {
          id: 'me_photo_2',
          url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600',
          caption: 'Ficando na corujona da Lan House Cyber-Sombra jogando Counter-Strike e compilando kernel em Rust. No-overflow total!',
          song: 'Evanescence - Bring Me To Life',
          gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3pjdWRhbW41dzNqNTRkOWI1aWNoOGtydWZmb3hyOGo5c2YxeTJjNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LMc8vEIsS0PFC/giphy.gif',
          likes: 12,
          comments: [
            {
              id: 'c1_3',
              authorName: 'Orkut Büyükkökten',
              authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
              text: 'Oh, those late night coffee mugs, CRT screens flickering and good code vibes. Love this vintage tech room!',
              date: '16/05/2026 - 22:15'
            }
          ],
          date: '12/05/2026'
        }
      ]
    },
    {
      id: 'me_prints_antigos',
      profileId: 'me',
      name: 'Prints Criptográficos',
      description: 'Isso sim era hacking de verdade. Compilações elegantes e logs de descriptografia simétrica.',
      theme: 'neon-hacker',
      createdAt: '18/05/2026',
      photos: [
        {
          id: 'me_photo_3',
          url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600',
          caption: 'Analisando logs de invasão e blindando os depoimentos contra injeção SQL clássica.',
          song: 'System of a Down - Chop Suey!',
          likes: 5,
          comments: [],
          date: '18/05/2026'
        }
      ]
    },

    // ------------------ ALEXANDRE CURI ------------------
    {
      id: 'ale_ass_2008',
      profileId: 'alexandre',
      name: 'Memórias da Assembleia Legislativa',
      description: 'Trabalho contínuo pelo estado do Paraná, debates públicos tecnológicos e festas regionais.',
      theme: 'old-camera',
      createdAt: '15/05/2026',
      photos: [
        {
          id: 'ale_photo_1',
          url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=600',
          caption: 'Sessão solene de lançamento do Plano Diretor de Banda Larga do interior do PR.',
          song: 'Legião Urbana - Que País É Este',
          likes: 24,
          comments: [
            {
              id: 'c2_1',
              authorName: 'Junior Sombra',
              authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              text: 'Debate de alto nível, deputado! Cibersegurança governamental é essencial.',
              date: '15/05/2026 - 19:40'
            }
          ],
          date: '15/05/2026'
        },
        {
          id: 'ale_photo_2',
          url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600',
          caption: 'O belo design arquitetônico de Curitiba refletido nos prédios públicos. Terra do pinhão seguro!',
          song: 'Capital Inicial - À Sua Maneira',
          likes: 18,
          comments: [],
          date: '16/05/2026'
        }
      ]
    },

    // ------------------ ORKUT BÜYÜKKÖKTEN ------------------
    {
      id: 'orkut_silicon_2004',
      profileId: 'orkut',
      name: 'Silicon Valley Memories (2004)',
      description: 'The real hardware machines and whiteboards when Orkut was born. Simple times, amazing people.',
      theme: 'cyberpunk',
      createdAt: '01/05/2026',
      photos: [
        {
          id: 'ork_photo_1',
          url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600',
          caption: 'Our main database server cabinet in Palo Alto back in 2004. Look at all those cables!',
          song: 'Coldplay - Clocks',
          gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcTYyeTFzbDN4bnFpeTdxNXBhbmtsajAweTViMmdnMnA2dzQxdnpxNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TdU3S76uAn7v83e6S7/giphy.gif',
          likes: 412,
          comments: [
            {
              id: 'c3_1',
              authorName: 'H3_Elit3_Hacker',
              authorAvatar: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150',
              text: 'So this is the famous silicon hub that I used to ping every morning in Belgrade!',
              date: '02/05/2026 - 03:12'
            },
            {
              id: 'c3_2',
              authorName: 'Junior Sombra',
              authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              text: 'História pura! Com o borrow checker de hoje, esse servidor precisaria de metade da ventilação, Orkut. Chapa!',
              date: '03/05/2026 - 12:44'
            }
          ],
          date: '01/05/2026'
        }
      ]
    },

    // ------------------ H3_ELIT3_HACKER ------------------
    {
      id: 'hacker_vulner_cyber',
      profileId: 'hacker',
      name: 'Terminal Labs & Cyberdeck',
      description: 'Se você chegou aqui, seu compilador é fraco e seus cookies de autenticação me enriqueceram.',
      theme: 'gotico',
      createdAt: '22/05/2026',
      photos: [
        {
          id: 'hac_photo_1',
          url: 'https://images.unsplash.com/photo-1601987177651-8edfe6c20009?w=600',
          caption: 'Onde compilamos exploits para quebrar a internet antiga e restaurar a anarquia analógica.',
          song: 'The Prodigy - Firestarter',
          gifUrl: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExejhpYzY0cnE5MmZwbTZleTZlajRkNzdpODhzd3VyOHEyMzd6MXZzeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ZElXUvIsO2ef6/giphy.gif',
          likes: 31,
          comments: [
            {
              id: 'c4_1',
              authorName: 'Junior Sombra',
              authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              text: 'Seu stack pointer está vazando na penúltima linha do monitor de fósforo verde, hein chapa.',
              date: '23/05/2026 - 04:50'
            }
          ],
          date: '22/05/2026'
        }
      ]
    }
  ];
};
