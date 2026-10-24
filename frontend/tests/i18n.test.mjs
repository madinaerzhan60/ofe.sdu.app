import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
const translations={}
const source=await readFile(new URL('../src/translations.ts',import.meta.url),'utf8')
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{require:()=>({translations}),exports:{}})
test('every literal UI translation has nonempty Russian and Kazakh text',async()=>{
 for(const file of (await readdir(new URL('../src/',import.meta.url))).filter(name=>name.endsWith('.tsx'))){
  const text=await readFile(new URL('../src/'+file,import.meta.url),'utf8')
  const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='t'&&node.arguments[0]&&ts.isStringLiteralLike(node.arguments[0])){const key=node.arguments[0].text;assert.ok(translations[key]?.[0]?.trim(),file+': missing Russian '+key);assert.ok(translations[key]?.[1]?.trim(),file+': missing Kazakh '+key)}ts.forEachChild(node,visit)}visit(ast)
 }
})
test('member Other and project detail labels use the appropriate context',()=>{assert.equal(translations['Other role'][0],'Другая роль');assert.equal(translations['Project details'][0],'Данные проекта');assert.equal(translations['Submit a project'][0],'Подать заявку')})
const dates=await readFile(new URL('../src/event-date.ts',import.meta.url),'utf8')
const compiled=ts.transpileModule(dates,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {eventDate}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'))
test('event dates are fully localized without relying on browser locale data',()=>{assert.equal(eventDate('2026-11-26','KK').full,'26 қараша 2026');assert.equal(eventDate('2026-11-26','KK').weekday,'Бейсенбі');assert.equal(eventDate('2026-11-26','RU').full,'26 ноября 2026');assert.equal(eventDate('2026-11-26','EN').weekday,'Thursday');assert.equal(eventDate('','KK').full,'')})
