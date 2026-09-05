interface EventItem {
  title: string;
  desc: string;
  veedel: string;
  types: string[];
  age: string[];
  date?: string;
  emoji?: string;
  instagramUrl?: string;
}

interface EventFilters {
  query: string;
  date: string;
  age: string;
  veedel: string;
  type: string;
}

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Required DOM element "#${id}" was not found.`);
  }

  return element as T;
};

const escapeHtml = (value: unknown): string => {
  const replacements: Readonly<Record<string, string>> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  };

  return String(value ?? '').replace(
    /[&<>'"]/g,
    (char) => replacements[char] ?? char,
  );
};

class EventRepository {
  async load(): Promise<EventItem[]> {
    return this.loadFromUrl('./data/events.json');
  }

  private async loadFromUrl(url: string): Promise<EventItem[]> {
    const response = await fetch(url, {
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') ?? '';

    if (!response.ok || !contentType.includes('application/json')) {
      throw new Error(
        `Could not load JSON from ${url} ` +
          `(HTTP ${response.status}, ${contentType || 'unknown content type'})`,
      );
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(`Expected an array of events from ${url}.`);
    }

    return data as EventItem[];
  }
}

class EventFilter {
  filter(events: readonly EventItem[], filters: EventFilters): EventItem[] {
    const normalizedQuery = filters.query.trim().toLocaleLowerCase('de-DE');

    return events.filter((event) => {
      const matchesQuery =
        normalizedQuery === '' ||
        this.buildSearchText(event).includes(normalizedQuery);

      const matchesDate =
        filters.date === '' ||
        !event.date ||
        event.date >= filters.date;

      const matchesAge =
        filters.age === '' ||
        event.age.includes(filters.age);

      const matchesVeedel =
        filters.veedel === '' ||
        event.veedel === filters.veedel;

      const matchesType =
        filters.type === '' ||
        event.types.includes(filters.type);

      return (
        matchesQuery &&
        matchesDate &&
        matchesAge &&
        matchesVeedel &&
        matchesType
      );
    });
  }

  private buildSearchText(event: EventItem): string {
    return [
      event.title,
      event.desc,
      event.veedel,
      ...event.types,
    ]
      .join(' ')
      .toLocaleLowerCase('de-DE');
  }
}

class EventView {
  private readonly queryInput =
    getElement<HTMLInputElement>('q');

  private readonly dateInput =
    getElement<HTMLInputElement>('date');

  private readonly ageSelect =
    getElement<HTMLSelectElement>('age');

  private readonly veedelSelect =
    getElement<HTMLSelectElement>('veedel');

  private readonly typeSelect =
    getElement<HTMLSelectElement>('type');

  private readonly countElement =
    getElement<HTMLElement>('count');

  private readonly gridElement =
    getElement<HTMLElement>('grid');

  private readonly resetButton =
    getElement<HTMLButtonElement>('reset');

  getFilters(): EventFilters {
    return {
      query: this.queryInput.value,
      date: this.dateInput.value,
      age: this.ageSelect.value,
      veedel: this.veedelSelect.value,
      type: this.typeSelect.value,
    };
  }

  bindFilterChange(handler: () => void): void {
    const elements: readonly (HTMLInputElement | HTMLSelectElement)[] = [
      this.queryInput,
      this.dateInput,
      this.ageSelect,
      this.veedelSelect,
      this.typeSelect,
    ];

    elements.forEach((element) => {
      element.addEventListener('input', handler);
    });
  }

  bindReset(handler: () => void): void {
    this.resetButton.addEventListener('click', () => {
      this.resetFilters();
      handler();
    });
  }

  populateFilters(events: readonly EventItem[]): void {
    this.addMissingOptions(
      this.veedelSelect,
      events.map((event) => event.veedel),
    );

    this.addMissingOptions(
      this.typeSelect,
      events.flatMap((event) => event.types),
    );
  }

  renderEvents(events: readonly EventItem[]): void {
    this.countElement.textContent = `${events.length} Termine`;

    this.gridElement.innerHTML = events.length > 0
      ? events.map((event) => this.renderEvent(event)).join('')
      : this.renderEmptyState();
  }

  renderLoadError(): void {
    this.countElement.textContent = '0 Termine';

    this.gridElement.innerHTML = `
      <div class="empty">
        <div style="font-size:42px">🐭</div>
        <h2>Termine konnten nicht geladen werden</h2>
        <p>Bitte versuche es später erneut.</p>
      </div>
    `;
  }

  private resetFilters(): void {
    this.queryInput.value = '';
    this.dateInput.value = '';
    this.ageSelect.value = '';
    this.veedelSelect.value = '';
    this.typeSelect.value = '';
  }

  private addMissingOptions(
    select: HTMLSelectElement,
    values: readonly string[],
  ): void {
    const existingValues = new Set(
      Array.from(select.options, (option) => option.value),
    );

    const uniqueValues = [...new Set(values)]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'de'));

    uniqueValues.forEach((value) => {
      if (existingValues.has(value)) {
        return;
      }

      select.add(new Option(value, value));
      existingValues.add(value);
    });
  }

  private renderEvent(event: EventItem): string {
  const primaryType = event.types[0] ?? 'Tipp';

  const details = event.instagramUrl
    ? `
      <a
        class="more"
        href="${escapeHtml(event.instagramUrl)}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Details zu ${escapeHtml(event.title)}"
      >
        Details →
      </a>
    `
    : '<span class="more">Details →</span>';

  const chips = event.types
    .map(
      (type) =>
        `<span class="chip">${escapeHtml(type)}</span>`,
    )
    .join('');

  return `
    <article class="card">
      <div class="visual">
        <span class="emoji" aria-hidden="true">
          ${escapeHtml(event.emoji ?? '')}
        </span>

        <span class="tag">
          ${escapeHtml(primaryType)}
        </span>
      </div>

      <div class="body">
        ${this.renderDate(event.date)}

        <h3 class="title">
          ${escapeHtml(event.title)}
        </h3>

        <p class="desc">
          ${escapeHtml(event.desc)}
        </p>

        <div class="chips" aria-label="Kategorien">
          ${chips}
        </div>
      </div>

      <footer class="footer">
        <span>
          <span aria-hidden="true">📍</span>
          ${escapeHtml(event.veedel)}
        </span>

        ${details}
      </footer>
    </article>
  `;
}

  private renderDate(date?: string): string {
  if (!date) {
    return '<p class="date">Termin siehe Instagram</p>';
  }

  const parsedDate = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return `<p class="date">${escapeHtml(date)}</p>`;
  }

  const formattedDate = parsedDate.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });

  return `
    <time
      class="date"
      datetime="${escapeHtml(date)}"
    >
      ${escapeHtml(formattedDate)}
    </time>
  `;
}

  private renderEmptyState(): string {
    return `
      <div class="empty">
        <div style="font-size:42px">🐭</div>
        <h2>Nichts gefunden</h2>
        <p>
          Probier einen anderen Filter oder setze die Auswahl zurück.
        </p>
      </div>
    `;
  }
}

class EventApplication {
  private events: EventItem[] = [];

  constructor(
    private readonly repository: EventRepository,
    private readonly filter: EventFilter,
    private readonly view: EventView,
  ) {}

  async initialize(): Promise<void> {
    this.bindEvents();

    try {
      this.events = await this.repository.load();

      this.view.populateFilters(this.events);
      this.render();
    } catch (error) {
      console.error('Failed to initialize events:', error);
      this.view.renderLoadError();
    }
  }

  private bindEvents(): void {
    this.view.bindFilterChange(() => this.render());
    this.view.bindReset(() => this.render());
  }

  private render(): void {
    const filters = this.view.getFilters();
    const filteredEvents = this.filter.filter(this.events, filters);

    this.view.renderEvents(filteredEvents);
  }
}

const app = new EventApplication(
  new EventRepository(),
  new EventFilter(),
  new EventView(),
);

void app.initialize();