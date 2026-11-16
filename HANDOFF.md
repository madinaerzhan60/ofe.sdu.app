# Передача работы · сайт OFE (SDU Office for Entrepreneurship)

Состояние на 14 ноября 2026. Рабочий репозиторий: https://github.com/Anuar-zxc/ofe_sdu
(ветка `main`). Это копия исходного репозитория команды
`madinaerzhan60/ofe.sdu.app` со всей историей и новыми коммитами поверх.
Мероприятие **SDU Founders Cup — 21 ноября 2026**, регистрация закрывается
**20 ноября в 23:59** (Алматы).

## Ссылки

| Что | Где |
|---|---|
| Код | https://github.com/Anuar-zxc/ofe_sdu |
| Исходный репозиторий команды | https://github.com/madinaerzhan60/ofe.sdu.app |
| Превью (демо-режим) | https://ofe-sdu.vercel.app · регистрация: https://ofe-sdu.vercel.app/events/founders-cup/register |
| Vercel | проект `ofe-sdu`, аккаунт `anuar-zxc` |
| Supabase (основная база) | проект `ofe-sdu-app`, ref `tnbomcaxdsqtarsfjarh`, URL `https://tnbomcaxdsqtarsfjarh.supabase.co` |
| Настройка аккаунтов и безопасности | [`frontend/ACCOUNT_SETUP.md`](frontend/ACCOUNT_SETUP.md), [`frontend/STORAGE_SETUP.md`](frontend/STORAGE_SETUP.md) |

Чтобы продолжить, новому человеку нужен доступ к проекту Vercel `ofe-sdu`
и к организации Supabase, где лежит `ofe-sdu-app`. Пароли и ключи в чат и в код не
передавайте: только приглашения в команды.

## Что сделано

- Многостраничный сайт в фирменном стиле SDU: шрифты SDU Unique / SDU Life / Gilroy,
  палитра SDU, логотипы 30-летия, светлая и тёмная тема, языки KK/RU/EN.
  Разделы: О нас, Каталог проектов, События (новости, хакатоны, чемпионаты,
  победители), Founders Cup, архив Demo Day.
- Участники проекта и команды добавляются по почте `@sdu.edu.kz`, при подаче
  проекта обязательны Telegram и телефон.
- Медиа-модераторы могут публиковать новости, админ выдаёт и снимает эти права.
- **Регистрация на Founders Cup** (`/events/founders-cup/register`): 4 шага
  (команда → продукт → презентация → проверка), до 6 человек по SDU-почте,
  один человек только в одной команде, описание продукта, презентация PDF/PPTX
  до 25 МБ. Кабинет команды: статус, участники, замена или скачивание
  презентации, правка или отзыв заявки до дедлайна.
- **Админка → Founders Cup**: список команд, поиск, фильтры по статусу,
  подтверждение или отказ с комментарием, скачивание презентаций, выгрузка в CSV.
- **Безопасность**
  - Вход только с почтой `@sdu.edu.kz`. Проверка стоит на сайте, в триггере на
    `auth.users` и в Auth-хуках Supabase. Google-вход использует подсказку
    `hd=sdu.edu.kz`, а сервер дополнительно проверяет, что Google подтвердил почту.
  - RLS на всех таблицах: заявку, контакты и презентацию видят только участники
    команды и админы. Капитан, статус, комментарий админа и даты выставляют
    триггеры в базе, а не браузер. После дедлайна база не принимает изменения.
  - Презентации лежат в приватном бакете `event-presentations` без публичных и
    подписанных ссылок. Скачиваются только с сессией пользователя и только как файл.
  - Заголовки в `frontend/vercel.json`: CSP (`script-src 'self'`), HSTS,
    `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, COOP/CORP.
  - Supabase-клиент работает через PKCE. CSV-выгрузка защищена от формул.
    `pnpm audit` уязвимостей не находит.
- Тесты базы на PGlite: `cd frontend && pnpm test` (33 из 33 проходят).

## Что осталось сделать (по порядку)

### 1. Миграции в Supabase `tnbomcaxdsqtarsfjarh` — готово
Основная база — `tnbomcaxdsqtarsfjarh` (`ofe-sdu-app`). Все 10 миграций из
`frontend/supabase/migrations/` уже применены 16 ноября 2026:

1. `20261022_accounts.sql`
2. `20261023071333_database_foundation.sql`
3. `20261023074400_event_registration_user_index.sql`
4. `20261023115503_storage_security_hardening.sql`
5. `20261023120625_storage_token_guards.sql`
6. `20261023123211_storage_update_operation.sql`
7. `20261031150000_sdu_auth_token_hook.sql`
8. `20261104150000_correct_founders_cup_date.sql`
9. `20261113120000_media_news_members_contacts.sql`
10. `20261114120000_founders_cup_registration.sql`

Стоит ещё раз запустить Advisors → Security и убедиться, что предупреждений нет.

### 2. Заполнить мероприятия
```sql
insert into public.events (id, data) values
 ('current', '{"id":"current","title":"SDU FOUNDERS CUP","date":"2026-11-21","place":"Venue to be confirmed","published":true}'),
 ('archive', '{"id":"archive","title":"Our first Demo Day","date":"","place":"Details to be added","published":true}')
on conflict (id) do nothing;
```
Когда будет известно место, замените `place`. Необязательные поля в `data`:
`"registrationDeadline": "2026-11-20T23:59:00+05:00"` и
`"registration": "closed"`, чтобы закрыть регистрацию досрочно.

### 3. Настроить Auth в Supabase
- URL Configuration: Site URL `https://ofesdu.app`, в Redirect URLs точные
  адреса сайта (`https://ofesdu.app` и превью-домены Vercel, если нужны).
- Providers → Email: Confirm email **вкл.**, минимальная длина пароля **10**.
  Anonymous sign-ins **выкл.**
- Hooks: **Before User Created** → `public.sdu_before_user_created_hook`,
  **Custom Access Token** → `public.sdu_access_token_hook`.
- Подключить нормальный SMTP: встроенная почта Supabase шлёт мало писем, а без
  письма подтверждения пользователь не сможет войти по паролю.

### 4. Вход через Google
1. Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web).
   Authorized redirect URI: `https://tnbomcaxdsqtarsfjarh.supabase.co/auth/v1/callback`.
   Если приложение не опубликовано, его нужно опубликовать или добавить
   тестовых пользователей.
2. Supabase → Authentication → Providers → Google: вставить Client ID и Secret.
   Secret хранится только в Supabase, в коде и в `VITE_*` его быть не должно.

### 5. Подключить сайт к базе (Vercel)
Settings → Environment Variables (Production), затем Redeploy:
- `VITE_SUPABASE_URL=https://tnbomcaxdsqtarsfjarh.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=` publishable (anon) ключ из Supabase → Connect.
  Только он: service_role или secret ключ сюда класть нельзя.
- `VITE_SUPABASE_STORAGE_BUCKET=startup-media`

Без этих переменных сайт остаётся в демо-режиме, и данные не сохраняются.
Если поменяется проект Supabase, обновите его адрес в CSP в `frontend/vercel.json`
(`connect-src`, `media-src`).

### 6. Назначить админа
Ануар (`250107056@sdu.edu.kz`) регистрируется на сайте, после этого:
```sql
insert into public.app_admins (user_id)
select id from auth.users where email = '250107056@sdu.edu.kz';
```
Медиа-модераторов админ назначает в админке → «Медиа-команда».

### 7. Проверить на живом сайте до 20 ноября
- Вход через Google с SDU-аккаунта работает. Gmail и другие домены отклоняются
  и через Google, и по почте с паролем.
- Регистрация команды полностью: добавить участника, загрузить PDF и PPTX,
  попробовать файл-подделку (должен быть отклонён), правка и отзыв заявки.
- Участник команды видит заявку, но не может её править. Посторонний SDU-пользователь
  не видит чужие заявки и не может скачать чужую презентацию.
- Админ подтверждает или отклоняет команду, скачивает презентацию, выгружает CSV.
- После дедлайна правки и загрузки не проходят.
- Восстановление пароля, выход, перезагрузка страницы с сохранением сессии.

### 8. Влить в основной сайт команды
- Код лежит в `Anuar-zxc/ofe_sdu`. Чтобы перенести его в исходный репозиторий:
  `git remote add team https://github.com/madinaerzhan60/ofe.sdu.app`,
  `git push team main:redesign/office-for-entrepreneurship`, затем открыть PR в `main`
  репозитория команды и отревьюить. История общая, так что PR соберётся без конфликтов,
  если в `main` команды ничего не менялось после 8 ноября.
- Прод работает на базе команды `tnbomcaxdsqtarsfjarh` (`ofe-sdu-app`), миграции
  применены, CSP в `frontend/vercel.json` указывает на этот проект.

## Известные ограничения и что стоит улучшить
- Проверка, что файл действительно PDF/PPTX (по первым байтам), идёт в браузере.
  На сервере файл ограничен приватным бакетом, MIME-типом и размером, а
  скачивается всегда как вложение. Для полной защиты можно добавить проверку
  в Edge Function.
- Общий JS-чанк около 530 КБ (React + Supabase): стоит разбить через `import()`
  по страницам.
- Боковая панель и шапка админки остались в старом стиле, а раздел Founders Cup
  уже в новом.
- В CSP `img-src` разрешает любые `https:`-картинки, потому что ссылки на
  изображения в архиве вводят админы. Если их перенести в Storage, можно
  оставить только свой домен и Supabase.
- В аккаунте Supabase стоит на паузе проект «Anuar-zxc's Project»
  (`hfvrbgvuecibwjeejdfr`), чтобы освободить слот бесплатного тарифа. Если он
  снова понадобится, его можно возобновить в панели.

## Как работать с кодом
```bash
cd frontend
pnpm install
cp .env.example .env.local   # без значений сайт работает в демо-режиме
pnpm dev                     # локальный сервер
pnpm test                    # тесты RLS и миграций на PGlite
pnpm build                   # сборка в dist/
```
Основные файлы:
- `src/pages/register.tsx`: мастер регистрации и кабинет команды.
- `src/registration.ts`: работа с данными и файлами (в демо-режиме всё в памяти).
- `src/admin-registrations.tsx`: админка Founders Cup.
- `src/router.tsx`: маршруты.
- `src/styles/site.css`: дизайн-система.
- `src/translations-ofe.ts`: переводы RU/KK.
- `supabase/migrations/`: схема и политики безопасности.
