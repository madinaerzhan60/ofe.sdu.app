import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/consent.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: {module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022} }).outputText
const { withPublicationConsent, publicationConsentVersion } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const row = {id:'project-1',ownerId:'owner-1',name:'Project',description:'Description',team:'Team',status:'Approved',visible:true,publication:true,consentVersion:'old-policy',consentAt:'2026-01-01T00:00:00.000Z',feedback:'Approved by reviewer',eventYears:['2026'],image:'storage://owner-1/project-1/logo.webp'}
const now = new Date('2026-10-23T15:00:00.000Z')

test('withdrawal only changes owner consent fields and preserves moderation/content', () => {
  const before = structuredClone(row)
  const updated = withPublicationConsent(row,'owner-1',false,now)
  assert.deepEqual(updated,{...row,publication:false,consentVersion:publicationConsentVersion,consentAt:now.toISOString()})
  assert.deepEqual(row,before)
  assert.notEqual(updated,row)
})
test('grant records the current version and exact timestamp without self-approval', () => {
  const pending = {...row,status:'Pending',visible:false,publication:false}
  const updated = withPublicationConsent(pending,'owner-1',true,now)
  assert.equal(updated.publication,true)
  assert.equal(updated.consentVersion,'2026-10-22')
  assert.equal(updated.consentAt,now.toISOString())
  assert.equal(updated.status,'Pending')
  assert.equal(updated.visible,false)
})
test('signed-out users, other owners, and unowned records cannot create consent updates', () => {
  for (const userId of ['', 'other-owner']) assert.throws(() => withPublicationConsent(row,userId,false,now),/Only the project owner/)
  assert.throws(() => withPublicationConsent({...row,ownerId:undefined},'owner-1',true,now),/Only the project owner/)
})
