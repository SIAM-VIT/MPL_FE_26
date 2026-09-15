(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Starfield: twinkle + per-star cursor repulsion + constellation links ---------- */
  var canvas = document.getElementById('stars');
  var ctx = canvas.getContext('2d');
  var W, H, DPR;
  var stars = [];
  var shootingStars = [];
  var mouseCX = -9999, mouseCY = -9999;
  var hasMouse = false;

  function resize(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    seedStars();
  }

  function seedStars(){
    var count = Math.round((W*H)/7800);
    stars = [];
    for(var i=0;i<count;i++){
      var depth = Math.random()*0.7 + 0.3;
      var tint = Math.random();
      stars.push({
        x: Math.random()*W,
        y: Math.random()*H,
        r: depth*1.7 + 0.5,
        baseAlpha: Math.random()*0.55 + 0.3,
        phase: Math.random()*Math.PI*2,
        speed: Math.random()*0.015 + 0.006,
        depth: depth,
        tint: tint, // 0 = pure white, 1 = pale ice-blue — no gold in the base field
        ox:0, oy:0, vx:0, vy:0
      });
    }
  }

  function maybeSpawnShootingStar(){
    if (reduceMotion) return;
    if (Math.random() < 0.006 && shootingStars.length < 2){
      var startX = Math.random()*W*0.6 + W*0.1;
      var startY = Math.random()*H*0.25;
      shootingStars.push({
        x:startX, y:startY,
        vx: 6 + Math.random()*4,
        vy: 3 + Math.random()*2,
        life:0, maxLife: 55 + Math.random()*20
      });
    }
  }

  var INFLUENCE = 190;
  var LINK_RADIUS = 200;
  var STAR_LINK_RADIUS = 75;
  var t = 0;

  function draw(){
    t += 1;
    ctx.clearRect(0,0,W,H);

    var near = [];

    for(var i=0;i<stars.length;i++){
      var s = stars[i];
      var dist = Infinity;

      if(hasMouse){
        var dx0 = (s.x + s.ox) - mouseCX;
        var dy0 = (s.y + s.oy) - mouseCY;
        dist = Math.sqrt(dx0*dx0 + dy0*dy0) || 0.001;

        if(!reduceMotion && dist < INFLUENCE){
          var force = (1 - dist/INFLUENCE) * (1.1 + s.depth*1.1);
          s.vx += (dx0/dist) * force * 2.3;
          s.vy += (dy0/dist) * force * 2.3;
        }
      }

      // spring back toward home + damping
      s.vx += (0 - s.ox) * 0.022;
      s.vy += (0 - s.oy) * 0.022;
      s.vx *= 0.91;
      s.vy *= 0.91;
      s.ox += s.vx;
      s.oy += s.vy;

      var tw = reduceMotion ? s.baseAlpha : s.baseAlpha + Math.sin(t*s.speed + s.phase) * 0.28;
      var alpha = Math.max(0, Math.min(1, tw));
      var px = s.x + s.ox;
      var py = s.y + s.oy;

      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI*2);
      var c = s.tint > 0.72
        ? '210,228,255'
        : '255,255,255';
      ctx.fillStyle = 'rgba(' + c + ',' + alpha + ')';
      ctx.fill();

      if(hasMouse && dist < LINK_RADIUS){
        near.push({x:px, y:py, d:dist});
      }
    }

    // constellation links: cursor -> nearby stars, and nearby stars -> each other
    if(near.length){
      for(var a=0;a<near.length;a++){
        var na = near[a];
        var la = 1 - na.d/LINK_RADIUS;
        ctx.strokeStyle = 'rgba(240,190,110,' + (la*0.55) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mouseCX, mouseCY);
        ctx.lineTo(na.x, na.y);
        ctx.stroke();

        for(var b=a+1;b<near.length;b++){
          var nb = near[b];
          var ddx = na.x-nb.x, ddy = na.y-nb.y;
          var dd = Math.sqrt(ddx*ddx+ddy*ddy);
          if(dd < STAR_LINK_RADIUS){
            var lb = 1 - dd/STAR_LINK_RADIUS;
            ctx.strokeStyle = 'rgba(255,255,255,' + (lb*0.32) + ')';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(na.x, na.y);
            ctx.lineTo(nb.x, nb.y);
            ctx.stroke();
          }
        }
      }
      // small bright hub where the cursor sits
      var hubGrad = ctx.createRadialGradient(mouseCX, mouseCY, 0, mouseCX, mouseCY, 5);
      hubGrad.addColorStop(0, 'rgba(255,236,190,0.9)');
      hubGrad.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = hubGrad;
      ctx.beginPath();
      ctx.arc(mouseCX, mouseCY, 5, 0, Math.PI*2);
      ctx.fill();
    }

    maybeSpawnShootingStar();
    for(var j=shootingStars.length-1;j>=0;j--){
      var sh = shootingStars[j];
      sh.x += sh.vx; sh.y += sh.vy; sh.life++;
      var a2 = 1 - sh.life/sh.maxLife;
      if(a2 <= 0){ shootingStars.splice(j,1); continue; }
      var grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx*8, sh.y - sh.vy*8);
      grad.addColorStop(0, 'rgba(255,244,214,' + a2 + ')');
      grad.addColorStop(1, 'rgba(255,244,214,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x - sh.vx*8, sh.y - sh.vy*8);
      ctx.stroke();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();

  /* ---------- Cursor tracking: drives background parallax + star repulsion + ambient glow + badge tilt ---------- */
  var cursorGlow = document.getElementById('cursorGlow');
  var badgeWrap = document.getElementById('badgeWrap');
  var bgPhoto = document.querySelector('.bg-photo');

  function onPointerMove(clientX, clientY){
    mouseCX = clientX;
    mouseCY = clientY;
    hasMouse = true;

    cursorGlow.style.setProperty('--mx', ((clientX/window.innerWidth)*100) + '%');
    cursorGlow.style.setProperty('--my', ((clientY/window.innerHeight)*100) + '%');

    if(!reduceMotion){
      var mx = clientX / window.innerWidth;
      var my = clientY / window.innerHeight;
      var rx = (my - 0.5) * -10;
      var ry = (mx - 0.5) * 14;
      badgeWrap.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';

      // background photo drifts gently opposite the cursor for a live, parallax feel
      var px = (mx - 0.5) * 2;
      var py = (my - 0.5) * 2;
      bgPhoto.style.transform = 'translate3d(' + (-px*16) + 'px, ' + (-py*14) + 'px, 0) scale(1.06)';
    }
  }

  window.addEventListener('mousemove', function(e){
    onPointerMove(e.clientX, e.clientY);
  });
  window.addEventListener('mouseleave', function(){
    hasMouse = false;
    mouseCX = -9999; mouseCY = -9999;
    bgPhoto.style.transform = 'translate3d(0,0,0) scale(1.06)';
  });
  window.addEventListener('touchmove', function(e){
    if(e.touches && e.touches[0]){
      onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, {passive:true});

  /* ----- Arena entry: the hub (index.html) owns login — go straight there ----- */
  var openBtn = document.getElementById('openLogin');
  openBtn.addEventListener('click', function(){
    window.location.href = 'index.html';  // same folder under :8000/ui, :5500, or file://
  });
  /* ---------- Interactive Math Font Switcher ---------- */
  var fontBtns = document.querySelectorAll('.fs-btn');
  var mathLine = document.querySelector('h1.wordmark .line1');

  function setMathFont(fontName) {
    if (!mathLine) return;
    mathLine.classList.remove('font-chakra', 'font-audiowide', 'font-teko', 'font-syne');
    if (fontName && fontName !== 'michroma') {
      mathLine.classList.add('font-' + fontName);
    }
    fontBtns.forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-font') === fontName);
    });
    try {
      localStorage.setItem('mpl_math_font', fontName);
    } catch(e) {}
  }

  fontBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var font = this.getAttribute('data-font');
      setMathFont(font);
    });
  });

  try {
    var savedFont = localStorage.getItem('mpl_math_font');
    if (savedFont) {
      setMathFont(savedFont);
    }
  } catch(e) {}
})();
