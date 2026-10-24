import {useEffect,useState} from 'react'
import type {Lang} from './model'
const valid=(value:string|null):value is Lang=>value==='EN'||value==='RU'||value==='KK'
export function useLanguage(){
 const [lang,setLang]=useState<Lang>(()=>{try{const saved=localStorage.getItem('ofe:language');return valid(saved)?saved:'EN'}catch{return 'EN'}})
 useEffect(()=>{document.documentElement.lang=lang.toLowerCase();try{localStorage.setItem('ofe:language',lang)}catch{}},[lang])
 useEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key==='ofe:language'&&valid(event.newValue))setLang(event.newValue)};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[])
 return [lang,setLang] as const
}
