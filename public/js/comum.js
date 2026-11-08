/* Ajudantes usados pelas duas páginas (cliente e Samuel)
 * =======================================================
 * Reúne funções que as duas telas precisam: guardar dados no navegador,
 * conversar com o servidor, desenhar nomes e itens, tocar sons e mostrar avisos.
 * Tudo fica dentro do objeto window.Comum (um "módulo" simples, sem import).
 */
(function () {
  var C = window.CARDAPIO;
  var I = window.ICONES;

  var Comum = {};

  /* ---------- localStorage: memória do navegador ----------
   * Guarda pequenos dados no próprio celular (sobrevive a recarregar a página).
   * Só aceita texto, por isso usamos JSON.stringify / JSON.parse.
   * O try/catch protege contra navegadores que bloqueiam o armazenamento
   * (ex.: aba anônima). As chaves ganham o prefixo "lanchonete." para não
   * misturar com outros sites. */

  /** Guarda um valor (qualquer tipo) com o nome "chave". */
  Comum.guardar = function (chave, valor) {
    try { localStorage.setItem('lanchonete.' + chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ }
  };
  /** Lê um valor guardado; se não existir, devolve "padrao". */
  Comum.ler = function (chave, padrao) {
    try {
      var v = localStorage.getItem('lanchonete.' + chave);
      return v === null ? padrao : JSON.parse(v);
    } catch (e) { return padrao; }
  };
  /** Apaga um valor guardado. */
  Comum.apagar = function (chave) {
    try { localStorage.removeItem('lanchonete.' + chave); } catch (e) { /* nada */ }
  };

  /**
   * Conversa com a API do servidor usando fetch() (requisição assíncrona).
   * Ex.: Comum.api('POST', '/api/pedidos', pedido).then(...).catch(...)
   *
   * - Envia o corpo em JSON (quando houver).
   * - Se o servidor responder com erro (status fora de 200–299), transforma a
   *   resposta num Error com a mensagem do servidor, o código HTTP (erro.codigo)
   *   e os dados (erro.dados), para quem chamou tratar no .catch().
   * - Se não houver conexão, o próprio fetch falha ("Failed to fetch").
   */
  Comum.api = function (metodo, caminho, corpo) {
    var opcoes = { method: metodo, headers: {} };
    if (corpo !== undefined) {
      opcoes.headers['Content-Type'] = 'application/json';
      opcoes.body = JSON.stringify(corpo);
    }
    return fetch(caminho, opcoes).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (dados) {
        if (!r.ok) {
          var erro = new Error(dados.erro || 'Algo deu errado.');
          erro.dados = dados;
          erro.codigo = r.status;
          throw erro;
        }
        return dados;
      });
    });
  };

  /**
   * Troca caracteres especiais do HTML por códigos seguros.
   * Importante sempre que um texto digitado por alguém (como o nome do
   * cliente) vai para dentro de innerHTML: evita injeção de código (XSS).
   */
  Comum.escapar = function (texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /**
   * Desenha o nome em quadradinhos, uma letra por quadrado, igual à comanda
   * de papel. Array.from separa corretamente letras acentuadas.
   */
  Comum.letras = function (nome) {
    return Array.from(String(nome)).map(function (l) {
      return '<span class="letra' + (l === ' ' ? ' espaco' : '') + '">' + Comum.escapar(l) + '</span>';
    }).join('');
  };

  /**
   * Transforma um item do pedido (como o servidor devolve) no que a tela
   * precisa mostrar: { icone, titulo, detalhe, extras, quantidade }.
   * "extras" são os desenhos menores (carnes e opcionais do hambúrguer).
   */
  Comum.descrever = function (item) {
    if (item.tipo === 'hamburguer') {
      var nomes = item.opcionais.map(function (id) { return C.acharPorId(C.opcionais, id).nome.toLowerCase(); });
      return {
        icone: I.hamburguer,
        titulo: 'Hambúrguer',
        detalhe: (item.carnes === 1 ? '1 carne' : '2 carnes') + (nomes.length ? ' · ' + nomes.join(', ') : ' · sem opcionais'),
        extras: [item.carnes === 1 ? I.carne1 : I.carne2].concat(item.opcionais.map(function (id) { return I[id]; }))
      };
    }
    if (item.tipo === 'hotdog') return { icone: I.hotdog, titulo: 'Hot dog', detalhe: 'Pão + 1 salsicha', extras: [] };
    if (item.tipo === 'nuggets') return { icone: I.nuggets, titulo: 'Nuggets', detalhe: 'de frango', extras: [] };
    if (item.tipo === 'batata') {
      var b = C.acharPorId(C.batatas, item.id);
      return { icone: I[item.id], titulo: b.nome, detalhe: item.quantidade + (item.quantidade === 1 ? ' unidade' : ' unidades'), quantidade: item.quantidade, extras: [] };
    }
    if (item.tipo === 'bebida') {
      var d = C.acharPorId(C.bebidas, item.id);
      return { icone: I[item.id], titulo: d.grupo + ' ' + d.nome.toLowerCase(), detalhe: '', extras: [] };
    }
    if (item.tipo === 'sobremesa') {
      var s = C.acharPorId(C.sobremesas, item.id);
      return { icone: I[item.id], titulo: 'Sorvete de ' + s.nome.toLowerCase(), detalhe: '', extras: [] };
    }
    return { icone: '', titulo: '?', detalhe: '', extras: [] };
  };

  Comum.dinheiro = function (valor) { return 'R$ ' + valor; };

  /* ---------- Som (Web Audio API) ----------
   * Os sons não são arquivos de áudio: são notas geradas na hora por um
   * oscilador (como um teclado eletrônico simples).
   * Regra dos navegadores de celular: o som só pode começar depois que a
   * pessoa toca na tela. Por isso existe liberarSom(), chamada nos toques. */
  var contextoAudio = null;

  /** Cria/retoma o "contexto de áudio". Precisa ser chamada dentro de um toque. */
  Comum.liberarSom = function () {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!contextoAudio) contextoAudio = new Ctx();
      if (contextoAudio.state === 'suspended') contextoAudio.resume();
    } catch (e) { /* sem som */ }
  };

  /**
   * Toca uma nota.
   * freq: frequência em Hz (1760 = Lá agudo); inicio e duracao: em segundos;
   * volume: de 0 a 1. O "ganho" sobe rápido e desce devagar, o que dá o som
   * de sininho em vez de um bipe seco.
   */
  function nota(freq, inicio, duracao, volume) {
    var ctx = contextoAudio;
    var osc = ctx.createOscillator();
    var ganho = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    ganho.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
    ganho.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + inicio + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + duracao);
    osc.connect(ganho).connect(ctx.destination);
    osc.start(ctx.currentTime + inicio);
    osc.stop(ctx.currentTime + inicio + duracao + 0.05);
  }

  /* "Plim-plim" de pedido novo */
  Comum.plim = function () {
    Comum.liberarSom();
    if (contextoAudio && contextoAudio.state === 'running') {
      nota(1318.5, 0, 0.5, 0.5);
      nota(1760, 0.16, 0.7, 0.45);
      nota(1318.5, 0.6, 0.5, 0.4);
      nota(1760, 0.76, 0.8, 0.4);
    }
    if (navigator.vibrate) { try { navigator.vibrate([180, 90, 180]); } catch (e) { /* nada */ } }
  };

  /* Musiquinha de pedido pronto */
  Comum.tadaa = function () {
    Comum.liberarSom();
    if (contextoAudio && contextoAudio.state === 'running') {
      nota(784, 0, 0.18, 0.4);
      nota(988, 0.14, 0.18, 0.4);
      nota(1175, 0.28, 0.18, 0.4);
      nota(1568, 0.42, 0.6, 0.45);
    }
    if (navigator.vibrate) { try { navigator.vibrate([120, 60, 120, 60, 240]); } catch (e) { /* nada */ } }
  };

  var temporizadorAviso = null;

  /** Mostra uma mensagem curta no rodapé da tela por alguns segundos (um "toast"). */
  Comum.avisar = function (texto, ms) {
    var el = document.getElementById('aviso');
    if (!el) return;
    el.textContent = texto;
    el.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () { el.hidden = true; }, ms || 3000);
  };

  /** Coloca o desenho certo em cada elemento do HTML que tem o atributo data-icone="nome". */
  Comum.preencherIcones = function (raiz) {
    (raiz || document).querySelectorAll('[data-icone]').forEach(function (el) {
      var nome = el.getAttribute('data-icone');
      if (I[nome] && !el.firstChild) el.innerHTML = I[nome];
    });
  };

  window.Comum = Comum;
})();
