try{var s=localStorage.getItem('ofe:theme');document.documentElement.dataset.theme=s==='dark'||(!s&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){}
