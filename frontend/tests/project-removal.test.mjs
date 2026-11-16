import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
const require=createRequire(import.meta.url)
const source=await readFile(new URL('../src/project-removal-dialog.tsx',import.meta.url),'utf8')
function dialog(onConfirm){
 const values=[];let cursor=0,closed=0
 const react={useState:initial=>{const index=cursor++;if(!(index in values))values[index]=initial;return [values[index],value=>{values[index]=value}]}}
 const exports={}
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>({react,'./model':{useT:()=>text=>text},'./admin-modal':{AdminModal:'dialog'}}[name]??require(name))})
 return {render(){cursor=0;return exports.ProjectRemovalDialog({name:'Chosen project',onConfirm,onClose:()=>closed++})},get closed(){return closed}}
}
const nodes=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(nodes)]
test('cancelling removal does not submit; confirming calls the chosen action and closes only on success',async()=>{
 let calls=0
 const view=dialog(async()=>{calls++;return true})
 const tree=view.render()
 nodes(tree).find(node=>node.type==='button'&&node.props.children==='Cancel').props.onClick()
 assert.equal(calls,0)
 assert.equal(view.closed,1)
 await nodes(view.render()).find(node=>node.type==='form').props.onSubmit({preventDefault(){}})
 assert.equal(calls,1)
 assert.equal(view.closed,2)
})
test('failed removal leaves the dialog open with an actionable error',async()=>{
 const view=dialog(async()=>false)
 await nodes(view.render()).find(node=>node.type==='form').props.onSubmit({preventDefault(){}})
 assert.equal(view.closed,0)
 assert.equal(nodes(view.render()).find(node=>node.props?.role==='alert').props.children,'Could not remove the project. Please try again.')
})
