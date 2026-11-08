import {useEffect,useRef,useState} from 'react'

const photos = [
 ['IMG_7414','All together on the Demo Day stage'],
 ['IMG_7500','Celebrating the teams'],
 ['IMG_7440','The award ceremony'],
 ['IMG_7247','Student founders at Demo Day'],
 ['IMG_7388','Ideas worth celebrating'],
] as const
export function ArchiveGallery({t}:{t:(text:string)=>string}) {
 const [active,setActive]=useState(0)
 const [paused,setPaused]=useState(false)
 const hasAdvanced=useRef(false)
 useEffect(()=>{
  if(paused)return
  const timer=window.setTimeout(()=>{
   hasAdvanced.current=true
   setActive(index=>(index+1)%photos.length)
  },hasAdvanced.current?4000:2500)
  return ()=>window.clearTimeout(timer)
 },[active,paused])
 const touchStart=useRef<number|null>(null)
 const lightbox=useRef<HTMLDialogElement>(null)
 const move=(step:number)=>{
  hasAdvanced.current=true
  setActive(index=>(index+step+photos.length)%photos.length)
 }
 return <section className="memory-gallery" aria-label={t('Demo Day photo gallery')} aria-roledescription={t('Carousel')}>
  <div className="memory-heading"><span className="gallery-index">01 — 05</span><h2>{t('THE DAY IN PICTURES')}</h2></div>
  <div className="memory-stage" tabIndex={0} aria-label={t('Use arrow keys to browse photos')} onKeyDown={event=>{if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}if(event.key==='ArrowRight'){event.preventDefault();move(1)}}} onTouchStart={event=>{touchStart.current=event.touches[0].clientX}} onTouchEnd={event=>{if(touchStart.current===null)return;const distance=touchStart.current-event.changedTouches[0].clientX;if(Math.abs(distance)>45)move(distance>0?1:-1);touchStart.current=null}} onTouchCancel={()=>{touchStart.current=null}}>
   <div className="photo-deck">{photos.map(([file,caption],index)=>{let offset=(index-active+photos.length)%photos.length;if(offset>2)offset-=photos.length;return <button key={file} type="button" className={'deck-photo deck-position-'+offset} tabIndex={offset===0?0:-1} aria-hidden={Math.abs(offset)>1} aria-label={t(caption)} onClick={()=>{if(offset===0){setPaused(true);lightbox.current?.showModal()}else move(offset)}}><img src={'/demo-day/'+file+'.webp'} alt={t(caption)} width="1600" height="1067"/><span className="deck-photo-label">{String(index+1).padStart(2,'0')}<span>DEMO DAY / 2026</span><span>↗</span></span></button>})}</div>
  </div>
  <div className="deck-navigation"><span className="deck-caption">{t(photos[active][1])}</span><div className="deck-controls"><button type="button" onClick={()=>move(-1)} aria-label={t('Previous photo')}>←</button><span className="deck-counter">{String(active+1).padStart(2,'0')} <i>/ {String(photos.length).padStart(2,'0')}</i></span><button type="button" onClick={()=>move(1)} aria-label={t('Next photo')}>→</button><button type="button" onClick={()=>setPaused(value=>!value)} aria-label={paused?t('Play slideshow'):t('Pause slideshow')}>{paused?'▶':'Ⅱ'}</button></div></div>
  <dialog className="photo-lightbox" ref={lightbox} aria-label={t('Demo Day photo gallery')}><button type="button" className="lightbox-close" aria-label={t('Close')} onClick={()=>lightbox.current?.close()}>×</button><img src={'/demo-day/'+photos[active][0]+'.webp'} alt={t(photos[active][1])}/><p>{t(photos[active][1])}</p></dialog>
 </section>
}
