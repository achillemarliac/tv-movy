// Ce code est ajouté au site quand il s'ouvre sur la télé.
// Pour masquer un élément gênant (bannière, bandeau cookies...),
// ajoute son sélecteur CSS dans la liste ci-dessous, par exemple ".banniere-pub".
(function () {
  var aMasquer = [
    // ".exemple-de-banniere",
  ];
  if (aMasquer.length) {
    var style = document.createElement('style');
    style.textContent = aMasquer.join(',') + '{display:none !important}';
    (document.head || document.documentElement).appendChild(style);
  }
})();
