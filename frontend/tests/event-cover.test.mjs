import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/event-cover-storage.ts',import.meta.url),'utf8')
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {eventCoverPath,uploadEventCover,coverReference} = await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))
const teamId='91c2831b-10f5-43f1-9199-f421a368aa12'
const fileId='91c2831b-10f5-43f1-9199-f421a368aa13'
const file = () => new Blob(['RIFF',new Uint8Array(4),'WEBP',new Uint8Array(8)],{type:'image/webp'})
test('absent covers have no image reference; cover paths cannot traverse another team',()=>{
  assert.equal(coverReference(),undefined)
  assert.equal(coverReference(''),undefined)
  assert.equal(eventCoverPath('current',teamId,fileId),`current/${teamId}/${fileId}.webp`)
  for(const eventId of ['', '../current','current/other','current#x']) assert.throws(()=>eventCoverPath(eventId,teamId,fileId))
  assert.throws(()=>eventCoverPath('current','../other',fileId))
})
test('cover uploads use unique immutable paths and reject invalid files before Storage',async()=>{
  const calls=[]
  const client={storage:{from:bucket=>({upload:async(...args)=>{calls.push({bucket,args});return {error:null}}})}}
  const first=await uploadEventCover(client,'current',teamId,file())
  const second=await uploadEventCover(client,'current',teamId,file())
  assert.notEqual(first,second)
  assert.equal(calls[0].bucket,'event-covers')
  assert.deepEqual(calls[0].args[2],{contentType:'image/webp',upsert:false,cacheControl:'0'})
  for(const invalid of [new Blob(['x'],{type:'image/webp'}),new Blob(['RIFFxxxxWEBP'],{type:'image/svg+xml'}),new Blob([new Uint8Array(5*1024*1024+1)],{type:'image/webp'})]) await assert.rejects(uploadEventCover(client,'current',teamId,invalid))
  assert.equal(calls.length,2)
  await assert.rejects(uploadEventCover({storage:{from:()=>({upload:async()=>({error:new Error('denied')})})}},'current',teamId,file()),/Cover upload failed/)
})

// Render the real card and profile: an absent optional cover must never produce
// an empty/broken <img>, while an uploaded cover reaches both components.
import vm from 'node:vm'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const require=createRequire(import.meta.url)
async function componentModule(file,modules){
 const text=await readFile(new URL(file,import.meta.url),'utf8')
 const exports={}
 vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>modules[name]??require(name)})
 return exports
}
test('real project card and profile render with and without an optional photo',async()=>{
 const project={id:'event-team-1',source:'event',eventIds:['current'],name:'Project',description:'Description',industry:'IT',stage:'Idea',team:'Team',product:''}
 const source=await readFile(new URL('../src/catalog.ts',import.meta.url),'utf8')
 const catalog=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'))
 const model={useT:()=>text=>text,useModel:()=>({submissions:[],eventProjects:[project],events:[{id:'current',title:'Founders Cup',published:true}],account:'signed-out',userEmail:'',liveMode:true,isAdmin:false})}
 const storage={StorageImage:props=>React.createElement('img',{...props,alt:props.alt??''})}
 const router={Link:({children,to,id,...props})=>React.createElement('a',{...props,href:`/${to}/${id??''}`},children),useRouter:()=>({route:{id:project.id}})}
 const ui={Icon:()=>null,useReveal:()=>{},SectionHead:()=>null,PageHero:()=>null}
 const cards=await componentModule('../src/cards.tsx',{'./storage':storage,'./event-date':{},'./model':model,'./catalog':catalog,'./router':router,'./ui':ui})
 const profiles=await componentModule('../src/pages/projects.tsx',{'../cards':cards,'../media':{ownsStartup:()=>false},'../model':model,'../router':router,'../storage':storage,'../ui':ui,'../validation':{},'../catalog':catalog})
 for(const Component of [cards.ProjectCard,profiles.ProjectProfile]){
   const props=Component===cards.ProjectCard?{project}:{}
   assert.doesNotMatch(renderToStaticMarkup(React.createElement(Component,props)),/<img/)
   project.cover=`event-cover://current/${teamId}/${fileId}.webp`
   const html=renderToStaticMarkup(React.createElement(Component,props))
   assert.match(html,/<img/)
   assert.ok(html.includes(project.cover))
   delete project.cover
 }
})
