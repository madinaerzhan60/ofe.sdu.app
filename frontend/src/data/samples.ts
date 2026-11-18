import type { EventData, Lang, NewsPost, Submission } from '../model'

const sampleStartups = [
  ['SP', 'SkillPath AI', 'AI learning paths that adapt to every student\'s goals.', 'EdTech', 'Seed'],
  ['MA', 'MedArchive', 'Secure, patient-owned medical records for Central Asia.', 'HealthTech', 'MVP'],
  ['RI', 'Review Intelligence', 'Customer feedback analytics for growing businesses.', 'SaaS', 'Seed'],
  ['QS', 'QazSolar', 'Smarter energy monitoring for homes and small businesses.', 'Climate', 'Prototype'],
  ['BA', 'Bala AI', 'Kazakh-language reading support for young learners.', 'EdTech', 'MVP'],
  ['FN', 'FinNote', 'Simple cash-flow planning for independent entrepreneurs.', 'FinTech', 'Seed'],
  ['TL', 'TazaLab', 'Quality control software for local food producers.', 'FoodTech', 'MVP'],
  ['WR', 'Workly Remote', 'Talent matching for Central Asia\'s remote workforce.', 'HR Tech', 'Growth'],
  ['AG', 'AgroGuard', 'Crop monitoring and early risk alerts for small farms.', 'AgriTech', 'Prototype'],
] as const

export const sampleSubmissions: Submission[] = sampleStartups.map(([, name, description, industry, stage], i) => ({
  id: `sample-${i}`, createdAt: `2026-01-${String(i + 1).padStart(2, '0')}`, visible: true, year: '2026', eventYears: [],
  name, description, industry, stage, team: 'Founder, Design, Development', product: '', status: 'Approved', publication: true,
  consentVersion: 'sample', consentAt: '2026-10-18', feedback: '', members: [],
}))

export const sampleEvents: EventData[] = [
  { id: 'current', title: 'SDU FOUNDERS CUP', date: '2026-11-23', place: 'Venue to be confirmed', published: true },
  { id: 'archive', title: 'Our first Demo Day', date: '', place: 'Details to be added', published: true },
]

type Copy = { title: string; excerpt: string; body: string }
export type LocalizedNews = NewsPost & { i18n?: Partial<Record<Lang, Copy>> }

export const sampleNews: LocalizedNews[] = [
  {
    id: 'founders-cup-2026', category: 'business', date: '2026-11-04', published: true, pinned: true, cover: '/demo-day/IMG_7414.webp',
    title: 'SDU Founders Cup takes place on 23 November',
    excerpt: 'Student founders will present their projects on stage. Team registration is open on the event page.',
    body: 'SDU Founders Cup is the next Demo Day of the Office for Entrepreneurship. Student teams will present their projects to the university community, mentors and guests.\n\nThe event takes place on 23 November 2026. The venue will be confirmed on the event page.\n\nWant to take part? Register your team on the event page: add teammates by their SDU emails, describe the product and upload your presentation.',
    i18n: {
      RU: { title: 'SDU Founders Cup пройдёт 23 ноября', excerpt: 'Студенты-основатели представят свои проекты на сцене. Регистрация команд открыта на странице события.', body: 'SDU Founders Cup — следующий Demo Day Office for Entrepreneurship. Студенческие команды представят свои проекты университетскому сообществу, менторам и гостям.\n\nСобытие пройдёт 23 ноября 2026 года. Место проведения появится на странице события.\n\nХотите участвовать? Зарегистрируйте команду на странице события: добавьте участников по почте SDU, опишите продукт и загрузите презентацию.' },
      KK: { title: 'SDU Founders Cup 23 қарашада өтеді', excerpt: 'Студент-негізін қалаушылар жобаларын сахнада таныстырады. Командаларды тіркеу іс-шара бетінде ашық.', body: 'SDU Founders Cup — Office for Entrepreneurship ұйымдастыратын келесі Demo Day. Студенттік командалар жобаларын университет қауымдастығына, менторлар мен қонақтарға таныстырады.\n\nІс-шара 2026 жылғы 23 қарашада өтеді. Өтетін орны іс-шара бетінде жарияланады.\n\nҚатысқыңыз келе ме? Команданы іс-шара бетінде тіркеңіз: қатысушыларды SDU поштасы арқылы қосып, өнімді сипаттап, презентацияны жүктеңіз.' },
    },
  },
  {
    id: 'demo-day-2026-winners', category: 'champions', date: '2026-04-28', published: true, cover: '/demo-day/awards.webp', link: '/archive.html',
    title: 'Demo Day 2026: the winners',
    excerpt: 'LIBR took the Grand Prix. ХБ-ШНИКИ, BILIMONT.KZ and Ronaldo Team completed the podium.',
    body: 'The first OFE Demo Day brought student teams to the stage of SDU University.\n\nGrand Prix — LIBR, with investor support. 1st place — ХБ-ШНИКИ (200,000 ₸). 2nd place — BILIMONT.KZ (120,000 ₸). 3rd place — Ronaldo Team.\n\nPhotos and team stories are collected in the Demo Day archive.',
    i18n: {
      RU: { title: 'Demo Day 2026: победители', excerpt: 'Гран-при получил LIBR. В тройку вошли ХБ-ШНИКИ, BILIMONT.KZ и Ronaldo Team.', body: 'Первый Demo Day OFE собрал студенческие команды на сцене SDU University.\n\nГран-при — LIBR, поддержка инвестора. 1 место — ХБ-ШНИКИ (200 000 ₸). 2 место — BILIMONT.KZ (120 000 ₸). 3 место — Ronaldo Team.\n\nФотографии и истории команд — в архиве Demo Day.' },
      KK: { title: 'Demo Day 2026: жеңімпаздар', excerpt: 'Гран-приді LIBR алды. Үздік үштікке ХБ-ШНИКИ, BILIMONT.KZ және Ronaldo Team енді.', body: 'OFE-нің алғашқы Demo Day-і студенттік командаларды SDU University сахнасына жинады.\n\nГран-при — LIBR, инвестор қолдауы. 1-орын — ХБ-ШНИКИ (200 000 ₸). 2-орын — BILIMONT.KZ (120 000 ₸). 3-орын — Ronaldo Team.\n\nФотосуреттер мен командалар туралы әңгімелер — Demo Day мұрағатында.' },
    },
  },
  {
    id: 'project-catalog-open', category: 'university', date: '2026-11-13', published: true, cover: '/demo-day/IMG_7500.webp',
    title: 'The OFE project catalog is open',
    excerpt: 'Submit your project, add teammates by their SDU email and follow the review in your workspace.',
    body: 'Every SDU student can now add a project to the Office for Entrepreneurship catalog.\n\nSign in with your SDU account, describe the idea, add teammates by their corporate @sdu.edu.kz email and leave a Telegram username and phone number for the OFE team. Contacts are visible only to you and the reviewers.\n\nAfter review, the project appears in the public catalog.',
    i18n: {
      RU: { title: 'Каталог проектов OFE открыт', excerpt: 'Подайте проект, добавьте участников по корпоративной почте SDU и следите за статусом в личном кабинете.', body: 'Теперь каждый студент SDU может добавить проект в каталог Office for Entrepreneurship.\n\nВойдите через аккаунт SDU, опишите идею, добавьте участников по корпоративной почте @sdu.edu.kz и оставьте Telegram и телефон для связи с командой OFE. Контакты видите только вы и модераторы.\n\nПосле проверки проект появится в открытом каталоге.' },
      KK: { title: 'OFE жобалар каталогы ашылды', excerpt: 'Жобаңызды жіберіңіз, қатысушыларды SDU корпоративтік поштасы арқылы қосып, мәртебесін жеке кабинеттен бақылаңыз.', body: 'Енді SDU-дың әр студенті Office for Entrepreneurship каталогына жоба қоса алады.\n\nSDU аккаунтымен кіріп, идеяны сипаттаңыз, қатысушыларды @sdu.edu.kz корпоративтік поштасы арқылы қосыңыз және OFE командасымен байланыс үшін Telegram мен телефон нөмірін қалдырыңыз. Байланыс деректерін тек сіз және модераторлар көреді.\n\nТексерістен кейін жоба ашық каталогта пайда болады.' },
    },
  },
  {
    id: 'sample-hackathon-checklist', category: 'hackathons', date: '2026-11-10', published: true, sample: true, cover: '/demo-day/IMG_7440.webp',
    title: 'Hackathon checklist for a student team',
    excerpt: 'Roles, a simple plan for the first hours and a demo that fits into three minutes.',
    body: 'Agree on roles before the start: who builds, who designs and who presents.\n\nSpend the first hours on the problem, not on code. A small working demo beats a large unfinished one.\n\nRehearse the pitch twice. Three clear minutes are better than ten rushed ones.',
    i18n: {
      RU: { title: 'Чек-лист для команды на хакатоне', excerpt: 'Роли, простой план на первые часы и демо, которое укладывается в три минуты.', body: 'Договоритесь о ролях до старта: кто разрабатывает, кто отвечает за дизайн и кто выступает.\n\nПервые часы потратьте на проблему, а не на код. Маленькое работающее демо лучше большого незаконченного.\n\nОтрепетируйте питч дважды. Три понятные минуты лучше десяти скомканных.' },
      KK: { title: 'Хакатондағы командаға арналған чек-парақ', excerpt: 'Рөлдер, алғашқы сағаттарға қарапайым жоспар және үш минутқа сыятын демо.', body: 'Басталғанға дейін рөлдерді келісіп алыңыз: кім әзірлейді, кім дизайнға жауапты және кім сөйлейді.\n\nАлғашқы сағаттарды кодқа емес, мәселеге жұмсаңыз. Шағын жұмыс істейтін демо үлкен аяқталмаған демодан жақсы.\n\nПитчті екі рет жаттықтырыңыз. Түсінікті үш минут асығыс он минуттан жақсы.' },
    },
  },
  {
    id: 'sample-mvp-tools', category: 'it', date: '2026-11-06', published: true, sample: true, cover: '/demo-day/IMG_7247.webp',
    title: 'How to test an IT idea before building it',
    excerpt: 'Talk to users, launch a landing page and measure interest before writing the first line of code.',
    body: 'Start with ten conversations with people who have the problem. Write down their words, not your assumptions.\n\nA simple landing page with a sign-up button shows whether the idea attracts interest.\n\nBuild the first version only for the most important scenario.',
    i18n: {
      RU: { title: 'Как проверить IT-идею до разработки', excerpt: 'Поговорите с пользователями, запустите лендинг и измерьте интерес до первой строчки кода.', body: 'Начните с десяти разговоров с людьми, у которых есть эта проблема. Записывайте их слова, а не свои предположения.\n\nПростой лендинг с кнопкой записи покажет, вызывает ли идея интерес.\n\nПервую версию делайте только для самого важного сценария.' },
      KK: { title: 'IT идеясын әзірлеуге дейін қалай тексеруге болады', excerpt: 'Пайдаланушылармен сөйлесіп, лендинг іске қосып, кодтың бірінші жолына дейін қызығушылықты өлшеңіз.', body: 'Бұл мәселесі бар адамдармен он әңгімеден бастаңыз. Өз болжамдарыңызды емес, олардың сөздерін жазыңыз.\n\nТіркелу батырмасы бар қарапайым лендинг идеяның қызығушылық тудыратынын көрсетеді.\n\nБірінші нұсқаны тек ең маңызды сценарий үшін жасаңыз.' },
    },
  },
  {
    id: 'sample-case-championship', category: 'championships', date: '2026-11-02', published: true, sample: true, cover: '/demo-day/IMG_7494.webp',
    title: 'Case championships: building a strong team',
    excerpt: 'Mix skills, split the case into parts and leave time to check the numbers.',
    body: 'A strong case team combines analysis, finance and presentation skills.\n\nSplit the case into parts in the first hour and agree when you will bring them together.\n\nLeave the last hour to check numbers and rehearse answers to the jury.',
    i18n: {
      RU: { title: 'Кейс-чемпионаты: как собрать сильную команду', excerpt: 'Сочетайте навыки, делите кейс на части и оставляйте время на проверку цифр.', body: 'Сильная кейс-команда сочетает аналитику, финансы и умение презентовать.\n\nВ первый час разделите кейс на части и договоритесь, когда соберёте их вместе.\n\nПоследний час оставьте на проверку цифр и репетицию ответов жюри.' },
      KK: { title: 'Кейс-чемпионаттар: мықты команданы қалай жинауға болады', excerpt: 'Дағдыларды үйлестіріп, кейсті бөліктерге бөліп, сандарды тексеруге уақыт қалдырыңыз.', body: 'Мықты кейс-команда талдауды, қаржыны және таныстыру шеберлігін біріктіреді.\n\nАлғашқы сағатта кейсті бөліктерге бөліп, оларды қашан біріктіретініңізді келісіңіз.\n\nСоңғы сағатты сандарды тексеруге және қазылар алқасының сұрақтарына жауап беруді жаттықтыруға қалдырыңыз.' },
    },
  },
]

export function localizeNews(post: LocalizedNews, lang: Lang): NewsPost {
  const copy = lang === 'EN' ? undefined : post.i18n?.[lang]
  return copy ? { ...post, ...copy } : post
}
