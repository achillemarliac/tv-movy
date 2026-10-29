// ===================================================================
//  Module TizenBrew — adapte un site à la télé et à la télécommande
// ===================================================================
//  RÉGLAGES (tu peux les modifier) :
var REGLAGES = {
  navigationTelecommande: true, // false si le site a déjà sa propre navigation télé
  zoom: 1.0,                    // 1.25 = textes et boutons 25 % plus gros
  masquer: [                    // éléments à cacher (sélecteurs CSS)
    // ".banniere-cookies",
  ]
};
// ===================================================================

(function () {
  if (window.__tvnav) return; window.__tvnav = true;

  // ---------- Style : zoom, éléments masqués, contour de sélection ----------
  var css = '.tvnav-focus{outline:4px solid #ffcc00 !important;outline-offset:3px !important;' +
            'box-shadow:0 0 0 8px rgba(255,204,0,.35) !important;border-radius:6px;}' +
            'html{scroll-behavior:smooth;}';
  if (REGLAGES.masquer.length) css += REGLAGES.masquer.join(',') + '{display:none !important;}';
  var style = document.createElement('style'); style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
  if (REGLAGES.zoom && REGLAGES.zoom !== 1) document.documentElement.style.zoom = REGLAGES.zoom;

  if (!REGLAGES.navigationTelecommande) return;

  // ---------- Navigation à la télécommande ----------
  var SELECTEUR = 'a[href], button, input:not([type=hidden]), select, textarea, summary, ' +
                  '[tabindex]:not([tabindex="-1"]), [role=button], [role=link], [role=tab], ' +
                  '[role=menuitem], [onclick], video';
  var courant = null;

  function visible(el) {
    if (el.disabled) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    var s = window.getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) === 0) return false;
    // ignore un élément entièrement contenu dans un autre élément sélectionnable (évite les doublons)
    var p = el.parentElement;
    while (p && p !== document.body) {
      if (p.matches && p.matches(SELECTEUR)) return false;
      p = p.parentElement;
    }
    return true;
  }

  function candidats() {
    return Array.prototype.filter.call(document.querySelectorAll(SELECTEUR), visible);
  }

  function selectionner(el) {
    if (!el) return;
    if (courant) courant.classList.remove('tvnav-focus');
    courant = el;
    el.classList.add('tvnav-focus');
    if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: true }); } catch (e) {}
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));   // ouvre les menus au survol
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  }

  function centre(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  function voisin(direction) {
    var liste = candidats();
    if (!liste.length) return null;
    if (!courant || !document.contains(courant) || !visible(courant)) {
      // premier appui : l'élément le plus proche du haut-gauche de l'écran
      var best = null, bestD = Infinity;
      liste.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        var d = Math.max(r.top, 0) * 2 + Math.max(r.left, 0);
        if (d < bestD) { bestD = d; best = el; }
      });
      return best || liste[0];
    }
    var a = courant.getBoundingClientRect(), ca = centre(a);
    var meilleur = null, score = Infinity;
    liste.forEach(function (el) {
      if (el === courant) return;
      var r = el.getBoundingClientRect(), c = centre(r), principal, lateral, chevauche;
      if (direction === 'droite')      { if (r.left < a.right - 5)  return; principal = r.left - a.right;  lateral = Math.abs(c.y - ca.y); chevauche = r.top < a.bottom && r.bottom > a.top; }
      else if (direction === 'gauche') { if (r.right > a.left + 5)  return; principal = a.left - r.right;  lateral = Math.abs(c.y - ca.y); chevauche = r.top < a.bottom && r.bottom > a.top; }
      else if (direction === 'bas')    { if (r.top < a.bottom - 5)  return; principal = r.top - a.bottom;  lateral = Math.abs(c.x - ca.x); chevauche = r.left < a.right && r.right > a.left; }
      else                             { if (r.bottom > a.top + 5)  return; principal = a.top - r.bottom;  lateral = Math.abs(c.x - ca.x); chevauche = r.left < a.right && r.right > a.left; }
      var s = Math.max(principal, 0) + lateral * (chevauche ? 0.5 : 3);
      if (s < score) { score = s; meilleur = el; }
    });
    return meilleur;
  }

  function estChampTexte(el) {
    return el && (el.tagName === 'TEXTAREA' || el.isContentEditable ||
      (el.tagName === 'INPUT' && !/^(button|submit|checkbox|radio|reset|image|range)$/i.test(el.type)));
  }

  var DIRECTIONS = { 37: 'gauche', 38: 'haut', 39: 'droite', 40: 'bas' };

  document.addEventListener('keydown', function (e) {
    var actif = document.activeElement;
    var dir = DIRECTIONS[e.keyCode];

    if (dir) {
      // dans un champ texte, gauche/droite déplacent le curseur
      if (estChampTexte(actif) && (dir === 'gauche' || dir === 'droite')) return;
      var cible = voisin(dir);
      e.preventDefault(); e.stopPropagation();
      if (cible) selectionner(cible);
      else if (dir === 'bas' || dir === 'haut') window.scrollBy(0, (dir === 'bas' ? 1 : -1) * innerHeight * 0.6);
      return;
    }

    if (e.keyCode === 13 && courant && document.contains(courant)) {          // OK
      if (estChampTexte(courant) || courant.tagName === 'SELECT') { courant.focus(); return; }
      e.preventDefault(); e.stopPropagation();
      if (courant.tagName === 'VIDEO') { courant.paused ? courant.play() : courant.pause(); return; }
      courant.click();
      return;
    }

    if (e.keyCode === 10009) {                                                // Retour
      if (estChampTexte(actif)) { actif.blur(); e.preventDefault(); return; }
      if (history.length > 1) { e.preventDefault(); history.back(); }
    }
  }, true);
})();
