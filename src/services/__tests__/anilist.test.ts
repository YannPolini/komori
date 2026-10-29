import { CatalogError, createAniListClient, toAnime } from '../anilist';
import { ANNOUNCED, FRIEREN, pageResponse } from '../__fixtures__/anilist';

const response = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  ({ status, ok: status >= 200 && status < 300, headers: new Headers(headers), json: async () => body }) as Response;

// A client on a fake clock: sleeping only advances the time and records the wait.
function setup(responses: (Response | Error)[]) {
  let time = 0;
  const waits: number[] = [];
  const bodies: { query: string; variables: Record<string, unknown> }[] = [];
  const fetch = jest.fn(async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(init.body as string));
    const next = responses.shift();
    if (!next) throw new Error('No response left');
    if (next instanceof Error) throw next;
    return next;
  });
  const client = createAniListClient({
    fetch: fetch as unknown as typeof globalThis.fetch,
    now: () => time,
    sleep: async (ms) => {
      waits.push(ms);
      time += ms;
    },
  });
  return { client, fetch, waits, bodies };
}

describe('catalog model', () => {
  it('maps a complete entry', () => {
    expect(toAnime(FRIEREN)).toEqual({
      id: 154587,
      title: 'Frieren: Beyond Journey’s End',
      imageUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-qQTzQnEJJ3oB.jpg',
      synopsis: 'The adventure is over but life goes on for an elf mage.\n\n(Source: Crunchyroll)',
      genres: ['Adventure', 'Drama', 'Fantasy'],
      score: 9.1,
      year: 2023,
      startDate: { year: 2023, month: 9, day: 29 },
      endDate: { year: 2024, month: 3, day: 22 },
      episodes: 28,
      airingStatus: 'finished',
    });
  });

  it('marks missing information as null and falls back to the romaji title', () => {
    expect(toAnime(ANNOUNCED)).toMatchObject({
      title: 'Sousou no Frieren 3rd Season',
      imageUrl: null,
      synopsis: null,
      genres: [],
      score: null,
      year: null,
      startDate: null,
      endDate: null,
      episodes: null,
      airingStatus: 'upcoming',
    });
  });

  it('keeps a partial premiere date', () => {
    const anime = toAnime({ ...ANNOUNCED, startDate: { year: 2027, month: 10, day: null } });
    expect(anime.startDate).toEqual({ year: 2027, month: 10, day: null });
    expect(anime.year).toBe(2027);
  });

  it('counts titles on hiatus as airing', () => {
    expect(toAnime({ ...FRIEREN, status: 'HIATUS' }).airingStatus).toBe('airing');
  });
});

describe('anilist client', () => {
  it('searches 12 titles per page and leaves out empty filters', async () => {
    const { client, bodies } = setup([response(200, pageResponse([FRIEREN], true))]);
    const page = await client.searchAnime({ search: '', genre: 'Fantasy', sort: ['POPULARITY_DESC'] }, 2);
    expect(bodies[0].variables).toEqual({ genre: 'Fantasy', sort: ['POPULARITY_DESC'], page: 2, perPage: 12 });
    expect(bodies[0].query).toContain('isAdult: false');
    expect(page.items.map((a) => a.id)).toEqual([154587]);
    expect(page.hasNextPage).toBe(true);
  });

  it('returns an empty page for no matches', async () => {
    const { client } = setup([response(200, pageResponse([]))]);
    expect(await client.searchAnime({ search: 'zzzz', sort: [] }, 1)).toEqual({ items: [], hasNextPage: false });
  });

  it('waits at least one second between requests', async () => {
    const { client, waits } = setup([1, 2, 3].map(() => response(200, pageResponse([]))));
    await Promise.all([1, 2, 3].map((page) => client.searchAnime({ sort: [] }, page)));
    expect(waits).toEqual([1000, 1000]);
  });

  it('shares one call for identical requests', async () => {
    const { client, fetch } = setup([response(200, { data: { Media: FRIEREN } })]);
    const [a, b] = await Promise.all([client.getAnime(154587), client.getAnime(154587)]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it('pauses for Retry-After after a rate limit and retries', async () => {
    const { client, fetch, waits } = setup([
      response(429, {}, { 'Retry-After': '5' }),
      response(200, { data: { Media: FRIEREN } }),
    ]);
    expect((await client.getAnime(154587)).id).toBe(154587);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(waits).toEqual([5000]);
  });

  it('gives up after limited retries', async () => {
    const { client, fetch, waits } = setup([response(429), response(429), response(429)]);
    await expect(client.getAnime(1)).rejects.toMatchObject({ kind: 'rateLimit' });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([2000, 4000]);
  });

  it('reports missing titles, server errors and network failures', async () => {
    const { client } = setup([
      response(404, { errors: [{ message: 'Not Found.', status: 404 }], data: { Media: null } }),
      response(500),
      response(200, { errors: [{ message: 'Validation error' }], data: null }),
      new TypeError('Network request failed'),
    ]);
    await expect(client.getAnime(1)).rejects.toMatchObject({ kind: 'notFound' });
    await expect(client.getAnime(2)).rejects.toMatchObject({ kind: 'server' });
    await expect(client.getAnime(3)).rejects.toMatchObject({ kind: 'server' });
    const failure = client.getAnime(4);
    await expect(failure).rejects.toBeInstanceOf(CatalogError);
    await expect(failure).rejects.toMatchObject({ kind: 'network' });
  });

  it('can request again after a failure', async () => {
    const { client } = setup([response(500), response(200, { data: { Media: FRIEREN } })]);
    await expect(client.getAnime(154587)).rejects.toMatchObject({ kind: 'server' });
    expect((await client.getAnime(154587)).id).toBe(154587);
  });

  it('loads genres sorted by name without adult genres', async () => {
    const { client } = setup([response(200, { data: { GenreCollection: ['Drama', 'Hentai', 'Action'] } })]);
    expect(await client.getGenres()).toEqual(['Action', 'Drama']);
  });
});
