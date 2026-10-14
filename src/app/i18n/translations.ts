export type Lang = 'de' | 'en';
export const LANGS: readonly Lang[] = ['de', 'en'] as const;
export const DEFAULT_LANG: Lang = 'de';

export type ServiceIcon = 'ai' | 'code' | 'api' | 'data' | 'etl' | 'jira';

export interface Dict {
  meta: { title: string; description: string; ogLocale: string };
  a11y: { skip: string; home: string; menu: string; mainNav: string; legalNav: string; langSwitch: string; scrollDown: string };
  nav: { services: string; process: string; why: string; tech: string; faq: string; contact: string };
  hero: { eyebrow: string; tagline: string; title: string; lead: string; ctaPrimary: string; ctaSecondary: string; facts: string[] };
  services: { eyebrow: string; title: string; lead: string; items: { icon: ServiceIcon; title: string; text: string; tags: string[] }[] };
  process: { eyebrow: string; title: string; lead: string; steps: { title: string; text: string }[] };
  why: { eyebrow: string; title: string; lead: string; items: { title: string; text: string }[] };
  tech: { eyebrow: string; title: string; lead: string; groups: { title: string; items: string[] }[] };
  faq: { eyebrow: string; title: string; items: { q: string; a: string }[] };
  contact: {
    eyebrow: string; title: string; lead: string; placeholderNote: string; points: string[];
    name: string; email: string; company: string; topic: string; topicPlaceholder: string; topicOther: string; message: string;
    privacy: string; submit: string; required: string; errName: string; errEmail: string; errMessage: string; errPrivacy: string;
    errSummary: string; success: string; hint: string;
  };
  footer: { claim: string; imprint: string; privacy: string; placeholder: string };
}

const servicesDe: Dict['services']['items'] = [
  { icon: 'ai', title: 'Künstliche Intelligenz', text: 'Integration von Large Language Models, wissensbasierte Assistenten (RAG) und Automatisierung von Routineaufgaben – dort, wo KI messbaren Nutzen bringt.', tags: ['LLM-Integration', 'RAG', 'Automatisierung'] },
  { icon: 'code', title: 'Softwareentwicklung', text: 'Individuelle Web-Anwendungen und Backend-Services mit klarer Architektur, automatisierten Tests und nachvollziehbarer Dokumentation.', tags: ['Web-Anwendungen', 'Backend', 'Testing'] },
  { icon: 'api', title: 'Schnittstellen & APIs', text: 'Konzeption und Entwicklung von REST- und GraphQL-Schnittstellen sowie die Integration bestehender Systeme und Drittanbieter.', tags: ['REST', 'GraphQL', 'Systemintegration'] },
  { icon: 'data', title: 'Data Engineering', text: 'Aufbau belastbarer Datenmodelle und Pipelines – für verlässliche, aktuelle und auswertbare Unternehmensdaten.', tags: ['Datenmodellierung', 'Pipelines', 'Datenqualität'] },
  { icon: 'etl', title: 'ETL-Prozesse', text: 'Automatisierte Extraktion, Transformation und Beladung von Daten – mit Monitoring, Fehlerbehandlung und Protokollierung.', tags: ['Orchestrierung', 'Monitoring', 'Automatisierung'] },
  { icon: 'jira', title: 'Jira Consulting & Schulungen', text: 'Einrichtung und Optimierung von Jira-Projekten, Workflows und Automatisierungen sowie praxisnahe Schulungen für Ihr Team.', tags: ['Workflows', 'Automatisierung', 'Schulungen'] },
];
const servicesEn: Dict['services']['items'] = [
  { icon: 'ai', title: 'Artificial Intelligence', text: 'Integration of large language models, knowledge-based assistants (RAG) and automation of routine tasks – wherever AI delivers measurable value.', tags: ['LLM integration', 'RAG', 'Automation'] },
  { icon: 'code', title: 'Software Development', text: 'Custom web applications and backend services with a clear architecture, automated tests and comprehensible documentation.', tags: ['Web applications', 'Backend', 'Testing'] },
  { icon: 'api', title: 'Interfaces & APIs', text: 'Design and development of REST and GraphQL APIs, plus integration of existing systems and third-party services.', tags: ['REST', 'GraphQL', 'System integration'] },
  { icon: 'data', title: 'Data Engineering', text: 'Robust data models and pipelines – for reliable, up-to-date and analysable business data.', tags: ['Data modelling', 'Pipelines', 'Data quality'] },
  { icon: 'etl', title: 'ETL Processes', text: 'Automated extraction, transformation and loading of data – with monitoring, error handling and logging.', tags: ['Orchestration', 'Monitoring', 'Automation'] },
  { icon: 'jira', title: 'Jira Consulting & Training', text: 'Setup and optimisation of Jira projects, workflows and automations, plus hands-on training for your team.', tags: ['Workflows', 'Automation', 'Training'] },
];

const techGroups = (de: boolean): Dict['tech']['groups'] => [
  { title: de ? 'Sprachen & Frameworks' : 'Languages & frameworks', items: ['TypeScript', 'Angular', 'Node.js', 'Python', 'Java'] },
  { title: de ? 'Daten' : 'Data', items: ['SQL', 'PostgreSQL', 'Apache Airflow', 'Apache Spark'] },
  { title: de ? 'KI' : 'AI', items: ['LLM-APIs', 'LangChain', 'RAG'] },
  { title: de ? 'Integration & Betrieb' : 'Integration & operations', items: ['REST', 'GraphQL', 'Docker', 'Git', 'CI/CD'] },
  { title: de ? 'Kollaboration' : 'Collaboration', items: ['Jira', 'Confluence'] },
];

export const TRANSLATIONS: Record<Lang, Dict> = {
  de: {
    meta: {
      title: 'Cyulater – KI, Softwareentwicklung, APIs, Data Engineering & Jira Consulting',
      description: 'Cyulater unterstützt Unternehmen bei KI-Lösungen, individueller Softwareentwicklung, Schnittstellenprogrammierung (APIs), Data Engineering, ETL-Prozessen sowie Jira Consulting und Schulungen.',
      ogLocale: 'de_DE',
    },
    a11y: { skip: 'Zum Inhalt springen', home: 'Cyulater – zum Seitenanfang', menu: 'Menü', mainNav: 'Hauptnavigation', legalNav: 'Rechtliches', langSwitch: 'Sprache wählen', scrollDown: 'Weiter zu den Leistungen' },
    nav: { services: 'Leistungen', process: 'Vorgehen', why: 'Arbeitsweise', tech: 'Technologien', faq: 'FAQ', contact: 'Kontakt' },
    hero: {
      eyebrow: 'IT-Dienstleistungen für Unternehmen', tagline: 'Build the impossible.',
      title: 'Software, Daten und KI – sauber integriert in Ihre Prozesse.',
      lead: 'Cyulater entwickelt individuelle Software, verbindet Systeme über APIs, baut verlässliche Datenpipelines und bringt KI produktiv zum Einsatz. Ergänzt durch Jira-Beratung und Schulungen für Ihr Team.',
      ctaPrimary: 'Erstgespräch vereinbaren', ctaSecondary: 'Leistungen ansehen',
      facts: ['Kostenloses Erstgespräch', 'Transparente Angebote', 'Remote & vor Ort'],
    },
    services: { eyebrow: 'Leistungen', title: 'Leistungsspektrum', lead: 'Sechs Kompetenzfelder, die ineinandergreifen – von der Datenquelle bis zur fertigen Anwendung.', items: servicesDe },
    process: {
      eyebrow: 'Vorgehen', title: 'Strukturierter Projektablauf', lead: 'Klare Phasen, nachvollziehbare Ergebnisse und regelmäßige Abstimmung.',
      steps: [
        { title: 'Erstgespräch', text: 'Wir besprechen Ziele, Rahmenbedingungen und bestehende Systemlandschaft – unverbindlich und kostenfrei.' },
        { title: 'Analyse & Konzept', text: 'Anforderungen, Architektur und Aufwand werden dokumentiert. Sie erhalten ein transparentes Angebot.' },
        { title: 'Umsetzung', text: 'Iterative Entwicklung in kurzen Zyklen mit regelmäßigen Zwischenständen und Abnahmen.' },
        { title: 'Übergabe & Betreuung', text: 'Dokumentierte Übergabe, Einweisung Ihres Teams und auf Wunsch fortlaufender Support.' },
      ],
    },
    why: {
      eyebrow: 'Arbeitsweise', title: 'Worauf Sie sich verlassen können', lead: 'Grundsätze, nach denen jedes Projekt umgesetzt wird.',
      items: [
        { title: 'Ein fester Ansprechpartner', text: 'Direkte Kommunikation ohne Umwege – vom ersten Gespräch bis zur Übergabe.' },
        { title: 'Transparente Kosten', text: 'Nachvollziehbare Aufwandsschätzungen und regelmäßige Statusberichte.' },
        { title: 'Ganzheitliche Expertise', text: 'Software, Schnittstellen, Daten und KI aus einer Hand – ohne Reibungsverluste zwischen Dienstleistern.' },
        { title: 'Dokumentation & Wissenstransfer', text: 'Ihr Team versteht und betreibt die Lösung eigenständig weiter.' },
        { title: 'Vertraulichkeit', text: 'Sorgfältiger Umgang mit Ihren Daten; Vertraulichkeitsvereinbarungen auf Wunsch.' },
        { title: 'Nachhaltige Technik', text: 'Bewährte, wartbare Technologien – ausgewählt nach Ihren Anforderungen.' },
      ],
    },
    tech: { eyebrow: 'Technologien', title: 'Technologie-Stack', lead: 'Eine Auswahl – die konkrete Kombination richtet sich nach Ihrem Projekt.', groups: techGroups(true) },
    faq: {
      eyebrow: 'FAQ', title: 'Häufige Fragen',
      items: [
        { q: 'Für welche Unternehmen arbeitet Cyulater?', a: 'Für kleine und mittlere Unternehmen sowie für Fachabteilungen größerer Organisationen, die gezielte Unterstützung in Softwareentwicklung, Datenverarbeitung, KI oder Jira benötigen.' },
        { q: 'Wie läuft eine Zusammenarbeit ab?', a: 'Nach einem kostenlosen Erstgespräch erhalten Sie ein Konzept mit Aufwandsschätzung. Die Umsetzung erfolgt iterativ mit regelmäßigen Abstimmungen.' },
        { q: 'Können bestehende Systeme angebunden werden?', a: 'Ja. Die Integration bestehender Anwendungen über Schnittstellen und Datenpipelines ist ein Kernbereich von Cyulater.' },
        { q: 'Finden Jira-Schulungen remote oder vor Ort statt?', a: 'Beides ist möglich. Inhalte und Umfang werden auf Ihr Team und Ihre Prozesse zugeschnitten.' },
        { q: 'Was kostet ein Projekt?', a: 'Das hängt vom Umfang ab. Nach dem Erstgespräch erhalten Sie ein transparentes Angebot – wahlweise nach Aufwand oder als Paket.' },
      ],
    },
    contact: {
      eyebrow: 'Kontakt', title: 'Sprechen wir über Ihr Vorhaben.', lead: 'Schildern Sie kurz Ihr Anliegen. Sie erhalten zeitnah eine Rückmeldung mit Terminvorschlägen für ein unverbindliches Erstgespräch.',
      placeholderNote: '[Platzhalter – echte E-Mail-Adresse eintragen]',
      points: ['Unverbindliches Erstgespräch', 'Vertrauliche Behandlung Ihrer Anfrage', 'Deutsch & Englisch'],
      name: 'Name', email: 'E-Mail', company: 'Unternehmen (optional)', topic: 'Thema', topicPlaceholder: 'Bitte wählen', topicOther: 'Sonstiges', message: 'Ihre Nachricht',
      privacy: 'Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung der Anfrage verwendet werden.',
      submit: 'Anfrage senden', required: 'Pflichtfeld',
      errName: 'Bitte geben Sie Ihren Namen an.', errEmail: 'Bitte geben Sie eine gültige E-Mail-Adresse an.', errMessage: 'Bitte beschreiben Sie kurz Ihr Anliegen.', errPrivacy: 'Bitte bestätigen Sie die Einwilligung.',
      errSummary: 'Bitte prüfen Sie die markierten Felder.',
      success: 'Ihr E-Mail-Programm wurde geöffnet. Falls nicht, schreiben Sie bitte direkt an',
      hint: 'Der Versand erfolgt über Ihr E-Mail-Programm. Auf dieser Website werden keine Formulardaten gespeichert.',
    },
    footer: { claim: 'Software · APIs · Data · KI · Jira', imprint: 'Impressum', privacy: 'Datenschutz', placeholder: 'Platzhalter – Seite noch anlegen' },
  },
  en: {
    meta: {
      title: 'Cyulater – AI, Software Development, APIs, Data Engineering & Jira Consulting',
      description: 'Cyulater supports companies with AI solutions, custom software development, API development, data engineering, ETL processes as well as Jira consulting and training.',
      ogLocale: 'en_US',
    },
    a11y: { skip: 'Skip to content', home: 'Cyulater – back to top', menu: 'Menu', mainNav: 'Main navigation', legalNav: 'Legal', langSwitch: 'Choose language', scrollDown: 'Continue to services' },
    nav: { services: 'Services', process: 'Process', why: 'How we work', tech: 'Technology', faq: 'FAQ', contact: 'Contact' },
    hero: {
      eyebrow: 'IT services for businesses', tagline: 'Build the impossible.',
      title: 'Software, data and AI – cleanly integrated into your processes.',
      lead: 'Cyulater builds custom software, connects systems via APIs, creates reliable data pipelines and puts AI into productive use – complemented by Jira consulting and training for your team.',
      ctaPrimary: 'Book an initial call', ctaSecondary: 'View services',
      facts: ['Free initial consultation', 'Transparent quotes', 'Remote & on-site'],
    },
    services: { eyebrow: 'Services', title: 'What we offer', lead: 'Six interlocking areas of expertise – from the data source to the finished application.', items: servicesEn },
    process: {
      eyebrow: 'Process', title: 'A structured project approach', lead: 'Clear phases, traceable results and regular alignment.',
      steps: [
        { title: 'Initial call', text: 'We discuss goals, constraints and your existing system landscape – free of charge and without obligation.' },
        { title: 'Analysis & concept', text: 'Requirements, architecture and effort are documented. You receive a transparent quote.' },
        { title: 'Implementation', text: 'Iterative development in short cycles with regular reviews and sign-offs.' },
        { title: 'Handover & support', text: 'Documented handover, onboarding of your team and ongoing support on request.' },
      ],
    },
    why: {
      eyebrow: 'How we work', title: 'What you can rely on', lead: 'Principles that guide every project.',
      items: [
        { title: 'One dedicated contact', text: 'Direct communication – from the first conversation to the final handover.' },
        { title: 'Transparent costs', text: 'Comprehensible estimates and regular status reports.' },
        { title: 'End-to-end expertise', text: 'Software, interfaces, data and AI from a single source – no friction between vendors.' },
        { title: 'Documentation & knowledge transfer', text: 'Your team understands the solution and can run it independently.' },
        { title: 'Confidentiality', text: 'Careful handling of your data; non-disclosure agreements on request.' },
        { title: 'Sustainable technology', text: 'Proven, maintainable technologies – selected to fit your requirements.' },
      ],
    },
    tech: { eyebrow: 'Technology', title: 'Technology stack', lead: 'A selection – the exact combination depends on your project.', groups: techGroups(false) },
    faq: {
      eyebrow: 'FAQ', title: 'Frequently asked questions',
      items: [
        { q: 'Who does Cyulater work for?', a: 'Small and medium-sized businesses as well as departments of larger organisations that need targeted support in software development, data processing, AI or Jira.' },
        { q: 'How does a collaboration work?', a: 'After a free initial call you receive a concept with an effort estimate. Implementation is iterative with regular check-ins.' },
        { q: 'Can existing systems be integrated?', a: 'Yes. Integrating existing applications via APIs and data pipelines is one of Cyulater’s core areas.' },
        { q: 'Is Jira training remote or on-site?', a: 'Both are possible. Content and scope are tailored to your team and processes.' },
        { q: 'What does a project cost?', a: 'That depends on the scope. After the initial call you receive a transparent quote – time-and-materials or as a package.' },
      ],
    },
    contact: {
      eyebrow: 'Contact', title: 'Let’s talk about your project.', lead: 'Briefly describe your request. You will receive a prompt reply with suggested dates for a no-obligation initial call.',
      placeholderNote: '[Placeholder – insert real email address]',
      points: ['No-obligation initial call', 'Confidential handling of your request', 'German & English'],
      name: 'Name', email: 'Email', company: 'Company (optional)', topic: 'Topic', topicPlaceholder: 'Please select', topicOther: 'Other', message: 'Your message',
      privacy: 'I agree that my details will be used to process this request.',
      submit: 'Send request', required: 'Required',
      errName: 'Please enter your name.', errEmail: 'Please enter a valid email address.', errMessage: 'Please briefly describe your request.', errPrivacy: 'Please confirm your consent.',
      errSummary: 'Please check the highlighted fields.',
      success: 'Your email program has been opened. If not, please write directly to',
      hint: 'The request is sent via your email program. No form data is stored on this website.',
    },
    footer: { claim: 'Software · APIs · Data · AI · Jira', imprint: 'Legal notice', privacy: 'Privacy policy', placeholder: 'Placeholder – page still to be created' },
  },
};
