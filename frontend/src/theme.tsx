import { useEffect, useState } from 'react'
import { useT } from './model'
export function ThemeToggle() {
 const t=useT()
 const [dark,setDark]=useState(()=>{try{const saved=localStorage.getItem('ofe:theme');return saved?saved==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches}catch{return false}})
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('ofe:theme',dark?'dark':'light')}catch{}},[dark])
 return <button className="theme-toggle" aria-label={t(dark?'Switch to light mode':'Switch to dark mode')} title={t(dark?'Switch to light mode':'Switch to dark mode')} aria-pressed={dark} onClick={()=>setDark(!dark)}><span aria-hidden="true">{dark?'☀':'☾'}</span></button>
}
