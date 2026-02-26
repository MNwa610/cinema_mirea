const { Film, Cinema } = require('../models/models');
const { STATIC_CINEMAS } = require('../data/staticCinemas');

const fetchFn = global.fetch;

const KP_BASE = 'https://kinopoiskapiunofficial.tech/api';
const KP_TOP_TYPE = 'TOP_250_BEST_FILMS';
const KP_TOP_MAX_PAGES = 13; 

const topPageCache = new Map(); 
const TOP_CACHE_TTL_MS = 10 * 60 * 1000;

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
    const actors = Array.isArray(staff)
        ? staff.filter(p => p?.professionKey === 'ACTOR').map(p => p?.nameRu || p?.nameEn).filter(Boolean).slice(0, 15)
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
        actors,
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

        const details = await kpFetchJson(`/v2.2/films/${filmId}`);

        const countries = Array.isArray(details?.countries)
            ? details.countries.map(c => c?.country).filter(Boolean)
            : [];

        const baseTitle =
            details?.nameRu || details?.nameEn || details?.nameOriginal || 'Фильм';

        const query = countries.length ? countries[0] : baseTitle;

        let location = null;
        try {
            const geo = await geocodeLocationNominatim(query);
            if (geo) {
                location = {
                    id: 1,
                    name: query,
                    description: `Страна производства фильма «${baseTitle}»`,
                    latitude: geo.latitude,
                    longitude: geo.longitude
                };
            }
        } catch (geoError) {
            console.error('geocodeLocationNominatim error for', query, geoError);
        }

        res.json(location ? [location] : []);
    } catch (error) {
        console.error('getFilmLocations error:', error);
        res.status(500).json({ message: 'Ошибка при получении локаций съемок', error });
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

