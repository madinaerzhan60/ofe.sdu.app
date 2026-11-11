import type { Lang } from './model'

// Draft legal texts for OFE / SDU review. Not legally approved.
// Items in [square brackets] must be filled in by OFE before release.

export type PolicySection = { h: string; p?: string[]; ul?: string[] }
type Localized<T> = Record<Lang, T>

export const policyDraftDate: Localized<string> = {
  EN: 'Draft version: 8 November 2026',
  RU: 'Версия черновика: 8 ноября 2026',
  KK: 'Жоба нұсқасы: 2026 жылғы 8 қараша',
}

export const policyDraftNote: Localized<string> = {
  EN: 'Draft prepared for OFE and SDU review. Items in [square brackets] must be completed and the texts approved by the SDU legal team before release.',
  RU: 'Черновик для проверки OFE и SDU. Пункты в [квадратных скобках] нужно заполнить, а тексты — согласовать с юристами SDU до публикации.',
  KK: 'OFE және SDU тексеруіне арналған жоба. [Төртбұрышты жақшадағы] тармақтарды толтырып, мәтіндерді жариялауға дейін SDU заңгерлерімен келісу қажет.',
}

const contact: Localized<string> = {
  EN: 'SDU Office for Entrepreneurship (OFE), SDU University, 1/1 Abylai Khan St., Kaskelen, Almaty region, Kazakhstan. Instagram: @ofe_sdu.',
  RU: 'Офис предпринимательства SDU (OFE), SDU University, Казахстан, Алматинская обл., г. Каскелен, ул. Абылай хана, 1/1. Instagram: @ofe_sdu.',
  KK: 'SDU кәсіпкерлік кеңсесі (OFE), SDU University, Қазақстан, Алматы обл., Қаскелең қ., Абылай хан к-сі, 1/1. Instagram: @ofe_sdu.',
}

export const policyDocs: Record<string, Localized<PolicySection[]>> = {
  'Privacy Policy': {
    EN: [
      { h: '1. Who we are', p: ['This platform (the “Platform”) is operated by the SDU Office for Entrepreneurship (“OFE”) on behalf of SDU University (“SDU”). SDU acts as the owner and operator of personal data within the meaning of the Law of the Republic of Kazakhstan “On Personal Data and Their Protection”.', contact.EN] },
      { h: '2. What data we collect', ul: [
        'Account data: your SDU e-mail (@sdu.edu.kz), display name and the identifiers provided by Google sign-in.',
        'Application data: project name, description, industry, stage, product description, team composition (names and roles of team members you enter) and any images you upload.',
        'Participation data: event registrations, team memberships, invitations and join requests, review status and reviewer feedback.',
        'Consent records: whether you gave or withdrew consent, the version of the document and the time.',
        'Technical data needed to keep you signed in and to remember your language and theme (see the Cookie Notice).',
      ] },
      { h: '3. Why we use it', ul: [
        'to create and secure your account and confirm that you belong to the SDU community;',
        'to receive, review and give feedback on applications to OFE programs, including SDU Founders Cup and Demo Day;',
        'to help students form teams and to organise events;',
        'to publish approved startups only where the owner has given separate Publication Consent;',
        'to contact you about your application or events you registered for;',
        'to compile anonymised statistics about OFE programs.',
      ] },
      { h: '4. Legal basis', p: ['We process your data on the basis of your consent (Personal Data Processing Consent), and, where applicable, to perform SDU’s educational and extracurricular activities. Publication of your project is based on a separate, optional Publication Consent.'] },
      { h: '5. Who can see your data', ul: [
        'OFE staff and authorised reviewers, jury members and mentors involved in a program — only to the extent needed for review;',
        'other signed-in users — only your team-related information you choose to share (for example, in team discovery);',
        'the public — only approved projects with Publication Consent;',
        'service providers that host the Platform on our behalf: Supabase (database, authentication, file storage), Vercel (web hosting) and Google (sign-in). Their servers may be located outside Kazakhstan [OFE to confirm hosting regions and the cross-border transfer arrangement].',
      ], p: ['We do not sell your data and do not use it for advertising.'] },
      { h: '6. How long we keep it', ul: [
        'account data — while your account is active; after you ask us to delete it, we delete it without delay and in any case no later than 30 days (the time needed to process the request and clear backups);',
        'applications and review results — for the program season and [3] years after it, then deleted or anonymised;',
        'consent records — as long as needed to prove that consent was given or withdrawn;',
        'published startup information — until you withdraw Publication Consent or the project is removed.',
      ] },
      { h: '7. Your rights', p: ['You may request access to your data, ask us to correct or delete it, withdraw consent, and object to processing. You may also file a complaint with the authorised body for personal data protection of the Republic of Kazakhstan. Send requests to the contact above; we answer within the time limits set by law.'] },
      { h: '8. Security', p: ['Access to data is limited by role-based rules in the database, file access requires a signed-in session, and only OFE administrators can review applications. No system is completely secure; please tell us immediately if you suspect unauthorised access to your account.'] },
      { h: '9. Minors', p: ['If you are under 18, your parent or legal guardian must agree to the processing of your personal data before you submit an application.'] },
      { h: '10. Changes', p: ['We will publish any change to this policy on the Platform and indicate the new version date. Significant changes will be communicated to registered users.'] },
    ],
    RU: [
      { h: '1. Кто мы', p: ['Платформой («Платформа») управляет Офис предпринимательства SDU («OFE») от имени SDU University («SDU»). SDU является собственником и оператором персональных данных в смысле Закона Республики Казахстан «О персональных данных и их защите».', contact.RU] },
      { h: '2. Какие данные мы собираем', ul: [
        'Данные аккаунта: ваш e-mail SDU (@sdu.edu.kz), отображаемое имя и идентификаторы, полученные при входе через Google.',
        'Данные заявки: название проекта, описание, отрасль, стадия, описание продукта, состав команды (имена и роли участников, которые вы указываете) и загруженные изображения.',
        'Данные об участии: регистрации на мероприятия, участие в командах, приглашения и запросы на вступление, статус рассмотрения и отзывы проверяющих.',
        'Записи о согласиях: дано или отозвано согласие, версия документа и время.',
        'Технические данные, необходимые, чтобы вы оставались в аккаунте, и чтобы запомнить язык и тему (см. Уведомление о cookie).',
      ] },
      { h: '3. Для чего мы их используем', ul: [
        'для создания и защиты аккаунта и подтверждения принадлежности к сообществу SDU;',
        'для приёма, рассмотрения заявок и обратной связи по программам OFE, включая SDU Founders Cup и Demo Day;',
        'для помощи студентам в поиске команды и для организации мероприятий;',
        'для публикации одобренных стартапов — только если владелец дал отдельное Согласие на публикацию;',
        'для связи с вами по заявке или по мероприятиям, на которые вы зарегистрировались;',
        'для подготовки обезличенной статистики о программах OFE.',
      ] },
      { h: '4. Правовое основание', p: ['Мы обрабатываем данные на основании вашего согласия (Согласие на обработку персональных данных), а также, где применимо, для осуществления образовательной и внеучебной деятельности SDU. Публикация проекта осуществляется на основании отдельного добровольного Согласия на публикацию.'] },
      { h: '5. Кто видит ваши данные', ul: [
        'сотрудники OFE и уполномоченные эксперты, члены жюри и менторы программы — только в объёме, необходимом для рассмотрения;',
        'другие авторизованные пользователи — только информацию о команде, которой вы сами решили поделиться (например, в поиске команд);',
        'все посетители — только одобренные проекты с Согласием на публикацию;',
        'поставщики услуг, обеспечивающие работу Платформы: Supabase (база данных, авторизация, хранение файлов), Vercel (хостинг) и Google (вход). Их серверы могут находиться за пределами Казахстана [OFE уточнить регионы хранения и порядок трансграничной передачи].',
      ], p: ['Мы не продаём ваши данные и не используем их для рекламы.'] },
      { h: '6. Сроки хранения', ul: [
        'данные аккаунта — пока аккаунт активен; после запроса на удаление мы удаляем их без промедления и в любом случае не позднее 30 дней (срок на обработку запроса и очистку резервных копий);',
        'заявки и результаты рассмотрения — в течение сезона программы и [3] лет после него, затем удаляются или обезличиваются;',
        'записи о согласиях — столько, сколько нужно, чтобы подтвердить факт дачи или отзыва согласия;',
        'опубликованная информация о стартапе — до отзыва Согласия на публикацию или удаления проекта.',
      ] },
      { h: '7. Ваши права', p: ['Вы вправе получить доступ к своим данным, потребовать их исправления или удаления, отозвать согласие и возразить против обработки. Вы также можете обратиться с жалобой в уполномоченный орган в сфере защиты персональных данных Республики Казахстан. Запросы направляйте по контактам выше; мы отвечаем в сроки, установленные законом.'] },
      { h: '8. Безопасность', p: ['Доступ к данным ограничен правилами на уровне базы данных, доступ к файлам возможен только в авторизованной сессии, а рассматривать заявки могут только администраторы OFE. Ни одна система не защищена полностью — сообщите нам сразу, если подозреваете несанкционированный доступ к аккаунту.'] },
      { h: '9. Несовершеннолетние', p: ['Если вам нет 18 лет, до подачи заявки необходимо согласие родителя или законного представителя на обработку ваших персональных данных.'] },
      { h: '10. Изменения', p: ['Изменения политики публикуются на Платформе с указанием даты новой версии. О существенных изменениях мы сообщим зарегистрированным пользователям.'] },
    ],
    KK: [
      { h: '1. Біз кімбіз', p: ['Платформаны («Платформа») SDU University («SDU») атынан SDU кәсіпкерлік кеңсесі («OFE») басқарады. SDU «Дербес деректер және оларды қорғау туралы» Қазақстан Республикасы Заңының мағынасында дербес деректердің меншік иесі және операторы болып табылады.', contact.KK] },
      { h: '2. Қандай деректер жинаймыз', ul: [
        'Аккаунт деректері: SDU e-mail (@sdu.edu.kz), көрсетілетін аты-жөніңіз және Google арқылы кіру кезінде берілетін идентификаторлар.',
        'Өтінім деректері: жоба атауы, сипаттамасы, саласы, кезеңі, өнім сипаттамасы, команда құрамы (сіз көрсеткен мүшелердің аты-жөні мен рөлдері) және жүктелген суреттер.',
        'Қатысу деректері: іс-шараларға тіркелу, командаларға мүшелік, шақырулар мен қосылу сұраулары, қарау мәртебесі және тексерушілердің пікірлері.',
        'Келісім жазбалары: келісім берілді ме немесе кері қайтарылды ма, құжат нұсқасы және уақыты.',
        'Аккаунтта қалуыңызға, тіл мен тақырыпты есте сақтауға қажетті техникалық деректер (Cookie туралы хабарламаны қараңыз).',
      ] },
      { h: '3. Не үшін пайдаланамыз', ul: [
        'аккаунт құру және қорғау, SDU қауымдастығына тиесілігіңізді растау үшін;',
        'OFE бағдарламаларына, соның ішінде SDU Founders Cup және Demo Day-ге өтінімдерді қабылдау, қарау және кері байланыс беру үшін;',
        'студенттерге команда табуға көмектесу және іс-шараларды ұйымдастыру үшін;',
        'мақұлданған стартаптарды тек иесі жеке Жариялауға келісім берген жағдайда жариялау үшін;',
        'өтініміңіз немесе тіркелген іс-шаралар бойынша сізбен байланысу үшін;',
        'OFE бағдарламалары туралы иесіздендірілген статистика дайындау үшін.',
      ] },
      { h: '4. Құқықтық негіз', p: ['Деректерді сіздің келісіміңіз (Дербес деректерді өңдеуге келісім) негізінде, сондай-ақ қажет болған жағдайда SDU-дың білім беру және сабақтан тыс қызметін жүзеге асыру үшін өңдейміз. Жобаны жариялау жеке әрі ерікті Жариялауға келісім негізінде жүзеге асырылады.'] },
      { h: '5. Деректеріңізді кім көреді', ul: [
        'OFE қызметкерлері және бағдарламаға қатысатын уәкілетті сарапшылар, қазылар алқасы мен менторлар — тек қарауға қажетті көлемде;',
        'басқа авторизацияланған пайдаланушылар — тек өзіңіз бөлісуді таңдаған команда туралы ақпарат (мысалы, команда іздеуде);',
        'барлық келушілер — тек Жариялауға келісімі бар мақұлданған жобалар;',
        'Платформа жұмысын қамтамасыз ететін қызмет жеткізушілер: Supabase (дерекқор, авторизация, файл сақтау), Vercel (хостинг) және Google (кіру). Олардың серверлері Қазақстаннан тыс орналасуы мүмкін [OFE сақтау өңірлерін және трансшекаралық беру тәртібін нақтылауы қажет].',
      ], p: ['Біз деректеріңізді сатпаймыз және жарнама үшін пайдаланбаймыз.'] },
      { h: '6. Сақтау мерзімдері', ul: [
        'аккаунт деректері — аккаунт белсенді болған кезде; жою туралы сұраудан кейін оларды кідіріссіз, кез келген жағдайда 30 күннен кешіктірмей жоямыз (сұрауды өңдеу және резервтік көшірмелерді тазалау мерзімі);',
        'өтінімдер мен қарау нәтижелері — бағдарлама маусымы бойы және одан кейін [3] жыл, содан соң жойылады немесе иесіздендіріледі;',
        'келісім жазбалары — келісімнің берілгенін немесе кері қайтарылғанын растау үшін қажетті мерзімге дейін;',
        'жарияланған стартап туралы ақпарат — Жариялауға келісім кері қайтарылғанға немесе жоба жойылғанға дейін.',
      ] },
      { h: '7. Сіздің құқықтарыңыз', p: ['Сіз өз деректеріңізге қол жеткізуге, оларды түзетуді немесе жоюды талап етуге, келісімді кері қайтаруға және өңдеуге қарсылық білдіруге құқылысыз. Сондай-ақ Қазақстан Республикасының дербес деректерді қорғау саласындағы уәкілетті органына шағым бере аласыз. Сұрауларды жоғарыдағы байланыс арқылы жіберіңіз; біз заңда белгіленген мерзімде жауап береміз.'] },
      { h: '8. Қауіпсіздік', p: ['Деректерге қол жеткізу дерекқор деңгейіндегі ережелермен шектелген, файлдарға тек авторизацияланған сессияда қол жеткізуге болады, ал өтінімдерді тек OFE әкімшілері қарай алады. Ешбір жүйе толық қорғалмаған — аккаунтыңызға рұқсатсыз кіру күдігі болса, бізге дереу хабарлаңыз.'] },
      { h: '9. Кәмелетке толмағандар', p: ['Егер сізге 18 жас толмаса, өтінім бергенге дейін дербес деректеріңізді өңдеуге ата-анаңыздың немесе заңды өкіліңіздің келісімі қажет.'] },
      { h: '10. Өзгерістер', p: ['Саясаттағы өзгерістер Платформада жаңа нұсқа күнімен жарияланады. Елеулі өзгерістер туралы тіркелген пайдаланушыларға хабарлаймыз.'] },
    ],
  },

  'Terms of Use': {
    EN: [
      { h: '1. Acceptance', p: ['By signing in to or using the Platform you agree to these Terms of Use, the Privacy Policy and the Copyright & IP Policy. If you do not agree, please do not use the Platform.'] },
      { h: '2. Who can use the Platform', p: ['Applying, joining teams and registering for events require a verified SDU Google account (@sdu.edu.kz). Public pages, such as the startup directory and the event archive, can be viewed by anyone. You are responsible for all activity in your account and must not share access with others.'] },
      { h: '3. Applications', ul: [
        'Information you submit must be accurate and up to date. You must have the consent of every team member whose name or data you include.',
        'Submitting an application does not guarantee acceptance, an award or publication. OFE and the jury decide according to the rules of the relevant program.',
        'OFE may contact you for clarifications and may reject applications that are incomplete or break these Terms.',
      ] },
      { h: '4. Teams', p: ['Team invitations and join requests are visible to the people involved. Be respectful; decisions about team membership are made by the team owner. OFE is not a party to agreements between team members, including on the split of ownership in a startup.'] },
      { h: '5. Acceptable use', p: ['You must not:'], ul: [
        'upload content that is illegal, offensive, discriminatory or misleading, or that infringes someone else’s rights;',
        'publish other people’s personal data without their consent;',
        'impersonate another person or create accounts for others;',
        'try to access data or features you are not authorised to use, interfere with the Platform’s security or overload it;',
        'use the Platform for advertising or spam unrelated to OFE programs.',
      ] },
      { h: '6. Moderation', p: ['OFE may edit the public display of, hide or remove content, and may restrict or suspend accounts that break these Terms or SDU internal rules. Where possible we will explain the reason and give you a chance to respond.'] },
      { h: '7. Availability and liability', p: ['The Platform is provided free of charge “as is”. We try to keep it available and secure but do not guarantee uninterrupted operation. Keep your own copies of important materials. SDU and OFE are not liable for losses caused by the use of the Platform, except where the law does not allow such a limitation.'] },
      { h: '8. Changes and governing law', p: ['We may update these Terms and will show the new version date on the Platform. Continued use after an update means you accept it. These Terms are governed by the law of the Republic of Kazakhstan.'] },
      { h: '9. Contact', p: [contact.EN] },
    ],
    RU: [
      { h: '1. Принятие условий', p: ['Входя на Платформу или пользуясь ею, вы соглашаетесь с настоящим Пользовательским соглашением, Политикой конфиденциальности и Политикой об авторских правах и ИС. Если вы не согласны, пожалуйста, не пользуйтесь Платформой.'] },
      { h: '2. Кто может пользоваться Платформой', p: ['Для подачи заявок, участия в командах и регистрации на мероприятия нужен подтверждённый Google-аккаунт SDU (@sdu.edu.kz). Публичные страницы — каталог стартапов и архив мероприятий — доступны всем. Вы отвечаете за все действия в своём аккаунте и не должны передавать доступ к нему другим лицам.'] },
      { h: '3. Заявки', ul: [
        'Указываемая информация должна быть достоверной и актуальной. Вы должны получить согласие каждого участника команды, чьё имя или данные вы указываете.',
        'Подача заявки не гарантирует её принятия, награды или публикации. Решения принимают OFE и жюри по правилам соответствующей программы.',
        'OFE может запросить уточнения и отклонить неполные заявки или заявки, нарушающие настоящие условия.',
      ] },
      { h: '4. Команды', p: ['Приглашения и запросы на вступление видны их участникам. Проявляйте уважение; решения о составе команды принимает её владелец. OFE не является стороной договорённостей между участниками команды, в том числе о распределении долей в стартапе.'] },
      { h: '5. Допустимое использование', p: ['Запрещается:'], ul: [
        'загружать незаконный, оскорбительный, дискриминационный или вводящий в заблуждение контент, а также контент, нарушающий чужие права;',
        'публиковать персональные данные других людей без их согласия;',
        'выдавать себя за другое лицо или создавать аккаунты за других;',
        'пытаться получить доступ к данным или функциям без разрешения, нарушать безопасность Платформы или перегружать её;',
        'использовать Платформу для рекламы или рассылок, не связанных с программами OFE.',
      ] },
      { h: '6. Модерация', p: ['OFE может скрывать, удалять или менять отображение контента, а также ограничивать или приостанавливать аккаунты, нарушающие настоящие условия или внутренние правила SDU. По возможности мы сообщим причину и дадим возможность ответить.'] },
      { h: '7. Доступность и ответственность', p: ['Платформа предоставляется бесплатно «как есть». Мы стараемся обеспечить её доступность и безопасность, но не гарантируем бесперебойную работу. Храните копии важных материалов у себя. SDU и OFE не несут ответственности за убытки, связанные с использованием Платформы, кроме случаев, когда такое ограничение не допускается законом.'] },
      { h: '8. Изменения и применимое право', p: ['Мы можем обновлять условия и укажем дату новой версии на Платформе. Продолжение использования после обновления означает согласие с ним. К настоящим условиям применяется право Республики Казахстан.'] },
      { h: '9. Контакты', p: [contact.RU] },
    ],
    KK: [
      { h: '1. Шарттарды қабылдау', p: ['Платформаға кіру немесе оны пайдалану арқылы сіз осы Пайдаланушы келісімімен, Құпиялық саясатымен және Авторлық құқық пен ЗМ саясатымен келісесіз. Келіспесеңіз, Платформаны пайдаланбаңыз.'] },
      { h: '2. Платформаны кім пайдалана алады', p: ['Өтінім беру, командаларға қосылу және іс-шараларға тіркелу үшін расталған SDU Google аккаунты (@sdu.edu.kz) қажет. Жария беттер — стартаптар каталогы мен іс-шаралар мұрағаты — барлығына қолжетімді. Аккаунтыңыздағы барлық әрекетке өзіңіз жауаптысыз және оған қол жеткізуді басқаларға бермеуіңіз керек.'] },
      { h: '3. Өтінімдер', ul: [
        'Көрсетілген ақпарат шынайы әрі өзекті болуы тиіс. Аты-жөнін немесе деректерін көрсеткен әрбір команда мүшесінің келісімін алуыңыз керек.',
        'Өтінім беру оның қабылдануына, марапатқа немесе жариялануына кепілдік бермейді. Шешімдерді тиісті бағдарлама ережелері бойынша OFE мен қазылар алқасы қабылдайды.',
        'OFE нақтылау сұрай алады және толық емес немесе осы шарттарды бұзатын өтінімдерді қабылдамауы мүмкін.',
      ] },
      { h: '4. Командалар', p: ['Шақырулар мен қосылу сұрауларын оларға қатысты адамдар көреді. Құрметпен қараңыз; команда құрамы туралы шешімді команда иесі қабылдайды. OFE команда мүшелері арасындағы, соның ішінде стартаптағы үлестерді бөлу туралы келісімдердің тарапы болып табылмайды.'] },
      { h: '5. Рұқсат етілген пайдалану', p: ['Тыйым салынады:'], ul: [
        'заңсыз, қорлайтын, кемсітушілік немесе жаңылыстыратын, сондай-ақ басқалардың құқықтарын бұзатын мазмұнды жүктеуге;',
        'басқа адамдардың дербес деректерін олардың келісімінсіз жариялауға;',
        'басқа адамның атын жамылуға немесе басқалар үшін аккаунт ашуға;',
        'рұқсатсыз деректерге немесе функцияларға қол жеткізуге тырысуға, Платформа қауіпсіздігін бұзуға немесе оны шамадан тыс жүктеуге;',
        'Платформаны OFE бағдарламаларына қатысы жоқ жарнама немесе спам үшін пайдалануға.',
      ] },
      { h: '6. Модерация', p: ['OFE мазмұнды жасыра, жоя немесе оның көрсетілуін өзгерте алады, сондай-ақ осы шарттарды немесе SDU ішкі ережелерін бұзатын аккаунттарды шектей немесе тоқтата тұра алады. Мүмкіндігінше себебін хабарлап, жауап беруге мүмкіндік береміз.'] },
      { h: '7. Қолжетімділік және жауапкершілік', p: ['Платформа тегін, «сол күйінде» ұсынылады. Біз оның қолжетімділігі мен қауіпсіздігін қамтамасыз етуге тырысамыз, бірақ үздіксіз жұмысына кепілдік бермейміз. Маңызды материалдардың көшірмелерін өзіңізде сақтаңыз. SDU және OFE Платформаны пайдаланумен байланысты залал үшін жауап бермейді, заң мұндай шектеуге жол бермейтін жағдайларды қоспағанда.'] },
      { h: '8. Өзгерістер және қолданылатын құқық', p: ['Біз шарттарды жаңарта аламыз және жаңа нұсқа күнін Платформада көрсетеміз. Жаңартудан кейін пайдалануды жалғастыру оған келісетініңізді білдіреді. Осы шарттарға Қазақстан Республикасының құқығы қолданылады.'] },
      { h: '9. Байланыс', p: [contact.KK] },
    ],
  },

  'Personal Data Processing Consent': {
    EN: [
      { h: 'Consent', p: ['By ticking the box “I agree to processing my application data” I, the user of the Platform, in accordance with the Law of the Republic of Kazakhstan “On Personal Data and Their Protection”, freely, of my own will and in my own interest, give consent to SDU University, represented by the SDU Office for Entrepreneurship (OFE), to process my personal data on the following terms.'] },
      { h: '1. Data covered', ul: [
        'full name / display name, SDU e-mail and Google account identifiers;',
        'information about my studies and role in the team that I provide in the application;',
        'the content of my application, uploaded images and reviewer feedback;',
        'information about team members that I include (I confirm that I have their consent).',
      ] },
      { h: '2. Purposes', p: ['Reviewing my application to OFE programs (including SDU Founders Cup and Demo Day), communicating with me about the application and events, organising events, forming teams, and preparing anonymised statistics.'] },
      { h: '3. Actions with data', p: ['Collection, recording, systematisation, storage, updating, use, transfer to OFE staff, reviewers, jury members and mentors of the program, transfer to the Platform’s hosting providers (Supabase, Vercel, Google), including cross-border transfer, depersonalisation, blocking and deletion.'] },
      { h: '4. Period', p: ['The consent is valid for the program season and [3] years after it, or until I withdraw it, whichever comes first.'] },
      { h: '5. Withdrawal', p: ['I may withdraw this consent at any time by writing to OFE (contact below). After withdrawal my application can no longer be reviewed, and my data will be deleted or anonymised, except for the consent record itself and data SDU must keep by law.'] },
      { h: '6. Not covered', p: ['This consent does not include publication of my project. Publication requires a separate Startup Publication Consent.'] },
      { h: '7. Confirmation', p: ['I confirm that I have read the Privacy Policy, I understand my rights as a personal data subject, and, if I am under 18, that my parent or legal guardian agrees to this processing.', contact.EN] },
    ],
    RU: [
      { h: 'Согласие', p: ['Отмечая пункт «Я согласен(а) на обработку данных заявки», я, пользователь Платформы, в соответствии с Законом Республики Казахстан «О персональных данных и их защите», свободно, своей волей и в своём интересе даю согласие SDU University в лице Офиса предпринимательства SDU (OFE) на обработку моих персональных данных на следующих условиях.'] },
      { h: '1. Перечень данных', ul: [
        'ФИО / отображаемое имя, e-mail SDU и идентификаторы Google-аккаунта;',
        'сведения об учёбе и роли в команде, указанные мной в заявке;',
        'содержание заявки, загруженные изображения и отзывы проверяющих;',
        'сведения об участниках команды, которые я указываю (подтверждаю, что получил(а) их согласие).',
      ] },
      { h: '2. Цели', p: ['Рассмотрение моей заявки в программы OFE (включая SDU Founders Cup и Demo Day), связь со мной по заявке и мероприятиям, организация мероприятий, формирование команд и подготовка обезличенной статистики.'] },
      { h: '3. Действия с данными', p: ['Сбор, запись, систематизация, хранение, обновление, использование, передача сотрудникам OFE, экспертам, членам жюри и менторам программы, передача поставщикам хостинга Платформы (Supabase, Vercel, Google), в том числе трансграничная, обезличивание, блокирование и удаление.'] },
      { h: '4. Срок действия', p: ['Согласие действует в течение сезона программы и [3] лет после него либо до его отзыва — в зависимости от того, что наступит раньше.'] },
      { h: '5. Отзыв согласия', p: ['Я могу отозвать согласие в любое время, написав в OFE (контакты ниже). После отзыва заявка не может быть рассмотрена, а мои данные будут удалены или обезличены, за исключением самой записи о согласии и данных, которые SDU обязан хранить по закону.'] },
      { h: '6. Что не входит', p: ['Настоящее согласие не включает публикацию проекта. Для публикации требуется отдельное Согласие на публикацию стартапа.'] },
      { h: '7. Подтверждение', p: ['Подтверждаю, что ознакомлен(а) с Политикой конфиденциальности и своими правами субъекта персональных данных, а если мне нет 18 лет — что мой родитель или законный представитель согласен на такую обработку.', contact.RU] },
    ],
    KK: [
      { h: 'Келісім', p: ['«Өтінім деректерін өңдеуге келісемін» белгісін қою арқылы мен, Платформа пайдаланушысы, «Дербес деректер және оларды қорғау туралы» Қазақстан Республикасының Заңына сәйкес, еркін, өз еркіммен және өз мүддем үшін SDU University-ге SDU кәсіпкерлік кеңсесі (OFE) атынан дербес деректерімді төмендегі шарттармен өңдеуге келісім беремін.'] },
      { h: '1. Деректер тізбесі', ul: [
        'аты-жөні / көрсетілетін аты, SDU e-mail және Google аккаунт идентификаторлары;',
        'өтінімде көрсеткен оқуым және командадағы рөлім туралы мәліметтер;',
        'өтінім мазмұны, жүктелген суреттер және тексерушілердің пікірлері;',
        'мен көрсеткен команда мүшелері туралы мәліметтер (олардың келісімін алғанымды растаймын).',
      ] },
      { h: '2. Мақсаттар', p: ['OFE бағдарламаларына (соның ішінде SDU Founders Cup және Demo Day) өтінімімді қарау, өтінім мен іс-шаралар бойынша менімен байланысу, іс-шараларды ұйымдастыру, командаларды құру және иесіздендірілген статистика дайындау.'] },
      { h: '3. Деректермен әрекеттер', p: ['Жинау, жазу, жүйелеу, сақтау, жаңарту, пайдалану, OFE қызметкерлеріне, бағдарлама сарапшыларына, қазылар алқасы мүшелеріне және менторларына беру, Платформаның хостинг жеткізушілеріне (Supabase, Vercel, Google), соның ішінде трансшекаралық беру, иесіздендіру, бұғаттау және жою.'] },
      { h: '4. Қолданылу мерзімі', p: ['Келісім бағдарлама маусымы бойы және одан кейін [3] жыл ішінде немесе кері қайтарылғанға дейін — қайсысы бұрын болса, сол уақытқа дейін әрекет етеді.'] },
      { h: '5. Келісімді кері қайтару', p: ['Мен келісімді кез келген уақытта OFE-ге (төмендегі байланыс) жазу арқылы кері қайтара аламын. Кері қайтарғаннан кейін өтінім қаралмайды, ал деректерім жойылады немесе иесіздендіріледі, келісім жазбасының өзі мен SDU заң бойынша сақтауға міндетті деректерді қоспағанда.'] },
      { h: '6. Не кірмейді', p: ['Бұл келісім жобаны жариялауды қамтымайды. Жариялау үшін жеке Стартапты жариялауға келісім қажет.'] },
      { h: '7. Растау', p: ['Құпиялық саясатымен және дербес деректер субъектісі ретіндегі құқықтарыммен танысқанымды, ал 18 жасқа толмаған болсам — ата-анамның немесе заңды өкілімнің мұндай өңдеуге келісетінін растаймын.', contact.KK] },
    ],
  },

  'Startup Publication Consent': {
    EN: [
      { h: 'What this consent is', p: ['This consent is optional and separate from the review of your application. Without it your application is still reviewed in full; your project simply does not appear publicly. Only the project owner can give or withdraw it.'] },
      { h: '1. What may be published', p: ['If your project is approved by OFE and you have given this consent, the following may appear in the public startup directory, on event pages and in the event archive of the Platform:'], ul: [
        'project name, short and full description, industry, stage and product description;',
        'team information as entered in the application (names and roles of team members);',
        'project logo, cover and other images you uploaded;',
        'participation in OFE events and results (for example, finalist or winner of Demo Day).',
      ] },
      { h: '2. Where and how', p: ['Materials are published only on the Platform. Your e-mail and reviewer feedback are never published.'] },
      { h: '3. Team members', p: ['By giving this consent you confirm that the team members listed in the project agree to their names and roles being published.'] },
      { h: '4. Withdrawal', p: ['You can withdraw consent at any time with the “I allow my project to be published” switch in your workspace. The project disappears from the public directory once the change is saved. Your application stays in your workspace. '] },
      { h: '5. Records', p: ['We keep a record of each grant and withdrawal (version of this document and time) to be able to prove your choice.'] },
      { h: '6. Contact', p: [contact.EN] },
    ],
    RU: [
      { h: 'Что это за согласие', p: ['Это согласие добровольное и не связано с рассмотрением заявки. Без него заявка рассматривается полностью — проект просто не появляется в открытом доступе. Дать или отозвать согласие может только владелец проекта.'] },
      { h: '1. Что может быть опубликовано', p: ['Если проект одобрен OFE и вы дали согласие, в публичном каталоге стартапов, на страницах мероприятий и в архиве мероприятий Платформы могут появиться:'], ul: [
        'название проекта, краткое и полное описание, отрасль, стадия и описание продукта;',
        'информация о команде, указанная в заявке (имена и роли участников);',
        'логотип, обложка и другие загруженные вами изображения;',
        'участие в мероприятиях OFE и результаты (например, финалист или победитель Demo Day).',
      ] },
      { h: '2. Где и как', p: ['Материалы публикуются только на Платформе. Ваш e-mail и отзывы проверяющих никогда не публикуются.'] },
      { h: '3. Участники команды', p: ['Давая согласие, вы подтверждаете, что указанные в проекте участники команды согласны на публикацию своих имён и ролей.'] },
      { h: '4. Отзыв', p: ['Отозвать согласие можно в любой момент переключателем «Я разрешаю публиковать мой проект» в личном кабинете. Проект исчезнет из публичного каталога после сохранения. Заявка останется в вашем кабинете. '] },
      { h: '5. Учёт', p: ['Мы сохраняем запись о каждом предоставлении и отзыве согласия (версия документа и время), чтобы подтвердить ваш выбор.'] },
      { h: '6. Контакты', p: [contact.RU] },
    ],
    KK: [
      { h: 'Бұл қандай келісім', p: ['Бұл келісім ерікті және өтінімді қараумен байланысты емес. Онсыз да өтінім толық қаралады — жоба жай ғана жария көрсетілмейді. Келісімді тек жоба иесі бере немесе кері қайтара алады.'] },
      { h: '1. Не жариялануы мүмкін', p: ['Егер жобаны OFE мақұлдаса және сіз келісім берсеңіз, Платформаның жария стартаптар каталогында, іс-шаралар беттерінде және іс-шаралар мұрағатында мыналар көрсетілуі мүмкін:'], ul: [
        'жоба атауы, қысқа және толық сипаттамасы, саласы, кезеңі және өнім сипаттамасы;',
        'өтінімде көрсетілген команда туралы ақпарат (мүшелердің аты-жөні мен рөлдері);',
        'сіз жүктеген логотип, мұқаба және басқа суреттер;',
        'OFE іс-шараларына қатысу және нәтижелер (мысалы, Demo Day финалисі немесе жеңімпазы).',
      ] },
      { h: '2. Қайда және қалай', p: ['Материалдар тек Платформада жарияланады. Сіздің e-mail мен тексерушілердің пікірлері ешқашан жарияланбайды.'] },
      { h: '3. Команда мүшелері', p: ['Келісім бере отырып, жобада көрсетілген команда мүшелерінің аты-жөні мен рөлдерінің жариялануына келісетінін растайсыз.'] },
      { h: '4. Кері қайтару', p: ['Келісімді кез келген уақытта жеке кабинеттегі «Жобамды жариялауға рұқсат беремін» қосқышы арқылы кері қайтаруға болады. Сақтағаннан кейін жоба жария каталогтан жойылады. Өтінім кабинетіңізде қалады. '] },
      { h: '5. Есепке алу', p: ['Таңдауыңызды растау үшін келісімнің әрбір берілуі мен кері қайтарылуының жазбасын (құжат нұсқасы мен уақыты) сақтаймыз.'] },
      { h: '6. Байланыс', p: [contact.KK] },
    ],
  },

  'Copyright & IP Policy': {
    EN: [
      { h: '1. Your project belongs to you', p: ['You and your team keep all rights to your ideas, business models, code, designs, names, logos and other materials you submit. Submitting an application does not transfer ownership to SDU or OFE. OFE does not decide disputes between team members about ownership.'] },
      { h: '2. Licence you give us', p: ['When you upload materials you give SDU/OFE a free, non-exclusive licence to store and show them to reviewers and jury for the purposes of the program. If you also give Publication Consent, the licence extends to displaying the approved materials publicly as described in that consent, for as long as the consent is in effect.'] },
      { h: '3. Confidentiality', p: ['Reviewers and OFE staff use application materials only for evaluation and support. Do not include trade secrets or information you are not ready to share; the Platform is not a substitute for a non-disclosure agreement.'] },
      { h: '4. Only upload what you may use', p: ['Upload only materials that you created or have permission to use (including images, fonts and trademarks). You are responsible for any claims arising from materials you upload.'] },
      { h: '5. Platform content', p: ['The Platform’s design, texts, the OFE and SDU names, logos, emblems, and event photos belong to SDU or are used with permission. They may not be copied or used commercially without written permission of SDU. Brief quotation with attribution for news and educational purposes is allowed.'] },
      { h: '6. Reporting a rights concern', p: ['If you believe content on the Platform infringes your rights, or you appear in a photo and want it removed, write to OFE with a link to the content, a description of your rights and your contact details. We will review the request and, where justified, hide or remove the content as soon as possible.', contact.EN] },
    ],
    RU: [
      { h: '1. Ваш проект принадлежит вам', p: ['Вы и ваша команда сохраняете все права на идеи, бизнес-модели, код, дизайн, названия, логотипы и другие материалы, которые вы подаёте. Подача заявки не передаёт права собственности SDU или OFE. OFE не разрешает споры между участниками команды о правах на проект.'] },
      { h: '2. Лицензия, которую вы нам даёте', p: ['Загружая материалы, вы предоставляете SDU/OFE бесплатную неисключительную лицензию на их хранение и показ экспертам и жюри для целей программы. Если вы также дали Согласие на публикацию, лицензия распространяется на публичный показ одобренных материалов в объёме, описанном в этом согласии, на время его действия.'] },
      { h: '3. Конфиденциальность', p: ['Эксперты и сотрудники OFE используют материалы заявок только для оценки и поддержки. Не указывайте коммерческую тайну и сведения, которыми вы не готовы делиться; Платформа не заменяет соглашение о неразглашении (NDA).'] },
      { h: '4. Загружайте только то, на что есть права', p: ['Загружайте только материалы, созданные вами или используемые с разрешения (включая изображения, шрифты и товарные знаки). Вы отвечаете за претензии, связанные с загруженными вами материалами.'] },
      { h: '5. Контент Платформы', p: ['Дизайн и тексты Платформы, названия, логотипы и эмблемы OFE и SDU, фотографии мероприятий принадлежат SDU или используются с разрешения. Их нельзя копировать или использовать в коммерческих целях без письменного разрешения SDU. Допускается краткое цитирование со ссылкой в новостных и образовательных целях.'] },
      { h: '6. Как сообщить о нарушении', p: ['Если вы считаете, что контент на Платформе нарушает ваши права, или вы есть на фотографии и хотите её удалить, напишите в OFE, указав ссылку на контент, описание ваших прав и контакты. Мы рассмотрим обращение и при обоснованности как можно скорее скроем или удалим контент.', contact.RU] },
    ],
    KK: [
      { h: '1. Жобаңыз өзіңізге тиесілі', p: ['Сіз және командаңыз ұсынған идеяларға, бизнес-модельдерге, кодқа, дизайнға, атауларға, логотиптерге және басқа материалдарға барлық құқықтарды сақтайсыз. Өтінім беру меншік құқығын SDU-ға немесе OFE-ге бермейді. OFE команда мүшелері арасындағы жобаға құқық туралы дауларды шешпейді.'] },
      { h: '2. Бізге беретін лицензияңыз', p: ['Материалдарды жүктей отырып, сіз SDU/OFE-ге оларды сақтауға және бағдарлама мақсатында сарапшылар мен қазылар алқасына көрсетуге тегін, айрықша емес лицензия бересіз. Егер Жариялауға келісім де берсеңіз, лицензия мақұлданған материалдарды сол келісімде сипатталған көлемде, ол әрекет ететін уақытқа дейін жария көрсетуге таралады.'] },
      { h: '3. Құпиялылық', p: ['Сарапшылар мен OFE қызметкерлері өтінім материалдарын тек бағалау және қолдау үшін пайдаланады. Коммерциялық құпияны және бөлісуге дайын емес ақпаратты көрсетпеңіз; Платформа құпияны жария етпеу туралы келісімді (NDA) алмастырмайды.'] },
      { h: '4. Тек құқығыңыз бар материалды жүктеңіз', p: ['Тек өзіңіз жасаған немесе рұқсатпен пайдаланатын материалдарды (суреттерді, қаріптерді және тауар белгілерін қоса) жүктеңіз. Жүктеген материалдарыңызға байланысты талаптарға өзіңіз жауаптысыз.'] },
      { h: '5. Платформа мазмұны', p: ['Платформаның дизайны мен мәтіндері, OFE және SDU атаулары, логотиптері мен эмблемалары, іс-шаралар фотосуреттері SDU-ға тиесілі немесе рұқсатпен пайдаланылады. Оларды SDU-дың жазбаша рұқсатынсыз көшіруге немесе коммерциялық мақсатта пайдалануға болмайды. Жаңалық және білім беру мақсатында сілтемемен қысқа дәйексөз келтіруге рұқсат етіледі.'] },
      { h: '6. Бұзушылық туралы қалай хабарлау керек', p: ['Егер Платформадағы мазмұн құқықтарыңызды бұзады деп есептесеңіз немесе фотосуретте бар болсаңыз және оны жойғыңыз келсе, мазмұнға сілтемені, құқықтарыңыздың сипаттамасын және байланыс деректеріңізді көрсетіп, OFE-ге жазыңыз. Біз өтінішті қарап, негізді болса, мазмұнды мүмкіндігінше тез жасырамыз немесе жоямыз.', contact.KK] },
    ],
  },

  'Cookie Notice': {
    EN: [
      { h: '1. Summary', p: ['The Platform does not use advertising or analytics cookies and does not track you across other websites. It only stores the small amount of information in your browser that is needed for it to work.'] },
      { h: '2. What is stored in your browser', ul: [
        'Sign-in session (local storage, set by Supabase Auth): keeps you signed in and refreshes your session securely. Removed when you sign out.',
        'Language (local storage, “ofe:language”): remembers EN / RU / KK.',
        'Theme (local storage, “ofe:theme”): remembers light or dark mode.',
        'Team drafts (session storage, “ofe:teams:v1:…”): temporary team discovery data, deleted when you close the tab.',
      ] },
      { h: '3. Third parties', p: ['When you sign in with Google, Google may set its own cookies on its own domain according to the Google Privacy Policy. Our hosting provider (Vercel) may process technical request data such as IP address to deliver and protect the website.'] },
      { h: '4. Your choices', p: ['These items are strictly necessary or remember your own settings, so no consent banner is required. You can delete them at any time in your browser settings; you will then be signed out and the language and theme will return to defaults.'] },
      { h: '5. Changes', p: ['If we ever add analytics or other non-essential cookies, we will update this notice and ask for your consent first.', contact.EN] },
    ],
    RU: [
      { h: '1. Кратко', p: ['Платформа не использует рекламные и аналитические cookie и не отслеживает вас на других сайтах. В браузере хранится только небольшой объём данных, необходимых для её работы.'] },
      { h: '2. Что хранится в браузере', ul: [
        'Сессия входа (local storage, устанавливается Supabase Auth): сохраняет вход и безопасно обновляет сессию. Удаляется при выходе.',
        'Язык (local storage, «ofe:language»): запоминает EN / RU / KK.',
        'Тема (local storage, «ofe:theme»): запоминает светлую или тёмную тему.',
        'Черновики команд (session storage, «ofe:teams:v1:…»): временные данные поиска команд, удаляются при закрытии вкладки.',
      ] },
      { h: '3. Третьи лица', p: ['При входе через Google компания Google может устанавливать собственные cookie на своём домене согласно Политике конфиденциальности Google. Хостинг-провайдер (Vercel) может обрабатывать технические данные запросов, например IP-адрес, чтобы доставлять и защищать сайт.'] },
      { h: '4. Ваш выбор', p: ['Эти данные строго необходимы или хранят ваши собственные настройки, поэтому баннер согласия не требуется. Вы можете удалить их в любое время в настройках браузера — после этого вы выйдете из аккаунта, а язык и тема вернутся к значениям по умолчанию.'] },
      { h: '5. Изменения', p: ['Если мы добавим аналитику или другие необязательные cookie, мы обновим это уведомление и сначала запросим ваше согласие.', contact.RU] },
    ],
    KK: [
      { h: '1. Қысқаша', p: ['Платформа жарнамалық және аналитикалық cookie файлдарын пайдаланбайды және сізді басқа сайттарда бақыламайды. Браузерде тек оның жұмысына қажетті шағын көлемдегі деректер сақталады.'] },
      { h: '2. Браузерде не сақталады', ul: [
        'Кіру сессиясы (local storage, Supabase Auth орнатады): кіруді сақтайды және сессияны қауіпсіз жаңартады. Шыққан кезде жойылады.',
        'Тіл (local storage, «ofe:language»): EN / RU / KK таңдауын есте сақтайды.',
        'Тақырып (local storage, «ofe:theme»): ашық немесе қараңғы тақырыпты есте сақтайды.',
        'Команда жобалары (session storage, «ofe:teams:v1:…»): команда іздеудің уақытша деректері, қойынды жабылғанда жойылады.',
      ] },
      { h: '3. Үшінші тараптар', p: ['Google арқылы кірген кезде Google өз доменінде Google құпиялық саясатына сәйкес өз cookie файлдарын орнатуы мүмкін. Хостинг провайдері (Vercel) сайтты жеткізу және қорғау үшін IP мекенжайы сияқты сұраулардың техникалық деректерін өңдеуі мүмкін.'] },
      { h: '4. Сіздің таңдауыңыз', p: ['Бұл деректер қатаң қажет немесе өз баптауларыңызды сақтайды, сондықтан келісім баннері талап етілмейді. Оларды кез келген уақытта браузер баптауларында жоя аласыз — содан кейін аккаунттан шығасыз, ал тіл мен тақырып әдепкі мәндерге оралады.'] },
      { h: '5. Өзгерістер', p: ['Егер аналитика немесе басқа міндетті емес cookie қоссақ, осы хабарламаны жаңартып, алдымен келісіміңізді сұраймыз.', contact.KK] },
    ],
  },
}
