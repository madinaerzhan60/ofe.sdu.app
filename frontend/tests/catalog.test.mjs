import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/catalog.ts',import.meta.url),'utf8')
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {publicProjects,forEvent} = await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))
test('catalogue merges confirmed event products without weakening ordinary publication rules',()=>{
  const published = {id:'approved',status:'Approved',publication:true,visible:true,eventIds:['cup'],eventYears:['2026']}
  const confirmed = {id:'event-team-1',source:'event',eventIds:['second-event']}
  const projects = publicProjects([published,{...published,id:'pending',status:'Pending'},{...published,id:'hidden',visible:false},{...published,id:'no-consent',publication:false}],[confirmed])
  assert.deepEqual(projects,[published,confirmed])
  assert.deepEqual(forEvent(projects,'cup'),[published])
  assert.deepEqual(forEvent(projects,'second-event'),[confirmed])
  assert.deepEqual(forEvent(projects,'other-event-in-2026'),[])
})
