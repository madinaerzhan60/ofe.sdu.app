import {useEffect,useRef,useState} from 'react'
import type {Finalist} from './model'
const winners=[
 {name:'LIBR',rank:'GP',label:'Grand Prix',award:'Investor support',image:'libr'},
 {name:'ХБ-ШНИКИ',rank:'01',label:'1st place',award:'200,000 ₸',image:'hb-shniki'},
 {name:'BILIMONT.KZ',rank:'02',label:'2nd place',award:'120,000 ₸',image:'bilimont'},
 {name:'Ronaldo Team',rank:'03',label:'3rd place',award:'',image:''},
]
const normalize=(name:string)=>name.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'')
function safeLink(value?:string){try{const url=new URL(value||'');return ['http:','https:'].includes(url.protocol)?url.href:undefined}catch{return undefined}}
export function ArchiveWinners({t,projects=[]}:{t:(text:string)=>string;projects?:Finalist[]}) {
 const [selected,setSelected]=useState<(typeof winners)[number]|null>(null)
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{if(selected&&!dialog.current?.open)dialog.current?.showModal()},[selected])
 const details=selected?projects.find(project=>normalize(project.name)===normalize(selected.name)):undefined
 const website=safeLink(details?.website)
 const hasDetails=Boolean(details?.description?.trim()||details?.members?.trim()||website)
 const canOpen=(winner:(typeof winners)[number])=>Boolean(winner.image||projects.some(p=>normalize(p.name)===normalize(winner.name)&&(p.description?.trim()||p.members?.trim()||safeLink(p.website))))
 return <section className="archive-winners" id="winners" aria-labelledby="winners-title">
  <div className="section-heading"><h2 id="winners-title">Winners</h2><span className="winners-edition">DEMO DAY / 2026</span></div>
  <div className="winners-grid">{winners.map(winner=><button type="button" className="winner-project" key={winner.rank} disabled={!canOpen(winner)} onClick={()=>setSelected(winner)} aria-label={t('View photo')+': '+winner.name}>
   <div className="winner-portrait">{winner.image?<img src={'/demo-day/'+winner.image+'.webp'} alt={winner.name+' · '+t(winner.label)} loading="lazy" width="960" height="1280"/>:<div className="winner-monogram" aria-hidden="true"><span>RT</span><small>DEMO DAY 2026</small></div>}<span className="winner-rank">{winner.rank}</span></div>
   <div className="winner-copy"><span className="memory-eyebrow">{t(winner.label)}</span><h3>{winner.name}{canOpen(winner)&&<span className="winner-open" aria-hidden="true">↗</span>}</h3>{winner.award&&<p className="winner-award">{t(winner.award)}</p>}{canOpen(winner)&&<span className="winner-discover">{t('View photo')} ↗</span>}</div>
  </button>)}</div>
  <dialog className={'winner-dialog'+(!hasDetails?' winner-dialog-photo-only':'')} ref={dialog} aria-labelledby="winner-detail-title" onClose={()=>setSelected(null)} onClick={event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.currentTarget.close()}}}>
   {selected&&<><button className="winner-dialog-close" type="button" aria-label={t('Close')} onClick={()=>dialog.current?.close()}>×</button><div className="winner-detail-layout"><div className="winner-detail-photo">{selected.image?<img src={'/demo-day/'+selected.image+'.webp'} alt={selected.name}/>:<span>RT</span>}</div><div className="winner-detail-copy"><span className="winner-detail-label">{t(selected.label)} · DEMO DAY 2026</span><h2 id="winner-detail-title">{selected.name}</h2>{selected.award&&<p className="winner-detail-award">{t(selected.award)}</p>}{details?.description?.trim()&&<><h3>{t('About the project')}</h3><p>{details.description}</p></>}{details?.members?.trim()&&<><h3>{t('The team')}</h3><p>{details.members}</p></>}{website&&<a className="winner-website" href={website} target="_blank" rel="noopener noreferrer">{t('Visit startup')} ↗</a>}</div></div></>}
  </dialog>
 </section>
}
