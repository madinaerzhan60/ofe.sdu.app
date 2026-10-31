import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'
import { createClient } from '@supabase/supabase-js'

const require = createRequire(import.meta.url)
const authSource = await readFile(new URL('../src/auth.tsx', import.meta.url), 'utf8')
const backendSource = await readFile(new URL('../src/backend.ts', import.meta.url), 'utf8')
const origin = 'https://ofe-frontend-nine.vercel.app'
const env = {VITE_SUPABASE_URL:'https://test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'public-test-key'}

// Exercise the real component/hook code with in-memory React state and a mocked
// network boundary. No browser credentials or production services are used.
function hooks() {
  const values = [], effects = []
  let cursor = 0
  return {
    react: {
      useState(initial) {
        const index = cursor++
        if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial
        return [values[index], next => {values[index] = typeof next === 'function' ? next(values[index]) : next}]
      },
      useRef(initial) {
        const index = cursor++
        return values[index] ??= {current:initial}
      },
      useEffect(effect) {
        const index = cursor++
        if (!(index in values)) {values[index] = true; effects.push(effect)}
      },
    },
    render(fn) {cursor = 0; return fn()},
    mount() {return effects.splice(0).map(effect => effect())},
  }
}

function browser(url = origin + '/') {
  const window = {location:new URL(url),history:{state:{},replaceState(state, _title, path) {
    this.state = state
    window.location = new URL(path, window.location)
  }}}
  return window
}

function load(source, modules, globals = {}) {
  const compiled = ts.transpileModule(source.replaceAll('import.meta.env', '__env'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,require:name => modules[name] ?? require(name),URL,URLSearchParams,setTimeout,__env:env,...globals,
  })
  return exports
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  if (!tree || typeof tree !== 'object') return []
  return [tree, ...nodes(tree.props?.children)]
}
const by = (tree, predicate) => nodes(tree).find(predicate)
const button = (tree, label) => by(tree, node => node.type === 'button' && node.props.children === label)
const tick = () => new Promise(resolve => setTimeout(resolve, 0))

function panel(client, props = {}) {
  const state = hooks(), calls = []
  const {AuthPanel} = load(authSource, {
    react:state.react,'./backend':{backend:client},
    './model':{useT:() => text => text,useModel:() => ({
      liveMode:!!client,setAccount:value => calls.push(value),finishRecovery:() => calls.push('recovered'),
    })},
  }, {window:browser()})
  return {render:() => state.render(() => AuthPanel(props)),calls}
}

test('Google button works without a feature flag, sends SDU hint and retries after failure', async () => {
  let finish, oauth
  const view = panel({auth:{signInWithOAuth:args => {oauth = args; return new Promise(resolve => {finish = resolve})}}})
  const google = tree => by(tree, node => node.props?.className === 'google-signin')
  assert.equal(google(view.render()).props.disabled, false)
  const request = google(view.render()).props.onClick()
  assert.equal(google(view.render()).props.disabled, true)
  assert.equal(oauth.provider, 'google')
  assert.equal(oauth.options.redirectTo, origin + '/')
  assert.equal(oauth.options.queryParams.hd, 'sdu.edu.kz')
  finish({error:new Error('sensitive provider diagnostic')})
  await request
  assert.equal(google(view.render()).props.disabled, false)
  assert.match(by(view.render(), node => node.props?.role === 'alert').props.children, /try again/)
  assert.doesNotMatch(by(view.render(), node => node.props?.role === 'alert').props.children, /sensitive/)
  const retry = google(view.render()).props.onClick()
  finish({error:null})
  await retry
  assert.equal(by(view.render(), node => node.props?.role === 'alert'), undefined)
  assert.equal(google(panel(null).render()).props.disabled, true)
})

test('existing SDU email signup, signin, reset and recovery handlers still work', async () => {
  const calls = []
  const auth = Object.fromEntries(['signUp','signInWithPassword','resetPasswordForEmail','updateUser'].map(method => [method, async args => {
    calls.push({method,args}); return {data:{session:null},error:null}
  }]))
  const view = panel({auth})
  const change = (field, value) => by(view.render(), node => node.type === 'input' && field(node.props)).props.onChange({target:{value}})
  const submit = () => by(view.render(), node => node.type === 'form').props.onSubmit({preventDefault(){}})
  change(props => props.type === 'email', ' student@sdu.edu.kz ')
  change(props => props.autoComplete === 'name', 'Student')
  change(props => props.autoComplete === 'new-password', 'test-password-123')
  await submit()
  assert.equal(calls[0].method, 'signUp')
  assert.equal(calls[0].args.email, 'student@sdu.edu.kz')
  assert.equal(calls[0].args.options.emailRedirectTo, origin + '/')
  change(props => props.autoComplete === 'current-password', 'test-password-123')
  await submit()
  assert.equal(calls[1].method, 'signInWithPassword')
  button(view.render(), 'Forgot your password?').props.onClick()
  await submit()
  assert.equal(calls[2].method, 'resetPasswordForEmail')
  assert.equal(calls[2].args, 'student@sdu.edu.kz')
  change(props => props.type === 'email', 'student@example.org')
  await submit()
  assert.equal(calls.length, 3, 'email form still rejects non-SDU addresses')

  const recovery = panel({auth}, {recovery:true})
  for (const input of nodes(recovery.render()).filter(node => node.type === 'input')) input.props.onChange({target:{value:'new-password-123'}})
  await by(recovery.render(), node => node.type === 'form').props.onSubmit({preventDefault(){}})
  assert.equal(calls[3].method, 'updateUser')
  assert.deepEqual(recovery.calls, ['recovered'])
})

function platform(url, session = null, testEnv = env) {
  const state = hooks(), window = browser(url)
  let onAuthChange, options, sessionUrl
  const client = {
    auth:{getSession:async () => {sessionUrl = window.location.href; return {data:{session},error:null}},onAuthStateChange:callback => {
      onAuthChange = callback
      return {data:{subscription:{unsubscribe(){}}}}
    }},
    from:() => ({select:async () => ({data:[],error:null})}),rpc:async () => ({data:false,error:null}),
  }
  const module = load(backendSource, {
    react:state.react,'@supabase/supabase-js':{createClient:(_url, _key, config) => {options = config; return client}},
  }, {window,__env:testEnv})
  const render = () => state.render(() => module.usePlatform([], []))
  render()
  const cleanups = state.mount()
  return {render,window,options,module,
    get sessionUrl() {return sessionUrl},
    emit(event, nextSession) {session = nextSession; onAuthChange(event)},
    close() {cleanups.forEach(cleanup => cleanup?.())},
  }
}

test('OAuth cancellation and failure callbacks show safe persistent errors and clean only error parameters', async () => {
  for (const suffix of [
    '#error=access_denied&error_description=PRIVATE_PROVIDER_DETAIL',
    '?error=server_error&error_code=unexpected_failure&error_description=PRIVATE_PROVIDER_DETAIL&lang=EN#admin',
    '#error_description=PRIVATE_PROVIDER_DETAIL',
  ]) {
    const view = platform(origin + '/' + suffix)
    try {
      await tick()
      assert.match(view.render().error, /Could not sign in/)
      assert.doesNotMatch(view.render().error, /PRIVATE_PROVIDER_DETAIL/)
      assert.doesNotMatch(view.window.location.href, /error|PRIVATE_PROVIDER_DETAIL/)
      if (suffix.includes('lang=EN')) {
        assert.equal(view.window.location.search, '?lang=EN')
        assert.equal(view.window.location.hash, '#admin')
      }
      view.render().clearError()
      assert.equal(view.render().error, '')
    } finally {view.close()}
  }
})

test('failed callbacks reach Supabase unchanged and discard attached credentials before a reload', async () => {
  const callback = origin + '/?lang=EN&code=failed-code&error=access_denied#access_token=failed-token&refresh_token=failed-refresh&provider_token=failed-provider&type=recovery'
  const view = platform(callback)
  try {
    assert.equal(view.sessionUrl, callback, 'Supabase must see the error before URL cleanup')
    await tick()
    assert.equal(view.window.location.href, origin + '/?lang=EN')
    assert.match(view.render().error, /Could not sign in/)
    assert.equal(view.render().userId, null)
    assert.equal(view.render().recovery, false)
  } finally {view.close()}
})

test('callback tokens are left to Supabase; sessions, logout state and recovery events still propagate', async () => {
  const callback = origin + '/#access_token=fixture&refresh_token=fixture&type=recovery'
  const session = {user:{id:'student-id',email:'student@sdu.edu.kz'}}
  const view = platform(callback, session)
  try {
    assert.equal(view.window.location.href, callback)
    assert.equal(view.options.auth.detectSessionInUrl, true)
    assert.equal(view.options.auth.persistSession, true)
    assert.equal(view.options.auth.autoRefreshToken, true)
    await tick()
    assert.equal(view.render().userId, 'student-id')
    view.emit('PASSWORD_RECOVERY', session)
    assert.equal(view.render().recovery, true)
    view.render().finishRecovery()
    assert.equal(view.render().recovery, false)
    view.emit('SIGNED_OUT', null)
    await tick()
    assert.equal(view.render().userId, null)
    assert.equal(view.render().userEmail, '')
    assert.equal(view.render().isAdmin, false)
  } finally {view.close()}
  assert.equal(platform(origin + '/', null, {}).module.backend, null)
  assert.equal(platform(origin + '/', null, {...env,VITE_DEMO_MODE:'true'}).module.backend, null)
})

test('real Supabase SDK consumes a simulated OAuth callback, persists, restores and signs out', async () => {
  const storage = new Map(), events = []
  const user = {id:'00000000-0000-0000-0000-000000000031',email:'student@sdu.edu.kz',aud:'authenticated'}
  const jwt = [
    {alg:'HS256',typ:'JWT'}, {sub:user.id,exp:Math.floor(Date.now()/1000)+3600}, 'test-signature',
  ].map(value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url')).join('.')
  const oldWindow = globalThis.window, oldDocument = globalThis.document
  globalThis.window = browser(`${origin}/#access_token=${jwt}&refresh_token=test-refresh&expires_in=3600&token_type=bearer`)
  globalThis.document = {visibilityState:'hidden'}
  const clients = []
  const makeClient = () => {
    const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'google-auth-test',storage:{
        getItem:key => storage.get(key) ?? null,setItem:(key, value) => storage.set(key,value),removeItem:key => storage.delete(key),
      }},
      global:{fetch:async url => {
        if (String(url).endsWith('/auth/v1/user')) return Response.json(user)
        if (String(url).includes('/auth/v1/logout')) return new Response(null,{status:204})
        throw new Error('Unexpected network call in isolated auth test')
      }},
    })
    clients.push(client)
    return client
  }
  try {
    const first = makeClient()
    const {data:{subscription}} = first.auth.onAuthStateChange(event => events.push(event))
    const result = await first.auth.getSession()
    assert.equal(result.error, null)
    assert.equal(result.data.session.user.email, user.email)
    assert.equal(globalThis.window.location.hash, '')
    await tick()
    assert.ok(events.includes('SIGNED_IN'))
    assert.ok(storage.has('google-auth-test'))
    subscription.unsubscribe()
    first.auth.dispose()
    const restored = makeClient()
    assert.equal((await restored.auth.getSession()).data.session.user.id, user.id)
    assert.equal((await restored.auth.signOut()).error, null)
    assert.equal((await restored.auth.getSession()).data.session, null)
    const oauth = await restored.auth.signInWithOAuth({provider:'google',options:{
      redirectTo:origin + '/',queryParams:{hd:'sdu.edu.kz'},skipBrowserRedirect:true,
    }})
    assert.equal(oauth.error, null)
    const authorize = new URL(oauth.data.url)
    assert.equal(authorize.pathname, '/auth/v1/authorize')
    assert.equal(authorize.searchParams.get('provider'), 'google')
    assert.equal(authorize.searchParams.get('redirect_to'), origin + '/')
    assert.equal(authorize.searchParams.get('hd'), 'sdu.edu.kz')
  } finally {
    clients.forEach(client => client.auth.dispose())
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument
  }
})

test('server-side hook requires verified SDU Google identity for OAuth and refresh while preserving password auth', async () => {
  const db = new PGlite()
  const userId = '00000000-0000-0000-0000-000000000031'
  const claims = {email:'Student@SDU.EDU.KZ',role:'authenticated',sub:userId,session_id:'session',exp:1234567890,
    iss:'https://test.supabase.co/auth/v1',aud:'authenticated',iat:1234564290,aal:'aal1',phone:'',is_anonymous:false,
    amr:[{method:'oauth',timestamp:1234564290}]}
  try {
    await db.exec(`create role anon; create role authenticated; create role supabase_auth_admin;
      create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create table auth.identities(user_id uuid references auth.users(id),provider text,identity_data jsonb);
      grant usage on schema auth to supabase_auth_admin;
      grant select on auth.users,auth.identities to supabase_auth_admin;`)
    await db.query('insert into auth.users values ($1,$2,now())',[userId,'student@sdu.edu.kz'])
    await db.query('insert into auth.identities values ($1,$2,$3)',[userId,'google',{email:'student@sdu.edu.kz',email_verified:true}])
    const migration = await readFile(new URL('../supabase/migrations/20261031_sdu_auth_token_hook.sql', import.meta.url), 'utf8')
    await db.exec(migration)
    await assert.rejects(db.exec(migration), /already exists/, 'never replace an existing hook')
    const invoke = async (method, overrides = {}) => (await db.query('select public.sdu_access_token_hook($1::jsonb) as result', [JSON.stringify({
      user_id:userId,authentication_method:method,claims:{...claims,...overrides},
    })])).rows[0].result
    await db.exec('set role supabase_auth_admin')
    for (const method of ['oauth','token_refresh','totp','email_change']) {
      assert.deepEqual(await invoke(method), {claims})
      for (const email of [undefined,null,'','student@gmail.com','student@sdu.edu.kz.evil.com','student@sub.sdu.edu.kz','student@@sdu.edu.kz','student@sdu.edu.kz\n']) {
        const result = await invoke(method,{email,user_metadata:{email:'student@sdu.edu.kz',email_verified:true,hd:'sdu.edu.kz'}})
        assert.equal(result.error.http_code, 403, `${method} must reject ${JSON.stringify(email)}`)
      }
    }
    // Initial OAuth is checked even before AMR exists.
    assert.ok((await invoke('oauth',{amr:[]})).claims)
    for (const method of ['password','otp','recovery','email/signup','token_refresh']) {
      const emailClaims = {...claims,email:'existing@example.org',amr:[{method:'password',timestamp:1234564290}]}
      assert.deepEqual(await invoke(method,emailClaims), {claims:emailClaims}, 'preserve existing email sessions')
    }
    for (const identity of [
      {email:'student@sdu.edu.kz',email_verified:false},
      {email:'student@sdu.edu.kz'},
      {email:'other@sdu.edu.kz',email_verified:true},
      {email:'student@gmail.com',email_verified:true},
    ]) {
      await db.exec('reset role')
      await db.query('update auth.identities set identity_data=$1',[identity])
      await db.exec('set role supabase_auth_admin')
      assert.equal((await invoke('oauth')).error.http_code,403,'provider verification and canonical email must agree')
      assert.equal((await invoke('token_refresh')).error.http_code,403)
    }
    await db.exec('reset role')
    await db.query('update auth.identities set identity_data=$1',[{email:'student@sdu.edu.kz',email_verified:true}])
    await db.exec('update auth.users set email_confirmed_at=null; set role supabase_auth_admin')
    assert.equal((await invoke('oauth')).error.http_code,403,'unconfirmed account is denied')
    await db.exec('reset role; update auth.users set email_confirmed_at=now(); delete from auth.identities; set role supabase_auth_admin')
    assert.equal((await invoke('oauth',{user_metadata:{email_verified:true}})).error.http_code,403,'metadata cannot forge a Google identity')
    for (const role of ['anon','authenticated']) {
      await db.exec(`reset role; set role ${role}`)
      await assert.rejects(invoke('oauth'), /permission denied/)
    }
  } finally {await db.close()}
})
