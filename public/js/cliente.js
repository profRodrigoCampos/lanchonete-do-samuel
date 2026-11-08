/* Página do cliente
 * =================
 * Uma "SPA" simples (aplicação de página única): todas as telas estão no
 * index.html e o JavaScript só mostra uma e esconde as outras.
 *
 * Caminho do cliente:
 *   [fechada] → nome → montar pedido → resumo → pagamento → acompanhar
 *
 * Ideias principais para estudo:
 *  - ESTADO: tudo o que a tela precisa saber fica no objeto "estado".
 *    Quando algo muda, a tela é redesenhada a partir dele.
 *  - POLLING: a cada 3 segundos a página pergunta ao servidor se a
 *    lanchonete está aberta (e, se houver pedido, como ele está).
 *  - DELEGAÇÃO DE EVENTOS: um único "ouvinte" de clique no documento trata
 *    todos os botões, olhando o atributo data-acao de cada um.
 */
(function () {
  var C = window.CARDAPIO;
  var I = window.ICONES;
  var M = window.Comum;

  // Estado da página. Alguns campos começam com o que estava guardado no
  // celular (localStorage), para continuar de onde parou se a página recarregar.
  var estado = {
    nome: M.ler('nome', ''),
    pedido: pedidoVazio(),
    pagamento: null,
    pedidoId: M.ler('pedidoId', null),
    sessao: M.ler('sessao', null),   // a "abertura" da lanchonete em que o nome foi escrito
    lojaAberta: null,                 // null = ainda não sei
    enviando: false
  };
  var temporizadorAcompanhar = null;
  var avisouPronto = false;

  /** Um pedido em branco, no mesmo formato que CARDAPIO.calcular() espera. */
  function pedidoVazio() {
    return {
      lanche: { tipo: null, carnes: 1, opcionais: [] },
      batatas: { frita: 0, chips: 0 },
      bebida: null,
      sobremesa: null
    };
  }

  /** Atalho para document.getElementById. */
  function $(id) { return document.getElementById(id); }

  /* ---------- Navegação entre telas ---------- */

  /**
   * Mostra a tela de id indicado e esconde as outras (atributo "hidden").
   * Também liga/desliga a barra do total e o visual cinza de "fechada",
   * e reinicia a animação de entrada (a linha com offsetWidth força o
   * navegador a "esquecer" a animação anterior).
   */
  function mostrarTela(id) {
    document.querySelectorAll('.tela').forEach(function (t) { t.hidden = t.id !== id; });
    $('barra-total').hidden = id !== 'tela-montar';
    document.body.classList.toggle('com-barra', id === 'tela-montar');
    document.body.classList.toggle('fechada', id === 'tela-fechada');
    var tela = $(id);
    tela.classList.remove('aparecer');
    void tela.offsetWidth;
    tela.classList.add('aparecer');
    window.scrollTo(0, 0);
  }

  /** Escreve o nome do cliente em todos os lugares marcados com a classe "nome-cliente". */
  function atualizarNomes() {
    document.querySelectorAll('.nome-cliente').forEach(function (el) { el.textContent = estado.nome; });
  }

  /* ---------- Pedido ---------- */

  /** Monta o objeto que vai para o servidor no POST /api/pedidos. */
  function pedidoParaEnvio() {
    var p = estado.pedido;
    return {
      nome: estado.nome,
      lanche: p.lanche.tipo ? { tipo: p.lanche.tipo, carnes: p.lanche.carnes, opcionais: p.lanche.opcionais } : null,
      batatas: p.batatas,
      bebida: p.bebida,
      sobremesa: p.sobremesa,
      pagamento: estado.pagamento
    };
  }

  /**
   * Calcula o total para mostrar na tela, com a MESMA função do servidor.
   * O valor que vale é o do servidor; este é só para o cliente ver.
   */
  function conta() {
    try { return C.calcular(pedidoParaEnvio()); } catch (e) { return { itens: [], total: 0 }; }
  }

  /* ---------- Tela de montar ---------- */

  /**
   * Gera o HTML de um cartão clicável do cardápio.
   * data-acao e data-valor dizem ao ouvinte de cliques o que fazer;
   * aria-pressed informa aos leitores de tela se o cartão está escolhido.
   */
  function cartaoOpcao(acao, valor, selecionado, conteudo, extraClasse) {
    return '<button type="button" class="cartao-opcao ' + (extraClasse || '') + (selecionado ? ' selecionado' : '') + '"' +
      ' data-acao="' + acao + '" data-valor="' + valor + '" aria-pressed="' + (selecionado ? 'true' : 'false') + '">' +
      '<span class="marca" aria-hidden="true">' + I.check + '</span>' + conteudo + '</button>';
  }

  /** A moedinha verde com o preço, igual à do cardápio impresso. */
  function precoBolinha(valor) {
    return '<span class="preco" aria-label="' + valor + ' reais"><small>R$</small><b>' + valor + '</b></span>';
  }

  /**
   * Redesenha o cardápio inteiro a partir do estado.pedido.
   * Técnica simples: montar uma string de HTML e trocar o innerHTML.
   * Os textos são todos do próprio cardápio (não digitados por usuários),
   * por isso podem ir direto para o HTML.
   */
  function desenharCardapio() {
    var p = estado.pedido;
    var html = '';

    /* PRATO PRINCIPAL */
    html += '<div class="secao secao-lanche"><div class="secao-titulo"><h2>PRATO PRINCIPAL</h2><span>escolha 1</span></div>';
    html += cartaoOpcao('lanche', 'hamburguer', p.lanche.tipo === 'hamburguer',
      '<span class="cartao-icone grande">' + I.hamburguer + '</span>' +
      '<span class="cartao-textos"><span class="cartao-nome">Hambúrguer</span>' +
      '<span class="cartao-detalhe">1 ou 2 carnes</span><span class="cartao-detalhe forte">R$ 3 ou R$ 4</span></span>', 'cartao-largo');

    if (p.lanche.tipo === 'hamburguer') {
      html += '<div class="painel-hamburguer aparecer">';
      html += '<h3>Quantas carnes?</h3><div class="grade-2">';
      [1, 2].forEach(function (n) {
        html += cartaoOpcao('carnes', n, p.lanche.carnes === n,
          '<span class="carne-linha"><span class="icone-carne">' + (n === 1 ? I.carne1 : I.carne2) + '</span>' +
          '<span class="cartao-nome">' + n + (n === 1 ? ' carne' : ' carnes') + '</span></span>' +
          precoBolinha(C.lanches.hamburguer.precoPorCarnes[n]), 'opcao-carne');
      });
      html += '</div>';
      html += '<h3>Pode colocar <span class="gratis-texto">(grátis)</span>:</h3><div class="grade-opcionais">';
      C.opcionais.forEach(function (o) {
        var marcado = p.lanche.opcionais.indexOf(o.id) !== -1;
        html += '<button type="button" class="chip' + (marcado ? ' selecionado' : '') + '" data-acao="opcional" data-valor="' + o.id + '" aria-pressed="' + marcado + '">' +
          '<span class="marca" aria-hidden="true">' + I.check + '</span>' +
          '<span class="chip-icone">' + I[o.id] + '</span><span>' + o.nome + '</span></button>';
      });
      html += '</div></div>';
    }

    html += '<div class="grade-2 grade-pratos">';
    ['hotdog', 'nuggets'].forEach(function (id) {
      var prato = C.lanches[id];
      html += cartaoOpcao('lanche', id, p.lanche.tipo === id,
        '<span class="cartao-icone medio">' + I[id] + '</span><span class="cartao-nome">' + prato.nome + '</span>' +
        '<span class="cartao-detalhe">' + prato.descricao + '</span>' + precoBolinha(prato.preco));
    });
    html += '</div>';
    html += '</div>';

    /* BATATA */
    html += '<div class="secao secao-batata"><div class="secao-titulo"><h2>BATATA</h2><span>até 5 de cada</span></div>';
    C.batatas.forEach(function (b) {
      var qtd = p.batatas[b.id];
      html += '<div class="linha-batata' + (qtd > 0 ? ' selecionado' : '') + '">' +
        '<span class="cartao-icone">' + I[b.id] + '</span>' +
        '<span class="batata-textos"><span class="cartao-nome">' + b.nome + '</span>' + precoBolinha(b.preco) + '</span>' +
        '<span class="contador" role="group" aria-label="Quantidade de ' + b.nome + '">' +
        '<button type="button" class="botao botao-branco botao-icone" data-acao="batata-menos" data-valor="' + b.id + '" aria-label="Tirar uma" ' + (qtd === 0 ? 'disabled' : '') + '>' + I.menos + '</button>' +
        '<output class="contador-numero" aria-live="polite">' + qtd + '</output>' +
        '<button type="button" class="botao botao-icone" data-acao="batata-mais" data-valor="' + b.id + '" aria-label="Pôr mais uma" ' + (qtd >= b.maximo ? 'disabled' : '') + '>' + I.mais + '</button>' +
        '</span></div>';
    });
    html += '<p class="nota-batata">O preço é por porção (de 1 a 5).</p>';
    html += '</div>';

    /* BEBIDA */
    html += '<div class="secao secao-bebida"><div class="secao-titulo"><h2>BEBIDA</h2><span>escolha 1</span></div><div class="grade-3">';
    C.bebidas.forEach(function (b) {
      html += cartaoOpcao('bebida', b.id, p.bebida === b.id,
        '<span class="cartao-icone alto">' + I[b.id] + '</span><span class="cartao-grupo">' + b.grupo + '</span><span class="cartao-nome">' + b.nome + '</span>' + precoBolinha(b.preco), 'cartao-pequeno');
    });
    html += '</div></div>';

    /* SOBREMESA */
    html += '<div class="secao secao-sobremesa"><div class="secao-titulo"><h2>SOBREMESA</h2><span>sorvete, escolha 1</span></div><div class="grade-3">';
    C.sobremesas.forEach(function (s) {
      html += cartaoOpcao('sobremesa', s.id, p.sobremesa === s.id,
        '<span class="cartao-icone">' + I[s.id] + '</span><span class="cartao-nome">' + s.nome + '</span>' + precoBolinha(s.preco), 'cartao-pequeno');
    });
    html += '</div></div>';

    $('cardapio').innerHTML = html;
    atualizarTotal();
  }

  /** Atualiza o valor da barra do total e libera o botão Continuar se houver item. */
  function atualizarTotal() {
    var c = conta();
    $('total-barra').textContent = M.dinheiro(c.total);
    $('botao-continuar').disabled = c.itens.length === 0;
  }

  /* ---------- Resumo ---------- */
  /** HTML da lista de itens (usada no resumo e no acompanhamento). */
  function linhasResumo(itens, comPreco) {
    return itens.map(function (item) {
      var d = M.descrever(item);
      var extras = d.extras.length ? '<span class="resumo-extras">' + d.extras.map(function (e) { return '<span>' + e + '</span>'; }).join('') + '</span>' : '';
      return '<li class="linha-resumo">' +
        '<span class="resumo-icone">' + d.icone + (d.quantidade ? '<span class="quantidade">' + d.quantidade + '</span>' : '') + '</span>' +
        '<span class="resumo-textos"><strong>' + d.titulo + '</strong>' + (d.detalhe ? '<small>' + d.detalhe + '</small>' : '') + extras + '</span>' +
        (comPreco ? precoBolinha(item.preco) : '') + '</li>';
    }).join('');
  }

  /** Preenche a tela de resumo com os itens e o total. */
  function desenharResumo() {
    var c = conta();
    $('lista-resumo').innerHTML = linhasResumo(c.itens, true);
    $('total-resumo').textContent = M.dinheiro(c.total);
  }

  /* ---------- Pagamento ---------- */
  /** Dentro da tela de pagamento, mostra só a etapa indicada (escolha, dinheiro, cartão, pix...). */
  function mostrarEtapaPagamento(id) {
    ['pagamento-escolha', 'pagamento-dinheiro', 'pagamento-cartao', 'pagamento-pix', 'pagamento-processando', 'pagamento-erro']
      .forEach(function (e) { $(e).hidden = e !== id; });
    var el = $(id);
    el.classList.remove('aparecer');
    void el.offsetWidth;
    el.classList.add('aparecer');
    window.scrollTo(0, 0);
  }

  /** Prepara as opções de pagamento de brincadeira com o total do pedido. */
  function desenharPagamento() {
    var c = conta();
    document.querySelectorAll('.total-texto').forEach(function (el) { el.textContent = M.dinheiro(c.total); });
    $('opcoes-pagamento').innerHTML = C.pagamentos.map(function (pg) {
      return '<button type="button" class="cartao-opcao opcao-pagamento" data-acao="pagar-com" data-valor="' + pg.id + '">' +
        '<span class="pagamento-icone">' + I[pg.id] + '</span><span class="cartao-nome">' + pg.nome + '</span></button>';
    }).join('');
    $('moedas-dinheiro').innerHTML = window.moedas(c.total, 'grandes');
    $('cartao-animado').innerHTML = I.cartao;
    desenharQrFalso();
    mostrarEtapaPagamento('pagamento-escolha');
  }

  /**
   * Desenha um "QR Code" de brincadeira: quadradinhos aleatórios num SVG.
   * Não é um QR de verdade (não aponta para nada); serve só para a encenação.
   */
  function desenharQrFalso() {
    var n = 21;
    var tam = 10;
    var quadrados = '';
    function canto(x, y) {
      quadrados += '<rect x="' + x * tam + '" y="' + y * tam + '" width="' + 7 * tam + '" height="' + 7 * tam + '" fill="#3A2418"/>' +
        '<rect x="' + (x + 1) * tam + '" y="' + (y + 1) * tam + '" width="' + 5 * tam + '" height="' + 5 * tam + '" fill="#fff"/>' +
        '<rect x="' + (x + 2) * tam + '" y="' + (y + 2) * tam + '" width="' + 3 * tam + '" height="' + 3 * tam + '" fill="#3A2418"/>';
    }
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        var noCanto = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
        if (!noCanto && Math.random() < 0.45) {
          quadrados += '<rect x="' + x * tam + '" y="' + y * tam + '" width="' + tam + '" height="' + tam + '" fill="#3A2418"/>';
        }
      }
    }
    canto(0, 0); canto(n - 7, 0); canto(0, n - 7);
    var meio = (n * tam) / 2;
    quadrados += '<circle cx="' + meio + '" cy="' + meio + '" r="26" fill="#fff"/>';
    $('qr-falso').innerHTML = '<svg viewBox="0 0 ' + n * tam + ' ' + n * tam + '" aria-hidden="true">' + quadrados +
      '<g transform="translate(' + (meio - 22) + ' ' + (meio - 20) + ') scale(0.37)">' + I.hamburguerFeliz.replace(/<\/?svg[^>]*>/g, '') + '</g></svg>';
  }

  /**
   * Envia o pedido ao servidor (POST /api/pedidos).
   * Promise.all espera duas coisas ao mesmo tempo: a resposta do servidor e
   * uma pequena pausa de "processando", para parecer uma maquininha de verdade.
   * Se a lanchonete fechou nesse meio-tempo, o servidor responde 409 e a
   * página vai para a tela de fechada.
   */
  function confirmarPagamento() {
    if (estado.enviando) return;
    estado.enviando = true;
    mostrarEtapaPagamento('pagamento-processando');
    var espera = new Promise(function (r) { setTimeout(r, estado.pagamento === 'cartao' ? 1800 : 1000); });
    var envio = M.api('POST', '/api/pedidos', pedidoParaEnvio());
    Promise.all([envio, espera]).then(function (res) {
      var pedido = res[0].pedido;
      estado.pedidoId = pedido.id;
      M.guardar('pedidoId', pedido.id);
      estado.enviando = false;
      avisouPronto = false;
      M.tadaa();
      comecarAcompanhar(pedido, null);
    }).catch(function (erro) {
      estado.enviando = false;
      if (erro && erro.dados && erro.dados.fechada) {
        aplicarEstado({ aberta: false });
        return;
      }
      $('texto-erro').textContent = erro && erro.message && erro.message !== 'Failed to fetch'
        ? erro.message
        : 'Não consegui falar com a lanchonete. Confira se está no Wi-Fi de casa.';
      mostrarEtapaPagamento('pagamento-erro');
    });
  }

  /* ---------- Acompanhar ---------- */
  /** Vai para a tela de acompanhar e começa a consultar o pedido a cada 3 segundos. */
  function comecarAcompanhar(pedido, antesDoSeu) {
    mostrarTela('tela-acompanhar');
    desenharAcompanhar(pedido, antesDoSeu);
    clearInterval(temporizadorAcompanhar);
    temporizadorAcompanhar = setInterval(consultarPedido, 3000);
    consultarPedido();
  }

  /** Mostra se o pedido está na fila (e quantos há antes) ou se já foi entregue. */
  function desenharAcompanhar(pedido, antesDoSeu) {
    $('numero-pedido').textContent = pedido.numero;
    $('letras-acompanhar').innerHTML = M.letras(pedido.nome);
    $('lista-acompanhar').innerHTML = linhasResumo(pedido.itens, false);
    var pronto = pedido.status === 'entregue';
    $('estado-preparando').hidden = pronto;
    $('estado-pronto').hidden = !pronto;
    $('botao-novo').hidden = !pronto;
    if (!pronto && antesDoSeu !== null && antesDoSeu !== undefined) {
      $('texto-fila').textContent = antesDoSeu === 0
        ? 'Você é o próximo! O Samuel está preparando.'
        : 'Tem ' + antesDoSeu + (antesDoSeu === 1 ? ' pedido' : ' pedidos') + ' antes do seu.';
    }
    if (pronto) {
      clearInterval(temporizadorAcompanhar);
      if (!avisouPronto) { avisouPronto = true; M.tadaa(); }
    }
  }

  /**
   * Pergunta ao servidor como está o pedido (GET /api/pedidos/:id).
   * Se o pedido sumiu (404), é porque a lanchonete fechou e apagou tudo.
   */
  function consultarPedido() {
    if (!estado.pedidoId) return;
    M.api('GET', '/api/pedidos/' + estado.pedidoId).then(function (dados) {
      desenharAcompanhar(dados.pedido, dados.antesDoSeu);
    }).catch(function (erro) {
      if (erro.codigo === 404) {
        // o pedido sumiu: a lanchonete fechou (e talvez já abriu de novo)
        clearInterval(temporizadorAcompanhar);
        if (erro.dados && typeof erro.dados.aberta === 'boolean') aplicarEstado(erro.dados);
        else verificarEstado();
      }
    });
  }

  /* ---------- Aberta / fechada ---------- */
  /** Esquece nome, pedido e sessão (no estado e no localStorage). Usada quando a lanchonete fecha. */
  function limparTudo() {
    clearInterval(temporizadorAcompanhar);
    estado.nome = '';
    estado.pedido = pedidoVazio();
    estado.pagamento = null;
    estado.pedidoId = null;
    estado.sessao = null;
    avisouPronto = false;
    M.apagar('nome');
    M.apagar('pedidoId');
    M.apagar('sessao');
    $('campo-nome').value = '';
    atualizarCampoNome();
    atualizarNomes();
  }

  /**
   * Decide o que mostrar a partir da resposta de /api/estado ({ aberta, sessao }).
   *  - Fechada: apaga tudo e mostra a tela cinza.
   *  - Aberta, mas com sessão diferente da guardada: é uma abertura nova,
   *    então começa do zero na tela do nome.
   *  - Aberta e mesma sessão: continua de onde parou.
   * A sessão é o que permite saber se a lanchonete fechou e reabriu entre
   * duas consultas.
   */
  function aplicarEstado(e) {
    if (estado.enviando) return;
    var estavaAberta = estado.lojaAberta;

    if (!e.aberta) {
      estado.lojaAberta = false;
      if (estavaAberta !== false || $('tela-fechada').hidden) {
        limparTudo();
        mostrarTela('tela-fechada');
      }
      return;
    }

    estado.lojaAberta = true;
    var mesmaAbertura = estado.sessao && estado.sessao === e.sessao;

    if (!mesmaAbertura) {
      // abertura nova: começa do zero
      limparTudo();
      estado.sessao = e.sessao;
      M.guardar('sessao', e.sessao);
      mostrarTela('tela-nome');
      if (estavaAberta === false) M.avisar('A lanchonete abriu! Pode pedir.');
      return;
    }

    if (estavaAberta === null) retomar();   // primeira consulta depois de abrir a página
  }

  /** Ao abrir a página: volta para o pedido em andamento ou para o cardápio. */
  function retomar() {
    if (estado.pedidoId) {
      M.api('GET', '/api/pedidos/' + estado.pedidoId).then(function (dados) {
        if (dados.pedido.status === 'entregue') avisouPronto = true;
        comecarAcompanhar(dados.pedido, dados.antesDoSeu);
      }).catch(function () {
        estado.pedidoId = null;
        M.apagar('pedidoId');
        novoPedido();
      });
    } else {
      novoPedido();
    }
  }

  /**
   * POLLING: pergunta ao servidor se a lanchonete está aberta.
   * É chamada ao abrir a página e depois a cada 3 segundos (setInterval).
   * Uma alternativa mais avançada seria WebSocket, em que o servidor avisa
   * na hora; aqui o polling é mais simples de entender e basta.
   */
  var falhasEstado = 0;
  function verificarEstado() {
    return M.api('GET', '/api/estado').then(function (e) {
      falhasEstado = 0;
      $('texto-fechada').textContent = 'Espere o Samuel abrir. Esta tela muda sozinha!';
      aplicarEstado(e);
    }).catch(function () {
      falhasEstado++;
      if (estado.lojaAberta === null || falhasEstado >= 3) {
        // sem conexão: mostra a tela cinza com o aviso
        $('texto-fechada').textContent = 'Não consegui falar com a lanchonete. Confira se está no Wi-Fi de casa.';
        if (estado.lojaAberta === null) mostrarTela('tela-fechada');
      }
    });
  }

  /** Começa um pedido em branco (mantém o nome, que é da mesma abertura). */
  function novoPedido() {
    clearInterval(temporizadorAcompanhar);
    estado.pedido = pedidoVazio();
    estado.pagamento = null;
    estado.pedidoId = null;
    M.apagar('pedidoId');
    if (estado.nome) {
      desenharCardapio();
      mostrarTela('tela-montar');
    } else {
      mostrarTela('tela-nome');
    }
  }

  /* ---------- Cliques ---------- */
  /**
   * DELEGAÇÃO DE EVENTOS: um único ouvinte de clique para a página toda.
   * closest('[data-acao]') acha o botão clicado (mesmo se o toque foi no
   * desenho dentro dele) e o switch executa a ação correspondente.
   * Vantagem: funciona também para botões criados depois via innerHTML.
   */
  document.addEventListener('click', function (ev) {
    var alvo = ev.target.closest('[data-acao]');
    if (!alvo || alvo.disabled) return;
    M.liberarSom();
    var acao = alvo.getAttribute('data-acao');
    var valor = alvo.getAttribute('data-valor');
    var p = estado.pedido;

    switch (acao) {
      case 'lanche':
        p.lanche.tipo = p.lanche.tipo === valor ? null : valor;
        if (p.lanche.tipo !== 'hamburguer') { p.lanche.carnes = 1; p.lanche.opcionais = []; }
        desenharCardapio();
        break;
      case 'carnes':
        p.lanche.carnes = Number(valor);
        desenharCardapio();
        break;
      case 'opcional': {
        var i = p.lanche.opcionais.indexOf(valor);
        if (i === -1) p.lanche.opcionais.push(valor); else p.lanche.opcionais.splice(i, 1);
        desenharCardapio();
        break;
      }
      case 'batata-mais': {
        var b = C.acharPorId(C.batatas, valor);
        if (p.batatas[valor] < b.maximo) p.batatas[valor]++;
        desenharCardapio();
        break;
      }
      case 'batata-menos':
        if (p.batatas[valor] > 0) p.batatas[valor]--;
        desenharCardapio();
        break;
      case 'bebida':
        p.bebida = p.bebida === valor ? null : valor;
        desenharCardapio();
        break;
      case 'sobremesa':
        p.sobremesa = p.sobremesa === valor ? null : valor;
        desenharCardapio();
        break;
      case 'ir-resumo':
        desenharResumo();
        mostrarTela('tela-resumo');
        break;
      case 'voltar-montar':
        desenharCardapio();
        mostrarTela('tela-montar');
        break;
      case 'ir-pagamento':
        desenharPagamento();
        mostrarTela('tela-pagamento');
        break;
      case 'voltar-resumo':
        desenharResumo();
        mostrarTela('tela-resumo');
        break;
      case 'pagar-com':
        estado.pagamento = valor;
        mostrarEtapaPagamento('pagamento-' + valor);
        break;
      case 'voltar-escolha':
        mostrarEtapaPagamento('pagamento-escolha');
        break;
      case 'confirmar-pagamento':
        confirmarPagamento();
        break;
      case 'novo-pedido':
        novoPedido();
        break;
      case 'trocar-nome':
        $('campo-nome').value = estado.nome;
        atualizarCampoNome();
        mostrarTela('tela-nome');
        $('campo-nome').focus();
        break;
    }
  });

  /* ---------- Nome ---------- */
  /** Mesmo filtro do servidor: só letras, números e espaço, em maiúsculas, até 10 caracteres. */
  function limparNome(texto) {
    return texto.replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').replace(/^\s+/, '').toUpperCase().slice(0, 10);
  }

  /** Limpa o que foi digitado, conta as letras e libera o botão quando há nome. */
  function atualizarCampoNome() {
    var campo = $('campo-nome');
    var limpo = limparNome(campo.value);
    if (campo.value !== limpo) campo.value = limpo;
    $('contador-nome').textContent = Array.from(limpo).length;
    $('botao-comecar').disabled = limpo.trim().length === 0;
  }

  $('campo-nome').addEventListener('input', atualizarCampoNome);
  $('form-nome').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var nome = limparNome($('campo-nome').value).trim();
    if (!nome) return;
    M.liberarSom();
    estado.nome = nome;
    M.guardar('nome', nome);
    if (estado.sessao) M.guardar('sessao', estado.sessao);
    atualizarNomes();
    desenharCardapio();
    mostrarTela('tela-montar');
  });

  /* ---------- Início ---------- */
  $('logo').innerHTML = I.logo;
  $('mascote-nome').innerHTML = I.hamburguerFeliz;
  $('mascote-preparando').innerHTML = I.hamburguerFeliz;
  $('mascote-pronto').innerHTML = I.hamburguerFeliz;
  $('placa-fechado').innerHTML = I.placaFechado;
  $('mascote-dormindo').innerHTML = I.hamburguerDormindo;
  M.preencherIcones();
  atualizarNomes();

  // Pergunta à lanchonete se está aberta, e continua perguntando a cada 3 segundos
  verificarEstado();
  setInterval(verificarEstado, 3000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) verificarEstado();
  });
})();
