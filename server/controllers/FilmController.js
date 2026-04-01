const { Film, Cinema } = require('../models/models');
const { STATIC_CINEMAS } = require('../data/staticCinemas');

const fetchFn = global.fetch;

const KP_BASE = 'https://kinopoiskapiunofficial.tech/api';
const KP_TOP_TYPE = 'TOP_250_BEST_FILMS';
const KP_TOP_MAX_PAGES = 13;

const topPageCache = new Map();
const TOP_CACHE_TTL_MS = 10 * 60 * 1000;
const weeklyFilmsCache = new Map();
const genreFilmsCache = new Map();
const GENRE_CACHE_TTL_MS = 10 * 60 * 1000;
const premieresCache = new Map();
const PREMIERES_CACHE_TTL_MS = 10 * 60 * 1000;
const locationsCache = new Map();
const LOCATIONS_CACHE_TTL_MS = 60 * 60 * 1000;

function getKpApiKey() {
    return process.env.KINOPOISK_API_KEY;
}

async function kpFetchJson(path) {
    const apiKey = getKpApiKey();
    if (!apiKey) {
        const err = new Error('KINOPOISK_API_KEY is not configured');
        err.status = 500;
        throw err;
    }
    if (!fetchFn) {
        const err = new Error('fetch is not available in this Node.js runtime');
        err.status = 500;
        throw err;
    }

    const url = `${KP_BASE}${path}`;
    const response = await fetchFn(url, {
        headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const text = await response.text();
        const err = new Error(`Kinopoisk API error: ${text || response.status}`);
        err.status = 502;
        throw err;
    }

    return response.json();
}

async function geocodeLocationNominatim(query) {
    if (!fetchFn) {
        const err = new Error('fetch is not available in this Node.js runtime');
        err.status = 500;
        throw err;
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
    )}&limit=1&accept-language=ru`;

    const response = await fetchFn(url, {
        headers: {
            'User-Agent': 'afisha-mirea/1.0 (contact@example.com)',
            'Accept-Language': 'ru'
        }
    });

    if (!response.ok) {
        const text = await response.text();
        const err = new Error(`Nominatim error: ${text || response.status}`);
        err.status = 502;
        throw err;
    }

    const data = await response.json();
    if (!Array.isArray(data) || !data.length) {
        return null;
    }

    const best = data[0];
    const lat = parseFloat(best.lat);
    const lon = parseFloat(best.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
    }

    return { latitude: lat, longitude: lon };
}

function toNumber(value) {
    if (value == null) return null;
    const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

function toInt(value) {
    if (value == null) return null;
    const n = typeof value === 'number' ? value : parseInt(String(value), 10);
    return Number.isFinite(n) ? n : null;
}

function normalizeCountryKey(countryName) {
    return String(countryName || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
}

function normalizeImdbId(value) {
    const raw = String(value || '').trim();
    const m = raw.match(/tt\d{7,8}/i);
    return m ? m[0].toLowerCase() : '';
}

async function fetchJson(url, headers = {}) {
    if (!fetchFn) {
        const err = new Error('fetch is not available in this Node.js runtime');
        err.status = 500;
        throw err;
    }
    const resp = await fetchFn(url, { headers });
    if (!resp.ok) {
        const text = await resp.text();
        const err = new Error(text || `HTTP ${resp.status}`);
        err.status = resp.status;
        throw err;
    }
    return resp.json();
}

function parseWikidataPoint(wktPoint) {
    // format: "Point(37.6173 55.7558)" => lon lat
    const m = String(wktPoint || '').match(/Point\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (!m) return null;
    const lon = parseFloat(m[1]);
    const lat = parseFloat(m[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { latitude: lat, longitude: lon };
}

async function fetchWikidataFilmingLocationsByImdbId(imdbId) {
    const id = normalizeImdbId(imdbId);
    if (!id) return [];

    const query = `
SELECT ?placeLabel ?placeDescription ?coord ?place WHERE {
  ?film wdt:P345 "${id}".
  OPTIONAL { ?film wdt:P915 ?place. }
  OPTIONAL { ?place wdt:P625 ?coord. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ru,en". }
}`.trim();

    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
    const data = await fetchJson(url, {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'afisha-mirea/1.0 (educational project)'
    });

    const bindings = Array.isArray(data?.results?.bindings) ? data.results.bindings : [];
    const items = bindings
        .map((b) => {
            const label = b?.placeLabel?.value || '';
            const descr = b?.placeDescription?.value || '';
            const coord = parseWikidataPoint(b?.coord?.value);
            if (!label || !coord) return null;
            return {
                name: label,
                description: descr,
                latitude: coord.latitude,
                longitude: coord.longitude
            };
        })
        .filter(Boolean);

    // unique by name+coords
    const seen = new Set();
    const unique = [];
    for (const it of items) {
        const k = `${it.name}|${it.latitude.toFixed(6)}|${it.longitude.toFixed(6)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        unique.push(it);
    }
    return unique.slice(0, 25);
}

async function fetchWikidataFilmQidByTitleYear(title, year) {
    const q = String(title || '').trim();
    if (!q) return '';
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
        q
    )}&language=ru&format=json&limit=10`;

    const data = await fetchJson(searchUrl, {
        'Accept': 'application/json',
        'User-Agent': 'afisha-mirea/1.0 (educational project)'
    });

    const results = Array.isArray(data?.search) ? data.search : [];
    // Best-effort: take the top result; refine by year via SPARQL later.
    return results[0]?.id || '';
}

async function fetchWikidataFilmingLocationsByQid(qid) {
    const id = String(qid || '').trim();
    if (!id) return [];

    const query = `
SELECT ?placeLabel ?placeDescription ?coord WHERE {
  wd:${id} wdt:P915 ?place.
  ?place wdt:P625 ?coord.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ru,en". }
}`.trim();

    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
    const data = await fetchJson(url, {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'afisha-mirea/1.0 (educational project)'
    });

    const bindings = Array.isArray(data?.results?.bindings) ? data.results.bindings : [];
    const items = bindings
        .map((b) => {
            const label = b?.placeLabel?.value || '';
            const descr = b?.placeDescription?.value || '';
            const coord = parseWikidataPoint(b?.coord?.value);
            if (!label || !coord) return null;
            return {
                name: label,
                description: descr,
                latitude: coord.latitude,
                longitude: coord.longitude
            };
        })
        .filter(Boolean);

    const seen = new Set();
    const unique = [];
    for (const it of items) {
        const k = `${it.name}|${it.latitude.toFixed(6)}|${it.longitude.toFixed(6)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        unique.push(it);
    }
    return unique.slice(0, 25);
}

// Координаты взяты вручную (центры/столицы) чтобы не зависеть от Nominatim.
// Используем нормализованные ключи через normalizeCountryKey().
const COUNTRY_COORDS = {
    // USA
    'сша': { latitude: 38.9072, longitude: -77.0369 },
    'united states': { latitude: 38.9072, longitude: -77.0369 },
    'united states of america': { latitude: 38.9072, longitude: -77.0369 },
    'usa': { latitude: 38.9072, longitude: -77.0369 },
    'us': { latitude: 38.9072, longitude: -77.0369 },

    // Russia
    'россия': { latitude: 55.7558, longitude: 37.6173 },
    'russia': { latitude: 55.7558, longitude: 37.6173 },

    // UK
    'великобритания': { latitude: 51.5072, longitude: -0.1276 },
    'united kingdom': { latitude: 51.5072, longitude: -0.1276 },
    'uk': { latitude: 51.5072, longitude: -0.1276 },

    // Germany
    'германия': { latitude: 52.52, longitude: 13.405 },
    'germany': { latitude: 52.52, longitude: 13.405 },

    // France
    'франция': { latitude: 48.8566, longitude: 2.3522 },
    'france': { latitude: 48.8566, longitude: 2.3522 },

    // Italy
    'италия': { latitude: 41.9028, longitude: 12.4964 },
    'italy': { latitude: 41.9028, longitude: 12.4964 },

    // Spain
    'испания': { latitude: 40.4168, longitude: -3.7038 },
    'spain': { latitude: 40.4168, longitude: -3.7038 },

    // Canada
    'канада': { latitude: 45.4215, longitude: -75.6972 },
    'canada': { latitude: 45.4215, longitude: -75.6972 },

    // China
    'китай': { latitude: 39.9042, longitude: 116.4074 },
    'china': { latitude: 39.9042, longitude: 116.4074 },

    // Japan
    'япония': { latitude: 35.6762, longitude: 139.6503 },
    'japan': { latitude: 35.6762, longitude: 139.6503 },

    // India
    'индия': { latitude: 28.6139, longitude: 77.209 },
    'india': { latitude: 28.6139, longitude: 77.209 },

    // Brazil
    'бразилия': { latitude: -15.7939, longitude: -47.8828 },
    'brazil': { latitude: -15.7939, longitude: -47.8828 },

    // Mexico
    'мексика': { latitude: 19.4326, longitude: -99.1332 },
    'mexico': { latitude: 19.4326, longitude: -99.1332 },

    // Australia
    'австралия': { latitude: -35.2809, longitude: 149.13 },
    'australia': { latitude: -35.2809, longitude: 149.13 },

    // Turkey
    'турция': { latitude: 39.9334, longitude: 32.8597 },
    'turkey': { latitude: 39.9334, longitude: 32.8597 },

    // Ukraine / Belarus
    'украина': { latitude: 50.4501, longitude: 30.5234 },
    'ukraine': { latitude: 50.4501, longitude: 30.5234 },
    'беларусь': { latitude: 53.9006, longitude: 27.559 },
    'belarus': { latitude: 53.9006, longitude: 27.559 },

    // Netherlands / Sweden / Norway / Finland
    'нидерланды': { latitude: 52.3676, longitude: 4.9041 },
    'netherlands': { latitude: 52.3676, longitude: 4.9041 },
    'швеция': { latitude: 59.3293, longitude: 18.0686 },
    'sweden': { latitude: 59.3293, longitude: 18.0686 },
    'норвегия': { latitude: 59.9139, longitude: 10.7522 },
    'norway': { latitude: 59.9139, longitude: 10.7522 },
    'финляндия': { latitude: 60.1699, longitude: 24.9384 },
    'finland': { latitude: 60.1699, longitude: 24.9384 },

    // Poland / Czechia
    'польша': { latitude: 52.2297, longitude: 21.0122 },
    'poland': { latitude: 52.2297, longitude: 21.0122 },
    'чехия': { latitude: 50.0755, longitude: 14.4378 },
    'czechia': { latitude: 50.0755, longitude: 14.4378 },

    // Austria / Switzerland
    'австрия': { latitude: 48.2082, longitude: 16.3738 },
    'austria': { latitude: 48.2082, longitude: 16.3738 },
    'швейцария': { latitude: 46.948, longitude: 7.4474 },
    'switzerland': { latitude: 46.948, longitude: 7.4474 },

    // Israel
    'израиль': { latitude: 31.7683, longitude: 35.2137 },
    'israel': { latitude: 31.7683, longitude: 35.2137 }
}

function mapTopFilmItem(item) {
    const kpId = item?.filmId ?? item?.kinopoiskId ?? item?.id;
    return {
        id: kpId,
        kinopoiskId: kpId,
        title: item?.nameRu || item?.nameEn || item?.nameOriginal || 'Без названия',
        posterUrl: item?.posterUrl || item?.posterUrlPreview || null,
        rating: toNumber(item?.rating) ?? 0,
        genres: Array.isArray(item?.genres) ? item.genres.map(g => g?.genre).filter(Boolean) : []
    };
}

function mapFilmDetails(details, staff) {
    const kpId = details?.kinopoiskId ?? details?.filmId ?? details?.id;
    const year = toInt(details?.year);
    const releaseDate = details?.premiereRu
        ? details.premiereRu
        : year
            ? `${year}-01-01`
            : null;

    const directors = Array.isArray(staff)
        ? staff.filter(p => p?.professionKey === 'DIRECTOR').map(p => p?.nameRu || p?.nameEn).filter(Boolean)
        : [];
    const actorItems = Array.isArray(staff)
        ? staff
            .filter(p => p?.professionKey === 'ACTOR')
            .map(p => ({
                id: p?.staffId ?? p?.personId ?? null,
                name: p?.nameRu || p?.nameEn || null
            }))
            .filter(p => p.name)
            .slice(0, 15)
        : [];

    return {
        id: kpId,
        kinopoiskId: kpId,
        title: details?.nameRu || details?.nameEn || details?.nameOriginal || 'Без названия',
        description: details?.description || details?.shortDescription || '',
        posterUrl: details?.posterUrl || details?.posterUrlPreview || null,
        releaseDate,
        rating: toNumber(details?.ratingKinopoisk) ?? toNumber(details?.ratingImdb) ?? 0,
        genres: Array.isArray(details?.genres) ? details.genres.map(g => g?.genre).filter(Boolean) : [],
        director: directors.length ? directors.join(', ') : null,
        actors: actorItems.map(a => a.name),
        actorList: actorItems,
        duration: toInt(details?.filmLength),
    };
}

exports.createFilm = async (req, res) => {
    try {
        const newFilm = await Film.create(req.body);
        res.status(201).json({ message: 'Фильм успешно создан', film: newFilm });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при создании фильма', error });
    }
};

exports.getFilm = async (req, res) => {
    try {
        const filmId = req.params.filmId;
        let film = await Film.findByPk(filmId);
        if (!film) {
            film = await Film.findOne({ where: { kinopoiskId: filmId } });
        }
        if (!film) {
            return res.status(404).json({ message: 'Фильм не найден' });
        }
        res.json(film);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении фильма', error });
    }
};

exports.getAllFilms = async (req, res) => {
    try {
        const films = await Film.findAll();
        res.json(films);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении фильмов', error });
    }
};

exports.getCinemasForFilm = async (req, res) => {
    try {
        const filmId = req.params.filmId;

        let cinemasForFilm = [];

        try {
            let film = await Film.findByPk(filmId, {
                include: [
                    {
                        model: Cinema,
                        through: { attributes: [] }
                    }
                ]
            });

            if (!film) {
                film = await Film.findOne({
                    where: { kinopoiskId: filmId },
                    include: [
                        {
                            model: Cinema,
                            through: { attributes: [] }
                        }
                    ]
                });
            }

            cinemasForFilm = film?.cinemas || [];
        } catch (dbError) {
            console.error('DB error when loading cinemas for film, fallback to static:', dbError);
        }

        if (!cinemasForFilm || cinemasForFilm.length === 0) {
            return res.json(STATIC_CINEMAS);
        }

        res.json(cinemasForFilm);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при получении кинотеатров для фильма', error });
    }
};

exports.getExternalRandomFilms = async (req, res) => {
    try {
        const take = Math.min(Math.max(parseInt(req.query.take || '10', 10), 1), 30);
        const excludeRaw = String(req.query.exclude || '').trim();
        const exclude = new Set(
            excludeRaw
                ? excludeRaw.split(',').map(s => s.trim()).filter(Boolean)
                : []
        );

        const picked = [];
        const pickedIds = new Set();

        let attempts = 0;
        while (picked.length < take && attempts < 8) {
            attempts += 1;
            const page = Math.floor(Math.random() * KP_TOP_MAX_PAGES) + 1;
            const cacheKey = `${KP_TOP_TYPE}:${page}`;
            const now = Date.now();
            let pageData = topPageCache.get(cacheKey);
            if (!pageData || pageData.expiresAt < now) {
                const data = await kpFetchJson(`/v2.2/films/top?type=${KP_TOP_TYPE}&page=${page}`);
                pageData = { data, expiresAt: now + TOP_CACHE_TTL_MS };
                topPageCache.set(cacheKey, pageData);
            }

            const items = Array.isArray(pageData.data?.films) ? pageData.data.films : [];
            const shuffled = [...items].sort(() => Math.random() - 0.5);
            for (const item of shuffled) {
                if (picked.length >= take) break;
                const mapped = mapTopFilmItem(item);
                const idStr = String(mapped.id);
                if (!mapped.id) continue;
                if (exclude.has(idStr)) continue;
                if (pickedIds.has(idStr)) continue;
                pickedIds.add(idStr);
                picked.push(mapped);
            }
        }

        res.json({ items: picked });
    } catch (error) {
        console.error('Kinopoisk random films error:', error);
        res.status(error.status || 500).json({ message: 'Ошибка при получении фильмов из Kinopoisk' });
    }
};

exports.getExternalWeeklyFilms = async (req, res) => {
    try {
        const now = new Date();
        const year = now.getUTCFullYear();
        const oneJan = new Date(Date.UTC(year, 0, 1));
        const dayOfYear = Math.floor((now - oneJan) / 86400000) + 1;
        const week = Math.ceil(dayOfYear / 7);
        const cacheKey = `${year}-W${week}`;

        const cached = weeklyFilmsCache.get(cacheKey);
        if (cached && cached.expiresAt > now.getTime()) {
            return res.json({ items: cached.items });
        }

        const take = 15;
        const picked = [];
        const pickedIds = new Set();

        let attempts = 0;
        while (picked.length < take && attempts < 8) {
            attempts += 1;
            const page = Math.floor(Math.random() * KP_TOP_MAX_PAGES) + 1;
            const pageCacheKey = `${KP_TOP_TYPE}:${page}`;
            const nowMs = Date.now();
            let pageData = topPageCache.get(pageCacheKey);
            if (!pageData || pageData.expiresAt < nowMs) {
                const data = await kpFetchJson(`/v2.2/films/top?type=${KP_TOP_TYPE}&page=${page}`);
                pageData = { data, expiresAt: nowMs + TOP_CACHE_TTL_MS };
                topPageCache.set(pageCacheKey, pageData);
            }

            const items = Array.isArray(pageData.data?.films) ? pageData.data.films : [];
            const shuffled = [...items].sort(() => Math.random() - 0.5);
            for (const item of shuffled) {
                if (picked.length >= take) break;
                const mapped = mapTopFilmItem(item);
                const idStr = String(mapped.id);
                if (!mapped.id) continue;
                if (pickedIds.has(idStr)) continue;
                pickedIds.add(idStr);
                picked.push(mapped);
            }
        }

        const endOfWeek = new Date(Date.UTC(year, 0, 1));
        endOfWeek.setUTCDate(week * 7);
        const expiresAt = endOfWeek.getTime();

        weeklyFilmsCache.set(cacheKey, { items: picked, expiresAt });

        res.json({ items: picked });
    } catch (error) {
        console.error('Kinopoisk weekly films error:', error);
        res.status(error.status || 500).json({ message: 'Ошибка при получении недельной подборки фильмов из Kinopoisk' });
    }
};

exports.getExternalMonthlyPremieres = async (req, res) => {
    try {
        const now = new Date();
        const year = now.getUTCFullYear();
        const monthIndex = now.getUTCMonth(); // 0-11

        const MONTH_NAMES = [
            'JANUARY',
            'FEBRUARY',
            'MARCH',
            'APRIL',
            'MAY',
            'JUNE',
            'JULY',
            'AUGUST',
            'SEPTEMBER',
            'OCTOBER',
            'NOVEMBER',
            'DECEMBER'
        ];

        const monthName = MONTH_NAMES[monthIndex];
        const cacheKey = `${year}-${monthName}`;

        const cached = premieresCache.get(cacheKey);
        const nowMs = Date.now();
        if (cached && cached.expiresAt > nowMs) {
            return res.json({ items: cached.items });
        }

        const data = await kpFetchJson(`/v2.2/films/premieres?year=${year}&month=${monthName}`);
        const itemsRaw = Array.isArray(data?.items) ? data.items : [];

        const items = itemsRaw
            .map((item) => {
                const kpId = item?.kinopoiskId ?? item?.filmId ?? item?.id;
                return {
                    id: kpId,
                    kinopoiskId: kpId,
                    title:
                        item?.nameRu ||
                        item?.nameEn ||
                        item?.nameOriginal ||
                        'Без названия',
                    posterUrl: item?.posterUrl || item?.posterUrlPreview || null,
                    rating: toNumber(item?.ratingKinopoisk) ?? toNumber(item?.ratingImdb) ?? 0,
                    genres: Array.isArray(item?.genres)
                        ? item.genres.map((g) => g?.genre).filter(Boolean)
                        : [],
                    premiereDate: item?.premiereRu || item?.premiereWorld || null
                };
            })
            .filter((x) => x.id);

        premieresCache.set(cacheKey, {
            items,
            expiresAt: nowMs + PREMIERES_CACHE_TTL_MS
        });

        res.json({ items });
    } catch (error) {
        console.error('Kinopoisk monthly premieres error:', error);
        res.status(error.status || 500).json({ message: 'Ошибка при получении премьер месяца из Kinopoisk' });
    }
};

exports.getExternalFilm = async (req, res) => {
    try {
        const id = req.params.kinopoiskId;
        const details = await kpFetchJson(`/v2.2/films/${id}`);
        let staff = null;
        try {
            staff = await kpFetchJson(`/v1/staff?filmId=${id}`);
        } catch (e) {
            staff = null;
        }
        const mapped = mapFilmDetails(details, staff);

        try {
            const [film, created] = await Film.findOrCreate({
                where: { kinopoiskId: mapped.kinopoiskId },
                defaults: {
                    title: mapped.title,
                    description: mapped.description,
                    posterUrl: mapped.posterUrl,
                    releaseDate: mapped.releaseDate,
                    rating: mapped.rating,
                    genres: mapped.genres,
                    director: mapped.director,
                    actors: mapped.actors,
                    duration: mapped.duration
                }
            });

            if (!created) {
                await film.update({
                    title: mapped.title,
                    description: mapped.description,
                    posterUrl: mapped.posterUrl,
                    releaseDate: mapped.releaseDate,
                    rating: mapped.rating,
                    genres: mapped.genres,
                    director: mapped.director,
                    actors: mapped.actors,
                    duration: mapped.duration
                });
            }
        } catch (dbError) {
            console.error('Failed to sync film with DB:', dbError);
        }

        res.json(mapped);
    } catch (error) {
        console.error('Kinopoisk film details error:', error);
        res.status(error.status || 500).json({ message: 'Ошибка при получении фильма из Kinopoisk' });
    }
};

exports.getExternalFilmFacts = async (req, res) => {
    try {
        const id = req.params.kinopoiskId;
        const data = await kpFetchJson(`/v2.2/films/${id}/facts`);
        res.json(data);
    } catch (error) {
        console.error('Kinopoisk film facts error:', error);
        res.status(error.status || 500).json({ message: 'Ошибка при получении фактов из Kinopoisk' });
    }
};

exports.getExternalFilmReviews = async (req, res) => {
    try {
        const id = req.params.kinopoiskId;
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const data = await kpFetchJson(`/v1/reviews?filmId=${id}&page=${page}`);
        res.json(data);
    } catch (error) {
        console.error('Kinopoisk film reviews error:', error);
        res.status(error.status || 500).json({ message: 'Ошибка при получении отзывов из Kinopoisk' });
    }
};

exports.getFilmLocations = async (req, res) => {
    try {
        const filmId = req.params.filmId;

        const cached = locationsCache.get(String(filmId));
        const nowMs = Date.now();
        if (cached && cached.expiresAt > nowMs) {
            return res.json(cached.items);
        }

        const details = await kpFetchJson(`/v2.2/films/${filmId}`);

        const countries = Array.isArray(details?.countries)
            ? details.countries.map(c => c?.country).filter(Boolean)
            : [];

        const baseTitle =
            details?.nameRu || details?.nameEn || details?.nameOriginal || 'Фильм';
        const year = toInt(details?.year);

        // 1) Пытаемся получить реальные локации съемок из внешнего API.
        // Внешний сервис ожидает IMDb Title ID вида `tt0137523`.
        const externalBaseUrl = 'https://filming-locations-api-w-express-js.vercel.app';
        const imdbIdRaw =
            details?.imdbId ?? details?.imdb_id ?? details?.imdbID ?? details?.imdbid ?? null;
        const imdbId = normalizeImdbId(imdbIdRaw);

        if (imdbId) {
            try {
                const externalUrl = `${externalBaseUrl}/api/locations/${encodeURIComponent(imdbId)}`;
                const externalResponse = await fetchFn(externalUrl);

                if (externalResponse.ok) {
                    const data = await externalResponse.json();
                    const rawItems = Array.isArray(data)
                        ? data
                        : Array.isArray(data?.locations)
                            ? data.locations
                            : Array.isArray(data?.results)
                                ? data.results
                                : Array.isArray(data?.items)
                                    ? data.items
                                    : [];

                    if (Array.isArray(rawItems) && rawItems.length > 0) {
                        const mapped = rawItems
                            .map((item, index) => {
                                const lat = toNumber(
                                    item?.latitude ??
                                    item?.lat ??
                                    item?.location?.latitude ??
                                    item?.location?.lat ??
                                    item?.coordinates?.lat ??
                                    item?.coordinates?.latitude ??
                                    null
                                );
                                const lon = toNumber(
                                    item?.longitude ??
                                    item?.lon ??
                                    item?.lng ??
                                    item?.location?.longitude ??
                                    item?.location?.lon ??
                                    item?.coordinates?.lon ??
                                    item?.coordinates?.lng ??
                                    item?.coordinates?.longitude ??
                                    null
                                );

                                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

                                return {
                                    id: item?.id ?? index,
                                    name:
                                        item?.name ??
                                        item?.title ??
                                        item?.locationName ??
                                        item?.place ??
                                        'Локация съемок',
                                    description:
                                        item?.description ??
                                        item?.address ??
                                        item?.notes ??
                                        '',
                                    latitude: lat,
                                    longitude: lon
                                };
                            })
                            .filter(Boolean);

                        if (mapped.length > 0) {
                            locationsCache.set(String(filmId), { items: mapped, expiresAt: nowMs + LOCATIONS_CACHE_TTL_MS });
                            return res.json(mapped);
                        }
                    }
                }
            } catch (externalErr) {
                console.error('External filming locations fetch error:', externalErr?.message || externalErr);
            }
        }

        // 2) Умный поиск: Wikidata (часто содержит P915 "filming location" с координатами).
        try {
            let wikidataItems = [];

            if (imdbId) {
                wikidataItems = await fetchWikidataFilmingLocationsByImdbId(imdbId);
            }

            if ((!wikidataItems || wikidataItems.length === 0) && baseTitle) {
                const qid = await fetchWikidataFilmQidByTitleYear(baseTitle, year);
                if (qid) {
                    wikidataItems = await fetchWikidataFilmingLocationsByQid(qid);
                }
            }

            if (Array.isArray(wikidataItems) && wikidataItems.length > 0) {
                const mapped = wikidataItems.map((it, idx) => ({
                    id: idx,
                    name: it.name,
                    description: it.description
                        ? it.description
                        : `Wikidata (места съемок «${baseTitle}»)`,
                    latitude: it.latitude,
                    longitude: it.longitude
                }));
                locationsCache.set(String(filmId), { items: mapped, expiresAt: nowMs + LOCATIONS_CACHE_TTL_MS });
                return res.json(mapped);
            }
        } catch (wikiErr) {
            console.error('Wikidata filming locations error:', wikiErr?.message || wikiErr);
        }

        // 2) Если внешние API не дали координаты — строим “ручные” точки по странам
        // из ответа Kinopoisk, чтобы не зависеть от Nominatim.
        const manualLocations = [];
        const seenCountries = new Set();
        for (const countryName of countries) {
            const key = normalizeCountryKey(countryName);
            if (!key || seenCountries.has(key)) continue;
            seenCountries.add(key);

            const coords = COUNTRY_COORDS[key];
            if (!coords) continue;

            manualLocations.push({
                id: manualLocations.length + 1,
                name: countryName,
                description: `Связано с фильмом «${baseTitle}» (страна производства)`,
                latitude: coords.latitude,
                longitude: coords.longitude
            });
        }

        if (manualLocations.length > 0) {
            locationsCache.set(String(filmId), { items: manualLocations, expiresAt: nowMs + LOCATIONS_CACHE_TTL_MS });
            return res.json(manualLocations);
        }

        // Больше не используем Nominatim: если не знаем координаты конкретной страны,
        // отдаём пустой список — фронт сможет продолжить работу.
        locationsCache.set(String(filmId), { items: [], expiresAt: nowMs + LOCATIONS_CACHE_TTL_MS });
        res.json([]);
    } catch (error) {
        console.error('getFilmLocations error:', error);
        res.status(500).json({ message: 'Ошибка при получении локаций съемок', error });
    }
};

exports.getExternalActor = async (req, res) => {
    try {
        const actorId = req.params.actorId;
        const data = await kpFetchJson(`/v1/staff/${actorId}`);

        const filmsRaw = Array.isArray(data?.films) ? data.films : [];

        // Kinopoisk часто возвращает дубли фильмов в фильмографии (по разным профессиям/записям).
        // Дедуплицируем по filmId, при этом объединяем professionKey в массив.
        const filmById = new Map();
        for (const item of filmsRaw) {
            const id = item?.filmId ?? item?.kinopoiskId ?? item?.id;
            if (!id) continue;

            const mapped = {
                id,
                title: item?.nameRu || item?.nameEn || item?.nameOriginal || 'Без названия',
                rating: toNumber(item?.rating) ?? 0,
                description: item?.description || '',
                professionKey: item?.professionKey || ''
            };

            const key = String(id);
            const existing = filmById.get(key);
            if (!existing) {
                filmById.set(key, {
                    ...mapped,
                    professionKeys: mapped.professionKey ? [mapped.professionKey] : []
                });
                continue;
            }

            // Объединяем professionKey
            if (mapped.professionKey && !existing.professionKeys.includes(mapped.professionKey)) {
                existing.professionKeys.push(mapped.professionKey);
            }

            // Берём наиболее “полные” поля
            if ((!existing.title || existing.title === 'Без названия') && mapped.title) {
                existing.title = mapped.title;
            }
            if (!existing.description && mapped.description) {
                existing.description = mapped.description;
            }
            if ((existing.rating || 0) < (mapped.rating || 0)) {
                existing.rating = mapped.rating;
            }
        }

        const filmsBase = Array.from(filmById.values())
            .map((f) => ({
                ...f,
                // для совместимости с текущим фронтом оставляем строковый professionKey
                professionKey: Array.isArray(f.professionKeys) && f.professionKeys.length
                    ? f.professionKeys[0]
                    : (f.professionKey || '')
            }))
            .sort((a, b) => (b.rating || 0) - (a.rating || 0));

        // Подтягиваем постеры для фильмов актера (ограничиваем, чтобы не упереться в rate limit).
        const posterLimit = 18;
        const filmsForPosters = filmsBase.slice(0, posterLimit);
        const posterCache = topPageCache; // переиспользуем общий cache map, ключи уникальные

        const posterPromises = filmsForPosters.map(async (f) => {
            const key = `filmPoster:${f.id}`;
            const now = Date.now();
            const cached = posterCache.get(key);
            if (cached && cached.expiresAt > now) {
                return { id: f.id, posterUrl: cached.posterUrl || null };
            }
            try {
                const details = await kpFetchJson(`/v2.2/films/${f.id}`);
                const posterUrl = details?.posterUrlPreview || details?.posterUrl || null;
                posterCache.set(key, { posterUrl, expiresAt: now + TOP_CACHE_TTL_MS });
                return { id: f.id, posterUrl };
            } catch {
                posterCache.set(key, { posterUrl: null, expiresAt: now + TOP_CACHE_TTL_MS });
                return { id: f.id, posterUrl: null };
            }
        });

        const posters = await Promise.all(posterPromises);
        const posterById = new Map(posters.map(p => [String(p.id), p.posterUrl]));

        const films = filmsBase.map((f) => ({
            ...f,
            posterUrl: posterById.get(String(f.id)) || null
        }));

        const result = {
            id: data?.personId ?? data?.staffId ?? actorId,
            name: data?.nameRu || data?.nameEn || data?.nameOriginal || 'Без имени',
            posterUrl: data?.posterUrl || null,
            profession: data?.profession || '',
            birthday: data?.birthday || null,
            death: data?.death || null,
            age: toInt(data?.age),
            birthPlace: data?.birthplace || '',
            growth: data?.growth || '',
            sex: data?.sex || '',
            facts: Array.isArray(data?.facts) ? data.facts.filter(Boolean).slice(0, 10) : [],
            films
        };

        res.json(result);
    } catch (error) {
        console.error('Kinopoisk actor details error:', error);
        res.status(error.status || 500).json({ message: 'Ошибка при получении профиля актера из Kinopoisk' });
    }
};

exports.getExternalGenreFilms = async (req, res) => {
    try {
        const genre = String(req.params.genre || '').trim().toLowerCase();
        if (!genre) {
            return res.status(400).json({ message: 'Жанр не указан' });
        }

        const cacheKey = `genre:${genre}`;
        const now = Date.now();
        const cached = genreFilmsCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
            return res.json({ genre, items: cached.items });
        }

        const items = [];
        const seen = new Set();

        const targetCount = 20;

        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const kpFetchJsonWithRetry = async (path, { retries = 3 } = {}) => {
            let lastErr = null;
            for (let attempt = 0; attempt < retries; attempt += 1) {
                try {
                    return await kpFetchJson(path);
                } catch (err) {
                    lastErr = err;
                    const msg = String(err?.message || '').toLowerCase();
                    const isRateLimit =
                        msg.includes('rate limit') ||
                        msg.includes('rate limit exceeded') ||
                        msg.includes('429');

                    if (!isRateLimit || attempt === retries - 1) {
                        throw err;
                    }

                    // Экспоненциальная задержка: 0.7s -> 1.4s -> 2.8s...
                    const delayMs = Math.round(700 * Math.pow(2, attempt));
                    await sleep(delayMs);
                }
            }
            throw lastErr;
        };

        for (let page = 1; page <= KP_TOP_MAX_PAGES; page += 1) {
            const pageCacheKey = `${KP_TOP_TYPE}:${page}`;
            const pageNow = Date.now();
            let pageData = topPageCache.get(pageCacheKey);
            if (!pageData || pageData.expiresAt < pageNow) {
                const data = await kpFetchJsonWithRetry(
                    `/v2.2/films/top?type=${KP_TOP_TYPE}&page=${page}`
                );
                pageData = { data, expiresAt: pageNow + TOP_CACHE_TTL_MS };
                topPageCache.set(pageCacheKey, pageData);
            }

            const pageItems = Array.isArray(pageData.data?.films) ? pageData.data.films : [];
            for (const rawItem of pageItems) {
                const mapped = mapTopFilmItem(rawItem);
                if (!mapped.id) continue;
                const hasGenre = Array.isArray(mapped.genres)
                    && mapped.genres.some(g => String(g).toLowerCase() === genre);
                if (!hasGenre) continue;
                const idStr = String(mapped.id);
                if (seen.has(idStr)) continue;
                seen.add(idStr);
                items.push(mapped);
            }

            if (items.length >= targetCount) break;
        }

        items.sort((a, b) => (b.rating || 0) - (a.rating || 0));

        genreFilmsCache.set(cacheKey, { items, expiresAt: now + GENRE_CACHE_TTL_MS });
        res.json({ genre, items });
    } catch (error) {
        console.error('Kinopoisk genre films error:', error);
        res.status(error.status || 500).json({ message: 'Ошибка при получении фильмов по жанру из Kinopoisk' });
    }
};

exports.updateFilm = async (req, res) => {
    try {
        const film = await Film.findByPk(req.params.filmId);
        if (!film) {
            return res.status(404).json({ message: 'Фильм не найден' });
        }
        await film.update(req.body);
        res.json({ message: 'Фильм успешно обновлен', film });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при обновлении фильма', error });
    }
};

exports.deleteFilm = async (req, res) => {
    try {
        const film = await Film.findByPk(req.params.filmId);
        if (!film) {
            return res.status(404).json({ message: 'Фильм не найден' });
        }
        await film.destroy();
        res.json({ message: 'Фильм успешно удален' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка при удалении фильма', error });
    }
};

