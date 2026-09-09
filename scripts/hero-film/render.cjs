// Deterministic 15-second edit of controlled real-UI captures. No generated UI.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve('apps/web/public/hero-film');
const shots=[['content',4],['caption',2],['schedule',2],['posting',2],['performance',2],['posting',3]];
for(const format of ['desktop','mobile']) {
 const folder=path.join(base,format);fs.mkdirSync(folder,{recursive:true});
 const size=format==='desktop'?'1440x950':'430x820';
 const [w,h]=size.split('x').map(Number);
 for(let i=0;i<shots.length;i++) {
  const [scene,seconds]=shots[i];
  // Small push-in and a six-frame dissolve through the scene's own surface.
  const filter=`${format === 'desktop' ? 'crop=1060:700:370:90,' : ''}scale=${w*2}:${h*2},zoompan=z='1+0.012*on/${seconds*30}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${size}:fps=30,fade=t=in:st=0:d=0.16,fade=t=out:st=${seconds-.16}:d=0.16,format=yuv420p`;
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-loop','1','-framerate','30','-i',path.join(base,'captures',`${format}-${scene}.png`),'-vf',filter,'-t',String(seconds),'-c:v','libx264','-preset','fast','-crf','23','-an',path.join(folder,`shot-${i}.mp4`)],{stdio:'inherit'});
 }
 const list=path.join(folder,'edit.txt');
 fs.writeFileSync(list,shots.map((_,i)=>`file 'shot-${i}.mp4'`).join('\n'));
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',path.join(folder,'oyinca-film.mp4')],{stdio:'inherit'});
 fs.mkdirSync(path.join(base,'posters'),{recursive:true});
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',path.join(base,'captures',`${format}-posting.png`),...(format==='desktop'?['-vf','crop=1060:700:370:90']:[]),'-frames:v','1','-q:v','3',path.join(base,'posters',`${format}.jpg`)],{stdio:'inherit'});
 for(let i=0;i<shots.length;i++)fs.unlinkSync(path.join(folder,`shot-${i}.mp4`));fs.unlinkSync(list);
 console.log(format,fs.statSync(path.join(folder,'oyinca-film.mp4')).size,'bytes');
}


