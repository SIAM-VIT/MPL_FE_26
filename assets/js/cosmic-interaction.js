(function(){
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('stars');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  if(!ctx) return;

  var W=0,H=0,DPR=1,stars=[],shootingStars=[];
  var mouseX=-9999,mouseY=-9999,hasPointer=false,frame=0;
  var INFLUENCE=190,LINK_RADIUS=200,STAR_LINK_RADIUS=76;
  var cursorGlow=document.getElementById('cursorGlow');
  var bgPhoto=document.querySelector('.bg-photo');

  function resize(){
    DPR=Math.min(window.devicePixelRatio||1,2);
    W=window.innerWidth; H=window.innerHeight;
    canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR);
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    seedStars();
  }

  function seedStars(){
    var count=Math.max(70,Math.round((W*H)/8200));
    stars=[];
    for(var i=0;i<count;i++){
      var depth=Math.random()*.7+.3;
      stars.push({
        x:Math.random()*W,y:Math.random()*H,r:depth*1.65+.45,
        baseAlpha:Math.random()*.52+.28,phase:Math.random()*Math.PI*2,
        speed:Math.random()*.015+.006,depth:depth,tint:Math.random(),
        ox:0,oy:0,vx:0,vy:0
      });
    }
  }

  function spawnShootingStar(){
    if(reduceMotion||shootingStars.length>1||Math.random()>=.006) return;
    shootingStars.push({
      x:Math.random()*W*.62+W*.06,y:Math.random()*H*.24,
      vx:6+Math.random()*4,vy:3+Math.random()*2,
      life:0,maxLife:55+Math.random()*20
    });
  }

  function draw(){
    frame++;
    ctx.clearRect(0,0,W,H);
    var near=[];

    for(var i=0;i<stars.length;i++){
      var s=stars[i],dist=Infinity;
      if(hasPointer){
        var dx=(s.x+s.ox)-mouseX,dy=(s.y+s.oy)-mouseY;
        dist=Math.sqrt(dx*dx+dy*dy)||.001;
        if(!reduceMotion&&dist<INFLUENCE){
          var force=(1-dist/INFLUENCE)*(1.1+s.depth*1.1);
          s.vx+=(dx/dist)*force*2.25;
          s.vy+=(dy/dist)*force*2.25;
        }
      }
      s.vx+=(0-s.ox)*.022; s.vy+=(0-s.oy)*.022;
      s.vx*=.91; s.vy*=.91; s.ox+=s.vx; s.oy+=s.vy;

      var tw=reduceMotion?s.baseAlpha:s.baseAlpha+Math.sin(frame*s.speed+s.phase)*.28;
      var alpha=Math.max(0,Math.min(1,tw));
      var px=s.x+s.ox,py=s.y+s.oy;
      ctx.beginPath();ctx.arc(px,py,s.r,0,Math.PI*2);
      ctx.fillStyle=s.tint>.72?'rgba(210,228,255,'+alpha+')':'rgba(255,255,255,'+alpha+')';
      ctx.fill();
      if(hasPointer&&dist<LINK_RADIUS) near.push({x:px,y:py,d:dist});
    }

    for(var a=0;a<near.length;a++){
      var na=near[a],la=1-na.d/LINK_RADIUS;
      ctx.strokeStyle='rgba(240,190,110,'+(la*.53)+')';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(mouseX,mouseY);ctx.lineTo(na.x,na.y);ctx.stroke();
      for(var b=a+1;b<near.length;b++){
        var nb=near[b],ddx=na.x-nb.x,ddy=na.y-nb.y;
        var dd=Math.sqrt(ddx*ddx+ddy*ddy);
        if(dd<STAR_LINK_RADIUS){
          ctx.strokeStyle='rgba(255,255,255,'+((1-dd/STAR_LINK_RADIUS)*.30)+')';
          ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(na.x,na.y);ctx.lineTo(nb.x,nb.y);ctx.stroke();
        }
      }
    }

    if(near.length){
      var hub=ctx.createRadialGradient(mouseX,mouseY,0,mouseX,mouseY,5);
      hub.addColorStop(0,'rgba(255,236,190,.9)');hub.addColorStop(1,'rgba(255,236,190,0)');
      ctx.fillStyle=hub;ctx.beginPath();ctx.arc(mouseX,mouseY,5,0,Math.PI*2);ctx.fill();
    }

    spawnShootingStar();
    for(var j=shootingStars.length-1;j>=0;j--){
      var sh=shootingStars[j];sh.x+=sh.vx;sh.y+=sh.vy;sh.life++;
      var lifeAlpha=1-sh.life/sh.maxLife;
      if(lifeAlpha<=0){shootingStars.splice(j,1);continue;}
      var grad=ctx.createLinearGradient(sh.x,sh.y,sh.x-sh.vx*8,sh.y-sh.vy*8);
      grad.addColorStop(0,'rgba(255,244,214,'+lifeAlpha+')');grad.addColorStop(1,'rgba(255,244,214,0)');
      ctx.strokeStyle=grad;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(sh.x,sh.y);ctx.lineTo(sh.x-sh.vx*8,sh.y-sh.vy*8);ctx.stroke();
    }
    requestAnimationFrame(draw);
  }

  function onPointer(clientX,clientY){
    mouseX=clientX;mouseY=clientY;hasPointer=true;
    if(cursorGlow){
      cursorGlow.style.setProperty('--mx',(clientX/window.innerWidth*100)+'%');
      cursorGlow.style.setProperty('--my',(clientY/window.innerHeight*100)+'%');
    }
    if(bgPhoto&&!reduceMotion){
      var nx=clientX/window.innerWidth-.5,ny=clientY/window.innerHeight-.5;
      bgPhoto.style.transform='translate3d('+(-nx*32)+'px,'+(-ny*28)+'px,0) scale(1.06)';
    }
  }

  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('mousemove',function(e){onPointer(e.clientX,e.clientY);},{passive:true});
  window.addEventListener('mouseleave',function(){
    hasPointer=false;mouseX=-9999;mouseY=-9999;
    if(bgPhoto) bgPhoto.style.transform='translate3d(0,0,0) scale(1.06)';
  });
  window.addEventListener('touchmove',function(e){
    if(e.touches&&e.touches[0]) onPointer(e.touches[0].clientX,e.touches[0].clientY);
  },{passive:true});

  resize();draw();
})();