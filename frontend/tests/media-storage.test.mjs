import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/media-storage.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { mediaPath, mediaObjectPath, uploadProjectImage, downloadProjectImage } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const target = { ownerId: 'owner-123', projectId: 'project-456', kind: 'logo' }
function client(userId = target.ownerId, denied = false) {
  const calls = []
  return { calls, auth: { getSession: async () => ({ data: { session: userId ? { user: { id: userId } } : null }, error: null }) }, storage: { from(bucket) { return { upload: async (...args) => { calls.push({ bucket, args }); return { error: denied ? new Error('RLS denied') : null } } } } } }
}
test('uses only policy-approved project paths and strips preview version on download', () => {
  assert.equal(mediaPath(target), 'owner-123/project-456/logo.webp')
  assert.equal(mediaPath({ ...target, kind: 'cover' }), 'owner-123/project-456/cover.webp')
  assert.equal(mediaObjectPath('storage://owner-123/project-456/logo.webp#revision'), mediaPath(target))
  for (const projectId of ['', '../other', 'a/b', 'a#b', 'a?b', 'a\\b']) assert.throws(() => mediaPath({ ...target, projectId }))
  assert.throws(() => mediaPath({ ...target, kind: 'event' }))
})
test('uploads binary content with existing session and versions replacement references', async () => {
  const api = client()
  const file = new Blob(['webp'], { type: 'image/webp' })
  const first = await uploadProjectImage(api, 'startup-media', file, target)
  const second = await uploadProjectImage(api, 'startup-media', file, target)
  assert.notEqual(first, second)
  assert.equal(mediaObjectPath(first), mediaPath(target))
  assert.deepEqual(api.calls[0], { bucket: 'startup-media', args: [mediaPath(target), file, { contentType: 'image/webp', upsert: true, cacheControl: '0' }] })
})
test('does not upload without a session or as another owner and reports Storage denial', async () => {
  for (const user of [null, 'another-user']) {
    const api = client(user)
    await assert.rejects(uploadProjectImage(api, 'startup-media', new Blob(), target))
    assert.equal(api.calls.length, 0)
  }
  await assert.rejects(uploadProjectImage(null, 'startup-media', new Blob(), target), /Configure Supabase/)
  await assert.rejects(uploadProjectImage(client(target.ownerId, true), 'startup-media', new Blob(), target), /Storage permissions/)
})

test('guest and signed-in downloads use the SDK and defer access to Storage RLS', async () => {
  for (const session of [null, {user:{id:'reader'}}]) {
    const calls=[]; const image=new Blob(['image'],{type:'image/webp'});
    const api={auth:{getSession:async()=>({data:{session},error:null})},storage:{from(bucket){return {download:async path=>{calls.push({bucket,path});return {data:image,error:null}}}}}};
    assert.equal(await downloadProjectImage(api,'startup-media','storage://owner/project/cover.webp#revision'),image);
    assert.deepEqual(calls,[{bucket:'startup-media',path:'owner/project/cover.webp'}]);
  }
});
test('download does not bypass denied, missing, or invalid-session responses', async()=>{
  for(const result of [{data:null,error:new Error('Access denied')},{data:null,error:null}]) {
    const api={auth:{getSession:async()=>({error:null})},storage:{from(){return {download:async()=>result}}}};
    await assert.rejects(downloadProjectImage(api,'startup-media','storage://owner/project/cover.webp'));
  }
  let requested=false;
  const api={auth:{getSession:async()=>({error:new Error('Session failed')})},storage:{from(){requested=true}}};
  await assert.rejects(downloadProjectImage(api,'startup-media','storage://owner/project/cover.webp'));
  assert.equal(requested,false);
});
