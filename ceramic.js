/* タイトルの器。ゲームと同じ釉薬を使い、光と金の継ぎ目を重ねる。 */
function drawCeramic(texture){
  const canvas=document.getElementById('ceramic-art'),x=canvas.getContext('2d');
  if(!x)return;
  const image=new Image();
  const paint=()=>{
    x.clearRect(0,0,900,760);x.save();x.translate(455,345);x.rotate(-.12);x.scale(1,.89);
    x.shadowColor='#26352965';x.shadowBlur=44;x.shadowOffsetX=10;x.shadowOffsetY=36;
    x.beginPath();x.arc(0,0,272,0,Math.PI*2);x.fillStyle='#647b6b';x.fill();x.shadowColor='transparent';
    x.save();x.beginPath();x.arc(0,0,270,0,Math.PI*2);x.clip();
    if(image.complete&&image.naturalWidth)x.drawImage(image,-275,-275,550,550);
    else{x.fillStyle='#8eab99';x.fillRect(-275,-275,550,550)}
    let g=x.createRadialGradient(-85,-120,15,0,0,275);g.addColorStop(0,'#eaf3d766');g.addColorStop(.58,'#9cbba300');g.addColorStop(.76,'#244e4166');g.addColorStop(.82,'#244e4122');g.addColorStop(.95,'#f0e9cb66');g.addColorStop(1,'#254e4988');x.fillStyle=g;x.fillRect(-275,-275,550,550);
    for(let i=0;i<9;i++){x.beginPath();x.ellipse(-3,0,223+i*4,223+i*4,0,0,Math.PI*2);x.strokeStyle=i%2?'#f6f5d813':'#2346370b';x.lineWidth=1.5;x.stroke()}
    const seams=[ [[-265,-58],[-215,-43],[-172,-67],[-132,-39],[-94,-24],[-62,12],[-20,27],[10,70],[64,99],[99,142],[148,163],[174,211],[191,258]], [[-62,12],[-34,-38],[1,-68],[9,-107],[45,-139],[52,-194],[86,-224],[90,-271]], [[64,99],[109,59],[151,63],[180,35],[234,23],[276,-3]] ];
    const gold=x.createLinearGradient(-250,-200,240,260);gold.addColorStop(0,'#b18a3c');gold.addColorStop(.3,'#ead59c');gold.addColorStop(.53,'#94702c');gold.addColorStop(.72,'#e5c783');gold.addColorStop(1,'#a78846');
    for(const pts of seams){for(const [width,color,offset] of [[7,'#293e3077',1.5],[5,gold,0],[1.2,'#fff4ceaa',-1]]){x.beginPath();pts.forEach(([a,b],i)=>i?x.lineTo(a+offset,b+offset):x.moveTo(a+offset,b+offset));x.lineJoin='round';x.lineCap='round';x.lineWidth=width;x.strokeStyle=color;x.stroke()}}
    g=x.createRadialGradient(-130,-160,0,-130,-160,150);g.addColorStop(0,'#fffbe36b');g.addColorStop(1,'#ffffff00');x.fillStyle=g;x.fillRect(-275,-275,550,550);x.restore();
    x.beginPath();x.arc(0,0,268,Math.PI*1.03,Math.PI*1.85);x.lineWidth=3;x.strokeStyle='#e4e8c898';x.stroke();x.restore();
  };
  image.onload=paint;image.onerror=paint;if(texture)image.src=texture;else paint();
}
