(function(){
  "use strict";
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hero canvas: copper pipe-lines carrying moving light — leads flowing
  // through the business without a leak. Runs continuously.
  var canvas = document.getElementById('flow');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    function size(){
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.max(1, w * DPR);
      canvas.height = Math.max(1, h * DPR);
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }
    size();
    window.addEventListener('resize', size);

    var PIPES = 7, pipes = [];
    for (var i=0;i<PIPES;i++){
      pipes.push({
        y0: 0.08 + (i/(PIPES-1))*0.86,
        amp: 16 + Math.random()*22,
        wobble: 0.6 + Math.random()*0.5,
        phase: Math.random()*Math.PI*2,
        dots: [{p:Math.random(), v:0.045+Math.random()*0.035},
               {p:Math.random(), v:0.045+Math.random()*0.035}]
      });
    }
    var t = 0;
    function pathY(pipe, xf){
      return pipe.y0*h + Math.sin(xf*Math.PI*2*pipe.wobble + pipe.phase + t*0.22) * pipe.amp;
    }
    function draw(){
      if (w<2||h<2){ requestAnimationFrame(draw); return; }
      ctx.clearRect(0,0,w,h);
      if (!reduced) t += 1;
      for (var i=0;i<pipes.length;i++){
        var pipe = pipes[i];
        ctx.beginPath();
        for (var s=0;s<=72;s++){
          var xf=s/72, x=xf*w, y=pathY(pipe,xf);
          if (s===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.strokeStyle='rgba(205,127,66,0.20)';
        ctx.lineWidth=1.5;
        ctx.stroke();
        if (!reduced){
          for (var d=0; d<pipe.dots.length; d++){
            var dot=pipe.dots[d];
            dot.p += dot.v*0.01;
            if (dot.p>1) dot.p-=1;
            var dx=dot.p*w, dy=pathY(pipe,dot.p);
            var grad=ctx.createRadialGradient(dx,dy,0,dx,dy,16);
            grad.addColorStop(0,'rgba(242,176,106,0.85)');
            grad.addColorStop(1,'rgba(242,176,106,0)');
            ctx.fillStyle=grad;
            ctx.beginPath(); ctx.arc(dx,dy,16,0,Math.PI*2); ctx.fill();
            ctx.fillStyle='#fbe0bb';
            ctx.beginPath(); ctx.arc(dx,dy,2.3,0,Math.PI*2); ctx.fill();
          }
        }
      }
      if (!reduced) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // Sticky "How I work": highlight whichever step's center is nearest the
  // middle of the screen, recalculated every scroll frame so no step is skipped.
  var steps = document.querySelectorAll('.p-step');
  var pvNum = document.getElementById('pv-num');
  var current = -1;
  function update(){
    var mid = window.innerHeight / 2, best = 0, bestDist = Infinity;
    for (var i=0;i<steps.length;i++){
      var r = steps[i].getBoundingClientRect();
      var dist = Math.abs(r.top + r.height/2 - mid);
      if (dist < bestDist){ bestDist = dist; best = i; }
    }
    if (best !== current){
      current = best;
      steps.forEach(function(s,i){ s.classList.toggle('active', i===best); });
      if (pvNum) pvNum.textContent = '0' + steps[best].getAttribute('data-step');
    }
  }
  if (steps.length){
    var ticking = false;
    function onScroll(){
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function(){ update(); ticking = false; });
    }
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll);
    update();
  }
})();
