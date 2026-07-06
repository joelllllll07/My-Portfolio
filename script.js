// ---------- Reveal on scroll ----------
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ---------- Custom cursor ----------
(function () {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const ring = document.querySelector('.cursor-ring');
  const dot = document.querySelector('.cursor-dot');
  if (!ring || !dot) return;
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;
  window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`; }, { passive: true });
  function tick() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  }
  tick();
  const hoverSel = 'a, button, .btn, .badge, .contact-link, .nav-links a, .step-chip, input, textarea';
  document.querySelectorAll(hoverSel).forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });
  window.addEventListener('mousedown', () => ring.classList.add('click'));
  window.addEventListener('mouseup', () => ring.classList.remove('click'));
  window.addEventListener('mouseleave', () => { ring.style.opacity = 0; dot.style.opacity = 0; });
  window.addEventListener('mouseenter', () => { ring.style.opacity = 1; dot.style.opacity = 1; });
})();

// ---------- Process canvas: scroll-driven web build ----------
(function () {
  const canvas = document.getElementById('web-canvas');
  const scrollWrap = document.querySelector('.process-scroll');
  if (!canvas || !scrollWrap) return;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  let nodes = [];
  let mouse = { x: -9999, y: -9999, active: false };
  let progress = 0; // 0 -> 1 scroll-driven progress through the section
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const stepData = [
    { title: 'Ideate.', desc: 'Every page starts as loose dots — half-thoughts and stray sketches waiting to be connected.' },
    { title: 'Sketch.', desc: 'Ideas find their neighbors. Short strokes link the closest thoughts into a rough scaffold.' },
    { title: 'Code.', desc: 'The scaffold hardens into structure — every dot a component, every line a function call.' },
    { title: 'Ship.', desc: 'The web comes alive. Move your cursor — the network pulls toward you, just like a real user.' }
  ];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function seed() {
    const density = Math.max(28, Math.min(56, Math.floor((W * H) / 14000)));
    nodes = new Array(density).fill(0).map(() => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.2 + 1.0,
      appear: Math.random() * 0.9 + 0.1
    }));
  }

  function onScroll() {
    const rect = scrollWrap.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) { progress = 1; return; }
    const scrolled = -rect.top;
    progress = Math.min(1, Math.max(0, scrolled / total));
    updateOverlay();
  }

  const chips = document.querySelectorAll('.step-chip');
  const stepTitle = document.getElementById('step-title');
  const stepDesc = document.getElementById('step-desc');
  const progressBar = document.getElementById('process-progress-bar');

  function updateOverlay() {
    const stageIdx = Math.min(3, Math.floor(progress * 4));
    chips.forEach(c => c.classList.toggle('active', Number(c.dataset.step) === stageIdx));
    if (stepTitle) stepTitle.textContent = stepData[stageIdx].title;
    if (stepDesc) stepDesc.textContent = stepData[stageIdx].desc;
    if (progressBar) progressBar.style.width = (progress * 100).toFixed(1) + '%';
  }

  chips.forEach(c => c.addEventListener('click', () => {
    const idx = Number(c.dataset.step);
    const rect = scrollWrap.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const target = window.scrollY + rect.top + (idx / 4) * total + 10;
    window.scrollTo({ top: target, behavior: 'smooth' });
  }));

  function update() {
    // continuous link distance driven by scroll progress, smoother than discrete jumps
    const linkDist = progress * 170;
    const attract = progress > 0.72;

    ctx.clearRect(0, 0, W, H);

    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;

      if (attract && mouse.active) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 180 * 180) {
          const d = Math.sqrt(d2) || 1;
          n.vx += (dx / d) * 0.02;
          n.vy += (dy / d) * 0.02;
        }
      }
      n.vx *= 0.995; n.vy *= 0.995;
      n.x = Math.max(0, Math.min(W, n.x));
      n.y = Math.max(0, Math.min(H, n.y));
    }

    if (linkDist > 2) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            const alpha = (1 - d / linkDist) * 0.5;
            ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    if (attract && mouse.active) {
      for (const n of nodes) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d < 180) {
          const alpha = (1 - d / 180) * 0.9;
          ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      }
    }

    for (const n of nodes) {
      ctx.fillStyle = `rgba(245,245,247,${(0.6 + n.appear * 0.4).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (attract && mouse.active) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2); ctx.fill();
    }

    requestAnimationFrame(update);
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top; mouse.active = true;
  });
  canvas.addEventListener('mouseleave', () => { mouse.active = false; });

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', onScroll, { passive: true });
  resize();
  onScroll();
  update();
})();

// ---------- Open to Work form ----------
// The form posts directly to Formspree's email endpoint (see index.html's action attribute) —
// no account signup needed. On first-ever submission, Formspree emails a one-time confirmation
// link to activate the form; every submission after that arrives straight in the inbox.
(function () {
  const form = document.getElementById('work-form');
  if (!form) return;
  const note = document.getElementById('form-note');
  const submitBtn = document.getElementById('form-submit-btn');

  form.addEventListener('submit', () => {
    if (note) { note.textContent = 'Sending...'; note.className = 'form-note'; }
    if (submitBtn) submitBtn.disabled = true;
    // Native form submission proceeds from here; Formspree redirects to its own
    // confirmation/thank-you page after a successful send.
  });
})();
