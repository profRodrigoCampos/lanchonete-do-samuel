/* Cardápio da Lanchonete do Samuel
 * ================================
 * Este é o ÚNICO lugar com itens e preços. Para mudar um preço, mude só aqui.
 *
 * Detalhe interessante para estudo: o mesmo arquivo roda em dois lugares.
 *  - No navegador ele vira a variável global window.CARDAPIO
 *    (carregado com <script src="/js/cardapio.js">).
 *  - No Node.js ele é carregado com require() e exportado por module.exports.
 * O "envelope" (function (raiz) { ... })(this) é uma IIFE (função executada na
 * hora) que evita espalhar variáveis no escopo global.
 *
 * Os preços são números inteiros e baixos de propósito: a criança faz as
 * contas nos dedos (o pedido mais caro possível dá exatamente R$ 10).
 */
(function (raiz) {
  // Os dados ficam em objetos e listas (arrays). Cada item tem um "id"
  // curto, usado no código, e um "nome", mostrado na tela.
  var CARDAPIO = {
    lanches: {
      hamburguer: { nome: 'Hambúrguer', precoPorCarnes: { 1: 3, 2: 4 } },
      hotdog: { nome: 'Hot dog', descricao: 'Pão + 1 salsicha', preco: 2 },
      nuggets: { nome: 'Nuggets', descricao: 'de frango', preco: 3 }
    },
    opcionais: [
      { id: 'queijo', nome: 'Queijo' },
      { id: 'alface', nome: 'Alface' },
      { id: 'tomate', nome: 'Tomate' },
      { id: 'ovo', nome: 'Ovo' },
      { id: 'picles', nome: 'Picles' }
    ],
    batatas: [
      { id: 'frita', nome: 'Batata frita', preco: 1, maximo: 5 },
      { id: 'chips', nome: 'Batata chips', preco: 1, maximo: 5 }
    ],
    bebidas: [
      { id: 'cola', grupo: 'Refri de', nome: 'Cola', preco: 2 },
      { id: 'limao', grupo: 'Refri de', nome: 'Limão', preco: 2 },
      { id: 'laranja', grupo: 'Refri de', nome: 'Laranja', preco: 2 },
      { id: 'agua', grupo: 'Água', nome: 'Mineral', preco: 1 },
      { id: 'suco_laranja', grupo: 'Suco de', nome: 'Laranja', preco: 2 },
      { id: 'suco_uva', grupo: 'Suco de', nome: 'Uva', preco: 2 }
    ],
    sobremesas: [
      { id: 'morango', nome: 'Morango', preco: 2 },
      { id: 'chocolate', nome: 'Chocolate', preco: 2 },
      { id: 'baunilha', nome: 'Baunilha', preco: 2 }
    ],
    pagamentos: [
      { id: 'dinheiro', nome: 'Dinheiro' },
      { id: 'cartao', nome: 'Cartão' },
      { id: 'pix', nome: 'Pix' }
    ]
  };

  /**
   * Procura numa lista o item com o id informado (busca linear).
   * Ex.: acharPorId(CARDAPIO.bebidas, 'cola') → { id: 'cola', ... }
   * Devolve null se não encontrar.
   */
  function acharPorId(lista, id) {
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return null;
  }

  /**
   * Coração das regras de negócio: recebe o pedido montado pelo cliente e
   * devolve { itens, total }, cada item com seu preço.
   *
   * Formato esperado do pedido:
   *   {
   *     lanche:    { tipo: 'hamburguer' | 'hotdog' | 'nuggets', carnes: 1|2, opcionais: ['queijo', ...] },
   *     batatas:   { frita: 0..5, chips: 0..5 },
   *     bebida:    'cola' | ... | null,
   *     sobremesa: 'morango' | ... | null
   *   }
   *
   * Se algo estiver errado (id que não existe, quantidade fora do limite),
   * lança um Error com mensagem amigável. O servidor devolve essa mensagem
   * ao navegador com o código HTTP 400.
   */
  function calcular(pedido) {
    var itens = [];
    var lanche = pedido && pedido.lanche;
    if (lanche && lanche.tipo === 'hamburguer') {
      var carnes = Number(lanche.carnes);
      if (carnes !== 1 && carnes !== 2) throw new Error('Escolha 1 ou 2 carnes.');
      var opcionais = [];
      (lanche.opcionais || []).forEach(function (id) {
        if (!acharPorId(CARDAPIO.opcionais, id)) throw new Error('Opcional desconhecido.');
        if (opcionais.indexOf(id) === -1) opcionais.push(id);
      });
      itens.push({ tipo: 'hamburguer', carnes: carnes, opcionais: opcionais, preco: CARDAPIO.lanches.hamburguer.precoPorCarnes[carnes] });
    } else if (lanche && lanche.tipo === 'hotdog') {
      itens.push({ tipo: 'hotdog', preco: CARDAPIO.lanches.hotdog.preco });
    } else if (lanche && lanche.tipo === 'nuggets') {
      itens.push({ tipo: 'nuggets', preco: CARDAPIO.lanches.nuggets.preco });
    } else if (lanche && lanche.tipo) {
      throw new Error('Lanche desconhecido.');
    }

    var batatas = (pedido && pedido.batatas) || {};
    CARDAPIO.batatas.forEach(function (b) {
      var qtd = Number(batatas[b.id] || 0);
      if (!Number.isInteger(qtd) || qtd < 0 || qtd > b.maximo) throw new Error('Quantidade de batata inválida.');
      if (qtd > 0) itens.push({ tipo: 'batata', id: b.id, quantidade: qtd, preco: b.preco });
    });

    if (pedido && pedido.bebida) {
      var bebida = acharPorId(CARDAPIO.bebidas, pedido.bebida);
      if (!bebida) throw new Error('Bebida desconhecida.');
      itens.push({ tipo: 'bebida', id: bebida.id, preco: bebida.preco });
    }

    if (pedido && pedido.sobremesa) {
      var sobremesa = acharPorId(CARDAPIO.sobremesas, pedido.sobremesa);
      if (!sobremesa) throw new Error('Sobremesa desconhecida.');
      itens.push({ tipo: 'sobremesa', id: sobremesa.id, preco: sobremesa.preco });
    }

    // reduce soma os preços: começa em 0 e vai acumulando item por item.
    // Obs.: o preço da batata é por porção (de 1 a 5 unidades custa o mesmo).
    var total = itens.reduce(function (s, it) { return s + it.preco; }, 0);
    return { itens: itens, total: total };
  }

  CARDAPIO.acharPorId = acharPorId;
  CARDAPIO.calcular = calcular;

  // No Node.js existe "module"; no navegador, não. Assim o arquivo sabe onde está.
  if (typeof module !== 'undefined' && module.exports) module.exports = CARDAPIO;
  else raiz.CARDAPIO = CARDAPIO;
})(this);
