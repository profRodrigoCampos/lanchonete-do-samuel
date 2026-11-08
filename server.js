/* Lanchonete do Samuel — servidor
 * ================================
 * Roda com Node.js puro (sem instalar pacotes):  node server.js
 * Página do cliente:  http://IP-DO-SERVIDOR:8080/
 * Tela do Samuel:     http://IP-DO-SERVIDOR:8080/samuel
 *
 * O que este arquivo faz (visão geral para estudo):
 *  1. Serve os arquivos da pasta "public" (HTML, CSS, JS, PDFs) — papel de
 *     servidor web estático.
 *  2. Oferece uma pequena API REST em JSON, em /api/..., que as páginas
 *     usam com fetch() para abrir/fechar a lanchonete, mandar pedidos e
 *     marcar pedidos como entregues.
 *  3. Guarda o estado da lanchonete na MEMÓRIA (variável "loja"). Não há
 *     banco de dados: quando o servidor desliga ou a lanchonete fecha,
 *     tudo some. É uma escolha de projeto para a brincadeira começar
 *     sempre limpa.
 *
 * Rotas da API:
 *   GET  /api/estado                 → { aberta, sessao }
 *   POST /api/abrir                  → abre a lanchonete (começa do zero)
 *   POST /api/fechar                 → fecha e apaga tudo
 *   GET  /api/pedidos                → fila de pedidos pendentes (tela do Samuel)
 *   POST /api/pedidos                → cria um pedido (página do cliente)
 *   GET  /api/pedidos/:id            → situação de um pedido (cliente acompanha)
 *   POST /api/pedidos/:id/entregar   → Samuel marca como entregue
 */
'use strict';

// Módulos que já vêm com o Node.js (nenhum "npm install" é necessário)
const http = require('http');     // cria o servidor HTTP
const fs = require('fs');         // lê arquivos do disco
const path = require('path');     // monta caminhos de pasta com segurança
const os = require('os');         // descobre os IPs da máquina
const crypto = require('crypto'); // gera códigos aleatórios
// O mesmo arquivo do cardápio é usado no navegador e aqui no servidor:
// assim os preços ficam num lugar só e o total é recalculado no servidor.
const CARDAPIO = require('./public/js/cardapio.js');

// A porta pode ser trocada por variável de ambiente:  PORTA=3000 node server.js
const PORTA = Number(process.env.PORTA || process.env.PORT || 8080);
const PASTA_PUBLICA = path.join(__dirname, 'public');

// Tipo de conteúdo (MIME) de cada extensão: diz ao navegador como tratar o arquivo
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json'
};

/* ---------- Estado da lanchonete (só na memória) ---------- */

/**
 * Gera um código aleatório que identifica cada "abertura" da lanchonete.
 * Os celulares dos clientes guardam esse código; se ele mudar, sabem que
 * a lanchonete foi fechada e aberta de novo, e apagam o que tinham guardado.
 */
function novaSessao() {
  return crypto.randomBytes(6).toString('hex');
}

// Todo o estado do sistema fica neste objeto.
let loja = {
  aberta: false,        // o servidor liga com a lanchonete FECHADA
  sessao: novaSessao(),
  proximoNumero: 1,     // número que o próximo pedido vai receber
  pedidos: []           // lista de pedidos (na fila ou já entregues)
};

/** Recomeça do zero: fila vazia, numeração em 1 e sessão nova. */
function zerar(aberta) {
  loja = { aberta, sessao: novaSessao(), proximoNumero: 1, pedidos: [] };
}

/** Pedidos que ainda não foram entregues, na ordem de chegada (a fila). */
function pendentes() {
  return loja.pedidos.filter((p) => p.status === 'fila');
}

/** Resumo público do estado: aberta ou fechada, e qual sessão. */
function estado() {
  return { aberta: loja.aberta, sessao: loja.sessao };
}

/* ---------- Ajudantes HTTP ---------- */

/**
 * Responde com JSON e o código HTTP indicado
 * (200 ok, 201 criado, 400 dado inválido, 404 não achou, 409 conflito).
 * "no-store" impede que o navegador guarde a resposta em cache.
 */
function responderJSON(res, codigo, dados) {
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(dados));
}

/**
 * Lê o corpo de uma requisição POST e converte de JSON para objeto.
 * O corpo chega em pedaços ("data"); juntamos tudo no evento "end".
 * Há um limite de tamanho para ninguém travar o servidor com dados enormes.
 * Retorna uma Promise, por isso quem chama usa "await".
 */
function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let tamanho = 0;
    const partes = [];
    req.on('data', (parte) => {
      tamanho += parte.length;
      if (tamanho > 20000) {
        reject(new Error('Pedido grande demais.'));
        req.destroy();
        return;
      }
      partes.push(parte);
    });
    req.on('end', () => {
      try {
        const texto = Buffer.concat(partes).toString('utf8');
        resolve(texto ? JSON.parse(texto) : {});
      } catch (e) {
        reject(new Error('Não entendi o pedido.'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Deixa o nome do cliente seguro e padronizado: só letras, números e
 * espaços, em MAIÚSCULAS, com no máximo 10 caracteres (os 10 quadradinhos
 * da comanda). Nunca confie no que vem do navegador: valide no servidor.
 */
function limparNome(nome) {
  return String(nome || '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, 10);
}

/**
 * Servidor de arquivos estáticos: devolve um arquivo da pasta "public".
 * "/" vira index.html (cliente) e "/samuel" vira samuel.html.
 * A checagem com startsWith impede o ataque de "path traversal"
 * (pedir algo como /../server.js para ler arquivos fora da pasta pública).
 */
function servirArquivo(res, caminhoUrl) {
  let relativo;
  try {
    relativo = decodeURIComponent(caminhoUrl);
  } catch (e) {
    res.writeHead(400);
    res.end('Endereço inválido');
    return;
  }
  if (relativo === '/' || relativo === '') relativo = '/index.html';
  if (relativo === '/samuel' || relativo === '/samuel/') relativo = '/samuel.html';

  const completo = path.normalize(path.join(PASTA_PUBLICA, relativo));
  if (!completo.startsWith(PASTA_PUBLICA + path.sep)) {
    res.writeHead(403);
    res.end('Proibido');
    return;
  }

  fs.readFile(completo, (erro, conteudo) => {
    if (erro) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Página não encontrada');
      return;
    }
    const tipo = TIPOS[path.extname(completo).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-cache' });
    res.end(conteudo);
  });
}

/* ---------- Rotas ---------- */

/**
 * Recebe TODA requisição e decide o que fazer olhando o método (GET/POST)
 * e o caminho. É um "roteador" feito à mão, sem framework (como Express),
 * para mostrar o que acontece por baixo dos panos.
 */
async function tratar(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const rota = url.pathname;

  try {
    // Aberta ou fechada? (clientes e Samuel consultam)
    if (req.method === 'GET' && rota === '/api/estado') {
      return responderJSON(res, 200, estado());
    }

    // Samuel abre: começa tudo limpo
    if (req.method === 'POST' && rota === '/api/abrir') {
      if (!loja.aberta) {
        zerar(true);
        console.log(`[${hora()}] Lanchonete ABERTA`);
      }
      return responderJSON(res, 200, estado());
    }

    // Samuel fecha: apaga tudo
    if (req.method === 'POST' && rota === '/api/fechar') {
      const apagados = pendentes().length;
      zerar(false);
      console.log(`[${hora()}] Lanchonete FECHADA` + (apagados ? ` (${apagados} pedido(s) da fila apagado(s))` : ''));
      return responderJSON(res, 200, estado());
    }

    // Fila de pedidos (tela do Samuel)
    if (req.method === 'GET' && rota === '/api/pedidos') {
      return responderJSON(res, 200, { ...estado(), pendentes: pendentes() });
    }

    // Fazer pedido (cliente)
    if (req.method === 'POST' && rota === '/api/pedidos') {
      const corpo = await lerCorpo(req);
      if (!loja.aberta) return responderJSON(res, 409, { erro: 'A lanchonete está fechada.', fechada: true });

      const nome = limparNome(corpo.nome);
      if (!nome) return responderJSON(res, 400, { erro: 'Escreva seu nome.' });

      // O total é calculado AQUI, com a tabela de preços do servidor,
      // e não aceito pronto do navegador (que poderia ser alterado).
      const conta = CARDAPIO.calcular(corpo);
      if (conta.itens.length === 0) return responderJSON(res, 400, { erro: 'Escolha pelo menos um item.' });

      const pagamento = CARDAPIO.acharPorId(CARDAPIO.pagamentos, corpo.pagamento);
      if (!pagamento) return responderJSON(res, 400, { erro: 'Escolha como vai pagar.' });

      const pedido = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        numero: loja.proximoNumero++,
        nome,
        itens: conta.itens,
        total: conta.total,
        pagamento: pagamento.id,
        status: 'fila',
        criadoEm: new Date().toISOString(),
        entregueEm: null
      };
      loja.pedidos.push(pedido);
      if (loja.pedidos.length > 200) loja.pedidos = loja.pedidos.slice(-200);
      console.log(`[${hora()}] Pedido nº ${pedido.numero} de ${pedido.nome} — R$ ${pedido.total}`);
      return responderJSON(res, 201, { pedido, sessao: loja.sessao });
    }

    // Consultar um pedido (cliente acompanhando)
    let achado = rota.match(/^\/api\/pedidos\/([a-z0-9]+)$/);
    if (req.method === 'GET' && achado) {
      const pedido = loja.pedidos.find((p) => p.id === achado[1]);
      if (!pedido) return responderJSON(res, 404, { erro: 'Pedido não encontrado.', ...estado() });
      const fila = pendentes();
      const posicao = fila.findIndex((p) => p.id === pedido.id);
      return responderJSON(res, 200, { pedido, antesDoSeu: posicao < 0 ? 0 : posicao, ...estado() });
    }

    // Marcar como entregue (Samuel)
    achado = rota.match(/^\/api\/pedidos\/([a-z0-9]+)\/entregar$/);
    if (req.method === 'POST' && achado) {
      const pedido = loja.pedidos.find((p) => p.id === achado[1]);
      if (!pedido) return responderJSON(res, 404, { erro: 'Pedido não encontrado.' });
      if (pedido.status !== 'entregue') {
        pedido.status = 'entregue';
        pedido.entregueEm = new Date().toISOString();
        console.log(`[${hora()}] Pedido nº ${pedido.numero} entregue para ${pedido.nome}`);
      }
      return responderJSON(res, 200, { pedido });
    }

    if (rota.startsWith('/api/')) return responderJSON(res, 404, { erro: 'Rota não encontrada.' });

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    return servirArquivo(res, rota);
  } catch (erro) {
    return responderJSON(res, 400, { erro: erro.message || 'Algo deu errado.' });
  }
}

/* ---------- Início ---------- */

function hora() {
  return new Date().toLocaleTimeString('pt-BR');
}

/** Lista os IPs da máquina na rede (ignora o 127.0.0.1) para mostrar no terminal. */
function enderecosDaRede() {
  const lista = [];
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach((nome) => {
    (interfaces[nome] || []).forEach((info) => {
      if (info.family === 'IPv4' && !info.internal) lista.push(info.address);
    });
  });
  return lista;
}

const servidor = http.createServer((req, res) => {
  tratar(req, res);
});

// '0.0.0.0' = aceitar conexões de qualquer aparelho da rede, não só desta máquina
servidor.listen(PORTA, '0.0.0.0', () => {
  const ips = enderecosDaRede();
  console.log('');
  console.log('  Servidor da Lanchonete do Samuel ligado!');
  console.log('  (a lanchonete começa FECHADA: o Samuel abre pela tela dele)');
  console.log('');
  if (ips.length === 0) {
    console.log('  Não achei o IP da rede. Confira se o Wi-Fi está ligado.');
    console.log(`  Neste celular: http://localhost:${PORTA}/`);
  } else {
    ips.forEach((ip) => {
      console.log(`  Clientes:  http://${ip}:${PORTA}/`);
      console.log(`  Samuel:    http://${ip}:${PORTA}/samuel`);
    });
  }
  console.log('');
  console.log('  Para desligar o servidor: Ctrl + C');
  console.log('');
});

servidor.on('error', (erro) => {
  if (erro.code === 'EADDRINUSE') {
    console.error(`A porta ${PORTA} já está em uso. Feche o outro servidor ou use: PORTA=8081 node server.js`);
  } else {
    console.error('Erro no servidor:', erro.message);
  }
  process.exit(1);
});
