// APRESENTAÇÃO — o que entra em cada seção, para o convite "anuncie aqui" do caderno.
// Seção criada no painel sem descrição aqui usa o texto genérico.

const DESCRICOES: Record<string, string> = {
  imoveis: "Casas, apartamentos, lotes, salas, aluguel e temporada.",
  veiculos: "Carros, motos, caminhões, peças e acessórios.",
  "empregos-e-formacao-profissional": "Vagas, currículos, cursos e aulas.",
  "servicos-profissionais": "Fretes, reformas, diaristas, eletricistas, consertos.",
  "comercio-e-negocios": "Pontos comerciais, sociedades, equipamentos e franquias.",
  "para-sua-casa": "Móveis, eletrodomésticos, decoração e utilidades.",
  "eletronicos-e-informatica": "Computadores, notebooks, TVs, videogames e acessórios.",
  "celulares-e-tablets": "Aparelhos novos e usados, capas e carregadores.",
  "moda-e-beleza": "Roupas, calçados, bolsas, perfumes e salões.",
  "agricultura-e-pecuaria": "Máquinas, animais, sementes, chácaras e fazendas.",
  pet: "Filhotes, doação, banho e tosa, ração e acessórios.",
  "festas-e-eventos": "Buffet, som, decoração, fotografia e espaços.",
  "turismo-e-lazer": "Pousadas, passeios, excursões e temporada.",
  "musica-arte-e-cultura": "Instrumentos, aulas, artesanato e livros.",
  esportes: "Bicicletas, academia, equipamentos e aulas.",
  "bebes-e-criancas": "Carrinhos, berços, roupas, brinquedos e babás.",
  adulto: "Somente maiores de 18 anos, conforme os termos de uso.",
  diversos: "Tudo o que não cabe nas outras seções.",
}

const CHAMADAS: Record<string, string> = {
  imoveis: "Compra, venda e aluguel",
  veiculos: "Carros e motos",
  "empregos-e-formacao-profissional": "Vagas e currículos",
  "servicos-profissionais": "Serviços na sua cidade",
  "comercio-e-negocios": "Pontos e negócios",
  "para-sua-casa": "Móveis e eletrodomésticos",
  "eletronicos-e-informatica": "Computadores e TVs",
  "celulares-e-tablets": "Celulares e tablets",
  "moda-e-beleza": "Roupas, calçados e salões",
  "agricultura-e-pecuaria": "Máquinas, animais e terras",
  pet: "Filhotes e pet shops",
  "festas-e-eventos": "Buffet, som e decoração",
  "turismo-e-lazer": "Pousadas e passeios",
  "musica-arte-e-cultura": "Instrumentos e aulas",
  esportes: "Bicicletas e equipamentos",
  "bebes-e-criancas": "Carrinhos, berços e brinquedos",
  adulto: "Somente maiores de 18",
  diversos: "Outros anúncios",
}

export function descricaoDaSecao(slug: string): string {
  return DESCRICOES[slug] ?? "Compre, venda, alugue e ofereça serviços na sua cidade."
}

/** Título curto do convite da seção ("Carros e motos"). */
export function chamadaDaSecao(slug: string, nome: string): string {
  return CHAMADAS[slug] ?? nome
}
