export type Lang = 'de' | 'en';
export const LANGS: readonly Lang[] = ['de', 'en'] as const;
export const DEFAULT_LANG: Lang = 'de';

export type ServiceIcon = 'ai' | 'code' | 'api' | 'data' | 'etl' | 'jira';

export interface Option { id: string; label: string; }
export interface ServiceItem {
  icon: ServiceIcon; title: string; text: string; tags: string[];
  example: { problem: string; solution: string; outcome: string };
}

export interface Dict {
  meta: { title: string; description: string; ogLocale: string };
  a11y: { skip: string; home: string; menu: string; mainNav: string; legalNav: string; langSwitch: string; themeToLight: string; themeToDark: string; openPalette: string };
  nav: { services: string; demo: string; process: string; scoping: string; faq: string; contact: string };
  hero: { eyebrow: string; tagline: string; title: string; lead: string; ctaPrimary: string; ctaSecondary: string; facts: string[] };
  pipeline: {
    label: string; hint: string; sourcesTitle: string; coreTitle: string; targetsTitle: string;
    nodes: { id: string; label: string; desc: string }[];
  };
  services: { eyebrow: string; title: string; lead: string; exampleShow: string; exampleHide: string; exampleNote: string; problem: string; solution: string; outcome: string; items: ServiceItem[] };
  demo: {
    eyebrow: string; title: string; lead: string; note: string; request: string; response: string; send: string; sending: string; reset: string; status: string; latency: string; idle: string;
    endpoints: { id: string; label: string; desc: string }[];
  };
  process: { eyebrow: string; title: string; lead: string; resultLabel: string; steps: { title: string; text: string; result: string }[] };
  why: { eyebrow: string; title: string; lead: string; items: { title: string; text: string }[] };
  tech: { eyebrow: string; title: string; lead: string; groups: { title: string; items: string[] }[] };
  wizard: {
    eyebrow: string; title: string; lead: string; stepOf: string; back: string; next: string; submit: string; sending: string; restart: string;
    steps: string[];
    servicesQ: string; servicesErr: string;
    situationQ: string; situations: Option[];
    scopeQ: string; scopes: Option[]; timelineQ: string; timelines: Option[]; budgetQ: string; budgets: Option[];
    contactQ: string; message: string; summaryTitle: string; recommendation: string;
    recommendations: { training: string; poc: string; project: string; retainer: string };
    errRequired: string; sent: string; mailto: string; failed: string; failedLink: string;
  };
  faq: { eyebrow: string; title: string; items: { q: string; a: string }[] };
  contact: {
    eyebrow: string; title: string; lead: string; placeholderNote: string; points: string[];
    name: string; email: string; company: string; topic: string; topicPlaceholder: string; topicOther: string; message: string;
    privacy: string; submit: string; sending: string; required: string; errName: string; errEmail: string; errMessage: string; errPrivacy: string;
    errSummary: string; success: string; sent: string; failed: string; hint: string; hintEndpoint: string;
  };
  palette: { title: string; placeholder: string; empty: string; hint: string; groupNav: string; groupActions: string; actLang: string; actTheme: string; actWizard: string; actMail: string; actTop: string };
  footer: { claim: string; imprint: string; privacy: string; placeholder: string; shortcut: string };
}

export const TRANSLATIONS: Record<Lang, Dict> = {
  de: {
    meta: {
      title: 'Cyulater – KI, Softwareentwicklung, APIs, Data Engineering & Jira Consulting',
      description: 'Cyulater unterstützt Unternehmen bei KI-Lösungen, individueller Softwareentwicklung, Schnittstellenprogrammierung (APIs), Data Engineering, ETL-Prozessen sowie Jira Consulting und Schulungen.',
      ogLocale: 'de_DE',
    },
    a11y: { skip: 'Zum Inhalt springen', home: 'Cyulater – zum Seitenanfang', menu: 'Menü', mainNav: 'Hauptnavigation', legalNav: 'Rechtliches', langSwitch: 'Sprache wählen', themeToLight: 'Helles Design aktivieren', themeToDark: 'Dunkles Design aktivieren', openPalette: 'Schnellnavigation öffnen (Strg+K)' },
    nav: { services: 'Leistungen', demo: 'API-Demo', process: 'Vorgehen', scoping: 'Projekt-Check', faq: 'FAQ', contact: 'Kontakt' },
    hero: {
      eyebrow: 'IT-Dienstleistungen für Unternehmen', tagline: 'Build the impossible.',
      title: 'Ihre Daten, Systeme und KI – verbunden zu Prozessen, die funktionieren.',
      lead: 'Cyulater entwickelt individuelle Software, verbindet Systeme über APIs, baut verlässliche Datenpipelines und bringt KI produktiv zum Einsatz. Ergänzt durch Jira-Beratung und Schulungen für Ihr Team.',
      ctaPrimary: 'Projekt-Check starten', ctaSecondary: 'Leistungen ansehen',
      facts: ['Kostenloses Erstgespräch', 'Transparente Angebote', 'Remote & vor Ort'],
    },
    pipeline: {
      label: 'Interaktive Darstellung: Datenquellen werden über Cyulater in Zielsysteme integriert',
      hint: 'Element auswählen für Details',
      sourcesTitle: 'Quellen', coreTitle: 'Integration', targetsTitle: 'Ziele',
      nodes: [
        { id: 'erp', label: 'ERP / CRM', desc: 'Stamm- und Bewegungsdaten aus Ihren Kernsystemen – per API oder Datenbank-Anbindung.' },
        { id: 'api', label: 'Externe APIs', desc: 'Partner-, Shop- oder SaaS-Schnittstellen, sicher authentifiziert und versioniert.' },
        { id: 'files', label: 'Dateien', desc: 'CSV, Excel oder XML aus Fachabteilungen – automatisch eingelesen statt manuell kopiert.' },
        { id: 'core', label: 'Cyulater', desc: 'Extrahieren, validieren, transformieren, mit KI anreichern – überwacht und protokolliert.' },
        { id: 'dwh', label: 'Data Warehouse', desc: 'Konsistente, historisierte Daten als Grundlage für Auswertungen.' },
        { id: 'ai', label: 'KI-Assistent', desc: 'Wissensbasierte Antworten auf Basis Ihrer eigenen, geprüften Daten.' },
        { id: 'jira', label: 'Jira', desc: 'Vorgänge automatisch anlegen und aktualisieren – Teams arbeiten mit aktuellen Informationen.' },
      ],
    },
    services: {
      eyebrow: 'Leistungen', title: 'Leistungsspektrum', lead: 'Sechs Kompetenzfelder, die ineinandergreifen – von der Datenquelle bis zur fertigen Anwendung.',
      exampleShow: 'Beispielszenario ansehen', exampleHide: 'Beispielszenario ausblenden',
      exampleNote: 'Hypothetisches Beispiel zur Veranschaulichung', problem: 'Ausgangslage', solution: 'Lösungsansatz', outcome: 'Ziel',
      items: [
        { icon: 'ai', title: 'Künstliche Intelligenz', text: 'Integration von Large Language Models, wissensbasierte Assistenten (RAG) und Automatisierung von Routineaufgaben – dort, wo KI messbaren Nutzen bringt.', tags: ['LLM-Integration', 'RAG', 'Automatisierung'],
          example: { problem: 'Der Support beantwortet wiederkehrende Fragen manuell; das Wissen steckt verstreut in Handbüchern und Tickets.', solution: 'Ein KI-Assistent durchsucht freigegebene Dokumente, beantwortet Fragen mit Quellenangabe und übergibt Sonderfälle an Menschen.', outcome: 'Schnellere Antworten, entlastetes Team, nachvollziehbare Quellen.' } },
        { icon: 'code', title: 'Softwareentwicklung', text: 'Individuelle Web-Anwendungen und Backend-Services mit klarer Architektur, automatisierten Tests und nachvollziehbarer Dokumentation.', tags: ['Web-Anwendungen', 'Backend', 'Testing'],
          example: { problem: 'Ein zentraler Prozess läuft über gewachsene Excel-Listen mit Versionskonflikten.', solution: 'Eine schlanke Web-Anwendung mit Rollen, Validierung und Historie ersetzt die Listen schrittweise.', outcome: 'Eine verlässliche Datenbasis und weniger Abstimmungsaufwand.' } },
        { icon: 'api', title: 'Schnittstellen & APIs', text: 'Konzeption und Entwicklung von REST- und GraphQL-Schnittstellen sowie die Integration bestehender Systeme und Drittanbieter.', tags: ['REST', 'GraphQL', 'Systemintegration'],
          example: { problem: 'Bestellungen aus dem Onlineshop werden händisch ins ERP übertragen.', solution: 'Eine dokumentierte API-Integration synchronisiert Bestellungen und Status automatisch – mit Fehlerbehandlung und Wiederholungslogik.', outcome: 'Keine Doppelerfassung, aktuelle Status in beiden Systemen.' } },
        { icon: 'data', title: 'Data Engineering', text: 'Aufbau belastbarer Datenmodelle und Pipelines – für verlässliche, aktuelle und auswertbare Unternehmensdaten.', tags: ['Datenmodellierung', 'Pipelines', 'Datenqualität'],
          example: { problem: 'Kennzahlen unterscheiden sich je nach Abteilung, weil jede eigene Auswertungen pflegt.', solution: 'Ein zentrales Datenmodell mit einheitlichen Definitionen und automatischen Qualitätsprüfungen.', outcome: 'Eine gemeinsame Zahlenbasis für Entscheidungen.' } },
        { icon: 'etl', title: 'ETL-Prozesse', text: 'Automatisierte Extraktion, Transformation und Beladung von Daten – mit Monitoring, Fehlerbehandlung und Protokollierung.', tags: ['Orchestrierung', 'Monitoring', 'Automatisierung'],
          example: { problem: 'Nächtliche Importskripte brechen unbemerkt ab; Fehler fallen erst Tage später auf.', solution: 'Orchestrierte ETL-Jobs mit Abhängigkeiten, Alarmierung und Wiederanlauf.', outcome: 'Transparente Datenflüsse und frühzeitige Fehlererkennung.' } },
        { icon: 'jira', title: 'Jira Consulting & Schulungen', text: 'Einrichtung und Optimierung von Jira-Projekten, Workflows und Automatisierungen sowie praxisnahe Schulungen für Ihr Team.', tags: ['Workflows', 'Automatisierung', 'Schulungen'],
          example: { problem: 'Jedes Team nutzt Jira anders; Berichte sind kaum vergleichbar.', solution: 'Abgestimmte Workflows, Automatisierungsregeln und eine Schulung je Rolle.', outcome: 'Einheitliche Prozesse und aussagekräftige Übersichten.' } },
      ],
    },
    demo: {
      eyebrow: 'API-Demo', title: 'So fühlt sich eine saubere Schnittstelle an', lead: 'Wählen Sie einen Endpunkt und senden Sie eine Anfrage. Klar strukturierte Requests, verständliche Antworten, sprechende Statuscodes.',
      note: 'Demo – simulierte Antworten mit Beispieldaten, keine echte Verbindung.',
      request: 'Anfrage', response: 'Antwort', send: 'Anfrage senden', sending: 'Wird gesendet …', reset: 'Zurücksetzen', status: 'Status', latency: 'Dauer', idle: 'Noch keine Anfrage gesendet.',
      endpoints: [
        { id: 'orders', label: 'Daten abrufen', desc: 'Offene Bestellungen paginiert aus einem ERP lesen.' },
        { id: 'classify', label: 'KI-Klassifizierung', desc: 'Eine Kundenanfrage per KI einer Kategorie zuordnen.' },
        { id: 'issue', label: 'Jira-Vorgang', desc: 'Aus einer Anfrage automatisch einen Jira-Vorgang erzeugen.' },
      ],
    },
    process: {
      eyebrow: 'Vorgehen', title: 'Erst klären, dann investieren', lead: 'Klare Phasen mit definiertem Ergebnis. Nach jeder Phase entscheiden Sie, ob es weitergeht.', resultLabel: 'Ergebnis',
      steps: [
        { title: 'Erstgespräch', text: 'Ziele, Rahmenbedingungen und bestehende Systemlandschaft – unverbindlich und kostenfrei.', result: 'Gemeinsames Verständnis und Einschätzung der Machbarkeit.' },
        { title: 'Analyse & Konzept', text: 'Anforderungen, Architektur und Aufwand werden dokumentiert.', result: 'Konzept mit transparentem Angebot.' },
        { title: 'Umsetzung', text: 'Iterative Entwicklung in kurzen Zyklen mit regelmäßigen Zwischenständen.', result: 'Getestete, lauffähige Lösung.' },
        { title: 'Übergabe & Betreuung', text: 'Dokumentierte Übergabe, Einweisung Ihres Teams, auf Wunsch fortlaufender Support.', result: 'Ihr Team betreibt die Lösung eigenständig.' },
      ],
    },
    why: {
      eyebrow: 'Arbeitsweise', title: 'Worauf Sie sich verlassen können', lead: 'Grundsätze, nach denen jedes Projekt umgesetzt wird.',
      items: [
        { title: 'Ein fester Ansprechpartner', text: 'Direkte Kommunikation ohne Umwege – vom ersten Gespräch bis zur Übergabe.' },
        { title: 'Transparente Kosten', text: 'Nachvollziehbare Aufwandsschätzungen und regelmäßige Statusberichte.' },
        { title: 'Ganzheitliche Expertise', text: 'Software, Schnittstellen, Daten und KI aus einer Hand – ohne Reibungsverluste zwischen Dienstleistern.' },
        { title: 'Dokumentiert & übergeben', text: 'Architektur, Datenwege und Betrieb sind beschrieben. Ihr Team kann die Lösung eigenständig weiterführen.' },
        { title: 'Vertraulichkeit', text: 'Sorgfältiger Umgang mit Ihren Daten; Vertraulichkeitsvereinbarungen auf Wunsch.' },
        { title: 'Kein Lock-in', text: 'Bewährte, offene Technologien – Abhängigkeiten und Alternativen werden offengelegt.' },
      ],
    },
    tech: {
      eyebrow: 'Technologien', title: 'Technologie-Stack', lead: 'Eine Auswahl – die konkrete Kombination richtet sich nach Ihrem Projekt.',
      groups: [
        { title: 'Sprachen & Frameworks', items: ['TypeScript', 'Angular', 'Node.js', 'Python', 'Java'] },
        { title: 'Daten', items: ['SQL', 'PostgreSQL', 'Apache Airflow', 'Apache Spark'] },
        { title: 'KI', items: ['LLM-APIs', 'LangChain', 'RAG'] },
        { title: 'Integration & Betrieb', items: ['REST', 'GraphQL', 'Docker', 'Git', 'CI/CD'] },
        { title: 'Kollaboration', items: ['Jira', 'Confluence'] },
      ],
    },
    wizard: {
      eyebrow: 'Projekt-Check', title: 'Ihr Vorhaben in vier Schritten', lead: 'Beantworten Sie ein paar kurze Fragen. Daraus entsteht eine strukturierte Anfrage – und Sie erhalten eine erste Empfehlung für den Einstieg.',
      stepOf: 'Schritt {n} von {total}', back: 'Zurück', next: 'Weiter', submit: 'Anfrage absenden', sending: 'Wird gesendet …', restart: 'Neue Anfrage',
      steps: ['Themen', 'Ausgangslage', 'Umfang', 'Kontakt'],
      servicesQ: 'Um welche Themen geht es? (Mehrfachauswahl)', servicesErr: 'Bitte wählen Sie mindestens ein Thema.',
      situationQ: 'Wie ist die Ausgangslage?',
      situations: [
        { id: 'new', label: 'Neues Vorhaben' }, { id: 'extend', label: 'Bestehendes System erweitern' },
        { id: 'modernize', label: 'Modernisierung / Ablösung' }, { id: 'advice', label: 'Beratung oder Schulung' },
      ],
      scopeQ: 'Welche Art der Zusammenarbeit passt?',
      scopes: [
        { id: 'training', label: 'Workshop / Schulung' }, { id: 'poc', label: 'Proof of Concept' },
        { id: 'project', label: 'Umsetzungsprojekt' }, { id: 'retainer', label: 'Langfristige Begleitung' },
      ],
      timelineQ: 'Gewünschter Start',
      timelines: [ { id: 'asap', label: 'So bald wie möglich' }, { id: '1-3', label: 'In 1–3 Monaten' }, { id: '3-6', label: 'In 3–6 Monaten' }, { id: 'open', label: 'Noch offen' } ],
      budgetQ: 'Budgetrahmen (optional)',
      budgets: [ { id: '', label: 'Keine Angabe' }, { id: '<5k', label: 'bis 5.000 €' }, { id: '5-15k', label: '5.000 – 15.000 €' }, { id: '15-50k', label: '15.000 – 50.000 €' }, { id: '>50k', label: 'über 50.000 €' } ],
      contactQ: 'Wie erreichen wir Sie?', message: 'Kurze Beschreibung (optional)',
      summaryTitle: 'Zusammenfassung Ihrer Anfrage', recommendation: 'Empfohlener Einstieg',
      recommendations: {
        training: 'Ein kompakter Workshop, zugeschnitten auf Ihr Team und Ihre Werkzeuge.',
        poc: 'Ein kurzer Discovery-Workshop, gefolgt von einem eng abgegrenzten Proof of Concept.',
        project: 'Analyse & Konzept als erste Phase – mit Architektur, Aufwand und festem Angebot.',
        retainer: 'Ein Erstgespräch zur Priorisierung, danach ein flexibles Kontingent mit regelmäßigen Abstimmungen.',
      },
      errRequired: 'Bitte beantworten Sie die Pflichtfragen.',
      sent: 'Vielen Dank! Ihre Anfrage wurde übermittelt. Sie erhalten zeitnah eine Rückmeldung.',
      mailto: 'Ihr E-Mail-Programm wurde mit der vorbereiteten Anfrage geöffnet. Bitte senden Sie die E-Mail dort ab.',
      failed: 'Die Übermittlung ist fehlgeschlagen. Bitte senden Sie die Anfrage per E-Mail:', failedLink: 'Anfrage per E-Mail senden',
    },
    faq: {
      eyebrow: 'FAQ', title: 'Häufige Fragen',
      items: [
        { q: 'Für welche Unternehmen arbeitet Cyulater?', a: 'Für kleine und mittlere Unternehmen sowie für Fachabteilungen größerer Organisationen, die gezielte Unterstützung in Softwareentwicklung, Datenverarbeitung, KI oder Jira benötigen.' },
        { q: 'Wie läuft eine Zusammenarbeit ab?', a: 'Nach einem kostenlosen Erstgespräch erhalten Sie ein Konzept mit Aufwandsschätzung. Die Umsetzung erfolgt iterativ; nach jeder Phase entscheiden Sie über den nächsten Schritt.' },
        { q: 'Können bestehende Systeme angebunden werden?', a: 'Ja. Die Integration bestehender Anwendungen über Schnittstellen und Datenpipelines ist ein Kernbereich von Cyulater.' },
        { q: 'Wem gehören Code und Dokumentation?', a: 'Was im Angebot vereinbart ist, erhalten Sie vollständig: Quellcode, Konfiguration und Dokumentation inklusive der vereinbarten Nutzungsrechte.' },
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
      submit: 'Anfrage senden', sending: 'Wird gesendet …', required: 'Pflichtfeld',
      errName: 'Bitte geben Sie Ihren Namen an.', errEmail: 'Bitte geben Sie eine gültige E-Mail-Adresse an.', errMessage: 'Bitte beschreiben Sie kurz Ihr Anliegen (mind. 10 Zeichen).', errPrivacy: 'Bitte bestätigen Sie die Einwilligung.',
      errSummary: 'Bitte prüfen Sie die markierten Felder.',
      success: 'Ihr E-Mail-Programm wurde geöffnet. Falls nicht, schreiben Sie bitte direkt an',
      sent: 'Vielen Dank! Ihre Anfrage wurde übermittelt.',
      failed: 'Die Übermittlung ist fehlgeschlagen. Bitte schreiben Sie direkt an',
      hint: 'Der Versand erfolgt über Ihr E-Mail-Programm. Auf dieser Website werden keine Formulardaten gespeichert.',
      hintEndpoint: 'Ihre Angaben werden ausschließlich zur Bearbeitung Ihrer Anfrage übermittelt.',
    },
    palette: { title: 'Schnellnavigation', placeholder: 'Wohin möchten Sie? Suchen …', empty: 'Keine Treffer', hint: '↑↓ auswählen · Enter öffnen · Esc schließen', groupNav: 'Bereiche', groupActions: 'Aktionen', actLang: 'Switch to English', actTheme: 'Design wechseln (hell/dunkel)', actWizard: 'Projekt-Check starten', actMail: 'E-Mail schreiben', actTop: 'Zum Seitenanfang' },
    footer: { claim: 'Software · APIs · Data · KI · Jira', imprint: 'Impressum', privacy: 'Datenschutz', placeholder: 'Platzhalter – Seite noch anlegen', shortcut: 'Tipp: Strg+K öffnet die Schnellnavigation' },
  },
  en: {
    meta: {
      title: 'Cyulater – AI, Software Development, APIs, Data Engineering & Jira Consulting',
      description: 'Cyulater supports companies with AI solutions, custom software development, API development, data engineering, ETL processes as well as Jira consulting and training.',
      ogLocale: 'en_US',
    },
    a11y: { skip: 'Skip to content', home: 'Cyulater – back to top', menu: 'Menu', mainNav: 'Main navigation', legalNav: 'Legal', langSwitch: 'Choose language', themeToLight: 'Switch to light theme', themeToDark: 'Switch to dark theme', openPalette: 'Open quick navigation (Ctrl+K)' },
    nav: { services: 'Services', demo: 'API demo', process: 'Process', scoping: 'Project check', faq: 'FAQ', contact: 'Contact' },
    hero: {
      eyebrow: 'IT services for businesses', tagline: 'Build the impossible.',
      title: 'Your data, systems and AI – connected into processes that work.',
      lead: 'Cyulater builds custom software, connects systems via APIs, creates reliable data pipelines and puts AI into productive use – complemented by Jira consulting and training for your team.',
      ctaPrimary: 'Start project check', ctaSecondary: 'View services',
      facts: ['Free initial consultation', 'Transparent quotes', 'Remote & on-site'],
    },
    pipeline: {
      label: 'Interactive diagram: data sources are integrated into target systems via Cyulater',
      hint: 'Select an element for details',
      sourcesTitle: 'Sources', coreTitle: 'Integration', targetsTitle: 'Targets',
      nodes: [
        { id: 'erp', label: 'ERP / CRM', desc: 'Master and transaction data from your core systems – via API or database connection.' },
        { id: 'api', label: 'External APIs', desc: 'Partner, shop or SaaS interfaces – securely authenticated and versioned.' },
        { id: 'files', label: 'Files', desc: 'CSV, Excel or XML from business units – ingested automatically instead of copied by hand.' },
        { id: 'core', label: 'Cyulater', desc: 'Extract, validate, transform, enrich with AI – monitored and logged.' },
        { id: 'dwh', label: 'Data warehouse', desc: 'Consistent, historised data as the foundation for analytics.' },
        { id: 'ai', label: 'AI assistant', desc: 'Knowledge-based answers grounded in your own, verified data.' },
        { id: 'jira', label: 'Jira', desc: 'Create and update issues automatically – teams work with current information.' },
      ],
    },
    services: {
      eyebrow: 'Services', title: 'What we offer', lead: 'Six interlocking areas of expertise – from the data source to the finished application.',
      exampleShow: 'Show example scenario', exampleHide: 'Hide example scenario',
      exampleNote: 'Hypothetical example for illustration', problem: 'Situation', solution: 'Approach', outcome: 'Goal',
      items: [
        { icon: 'ai', title: 'Artificial Intelligence', text: 'Integration of large language models, knowledge-based assistants (RAG) and automation of routine tasks – wherever AI delivers measurable value.', tags: ['LLM integration', 'RAG', 'Automation'],
          example: { problem: 'Support answers recurring questions manually; knowledge is scattered across manuals and tickets.', solution: 'An AI assistant searches approved documents, answers with source references and hands special cases to humans.', outcome: 'Faster answers, a relieved team, traceable sources.' } },
        { icon: 'code', title: 'Software Development', text: 'Custom web applications and backend services with a clear architecture, automated tests and comprehensible documentation.', tags: ['Web applications', 'Backend', 'Testing'],
          example: { problem: 'A core process runs on grown Excel sheets with version conflicts.', solution: 'A lean web application with roles, validation and history gradually replaces the sheets.', outcome: 'A reliable data foundation and less coordination effort.' } },
        { icon: 'api', title: 'Interfaces & APIs', text: 'Design and development of REST and GraphQL APIs, plus integration of existing systems and third-party services.', tags: ['REST', 'GraphQL', 'System integration'],
          example: { problem: 'Orders from the online shop are transferred to the ERP by hand.', solution: 'A documented API integration synchronises orders and status automatically – with error handling and retry logic.', outcome: 'No double entry, current status in both systems.' } },
        { icon: 'data', title: 'Data Engineering', text: 'Robust data models and pipelines – for reliable, up-to-date and analysable business data.', tags: ['Data modelling', 'Pipelines', 'Data quality'],
          example: { problem: 'KPIs differ between departments because each maintains its own reports.', solution: 'A central data model with shared definitions and automated quality checks.', outcome: 'One common set of numbers for decisions.' } },
        { icon: 'etl', title: 'ETL Processes', text: 'Automated extraction, transformation and loading of data – with monitoring, error handling and logging.', tags: ['Orchestration', 'Monitoring', 'Automation'],
          example: { problem: 'Nightly import scripts fail silently; errors surface days later.', solution: 'Orchestrated ETL jobs with dependencies, alerting and restart capability.', outcome: 'Transparent data flows and early error detection.' } },
        { icon: 'jira', title: 'Jira Consulting & Training', text: 'Setup and optimisation of Jira projects, workflows and automations, plus hands-on training for your team.', tags: ['Workflows', 'Automation', 'Training'],
          example: { problem: 'Every team uses Jira differently; reports are hardly comparable.', solution: 'Aligned workflows, automation rules and role-based training.', outcome: 'Consistent processes and meaningful overviews.' } },
      ],
    },
    demo: {
      eyebrow: 'API demo', title: 'What a clean interface feels like', lead: 'Pick an endpoint and send a request. Clearly structured requests, readable responses, meaningful status codes.',
      note: 'Demo – simulated responses with sample data, no real connection.',
      request: 'Request', response: 'Response', send: 'Send request', sending: 'Sending …', reset: 'Reset', status: 'Status', latency: 'Duration', idle: 'No request sent yet.',
      endpoints: [
        { id: 'orders', label: 'Fetch data', desc: 'Read open orders from an ERP, paginated.' },
        { id: 'classify', label: 'AI classification', desc: 'Assign a customer request to a category using AI.' },
        { id: 'issue', label: 'Jira issue', desc: 'Automatically create a Jira issue from a request.' },
      ],
    },
    process: {
      eyebrow: 'Process', title: 'Clarify first, then invest', lead: 'Clear phases with a defined result. After each phase you decide whether to continue.', resultLabel: 'Result',
      steps: [
        { title: 'Initial call', text: 'Goals, constraints and existing system landscape – free of charge and without obligation.', result: 'Shared understanding and a feasibility assessment.' },
        { title: 'Analysis & concept', text: 'Requirements, architecture and effort are documented.', result: 'Concept with a transparent quote.' },
        { title: 'Implementation', text: 'Iterative development in short cycles with regular reviews.', result: 'A tested, working solution.' },
        { title: 'Handover & support', text: 'Documented handover, onboarding of your team, ongoing support on request.', result: 'Your team runs the solution independently.' },
      ],
    },
    why: {
      eyebrow: 'How we work', title: 'What you can rely on', lead: 'Principles that guide every project.',
      items: [
        { title: 'One dedicated contact', text: 'Direct communication – from the first conversation to the final handover.' },
        { title: 'Transparent costs', text: 'Comprehensible estimates and regular status reports.' },
        { title: 'End-to-end expertise', text: 'Software, interfaces, data and AI from a single source – no friction between vendors.' },
        { title: 'Documented & handed over', text: 'Architecture, data flows and operations are documented. Your team can carry the solution forward independently.' },
        { title: 'Confidentiality', text: 'Careful handling of your data; non-disclosure agreements on request.' },
        { title: 'No lock-in', text: 'Proven, open technologies – dependencies and alternatives are made transparent.' },
      ],
    },
    tech: {
      eyebrow: 'Technology', title: 'Technology stack', lead: 'A selection – the exact combination depends on your project.',
      groups: [
        { title: 'Languages & frameworks', items: ['TypeScript', 'Angular', 'Node.js', 'Python', 'Java'] },
        { title: 'Data', items: ['SQL', 'PostgreSQL', 'Apache Airflow', 'Apache Spark'] },
        { title: 'AI', items: ['LLM APIs', 'LangChain', 'RAG'] },
        { title: 'Integration & operations', items: ['REST', 'GraphQL', 'Docker', 'Git', 'CI/CD'] },
        { title: 'Collaboration', items: ['Jira', 'Confluence'] },
      ],
    },
    wizard: {
      eyebrow: 'Project check', title: 'Your project in four steps', lead: 'Answer a few short questions. The result is a structured request – plus a first recommendation on how to get started.',
      stepOf: 'Step {n} of {total}', back: 'Back', next: 'Next', submit: 'Submit request', sending: 'Sending …', restart: 'New request',
      steps: ['Topics', 'Situation', 'Scope', 'Contact'],
      servicesQ: 'Which topics are involved? (multiple choice)', servicesErr: 'Please select at least one topic.',
      situationQ: 'What is the current situation?',
      situations: [
        { id: 'new', label: 'New initiative' }, { id: 'extend', label: 'Extend an existing system' },
        { id: 'modernize', label: 'Modernisation / replacement' }, { id: 'advice', label: 'Consulting or training' },
      ],
      scopeQ: 'Which type of engagement fits?',
      scopes: [
        { id: 'training', label: 'Workshop / training' }, { id: 'poc', label: 'Proof of concept' },
        { id: 'project', label: 'Implementation project' }, { id: 'retainer', label: 'Long-term support' },
      ],
      timelineQ: 'Preferred start',
      timelines: [ { id: 'asap', label: 'As soon as possible' }, { id: '1-3', label: 'In 1–3 months' }, { id: '3-6', label: 'In 3–6 months' }, { id: 'open', label: 'Not decided yet' } ],
      budgetQ: 'Budget range (optional)',
      budgets: [ { id: '', label: 'Not specified' }, { id: '<5k', label: 'up to €5,000' }, { id: '5-15k', label: '€5,000 – €15,000' }, { id: '15-50k', label: '€15,000 – €50,000' }, { id: '>50k', label: 'over €50,000' } ],
      contactQ: 'How can we reach you?', message: 'Short description (optional)',
      summaryTitle: 'Summary of your request', recommendation: 'Recommended starting point',
      recommendations: {
        training: 'A compact workshop tailored to your team and tools.',
        poc: 'A short discovery workshop followed by a tightly scoped proof of concept.',
        project: 'Analysis & concept as the first phase – with architecture, effort and a fixed quote.',
        retainer: 'An initial call to prioritise, then a flexible budget with regular check-ins.',
      },
      errRequired: 'Please answer the required questions.',
      sent: 'Thank you! Your request has been submitted. You will receive a reply shortly.',
      mailto: 'Your email program has been opened with the prepared request. Please send the email from there.',
      failed: 'Submission failed. Please send your request by email:', failedLink: 'Send request by email',
    },
    faq: {
      eyebrow: 'FAQ', title: 'Frequently asked questions',
      items: [
        { q: 'Who does Cyulater work for?', a: 'Small and medium-sized businesses as well as departments of larger organisations that need targeted support in software development, data processing, AI or Jira.' },
        { q: 'How does a collaboration work?', a: 'After a free initial call you receive a concept with an effort estimate. Implementation is iterative; after each phase you decide on the next step.' },
        { q: 'Can existing systems be integrated?', a: 'Yes. Integrating existing applications via APIs and data pipelines is one of Cyulater’s core areas.' },
        { q: 'Who owns the code and documentation?', a: 'You receive everything agreed in the quote: source code, configuration and documentation, including the agreed usage rights.' },
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
      submit: 'Send request', sending: 'Sending …', required: 'Required',
      errName: 'Please enter your name.', errEmail: 'Please enter a valid email address.', errMessage: 'Please briefly describe your request (min. 10 characters).', errPrivacy: 'Please confirm your consent.',
      errSummary: 'Please check the highlighted fields.',
      success: 'Your email program has been opened. If not, please write directly to',
      sent: 'Thank you! Your request has been submitted.',
      failed: 'Submission failed. Please write directly to',
      hint: 'The request is sent via your email program. No form data is stored on this website.',
      hintEndpoint: 'Your details are transmitted solely to process your request.',
    },
    palette: { title: 'Quick navigation', placeholder: 'Where to? Search …', empty: 'No results', hint: '↑↓ select · Enter open · Esc close', groupNav: 'Sections', groupActions: 'Actions', actLang: 'Auf Deutsch wechseln', actTheme: 'Toggle theme (light/dark)', actWizard: 'Start project check', actMail: 'Write an email', actTop: 'Back to top' },
    footer: { claim: 'Software · APIs · Data · AI · Jira', imprint: 'Legal notice', privacy: 'Privacy policy', placeholder: 'Placeholder – page still to be created', shortcut: 'Tip: Ctrl+K opens quick navigation' },
  },
};
