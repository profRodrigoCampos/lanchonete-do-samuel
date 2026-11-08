/* Tela do Samuel (atendente)
 * ===========================
 * Mostra a fila de pedidos de forma visual (desenhos e moedinhas), porque o
 * atendente ainda não lê. Também abre e fecha a lanchonete.
 *
 * Fluxo: [abertura] ABRIR → cozinha (fila, atualizada a cada 2 s) → Fechar
 *
 * Ideias para estudo: polling da fila, detecção de pedidos novos comparando
 * com os já conhecidos, janela de confirmação (modal) antes de uma ação que
 * apaga dados, e tratamento de falta de conexão.
 */
(function () {
  var C = window.CARDAPIO;
  var I = window.ICONES;
  var M = window.Comum;

  var fila = [];
  var conhecidos = null;          // ids já vistos (null = ainda não carregou)
  var feitos = M.ler('feitos', {}); // { idDoPedido: [índices dos itens já feitos] }
  var precoVisivel = false;
  var entregando = false;
  var temporizador = null;
  var falhas = 0;
  var alertaTempo = null;
  var lojaAberta = false;
  var mexendo = false;            // abrindo ou fechando agora

  function $(id) { return document.getElementById(id); }

  /* ---------- Desenho ---------- */
  /**
   * HTML de um item do pedido atual: desenho, detalhes (carnes, opcionais ou
   * quantidade de batata), moedinhas do preço e a caixinha de "feito".
   * Tocar no item marca/desmarca (ajuda o Samuel a não esquecer nada).
   */
  function itemHtml(item, indice, feito) {
    var d = M.descrever(item);
    var meio = '';
    if (item.tipo === 'hamburguer') {
      meio = '<span class="item-extras">' + d.extras.map(function (e, i) {
        return '<span class="' + (i === 0 ? 'extra-carne' : 'extra') + '">' + e + '</span>';
      }).join('') + '</span>';
    } else if (item.tipo === 'batata') {
      meio = '<span class="item-quantidade" aria-label="' + item.quantidade + ' unidades">' + item.quantidade + '</span>';
    }
    return '<li>' +
      '<button type="button" class="item' + (feito ? ' feito' : '') + '" data-indice="' + indice + '" aria-pressed="' + feito + '">' +
      '<span class="item-icone">' + d.icone + '</span>' +
      '<span class="item-meio"><span class="sr-only">' + d.titulo + ' ' + d.detalhe + '</span>' + meio + '</span>' +
      window.moedas(item.preco) +
      '<span class="item-check" aria-hidden="true">' + I.check + '</span>' +
      '</button></li>';
  }

  /** Redesenha a tela da cozinha: pedido atual (o primeiro da fila) e os próximos. */
  function desenhar() {
    var atual = fila[0];
    $('fila-numero').textContent = fila.length;
    $('vazio').hidden = !!atual;
    $('pedido-atual').hidden = !atual;

    if (atual) {
      var lista = feitos[atual.id] || [];
      $('numero-atual').textContent = atual.numero;
      $('letras-atual').innerHTML = M.letras(atual.nome);
      $('itens-atual').innerHTML = atual.itens.map(function (item, i) {
        return itemHtml(item, i, lista.indexOf(i) !== -1);
      }).join('');
      var pg = C.acharPorId(C.pagamentos, atual.pagamento);
      $('pago-atual').innerHTML = '<span class="pago-icone">' + I[atual.pagamento] + '</span><span>Pago' + (pg ? '<small>' + pg.nome + '</small>' : '') + '</span>';
      $('total-atual').textContent = atual.total;
      $('preco-revelado').hidden = !precoVisivel;
      $('botao-preco').setAttribute('aria-expanded', String(precoVisivel));
      $('texto-botao-preco').textContent = precoVisivel ? 'Esconder o preço' : 'Ver o preço';
      $('botao-entregar').disabled = entregando;
    }

    var proximos = fila.slice(1);
    $('proximos').hidden = proximos.length === 0;
    $('lista-proximos').innerHTML = proximos.map(function (p) {
      var icones = p.itens.map(function (it) { return '<span>' + M.descrever(it).icone + '</span>'; }).join('');
      return '<li class="proximo"><span class="proximo-numero">nº ' + p.numero + '</span>' +
        '<span class="proximo-nome">' + M.escapar(p.nome) + '</span><span class="proximo-icones">' + icones + '</span></li>';
    }).join('');
  }

  /* ---------- Abertura (aberta ou fechada) ---------- */
  /**
   * Mostra a tela de abertura. Fechada: placa FECHADO e botão ABRIR.
   * Aberta (página recarregada): placa ABERTO e botão VOLTAR PARA A COZINHA.
   * Nos dois casos o toque é necessário para liberar o som do celular.
   */
  function mostrarAbertura(aberta) {
    var tela = $('abertura');
    tela.classList.toggle('fechada', !aberta);
    $('abertura-placa').innerHTML = aberta ? I.placaAberto : I.placaFechado;
    $('botao-abrir').setAttribute('aria-label', aberta ? 'Voltar para a cozinha' : 'Abrir a lanchonete');
    $('rotulo-abertura').textContent = aberta ? 'VOLTAR PARA A COZINHA' : 'ABRIR A LANCHONETE';
    $('dica-abertura').textContent = aberta
      ? 'A lanchonete já está aberta. Toque para continuar.'
      : 'Toque no botão verde para os clientes poderem pedir.';
    $('botao-abrir').disabled = false;
    tela.hidden = false;
  }

  /** Esconde a abertura e começa a buscar a fila a cada 2 segundos (polling). */
  function comecarCozinha() {
    $('abertura').hidden = true;
    conhecidos = null;
    buscar();
    clearInterval(temporizador);
    temporizador = setInterval(buscar, 2000);
  }

  /** Para a busca e limpa tudo da tela (usada ao fechar a lanchonete). */
  function pararCozinha() {
    clearInterval(temporizador);
    temporizador = null;
    fila = [];
    conhecidos = null;
    feitos = {};
    M.guardar('feitos', feitos);
    precoVisivel = false;
    $('alerta-novo').hidden = true;
    $('modal-fechar').hidden = true;
    desenhar();
  }

  $('botao-abrir').addEventListener('click', function () {
    if (mexendo) return;
    M.liberarSom();
    if (lojaAberta) { comecarCozinha(); return; }
    mexendo = true;
    $('botao-abrir').disabled = true;
    M.api('POST', '/api/abrir').then(function (e) {
      mexendo = false;
      lojaAberta = e.aberta;
      M.tadaa();
      comecarCozinha();
      M.avisar('Lanchonete aberta! Os clientes já podem pedir.', 2600);
    }).catch(function () {
      mexendo = false;
      $('botao-abrir').disabled = false;
      $('dica-abertura').textContent = 'Não consegui falar com a lanchonete. Confira o Wi-Fi e o Termux.';
    });
  });

  /* ---------- Fechar ----------
   * Fechar apaga tudo, então antes aparece "Fechar mesmo?" (um modal).
   * O texto avisa quantos pedidos ainda estão na fila. */
  $('botao-fechar').addEventListener('click', function () {
    var n = fila.length;
    $('texto-modal').textContent = n === 0
      ? 'Os clientes não vão mais poder pedir.'
      : 'Ainda tem ' + n + (n === 1 ? ' pedido' : ' pedidos') + ' na fila. ' + (n === 1 ? 'Ele vai' : 'Eles vão') + ' ser apagado' + (n === 1 ? '.' : 's.');
    $('modal-fechar').hidden = false;
    $('botao-nao-fechar').focus();
  });

  $('botao-nao-fechar').addEventListener('click', function () { $('modal-fechar').hidden = true; });
  $('modal-fechar').addEventListener('click', function (ev) {
    if (ev.target === $('modal-fechar')) $('modal-fechar').hidden = true;
  });

  $('botao-sim-fechar').addEventListener('click', function () {
    if (mexendo) return;
    mexendo = true;
    $('botao-sim-fechar').disabled = true;
    M.api('POST', '/api/fechar').then(function (e) {
      mexendo = false;
      $('botao-sim-fechar').disabled = false;
      lojaAberta = e.aberta;
      pararCozinha();
      mostrarAbertura(false);
    }).catch(function () {
      mexendo = false;
      $('botao-sim-fechar').disabled = false;
      $('modal-fechar').hidden = true;
      M.avisar('Sem conexão. Não consegui fechar. Tente de novo.');
    });
  });

  /* ---------- Busca da fila ---------- */
  /**
   * Busca a fila no servidor (GET /api/pedidos).
   * Para saber se chegou pedido NOVO, guarda os ids já vistos em "conhecidos":
   * qualquer id que não estava lá dispara o sininho e o alerta.
   * Na primeira busca, só anota os ids (para não tocar por pedidos antigos).
   */
  function buscar() {
    M.api('GET', '/api/pedidos').then(function (dados) {
      falhas = 0;
      $('texto-conexao').textContent = 'Quando chegar um pedido, vai tocar um sininho.';

      if (!dados.aberta) {
        // fechada (por exemplo, o servidor foi reiniciado)
        lojaAberta = false;
        pararCozinha();
        mostrarAbertura(false);
        return;
      }

      var nova = dados.pendentes || [];
      var idAtualAntes = fila[0] && fila[0].id;

      if (conhecidos === null) {
        conhecidos = {};
        nova.forEach(function (p) { conhecidos[p.id] = true; });
      } else {
        var chegaram = nova.filter(function (p) { return !conhecidos[p.id]; });
        chegaram.forEach(function (p) { conhecidos[p.id] = true; });
        if (chegaram.length) alertarNovo(chegaram[chegaram.length - 1]);
      }

      fila = nova;
      if ((fila[0] && fila[0].id) !== idAtualAntes) precoVisivel = false;
      limparFeitos();
      desenhar();
    }).catch(function () {
      falhas++;
      if (falhas >= 2) {
        $('texto-conexao').textContent = 'Sem conexão com a lanchonete. Confira o Wi-Fi e o Termux.';
        if (!fila.length) { $('vazio').hidden = false; }
      }
    });
  }

  /** Remove as marcações de itens de pedidos que já saíram da fila. */
  function limparFeitos() {
    var ids = {};
    fila.forEach(function (p) { ids[p.id] = true; });
    Object.keys(feitos).forEach(function (id) { if (!ids[id]) delete feitos[id]; });
    M.guardar('feitos', feitos);
  }

  /** Toca o "plim-plim", vibra e mostra o nome de quem pediu por alguns segundos. */
  function alertarNovo(pedido) {
    M.plim();
    $('letras-alerta').innerHTML = M.letras(pedido.nome);
    $('alerta-novo').hidden = false;
    clearTimeout(alertaTempo);
    alertaTempo = setTimeout(function () { $('alerta-novo').hidden = true; }, 2600);
  }

  /* ---------- Ações do pedido ---------- */
  $('itens-atual').addEventListener('click', function (ev) {
    var botao = ev.target.closest('.item');
    if (!botao || !fila[0]) return;
    var id = fila[0].id;
    var i = Number(botao.getAttribute('data-indice'));
    var lista = feitos[id] || (feitos[id] = []);
    var pos = lista.indexOf(i);
    if (pos === -1) lista.push(i); else lista.splice(pos, 1);
    M.guardar('feitos', feitos);
    desenhar();
  });

  $('botao-preco').addEventListener('click', function () {
    precoVisivel = !precoVisivel;
    desenhar();
  });

  $('botao-entregar').addEventListener('click', function () {
    var atual = fila[0];
    if (!atual || entregando) return;
    entregando = true;
    desenhar();
    M.api('POST', '/api/pedidos/' + atual.id + '/entregar').then(function () {
      M.tadaa();
      M.avisar('Pedido de ' + atual.nome + ' entregue!', 2200);
      fila = fila.filter(function (p) { return p.id !== atual.id; });
      delete feitos[atual.id];
      M.guardar('feitos', feitos);
      precoVisivel = false;
      entregando = false;
      desenhar();
      var cartao = $('pedido-atual');
      cartao.classList.remove('aparecer');
      void cartao.offsetWidth;
      cartao.classList.add('aparecer');
      window.scrollTo(0, 0);
    }).catch(function (erro) {
      entregando = false;
      desenhar();
      M.avisar(erro.message === 'Failed to fetch' ? 'Sem conexão. Tente de novo.' : erro.message);
    });
  });

  $('alerta-novo').addEventListener('click', function () { $('alerta-novo').hidden = true; });
  $('botao-testar-som').addEventListener('click', function () { M.plim(); });

  /* Volta a buscar logo quando a tela é reaberta */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && $('abertura').hidden) buscar();
  });

  /* ---------- Início ---------- */
  $('logo').innerHTML = I.logo;
  $('mascote-espera').innerHTML = I.hamburguerFeliz;
  $('modal-placa').innerHTML = I.placaFechado;
  M.preencherIcones();
  desenhar();
  $('vazio').hidden = false;
  mostrarAbertura(false);

  M.api('GET', '/api/estado').then(function (e) {
    lojaAberta = e.aberta;
    mostrarAbertura(e.aberta);
  }).catch(function () {
    $('dica-abertura').textContent = 'Não consegui falar com a lanchonete. Confira o Wi-Fi e o Termux.';
  });
})();
