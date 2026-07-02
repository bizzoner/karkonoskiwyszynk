// =========================================================
// WYSZYNK KARKONOSKI — skrypty strony
// Bez zewnętrznych bibliotek: hamburger, zakładki menu,
// lekki lightbox galerii, rok w stopce.
// =========================================================

document.addEventListener('DOMContentLoaded', function () {

  // ---------- Hamburger nawigacji (mobile) ----------
  var hamburger = document.getElementById('hamburger');
  var linki = document.getElementById('linki-nawigacji');

  if (hamburger && linki) {
    hamburger.addEventListener('click', function () {
      var otwarte = linki.classList.toggle('jest-otwarte');
      hamburger.setAttribute('aria-expanded', otwarte ? 'true' : 'false');
    });

    // Zamknij menu po kliknięciu w link (mobile)
    linki.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        linki.classList.remove('jest-otwarte');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---------- Zakładki kategorii menu ----------
  var zakladki = document.querySelectorAll('.menu__zakladka');
  var kategorie = document.querySelectorAll('.menu__kategoria');

  zakladki.forEach(function (zakladka) {
    zakladka.addEventListener('click', function () {
      var idKategorii = zakladka.getAttribute('data-kategoria');

      zakladki.forEach(function (z) {
        z.classList.remove('jest-aktywna');
        z.setAttribute('aria-selected', 'false');
      });
      zakladka.classList.add('jest-aktywna');
      zakladka.setAttribute('aria-selected', 'true');

      kategorie.forEach(function (kat) {
        kat.classList.toggle('jest-aktywna', kat.id === idKategorii);
      });
    });
  });

  // ---------- Lightbox galerii (lekki, bez bibliotek) ----------
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var lightboxOpis = document.getElementById('lightbox-opis');
  var lightboxZamknij = document.getElementById('lightbox-zamknij');
  var elementyGalerii = document.querySelectorAll('.galeria__element');

  function otworzLightbox(element) {
    var opis = element.getAttribute('data-alt');
    var zdjecie = element.querySelector('img');
    lightboxOpis.textContent = opis;
    if (zdjecie) {
      lightboxImg.src = zdjecie.src;
      lightboxImg.alt = opis;
      lightboxImg.style.display = 'block';
    } else {
      lightboxImg.style.display = 'none';
    }
    lightbox.classList.add('jest-otwarty');
  }

  function zamknijLightbox() {
    lightbox.classList.remove('jest-otwarty');
  }

  elementyGalerii.forEach(function (element) {
    element.addEventListener('click', function () {
      otworzLightbox(element);
    });
  });

  if (lightboxZamknij) {
    lightboxZamknij.addEventListener('click', zamknijLightbox);
  }
  if (lightbox) {
    lightbox.addEventListener('click', function (event) {
      if (event.target === lightbox) zamknijLightbox();
    });
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') zamknijLightbox();
  });

  // ---------- Aktualny rok w stopce ----------
  var rokStopki = document.getElementById('rok-stopki');
  if (rokStopki) {
    rokStopki.textContent = new Date().getFullYear();
  }

});
