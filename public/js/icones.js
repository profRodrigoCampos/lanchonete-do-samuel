/* Desenhos da Lanchonete do Samuel
 * =================================
 * Todos os desenhos são SVG (gráficos vetoriais) escritos como texto: não há
 * arquivos de imagem. São os mesmos do cardápio impresso, para a criança
 * reconhecer o item na tela e no papel.
 *
 * Como ler um SVG: viewBox define a "folha" de desenho; rect, circle, ellipse
 * e path são formas; fill é a cor de dentro e stroke, a cor do contorno.
 * Funções como copoRefri() e sorvete() reaproveitam o mesmo desenho mudando
 * só as cores: o mesmo copo serve para cola, limão e laranja.
 */
(function () {
  var K = '#3A2418';
  var FRITA = 'M0 0 L10 0 L12 5.5 L10 11 L12 16.5 L10 22 L12 27.5 L10 33 L12 38.5 L10 44 L0 44 L-2 38.5 L0 33 L-2 27.5 L0 22 L-2 16.5 L0 11 L-2 5.5 Z';
  var CHIP = 'M-28 -2 C-18 -13 -8 -3 0 -5 C8 -3 18 -13 28 -2 C20 10 8 12 0 10 C-8 12 -20 10 -28 -2 Z';

  /** Embrulha as formas numa tag <svg>. aria-hidden: o desenho é decorativo para leitores de tela. */
  function svg(viewBox, conteudo) {
    return '<svg viewBox="' + viewBox + '" aria-hidden="true" focusable="false">' + conteudo + '</svg>';
  }

  /**
   * Hambúrguer em camadas (pão, carne, queijo, tomate, alface, pão).
   * sorriso: false = gergelim; true = carinha feliz (logo); 'dormindo' = olhos fechados.
   */
  function hamburguer(sorriso) {
    var c = '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
      '<rect x="10" y="78" width="100" height="14" rx="7" fill="#F2A33A"/>' +
      '<rect x="8" y="62" width="104" height="16" rx="8" fill="#8B4A22"/>' +
      '<path d="M8 60 L112 60 L106 70 L98 64 L88 74 L78 64 L42 64 L32 72 L24 64 L14 64 Z" fill="#FFD23F"/>' +
      '<rect x="12" y="53" width="96" height="8" rx="4" fill="#E8412F"/>' +
      '<path d="M6 48 Q14 58 22 50 Q30 58 38 50 Q46 58 54 50 Q62 58 70 50 Q78 58 86 50 Q94 58 102 50 Q110 58 114 48 Z" fill="#6BCB3C"/>' +
      '<path d="M8 48 Q8 10 60 10 Q112 10 112 48 Z" fill="#F2A33A"/>';
    if (sorriso === 'dormindo') {
      c += '<path d="M39 30 Q45 34 51 30 M69 30 Q75 34 81 30" fill="none"/>' +
        '<ellipse cx="60" cy="39" rx="4" ry="3" fill="' + K + '" stroke="none"/>' +
        '<ellipse cx="34" cy="38" rx="5" ry="3" fill="#F7A6A0" stroke="none"/><ellipse cx="86" cy="38" rx="5" ry="3" fill="#F7A6A0" stroke="none"/>';
    } else if (sorriso) {
      c += '<circle cx="45" cy="29" r="4.5" fill="' + K + '" stroke="none"/><circle cx="75" cy="29" r="4.5" fill="' + K + '" stroke="none"/>' +
        '<path d="M50 37 Q60 45 70 37" fill="none"/>' +
        '<ellipse cx="34" cy="38" rx="5" ry="3" fill="#F7A6A0" stroke="none"/><ellipse cx="86" cy="38" rx="5" ry="3" fill="#F7A6A0" stroke="none"/>';
    } else {
      c += '<ellipse cx="40" cy="26" rx="4" ry="2.5" fill="#FFF1CC" stroke-width="1.5"/><ellipse cx="60" cy="19" rx="4" ry="2.5" fill="#FFF1CC" stroke-width="1.5"/>' +
        '<ellipse cx="80" cy="26" rx="4" ry="2.5" fill="#FFF1CC" stroke-width="1.5"/><ellipse cx="50" cy="36" rx="4" ry="2.5" fill="#FFF1CC" stroke-width="1.5"/>' +
        '<ellipse cx="72" cy="36" rx="4" ry="2.5" fill="#FFF1CC" stroke-width="1.5"/>';
    }
    return svg('0 0 120 100', c + '</g>');
  }

  function copoRefri(cor, emblema) {
    return svg('0 0 60 100', '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M38 2 L34 24" stroke="#E8412F" stroke-width="6"/>' +
      '<path d="M38 2 L34 24" stroke="#FFFFFF" stroke-width="6" stroke-dasharray="3 4" stroke-linecap="butt"/>' +
      '<path d="M10 30 L50 30 L45 96 L15 96 Z" fill="' + cor + '"/>' +
      '<path d="M11.4 48 Q20 41 30 48 Q40 55 48.6 48 L47.3 66 Q40 72 30 66 Q20 60 12.7 66 Z" fill="#FFFFFF" stroke="none"/>' +
      emblema +
      '<path d="M10 30 L50 30 L45 96 L15 96 Z" fill="none"/>' +
      '<path d="M13 22 Q30 12 47 22 Z" fill="#F4F7FA"/>' +
      '<rect x="7" y="22" width="46" height="8" rx="3" fill="#FFFFFF"/></g>');
  }

  function fatiaFruta(cx, cy, r, cor, linha) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + cor + '" stroke-width="2"/>' +
      '<path d="M' + cx + ' ' + (cy - r + 1) + ' L' + cx + ' ' + (cy + r - 1) + ' M' + (cx - r + 1) + ' ' + cy + ' L' + (cx + r - 1) + ' ' + cy +
      '" stroke="' + linha + '" stroke-width="1.5"/>';
  }

  function caixinha(frente, topo, lado, rotulo) {
    return svg('0 0 60 100', '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M36 22 L36 8 L44 2" stroke="#1F6FD1" stroke-width="4" fill="none"/>' +
      '<path d="M10 26 L18 18 L52 18 L44 26 Z" fill="' + topo + '"/>' +
      '<path d="M44 26 L52 18 L52 88 L44 96 Z" fill="' + lado + '"/>' +
      '<rect x="10" y="26" width="34" height="70" fill="' + frente + '"/>' +
      '<rect x="14" y="44" width="26" height="32" rx="5" fill="#FFFFFF" stroke="none"/>' + rotulo +
      '<rect x="10" y="26" width="34" height="70" fill="none"/></g>');
  }

  function sorvete(cor, cobertura, brilho) {
    return svg('0 0 90 92', '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
      (cobertura.atras || '') +
      '<circle cx="29" cy="52" r="17" fill="' + cor + '"/><circle cx="61" cy="52" r="17" fill="' + cor + '"/><circle cx="45" cy="30" r="17" fill="' + cor + '"/>' +
      '<ellipse cx="39" cy="24" rx="4" ry="2.5" fill="#FFFFFF" stroke="none" opacity="' + brilho + '"/>' +
      '<ellipse cx="23" cy="46" rx="4" ry="2.5" fill="#FFFFFF" stroke="none" opacity="' + brilho + '"/>' +
      '<ellipse cx="55" cy="46" rx="4" ry="2.5" fill="#FFFFFF" stroke="none" opacity="' + brilho + '"/>' +
      (cobertura.bolas || '') +
      '<path d="M8 60 L82 60 Q78 88 45 90 Q12 88 8 60 Z" fill="#FFFFFF"/>' +
      '<path d="M13 71 Q45 78 77 71" stroke="#2E9E45" stroke-width="4" fill="none"/>' +
      (cobertura.frente || '') + '</g>');
  }

  var fritas = '';
  [['translate(18 10) rotate(-12)'], ['translate(30 3)'], ['translate(43 5) rotate(6)'], ['translate(54 12) rotate(14)'], ['translate(24 16) rotate(-4)']]
    .forEach(function (t) { fritas += '<path transform="' + t[0] + '" d="' + FRITA + '" fill="#FFD23F"/>'; });

  var chips = '<ellipse cx="40" cy="82" rx="35" ry="6" fill="#FFFFFF" stroke-width="3"/>';
  [['translate(40 74)'], ['translate(41 63) rotate(-2)'], ['translate(39 52) rotate(2)'], ['translate(41 41) rotate(-2)'], ['translate(40 30)']]
    .forEach(function (t) {
      chips += '<g transform="' + t[0] + '"><path d="' + CHIP + '" fill="#F7C548"/><path d="M-18 2 C-10 -4 -4 2 0 1 C4 2 10 -4 18 2" stroke="#D9A21B" stroke-width="2" fill="none"/></g>';
    });
  chips += '<g transform="translate(47 14) rotate(-18)"><path d="M-24 -2 C-15 -12 -7 -3 0 -4 C7 -3 15 -12 24 -2 C17 9 7 10 0 9 C-7 10 -17 9 -24 -2 Z" fill="#F7C548"/>' +
    '<path d="M-15 2 C-8 -3 -3 2 0 1 C3 2 8 -3 15 2" stroke="#D9A21B" stroke-width="2" fill="none"/></g>';

  window.ICONES = {
    logo: svg('0 0 132 132', '<g stroke="' + K + '" stroke-linejoin="round" stroke-linecap="round">' +
      '<circle cx="66" cy="66" r="62" fill="#FFC72C" stroke-width="4"/><circle cx="66" cy="66" r="50" fill="#FFFFFF" stroke-width="3"/>' +
      '<g transform="translate(26 31) scale(0.667)" stroke-width="1.5">' + hamburguer(true).replace(/<\/?svg[^>]*>/g, '') + '</g></g>'),

    hamburguer: hamburguer(false),
    hamburguerFeliz: hamburguer(true),
    hamburguerDormindo: hamburguer('dormindo'),

    /* Placa pendurada: FECHADO (cinza) ou ABERTO (verde) */
    placaFechado: svg('0 0 220 130', '<g stroke="' + K + '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M60 44 L110 10 L160 44" fill="none"/><circle cx="110" cy="10" r="6" fill="#B9B2AC"/>' +
      '<rect x="12" y="40" width="196" height="80" rx="18" fill="#6F6862"/>' +
      '<rect x="22" y="50" width="176" height="60" rx="12" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="6 6"/>' +
      '<text x="110" y="95" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="36" font-weight="700" fill="#FFFFFF" stroke="none" textLength="148" lengthAdjust="spacingAndGlyphs">FECHADO</text></g>'),
    placaAberto: svg('0 0 220 130', '<g stroke="' + K + '" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M60 44 L110 10 L160 44" fill="none"/><circle cx="110" cy="10" r="6" fill="#FFC72C"/>' +
      '<rect x="12" y="40" width="196" height="80" rx="18" fill="#2E9E45"/>' +
      '<rect x="22" y="50" width="176" height="60" rx="12" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="6 6"/>' +
      '<text x="110" y="95" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="36" font-weight="700" fill="#FFFFFF" stroke="none" textLength="140" lengthAdjust="spacingAndGlyphs">ABERTO</text></g>'),
    porta: svg('0 0 24 24', '<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M5 21 L5 4 L15 3 L15 21 Z"/><path d="M3 21 L21 21"/><circle cx="12" cy="12.5" r="1.2" fill="currentColor"/><path d="M17 8 L20 8 M17 12 L21 12 M17 16 L20 16"/></g>'),
    baixar: svg('0 0 24 24', '<g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3 L12 15 M7 10 L12 15 L17 10"/><path d="M4 16 L4 20 L20 20 L20 16"/></g>'),
    xis: svg('0 0 24 24', '<path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>'),

    hotdog: svg('0 0 140 80', '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
      '<rect x="12" y="18" width="116" height="26" rx="13" fill="#E89530"/>' +
      '<rect x="3" y="28" width="134" height="22" rx="11" fill="#D9534F"/>' +
      '<path d="M22 34 L118 34" stroke="#F4A09B" stroke-width="3.5"/>' +
      '<path d="M10 46 Q70 60 130 46 L130 52 Q130 70 112 70 L28 70 Q10 70 10 52 Z" fill="#F7B652"/></g>'),

    nuggets: (function () {
      var NUGGET = 'M-14 -1 C-14 -9 -6 -12 2 -11 C10 -10 15 -5 14 2 C13 9 5 12 -3 11 C-10 10 -14 6 -14 -1 Z';
      function migalhas(pontos) {
        return pontos.map(function (p) {
          return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '" fill="#C9822A" stroke="none"/>';
        }).join('');
      }
      return svg('0 0 100 80', '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
        '<g transform="translate(28 34) rotate(-14)"><path d="' + NUGGET + '" fill="#EDA93A"/>' + migalhas([[-5, -4, 1.6], [4, -6, 1.4], [1, 2, 1.6]]) + '</g>' +
        '<g transform="translate(72 34) rotate(18)"><path d="' + NUGGET + '" fill="#EDA93A"/>' + migalhas([[-6, -3, 1.6], [3, -5, 1.4], [5, 3, 1.6]]) + '</g>' +
        '<g transform="translate(50 27) rotate(6)"><path d="' + NUGGET + '" fill="#F2B54A"/>' + migalhas([[-6, -4, 1.6], [2, -6, 1.4], [6, 1, 1.6], [-2, 3, 1.4]]) + '</g>' +
        '<path d="M10 42 L90 42 L82 76 L18 76 Z" fill="#D62828"/>' +
        '<path d="M12.4 52 L87.6 52 L85.5 61 L14.5 61 Z" fill="#FFC72C" stroke="none"/>' +
        '<path d="M10 42 L90 42 L82 76 L18 76 Z" fill="none"/></g>');
    })(),

    carne1: svg('0 0 50 30', '<rect x="3" y="8" width="44" height="14" rx="7" fill="#8B4A22" stroke="' + K + '" stroke-width="3"/>'),
    carne2: svg('0 0 50 30', '<rect x="3" y="2" width="44" height="11" rx="5.5" fill="#8B4A22" stroke="' + K + '" stroke-width="3"/>' +
      '<rect x="3" y="16" width="44" height="11" rx="5.5" fill="#8B4A22" stroke="' + K + '" stroke-width="3"/>'),

    queijo: svg('0 0 60 60', '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round"><path d="M8 14 L52 8 L54 48 L10 52 Z" fill="#FFD23F"/>' +
      '<circle cx="22" cy="26" r="5" fill="#F2B71F" stroke-width="2"/><circle cx="38" cy="36" r="4" fill="#F2B71F" stroke-width="2"/>' +
      '<circle cx="40" cy="20" r="3" fill="#F2B71F" stroke-width="2"/><circle cx="20" cy="42" r="2.5" fill="#F2B71F" stroke-width="2"/></g>'),
    alface: svg('0 0 60 60', '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M30 5 C48 8 57 26 52 44 C46 54 38 55 30 55 C22 55 14 54 8 44 C3 26 12 8 30 5 Z" fill="#6BCB3C"/>' +
      '<path d="M30 12 L30 50 M30 24 L20 18 M30 24 L40 18 M30 36 L18 30 M30 36 L42 30" stroke="#3F8F22" stroke-width="2.5" fill="none"/></g>'),
    tomate: svg('0 0 60 60', '<g stroke="' + K + '" stroke-width="3"><circle cx="30" cy="30" r="24" fill="#E8412F"/>' +
      '<circle cx="30" cy="30" r="16" fill="#F26B5B" stroke="none"/><path d="M30 14 L30 46 M14 30 L46 30" stroke="#E8412F" stroke-width="3"/>' +
      '<ellipse cx="22" cy="22" rx="2.5" ry="3.5" fill="#FFE08A" stroke="none"/><ellipse cx="38" cy="22" rx="2.5" ry="3.5" fill="#FFE08A" stroke="none"/>' +
      '<ellipse cx="22" cy="38" rx="2.5" ry="3.5" fill="#FFE08A" stroke="none"/><ellipse cx="38" cy="38" rx="2.5" ry="3.5" fill="#FFE08A" stroke="none"/></g>'),
    ovo: svg('0 0 60 60', '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round">' +
      '<path d="M8 32 C4 14 24 4 34 10 C50 6 58 24 51 38 C48 54 26 57 17 48 C9 46 10 40 8 32 Z" fill="#FFFFFF"/>' +
      '<circle cx="31" cy="30" r="10" fill="#FFC21A"/><circle cx="28" cy="27" r="3" fill="#FFFFFF" stroke="none"/></g>'),
    picles: svg('0 0 60 60', '<g stroke="' + K + '" stroke-width="3"><circle cx="38" cy="22" r="15" fill="#7CB342"/><circle cx="38" cy="22" r="10" fill="#C5E1A5" stroke="none"/>' +
      '<circle cx="34" cy="20" r="1.8" fill="#7CB342" stroke="none"/><circle cx="41" cy="18" r="1.8" fill="#7CB342" stroke="none"/><circle cx="40" cy="26" r="1.8" fill="#7CB342" stroke="none"/>' +
      '<circle cx="22" cy="38" r="15" fill="#7CB342"/><circle cx="22" cy="38" r="10" fill="#C5E1A5" stroke="none"/>' +
      '<circle cx="18" cy="36" r="1.8" fill="#7CB342" stroke="none"/><circle cx="25" cy="34" r="1.8" fill="#7CB342" stroke="none"/><circle cx="24" cy="42" r="1.8" fill="#7CB342" stroke="none"/></g>'),

    frita: svg('0 0 80 90', '<g stroke="' + K + '" stroke-width="2.5" stroke-linejoin="round">' + fritas +
      '<path d="M8 44 L72 44 L63 86 L17 86 Z" fill="#1F6FD1" stroke-width="3"/>' +
      '<path d="M30 46 L32 84 M50 46 L48 84" stroke="#FFFFFF" stroke-width="5"/>' +
      '<path d="M8 44 L72 44 L63 86 L17 86 Z" fill="none" stroke-width="3"/></g>'),
    chips: svg('0 0 80 90', '<g stroke="' + K + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">' + chips + '</g>'),

    cola: copoRefri('#5A2D1A', '<circle cx="24" cy="55" r="3" fill="none" stroke="#5A2D1A" stroke-width="2"/><circle cx="33" cy="59" r="4" fill="none" stroke="#5A2D1A" stroke-width="2"/><circle cx="38" cy="50" r="2.5" fill="none" stroke="#5A2D1A" stroke-width="2"/>'),
    limao: copoRefri('#2E9E45', fatiaFruta(30, 56, 8, '#CDE86B', '#8DB33A')),
    laranja: copoRefri('#FF8A1F', fatiaFruta(30, 56, 8, '#FFB347', '#E07B00')),
    agua: svg('0 0 60 100', '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round">' +
      '<rect x="22" y="3" width="16" height="10" rx="3" fill="#1F6FD1"/><path d="M24 13 L36 13 L40 24 L20 24 Z" fill="#CFE8FF"/>' +
      '<rect x="14" y="24" width="32" height="70" rx="10" fill="#CFE8FF"/><rect x="14" y="44" width="32" height="26" fill="#1F6FD1" stroke="none"/>' +
      '<path d="M30 48 C26 54 25 57 25 59 A5 5 0 0 0 35 59 C35 57 34 54 30 48 Z" fill="#FFFFFF" stroke="none"/>' +
      '<rect x="14" y="24" width="32" height="70" rx="10" fill="none"/></g>'),
    suco_laranja: caixinha('#FF9F1C', '#FFC37A', '#E07B00', fatiaFruta(27, 60, 9, '#FFB347', '#E07B00')),
    suco_uva: caixinha('#7B3FA0', '#B784D6', '#5A2C78',
      '<g stroke-width="1.8"><circle cx="22" cy="55" r="4.5" fill="#9B59C6"/><circle cx="31" cy="55" r="4.5" fill="#9B59C6"/>' +
      '<circle cx="26.5" cy="62" r="4.5" fill="#9B59C6"/><circle cx="26.5" cy="69" r="4" fill="#9B59C6"/>' +
      '<path d="M27 51 L29 46" stroke="#3F8F22" stroke-width="2.5"/></g>'),

    morango: sorvete('#F78FB3', {
      frente: '<path d="M45 6 C39 3 35 11 39 16 L45 22 L51 16 C55 11 51 3 45 6 Z" fill="#E8412F"/><path d="M40 6 L45 1 L50 6" fill="#3BB54A" stroke-width="2.5"/>' +
        '<circle cx="42" cy="12" r="1" fill="#FFE08A" stroke="none"/><circle cx="48" cy="12" r="1" fill="#FFE08A" stroke="none"/><circle cx="45" cy="17" r="1" fill="#FFE08A" stroke="none"/>'
    }, 0.7),
    chocolate: sorvete('#8B4A22', {
      bolas: '<path d="M30 22 Q36 16 42 22 Q48 28 54 20 Q58 16 61 22" stroke="#4A2412" stroke-width="4" fill="none"/>' +
        '<rect x="34" y="31" width="6" height="3" rx="1.5" fill="#FFD23F" stroke="none" transform="rotate(-20 37 32)"/>' +
        '<rect x="50" y="30" width="6" height="3" rx="1.5" fill="#F78FB3" stroke="none" transform="rotate(25 53 31)"/>' +
        '<rect x="42" y="38" width="6" height="3" rx="1.5" fill="#6BCB3C" stroke="none"/>'
    }, 0.4),
    baunilha: sorvete('#FFF1C1', {
      atras: '<rect x="58" y="4" width="8" height="30" rx="3" fill="#F2C47A" transform="rotate(25 62 19)"/>',
      bolas: '<ellipse cx="40" cy="26" rx="1.5" ry="1" fill="#8B6B3D" stroke="none"/><ellipse cx="50" cy="34" rx="1.5" ry="1" fill="#8B6B3D" stroke="none"/>' +
        '<ellipse cx="46" cy="22" rx="1.5" ry="1" fill="#8B6B3D" stroke="none"/><ellipse cx="25" cy="50" rx="1.5" ry="1" fill="#8B6B3D" stroke="none"/>' +
        '<ellipse cx="33" cy="56" rx="1.5" ry="1" fill="#8B6B3D" stroke="none"/><ellipse cx="58" cy="50" rx="1.5" ry="1" fill="#8B6B3D" stroke="none"/>' +
        '<ellipse cx="65" cy="56" rx="1.5" ry="1" fill="#8B6B3D" stroke="none"/>'
    }, 0.7),

    /* Pagamento e interface */
    dinheiro: svg('0 0 80 60', '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round">' +
      '<rect x="6" y="14" width="56" height="32" rx="5" fill="#8FD694"/><circle cx="34" cy="30" r="9" fill="#C8EFCB"/>' +
      '<text x="34" y="35" text-anchor="middle" font-size="14" font-weight="700" fill="' + K + '" stroke="none" font-family="sans-serif">$</text>' +
      '<circle cx="60" cy="44" r="12" fill="#FFC72C"/><circle cx="60" cy="44" r="7" fill="none" stroke-width="2"/></g>'),
    cartao: svg('0 0 80 60', '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round">' +
      '<rect x="6" y="8" width="68" height="44" rx="7" fill="#1F6FD1"/><rect x="6" y="18" width="68" height="8" fill="#3A2418" stroke="none"/>' +
      '<rect x="14" y="32" width="14" height="10" rx="2" fill="#FFC72C" stroke-width="2"/>' +
      '<path d="M36 40 L64 40" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/></g>'),
    pix: svg('0 0 60 60', '<g stroke="' + K + '" stroke-width="3" stroke-linejoin="round">' +
      '<rect x="6" y="6" width="48" height="48" rx="6" fill="#FFFFFF"/>' +
      '<rect x="12" y="12" width="14" height="14" rx="2" fill="' + K + '" stroke="none"/><rect x="34" y="12" width="14" height="14" rx="2" fill="' + K + '" stroke="none"/>' +
      '<rect x="12" y="34" width="14" height="14" rx="2" fill="' + K + '" stroke="none"/><rect x="34" y="34" width="6" height="6" fill="#2E9E45" stroke="none"/>' +
      '<rect x="42" y="42" width="6" height="6" fill="#2E9E45" stroke="none"/><rect x="34" y="42" width="4" height="6" fill="' + K + '" stroke="none"/></g>'),
    pessoa: svg('0 0 32 32', '<g stroke="' + K + '" stroke-width="2.5" fill="#FFC72C"><circle cx="16" cy="10" r="6"/><path d="M4 29 C4 21 10 18 16 18 C22 18 28 21 28 29 Z"/></g>'),
    sino: svg('0 0 40 32', '<g stroke="' + K + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M4 26 L36 26" fill="none"/><path d="M7 24 C7 15 13 10 20 10 C27 10 33 15 33 24 Z" fill="#FFC72C"/><circle cx="20" cy="7" r="3" fill="#FFC72C"/></g>'),
    check: svg('0 0 24 24', '<path d="M5 12.5 L10 17.5 L19 7" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'),
    olho: svg('0 0 24 24', '<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12 C5 6 9 4 12 4 C15 4 19 6 22 12 C19 18 15 20 12 20 C9 20 5 18 2 12 Z"/><circle cx="12" cy="12" r="3.5"/></g>'),
    voltar: svg('0 0 24 24', '<path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
    mais: svg('0 0 24 24', '<path d="M12 5 L12 19 M5 12 L19 12" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>'),
    menos: svg('0 0 24 24', '<path d="M5 12 L19 12" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>'),
    lixo: svg('0 0 24 24', '<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7 L20 7 M9 7 L9 4 L15 4 L15 7 M6 7 L7 20 L17 20 L18 7"/></g>'),
    engrenagem: svg('0 0 24 24', '<g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5 L12 5 M12 19 L12 21.5 M2.5 12 L5 12 M19 12 L21.5 12 M5.3 5.3 L7 7 M17 17 L18.7 18.7 M5.3 18.7 L7 17 M17 7 L18.7 5.3"/></g>'),
    som: svg('0 0 24 24', '<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9 L8 9 L13 5 L13 19 L8 15 L4 15 Z"/><path d="M16.5 8.5 C18 10 18 14 16.5 15.5 M19 6 C22 9 22 15 19 18"/></g>')
  };

  /* Moedinhas verdes com $, uma por real (igual à comanda impressa).
   * A criança conta as moedinhas dos itens para chegar ao total. */
  window.moedas = function (quantidade, classe) {
    var html = '<span class="moedas ' + (classe || '') + '" aria-label="' + quantidade + (quantidade === 1 ? ' moeda' : ' moedas') + '">';
    for (var i = 0; i < quantidade; i++) html += '<span class="moeda" aria-hidden="true">$</span>';
    return html + '</span>';
  };
})();
