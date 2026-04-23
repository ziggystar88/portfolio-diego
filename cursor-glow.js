/**
 * CursorGlow — Heartbeat Nebula
 * Tres capas · blur real · pulso lub-dub · deriva ascendente · bordes disueltos
 */
(function () {
  if (window.matchMedia('(hover: none)').matches) return;

  const COLORS = ['#7C3AED', '#A855F7', '#14B8A6', '#6366F1'];
  const ROTATION_INTERVAL = 8000;
  const BPM = 68;                        // latidos por minuto
  const CYCLE_MS = 60000 / BPM;          // ~882ms por ciclo

  function lerp(a, b, t) { return a + (b - a) * t; }

  // ── Curva de latido: lub-dub + reposo ───────────────────────────
  // Devuelve un multiplicador de escala dado un phase [0..1] dentro del ciclo
  function heartbeatScale(phase, strength) {
    const t = phase;
    if (t < 0.07) return 1 + (t / 0.07) * strength;                     // lub ↑
    if (t < 0.18) return 1 + ((0.18 - t) / 0.11) * strength;            // lub ↓
    if (t < 0.26) return 1 + ((t - 0.18) / 0.08) * strength * 0.65;    // dub ↑
    if (t < 0.38) return 1 + ((0.38 - t) / 0.12) * strength * 0.65;    // dub ↓
    return 1;                                                              // reposo
  }

  // ── Crear capa ──────────────────────────────────────────────────
  function makeLayer({ size, blur, opacity }) {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position:      'fixed',
      top:           '0',
      left:          '0',
      width:         size + 'px',
      height:        size + 'px',
      borderRadius:  '50%',
      pointerEvents: 'none',
      zIndex:        '9990',
      opacity:       '0',
      filter:        `blur(${blur}px)`,
      mixBlendMode:  'screen',
      willChange:    'transform, opacity',
      background:    `radial-gradient(circle at 50% 50%, ${COLORS[0]} 0%, transparent 55%)`,
      transition:    'background 1.4s ease',
    });
    el._base = opacity;
    document.body.appendChild(el);
    return el;
  }

  const CFG = [
    { size: 920, blur: 110, opacity: 0.028 }, // halo exterior
    { size: 460, blur: 55,  opacity: 0.042 }, // cuerpo
    { size: 200, blur: 22,  opacity: 0.055 }, // núcleo
  ];
  const layers = CFG.map(makeLayer);

  // Lerp por capa: más lento = más halo
  const LERPS    = [0.030, 0.052, 0.080];
  // Fuerza del latido muy reducida — solo una insinuación de pulso
  const STRENGTH = [0.10,  0.07,  0.04];
  // Delay de fase: el halo lleva un pequeño retraso (el pulso se propaga hacia afuera)
  const DELAY    = [0.06,  0.03,  0.00];  // en fracción de ciclo

  const mouse = { x: -2000, y: -2000 };
  const pos   = CFG.map(() => ({ x: -2000, y: -2000 }));

  // Deriva ascendente por capa
  const DRIFT = [
    { range: 70, speed: 0.00018, phase: 0.0 },
    { range: 42, speed: 0.00022, phase: 1.3 },
    { range: 22, speed: 0.00028, phase: 2.5 },
  ];

  let visible = false;
  let startTime = null;

  function show() {
    visible = true;
    layers.forEach(l => { l.style.opacity = String(l._base); });
  }
  function hide() {
    visible = false;
    layers.forEach(l => { l.style.opacity = '0'; });
  }

  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (!visible) show();
  });
  document.addEventListener('mouseleave', hide);
  document.addEventListener('mouseenter', show);

  // ── Rotación de color ───────────────────────────────────────────
  let colorIndex = 0;
  setInterval(() => {
    colorIndex = (colorIndex + 1) % COLORS.length;
    const c = COLORS[colorIndex];
    layers.forEach(l => {
      l.style.background = `radial-gradient(circle at 50% 50%, ${c} 0%, transparent 55%)`;
    });
  }, ROTATION_INTERVAL);

  // ── Loop principal ──────────────────────────────────────────────
  function tick(now) {
    if (!startTime) startTime = now;
    const elapsed = now - startTime;

    layers.forEach((layer, i) => {
      // Lerp de posición
      pos[i].x = lerp(pos[i].x, mouse.x, LERPS[i]);
      pos[i].y = lerp(pos[i].y, mouse.y, LERPS[i]);

      const size = CFG[i].size;

      // Fase del latido con delay por capa
      const cyclePos = ((elapsed / CYCLE_MS) - DELAY[i] + 100) % 1;
      const pulse    = heartbeatScale(cyclePos, STRENGTH[i]);

      // Pulso de opacidad mínimo — casi imperceptible
      const opacityBoost = (pulse - 1) * 0.15;
      layer.style.opacity = String(Math.min(layer._base + opacityBoost, 0.08));

      // Deriva ascendente senoidal con sesgo hacia arriba
      const driftY = Math.sin(elapsed * DRIFT[i].speed + DRIFT[i].phase) * DRIFT[i].range
                   - DRIFT[i].range * 0.35;

      const x = pos[i].x - (size * pulse) / 2;
      const y = pos[i].y - (size * pulse) / 2 + driftY;

      layer.style.transform = `translate(${x}px, ${y}px) scale(${pulse})`;
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
