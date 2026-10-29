import { CatalogError, createJikanClient, toAnime } from '../jikan';
import { ANNOUNCED, FRIEREN, listResponse } from '../__fixtures__/jikan';

const response = (status: number, body: unknown = {}) =>
  ({ status, ok: status >= 200 && status < 300, json: async () => body }) as Response;

// A client on a fake clock: sleeping only advances the time and records the wait.
function setup(responses: (Response | Error)[]) {
  let time = 0;
  const waits: number[] = [];
  const urls: string[] = [];
  const fetch = jest.fn(async (url: string) => {
    urls.push(url);
    const next = responses.shift();
    if (!next) throw new Error('No response left');
    if (next instanceof Error) throw next;
    return next;
  });
  const client = createJikanClient({
    fetch: fetch as unknown as typeof globalThis.fetch,
    now: () => time,
    sleep: async (ms) => {
      waits.push(ms);
      time += ms;
    },
  });
  return { client, fetch, waits, urls };
}

describe('catalog model', () => {
  it('maps a complete entry', () => {
    expect(toAnime(FRIEREN)).toEqual({
      id: 52991,
      title: "Frieren: Beyond Journey's End",
      imageUrl: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg',
      synopsis: 'During their decade-long quest to defeat the Demon King, the members of the hero party bond.',
      genres: ['Adventure', 'Drama', 'Fantasy'],
      score: 9.3,
      year: 2023,
      startDate: { year: 2023, month: 9, day: 29 },
      endDate: { year: 2024, month: 3, day: 22 },
      episodes: 28,
      airingStatus: 'finished',
    });
  });

  it('marks missing information as null', () => {
    expect(toAnime(ANNOUNCED)).toMatchObject({
      title: 'Announced Sequel',
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
    const anime = toAnime({ ...ANNOUNCED, aired: { prop: { from: { day: null, month: 4, year: 2027 } } } });
    expect(anime.startDate).toEqual({ year: 2027, month: 4, day: null });
    expect(anime.year).toBe(2027);
  });
});

describe('jikan client', () => {
  it('searches with 12 results per page and leaves out empty filters', async () => {
    const { client, urls } = setup([response(200, listResponse([FRIEREN], true))]);
    const page = await client.searchAnime({ q: '', genres: 10, order_by: 'members', sort: 'desc' }, 2);
    expect(urls[0]).toBe('https://api.jikan.moe/v4/anime?genres=10&order_by=members&sort=desc&sfw=true&limit=12&page=2');
    expect(page.items.map((a) => a.id)).toEqual([52991]);
    expect(page.hasNextPage).toBe(true);
  });

  it('returns an empty page for no matches', async () => {
    const { client } = setup([response(200, listResponse([]))]);
    expect(await client.searchAnime({ q: 'zzzz' }, 1)).toEqual({ items: [], hasNextPage: false });
  });

  it('waits at least one second between requests', async () => {
    const { client, waits } = setup([200, 200, 200].map((s) => response(s, listResponse([]))));
    await Promise.all([1, 2, 3].map((page) => client.searchAnime({}, page)));
    expect(waits).toEqual([1000, 1000]);
  });

  it('shares one call for identical requests', async () => {
    const { client, fetch } = setup([response(200, { data: FRIEREN })]);
    const [a, b] = await Promise.all([client.getAnime(52991), client.getAnime(52991)]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it('pauses and retries after a rate limit', async () => {
    const { client, fetch, waits } = setup([response(429), response(200, { data: FRIEREN })]);
    expect((await client.getAnime(52991)).title).toBe("Frieren: Beyond Journey's End");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(waits).toEqual([2000]);
  });

  it('gives up after limited retries', async () => {
    const { client, fetch, waits } = setup([response(429), response(429), response(429)]);
    await expect(client.getAnime(1)).rejects.toMatchObject({ kind: 'rateLimit' });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([2000, 4000]);
  });

  it('reports missing titles, server errors and network failures', async () => {
    const { client } = setup([response(404), response(500), new TypeError('Network request failed')]);
    await expect(client.getAnime(1)).rejects.toMatchObject({ kind: 'notFound' });
    await expect(client.getAnime(2)).rejects.toMatchObject({ kind: 'server' });
    const failure = client.getAnime(3);
    await expect(failure).rejects.toBeInstanceOf(CatalogError);
    await expect(failure).rejects.toMatchObject({ kind: 'network' });
  });

  it('can request again after a failure', async () => {
    const { client } = setup([response(500), response(200, { data: FRIEREN })]);
    await expect(client.getAnime(52991)).rejects.toMatchObject({ kind: 'server' });
    expect((await client.getAnime(52991)).id).toBe(52991);
  });

  it('loads genres sorted by name', async () => {
    const { client, urls } = setup([
      response(200, { data: [{ mal_id: 10, name: 'Fantasy', count: 5 }, { mal_id: 1, name: 'Action', count: 9 }] }),
    ]);
    expect(await client.getGenres()).toEqual([
      { id: 1, name: 'Action', count: 9 },
      { id: 10, name: 'Fantasy', count: 5 },
    ]);
    expect(urls[0]).toBe('https://api.jikan.moe/v4/genres/anime?filter=genres');
  });
});
