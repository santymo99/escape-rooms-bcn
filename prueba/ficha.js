// PRUEBA 04/10: barra fija de reserva en el móvil cuando los botones de la ficha salen de la pantalla.
(function () {
  var bar = document.querySelector('.t-sticky'), act = document.querySelector('.actions');
  if (!bar || !act || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function (es) { var e = es[0]; bar.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0); }).observe(act);
})();
