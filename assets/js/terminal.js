document.addEventListener('DOMContentLoaded', () => {
    const terminalOverlay = document.querySelector('[data-terminal]');
    const terminalLaunchers = document.querySelectorAll('[data-terminal-launch]');
    const terminalShell = terminalOverlay?.querySelector('.terminal-shell');
    const terminalInput = terminalOverlay?.querySelector('.terminal-input');
    const terminalScreen = terminalOverlay?.querySelector('.terminal-screen');
    const terminalClose = terminalOverlay?.querySelector('.terminal-close');
    const syncTerminalViewportHeight = () => {
        const viewport = window.visualViewport;
        const viewportHeight = viewport?.height || window.innerHeight;
        const offsetTop = viewport?.offsetTop || 0;

        document.documentElement.style.setProperty('--terminal-vh', `${viewportHeight}px`);
        document.documentElement.style.setProperty('--terminal-offset-top', `${offsetTop}px`);
    };

    const terminalHistory = [];
    let terminalHistoryIndex = -1;
    let terminalBooted = false;
    let activeMiniGame = null;
    let pendingTerminalPrompt = null;
    let lockedScrollY = 0;
    let pendingThemePrompt = false;
    const availableThemes = ['default', 'matrix', 'amber'];

    const linkify = (text = '') => {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

        return text
            .replace(urlRegex, '<a href=\"$1\" target=\"_blank\" rel=\"noopener noreferrer\">$1</a>')
            .replace(emailRegex, '<a href=\"mailto:$1\">$1</a>');
    };

    const addTerminalLine = (text, options = {}) => {
        if (!terminalScreen) return;
        const line = document.createElement('div');
        line.className = 'terminal-line';
        const outputText = options.output ?? text ?? '';
        const formattedOutput = options.output
            ? linkify(outputText).replace(/^([^—]+)\s—\s(.+)$/, '<span class="terminal-hint-command">`$1`</span> <span class="terminal-hint-separator">—</span> $2')
            : '';
        line.innerHTML = [
            options.prompt ? `<span class=\"prompt\">${options.prompt}</span>` : '',
            options.cmd ? `<span class=\"cmd\"> ${options.cmd}</span>` : '',
            outputText ? `<span class=\"output\"> ${formattedOutput || linkify(outputText)}</span>` : ''
        ].join('');
        terminalScreen.appendChild(line);
        terminalScreen.scrollTop = terminalScreen.scrollHeight;
    };

    const addTerminalHelpColumns = () => {
        if (!terminalScreen) return;

        const meCommands = [
            'whoami — quick bio',
            'now — what I am focused on',
            'focus — what I optimize for',
            'stack — tech I ship with',
            'uses — tools and workflow',
            'experience — timeline',
            'ships — shipped projects',
            'projects — shipped projects (alias)',
            'bestat — strongest working zone',
            'status — current availability snapshot',
            'availability — how/when to collaborate',
            'location — where I am based',
            'socials — quick links',
            'social — quick links (alias)',
            'github — GitHub profile',
            'linkedin — LinkedIn profile',
            'email — direct email',
            'resume — download link',
            'contact — reach out fast',
        ];

        const funCommands = [
            'help — list commands',
            'ip — get your public IP (network fetch)',
            'ping — live HTTP latency check',
            'weather — ask for a city and fetch weather',
            'theme — switch terminal theme',
            'advice — random advice from the internet',
            'fact — random useless fact',
            'game — start a tiny terminal game',
            'time — local time',
            'date — today\'s date',
            'tz — your timezone guess',
            'pwd — current terminal path',
            'ls — quick directory listing',
            'uname — system flavor',
            'fortune — random terminal fortune',
            'hack — dramatic nonsense',
            'neofetch — mini system card',
            'echo — check if terminal is awake',
            'coffee — caffeine status',
            'sudo — try your luck',
            'joke — one dry joke',
            'matrix — tiny glitch message',
            'clear — clear screen',
            'exit — close terminal',
        ];

        const renderItem = (item) => {
            const html = linkify(item).replace(
                /^([^—]+)\s—\s(.+)$/,
                '<span class="terminal-hint-command">`$1`</span> <span class="terminal-hint-separator">—</span> $2'
            );

            const row = document.createElement('div');
            row.className = 'terminal-help-item';
            row.innerHTML = html;
            return row;
        };

        const renderColumn = (title, items) => {
            const column = document.createElement('div');
            column.className = 'terminal-help-column';

            const heading = document.createElement('div');
            heading.className = 'terminal-help-heading';
            heading.textContent = title;
            column.appendChild(heading);

            items.forEach((item) => {
                column.appendChild(renderItem(item));
            });

            return column;
        };

        const wrapper = document.createElement('div');
        wrapper.className = 'terminal-help-grid';
        wrapper.append(
            renderColumn('About Srinivasa', meCommands),
            renderColumn('Utilities + Fun', funCommands)
        );

        terminalScreen.appendChild(wrapper);
        terminalScreen.scrollTop = terminalScreen.scrollHeight;
    };

    const printTerminalIntro = () => {
        if (terminalBooted) return;
        addTerminalLine('srinivasa.dev terminal session initialized');
        addTerminalLine(terminalMotdLines[Math.floor(Math.random() * terminalMotdLines.length)]);
        addTerminalLine("type 'help' to inspect available commands");
        terminalBooted = true;
    };

    const applyTerminalTheme = (themeName) => {
        if (!terminalShell) return false;
        const normalizedTheme = availableThemes.includes(themeName) ? themeName : 'default';

        terminalShell.dataset.theme = normalizedTheme;
        try {
            window.localStorage.setItem('terminal-theme', normalizedTheme);
        } catch (error) {
            // Ignore storage failures.
        }

        return true;
    };

    const restoreTerminalTheme = () => {
        try {
            const savedTheme = window.localStorage.getItem('terminal-theme');
            if (savedTheme) {
                applyTerminalTheme(savedTheme);
                return;
            }
        } catch (error) {
            // Ignore storage failures.
        }

        applyTerminalTheme('default');
    };

    const formatTimeString = () => new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
    }).format(new Date());

    const formatDateString = () => new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date());

    const fetchWithTimeout = (url, options = {}, timeoutMs = 3500) => {
        const controller = new AbortController();
        const id = window.setTimeout(() => controller.abort(), timeoutMs);
        const merged = { ...options, signal: controller.signal };
        return fetch(url, merged).finally(() => window.clearTimeout(id));
    };

    let cachedIp = null;
    let cachedIpLocation = null;
    const terminalJokes = [
        'Why do programmers prefer dark mode? Because light attracts bugs.',
        'There are 10 kinds of people in tech: those who know binary and those who fake confidence.',
        'I would tell you a UDP joke, but you might not get it.',
        'A clean deploy is just a bug with good timing.',
        'My code does not have bugs. It develops surprise features.',
        'Hardware is just software that gave up on flexibility.',
        'The best debugger is still a full night of sleep. Very limited availability though.',
    ];
    const terminalFortunes = [
        'Fortune says: ship the boring version first. Fancy can earn its turn later.',
        'Fortune says: if it works on the first try, check what you forgot.',
        'Fortune says: elegant code is usually deleted code.',
        'Fortune says: the spec was not wrong, just creatively interpreted.',
        'Fortune says: today is a good day to rename something dangerous.',
    ];
    const terminalMotdLines = [
        'build status: clean, caffeinated, deployable',
        'terminal online. bugs currently pretending to behave.',
        'today feels like a good day to ship without drama.',
        'systems nominal. ambition slightly above baseline.',
        'all green. suspicious, but welcome.',
        'runtime stable. ideas unstable in a useful way.',
    ];
    const getPublicIp = async () => {
        if (cachedIp) return cachedIp;

        const providers = [
            async () => {
                const response = await fetchWithTimeout('https://api64.ipify.org?format=json', { cache: 'no-store' });
                if (!response.ok) throw new Error('ipify failed');
                const data = await response.json();
                return data?.ip || null;
            },
            async () => {
                const response = await fetchWithTimeout('https://api.ipify.org?format=json', { cache: 'no-store' });
                if (!response.ok) throw new Error('ipify fallback failed');
                const data = await response.json();
                return data?.ip || null;
            },
            async () => {
                const response = await fetchWithTimeout('https://ipapi.co/ip/', {
                    cache: 'no-store',
                    headers: {
                        Accept: 'text/plain',
                    },
                });
                if (!response.ok) throw new Error('ipapi failed');
                const text = (await response.text()).trim();
                return text || null;
            },
        ];

        for (const provider of providers) {
            try {
                const ip = await provider();
                if (ip) {
                    cachedIp = ip;
                    return cachedIp;
                }
            } catch (error) {
                // Try the next provider.
            }
        }

        throw new Error('ip unavailable');
    };

    const getIpv4AndIpv6 = async () => {
        const [ipv4, ipv6] = await Promise.allSettled([
            fetchWithTimeout('https://api.ipify.org?format=json', { cache: 'no-store' })
                .then((response) => {
                    if (!response.ok) throw new Error('ipv4 failed');
                    return response.json();
                })
                .then((data) => data?.ip || null),
            fetchWithTimeout('https://api64.ipify.org?format=json', { cache: 'no-store' })
                .then((response) => {
                    if (!response.ok) throw new Error('ipv6 failed');
                    return response.json();
                })
                .then((data) => data?.ip || null),
        ]);

        return {
            ipv4: ipv4.status === 'fulfilled' ? ipv4.value : null,
            ipv6: ipv6.status === 'fulfilled' ? ipv6.value : null,
        };
    };

    const startGuessGame = () => {
        activeMiniGame = {
            type: 'guess',
            target: Math.floor(Math.random() * 100) + 1,
            attempts: 0,
        };

        return [
            'Mini game started: guess the number.',
            'I picked a number from 1 to 100.',
            'Type a number to play, or type `quit game`.'
        ];
    };

    const handleGuessGame = (rawInput) => {
        if (!activeMiniGame || activeMiniGame.type !== 'guess') return null;

        const normalized = rawInput.trim().toLowerCase();
        if (normalized === 'quit game' || normalized === 'exit game') {
            activeMiniGame = null;
            return ['Game closed. Pride mostly intact.'];
        }

        const guess = Number.parseInt(rawInput.trim(), 10);
        if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
            return ['Enter a number from 1 to 100. Precision is now part of the assignment.'];
        }

        activeMiniGame.attempts += 1;

        if (guess === activeMiniGame.target) {
            const attempts = activeMiniGame.attempts;
            activeMiniGame = null;
            return [
                `Correct. The number was ${guess}.`,
                `Solved in ${attempts} ${attempts === 1 ? 'try' : 'tries'}.`
            ];
        }

        const distance = Math.abs(guess - activeMiniGame.target);

        if (guess < activeMiniGame.target) {
            return [distance <= 3 ? 'Too low, but very close.' : distance <= 8 ? 'Too low. Getting warmer.' : 'Too low.'];
        }

        return [distance <= 3 ? 'Too high, but very close.' : distance <= 8 ? 'Too high. Getting warmer.' : 'Too high.'];
    };

    const startWeatherCityPrompt = () => {
        pendingTerminalPrompt = { type: 'weather-city' };
        return [
            'Enter a city name for weather lookup.',
            'Example: Bangalore'
        ];
    };

    const getIpLocation = async () => {
        if (cachedIpLocation) return cachedIpLocation;
        const publicIp = await getPublicIp();

        const providers = [
            async () => {
                const response = await fetchWithTimeout(`https://ipapi.co/${encodeURIComponent(publicIp)}/json/`, {
                    cache: 'no-store',
                    headers: {
                        Accept: 'application/json',
                    },
                }, 5000);
                if (!response.ok) throw new Error('ipapi failed');
                const data = await response.json();
                return {
                    source: 'ipapi',
                    ip: data?.ip || publicIp,
                    city: data?.city || '',
                    region: data?.region || '',
                    country_name: data?.country_name || '',
                    country_code: data?.country_code || '',
                    latitude: Number(data?.latitude),
                    longitude: Number(data?.longitude),
                };
            },
            async () => {
                const response = await fetchWithTimeout(`https://geolocation-db.com/json/${encodeURIComponent(publicIp)}`, {
                    cache: 'no-store',
                    headers: {
                        Accept: 'application/json',
                    },
                }, 5000);
                if (!response.ok) throw new Error('geolocation-db failed');
                const data = await response.json();
                return {
                    source: 'geolocation-db',
                    ip: data?.IPv4 || publicIp,
                    city: data?.city || '',
                    region: data?.state || '',
                    country_name: data?.country_name || '',
                    country_code: data?.country_code || '',
                    latitude: Number(data?.latitude),
                    longitude: Number(data?.longitude),
                };
            },
            async () => {
                const response = await fetchWithTimeout(`https://ipwho.is/${encodeURIComponent(publicIp)}`, {
                    cache: 'no-store',
                    headers: {
                        Accept: 'application/json',
                    },
                }, 5000);
                if (!response.ok) throw new Error('ipwho.is failed');
                const data = await response.json();
                if (data?.success === false) throw new Error('ipwho.is lookup failed');
                return {
                    source: 'ipwho.is',
                    ip: data?.ip || publicIp,
                    city: data?.city || '',
                    region: data?.region || '',
                    country_name: data?.country || '',
                    country_code: data?.country_code || '',
                    latitude: Number(data?.latitude),
                    longitude: Number(data?.longitude),
                };
            },
        ];

        const results = (await Promise.allSettled(providers.map((provider) => provider())))
            .filter((result) => result.status === 'fulfilled')
            .map((result) => result.value)
            .filter((result) => Number.isFinite(result.latitude) && Number.isFinite(result.longitude));

        if (!results.length) {
            throw new Error('location unavailable');
        }

        const normalize = (value) => String(value || '').trim().toLowerCase();
        const scoredResults = results.map((candidate) => {
            const score = results.reduce((total, other) => {
                if (candidate === other) return total + 1;

                let next = total;
                if (normalize(candidate.country_code) && normalize(candidate.country_code) === normalize(other.country_code)) next += 3;
                if (normalize(candidate.country_name) && normalize(candidate.country_name) === normalize(other.country_name)) next += 2;
                if (normalize(candidate.region) && normalize(candidate.region) === normalize(other.region)) next += 3;
                if (normalize(candidate.city) && normalize(candidate.city) === normalize(other.city)) next += 5;
                return next;
            }, 0);

            return { ...candidate, score };
        });

        scoredResults.sort((a, b) => b.score - a.score);
        cachedIpLocation = scoredResults[0];
        return cachedIpLocation;
    };

    const getWeatherSummary = async () => {
        const location = await getIpLocation();
        const cityBits = [location.city, location.region, location.country_name].filter(Boolean);
        const placeLabel = cityBits.join(', ') || 'your area';
        let latitude = location.latitude;
        let longitude = location.longitude;

        if (location.city) {
            try {
                const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
                geocodeUrl.searchParams.set('name', location.city);
                geocodeUrl.searchParams.set('count', '5');
                geocodeUrl.searchParams.set('language', 'en');
                geocodeUrl.searchParams.set('format', 'json');

                const geocodeResponse = await fetchWithTimeout(geocodeUrl.toString(), {
                    cache: 'no-store',
                    headers: {
                        Accept: 'application/json',
                    },
                }, 5000);

                if (geocodeResponse.ok) {
                    const geocodeData = await geocodeResponse.json();
                    const results = Array.isArray(geocodeData?.results) ? geocodeData.results : [];
                    const matchedCity = results.find((result) => {
                        const sameCountry = !location.country_code || result?.country_code === location.country_code;
                        const sameRegion = !location.region || result?.admin1 === location.region;
                        return sameCountry && sameRegion;
                    }) || results.find((result) => (
                        !location.country_code || result?.country_code === location.country_code
                    )) || results[0];

                    if (typeof matchedCity?.latitude === 'number' && typeof matchedCity?.longitude === 'number') {
                        latitude = matchedCity.latitude;
                        longitude = matchedCity.longitude;
                    }
                }
            } catch (error) {
                // Fall back to raw IP coordinates if city geocoding fails.
            }
        }

        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.searchParams.set('latitude', String(latitude));
        url.searchParams.set('longitude', String(longitude));
        url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m');
        url.searchParams.set('timezone', 'auto');

        const response = await fetchWithTimeout(url.toString(), {
            cache: 'no-store',
            headers: {
                Accept: 'application/json',
            },
        }, 5000);

        if (!response.ok) throw new Error('weather lookup failed');

        const data = await response.json();
        const current = data?.current;
        if (!current) throw new Error('weather unavailable');

        const weatherCodeMap = {
            0: 'clear sky',
            1: 'mainly clear',
            2: 'partly cloudy',
            3: 'overcast',
            45: 'foggy',
            48: 'depositing rime fog',
            51: 'light drizzle',
            53: 'moderate drizzle',
            55: 'dense drizzle',
            61: 'slight rain',
            63: 'moderate rain',
            65: 'heavy rain',
            71: 'slight snow',
            73: 'moderate snow',
            75: 'heavy snow',
            80: 'rain showers',
            81: 'strong rain showers',
            82: 'violent rain showers',
            95: 'thunderstorm',
        };

        const condition = weatherCodeMap[current.weather_code] || 'mixed weather';
        const temperature = Math.round(current.temperature_2m);
        const feelsLike = Math.round(current.apparent_temperature);
        const wind = Math.round(current.wind_speed_10m);

        return [
            `Current weather for ${placeLabel}: ${condition}, ${temperature}°C.`,
            `Feels like ${feelsLike}°C with wind around ${wind} km/h.`
        ];
    };

    const getWeatherSummaryForCity = async (cityQuery) => {
        const location = await getIpLocation();
        const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
        geocodeUrl.searchParams.set('name', cityQuery);
        geocodeUrl.searchParams.set('count', '8');
        geocodeUrl.searchParams.set('language', 'en');
        geocodeUrl.searchParams.set('format', 'json');

        if (location?.country_code) {
            geocodeUrl.searchParams.set('countryCode', location.country_code);
        }

        const geocodeResponse = await fetchWithTimeout(geocodeUrl.toString(), {
            cache: 'no-store',
            headers: {
                Accept: 'application/json',
            },
        }, 5000);

        if (!geocodeResponse.ok) throw new Error('city geocoding failed');

        const geocodeData = await geocodeResponse.json();
        const results = Array.isArray(geocodeData?.results) ? geocodeData.results : [];
        const matchedCity = results.find((result) => (
            typeof result?.latitude === 'number' && typeof result?.longitude === 'number'
        ));

        if (!matchedCity) {
            throw new Error('city not found');
        }

        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.searchParams.set('latitude', String(matchedCity.latitude));
        url.searchParams.set('longitude', String(matchedCity.longitude));
        url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m');
        url.searchParams.set('timezone', 'auto');

        const response = await fetchWithTimeout(url.toString(), {
            cache: 'no-store',
            headers: {
                Accept: 'application/json',
            },
        }, 5000);

        if (!response.ok) throw new Error('weather lookup failed');

        const data = await response.json();
        const current = data?.current;
        if (!current) throw new Error('weather unavailable');

        const weatherCodeMap = {
            0: 'clear sky',
            1: 'mainly clear',
            2: 'partly cloudy',
            3: 'overcast',
            45: 'foggy',
            48: 'depositing rime fog',
            51: 'light drizzle',
            53: 'moderate drizzle',
            55: 'dense drizzle',
            61: 'slight rain',
            63: 'moderate rain',
            65: 'heavy rain',
            71: 'slight snow',
            73: 'moderate snow',
            75: 'heavy snow',
            80: 'rain showers',
            81: 'strong rain showers',
            82: 'violent rain showers',
            95: 'thunderstorm',
        };

        const condition = weatherCodeMap[current.weather_code] || 'mixed weather';
        const temperature = Math.round(current.temperature_2m);
        const feelsLike = Math.round(current.apparent_temperature);
        const wind = Math.round(current.wind_speed_10m);
        const placeLabel = [matchedCity.name, matchedCity.admin1, matchedCity.country].filter(Boolean).join(', ');

        return [
            `Current weather for ${placeLabel}: ${condition}, ${temperature}°C.`,
            `Feels like ${feelsLike}°C with wind around ${wind} km/h.`
        ];
    };

    const measureHttpPing = async () => {
        const start = performance.now();
        const response = await fetchWithTimeout(`${window.location.origin}/favicon.svg?ts=${Date.now()}`, {
            cache: 'no-store',
        }, 5000);
        if (!response.ok) throw new Error('ping failed');
        const latency = Math.round(performance.now() - start);
        return latency;
    };

    const terminalCommands = {
        help: () => [
            'help — list commands',
            'whoami — quick bio',
            'now — what I am focused on',
            'focus — what I optimize for',
            'stack — tech I ship with',
            'uses — tools and workflow',
            'experience — timeline',
            'ships — shipped projects',
            'projects — shipped projects (alias)',
            'bestat — strongest working zone',
            'status — current availability snapshot',
            'availability — how/when to collaborate',
            'location — where I am based',
            'socials — quick links',
            'github — GitHub profile',
            'linkedin — LinkedIn profile',
            'email — direct email',
            'ip — get your public IP (network fetch)',
            'ping — live HTTP latency check',
            'weather — weather near your IP location',
            'advice — random advice from the internet',
            'fact — random useless fact',
            'game — start a tiny terminal game',
            'time — local time',
            'date — today\'s date',
            'tz — your timezone guess',
            'pwd — current terminal path',
            'ls — quick directory listing',
            'uname — system flavor',
            'fortune — random terminal fortune',
            'hack — dramatic nonsense',
            'neofetch — mini system card',
            'echo — check if terminal is awake',
            'coffee — caffeine status',
            'sudo — try your luck',
            'joke — one dry joke',
            'matrix — tiny glitch message',
            'resume — download link',
            'contact — reach out fast',
            'clear — clear screen',
            'exit — close terminal'
        ],
        whoami: () => [
            'Srinivasa Yadav — Flutter developer building fast, reliable mobile/web experiences.',
            'Currently Cloud Frontend Engineer @ NexTurn (Dec 2024–present). Based in Bengaluru.'
        ],
        now: () => [
            'Shipping Flutter features @ NexTurn with an eye on performance, DX, and clean UI.',
            'Focused on building polished product experiences that feel fast and stay maintainable.'
        ],
        focus: () => [
            'Primary obsession: smooth Flutter product experiences that do not feel stitched together in a hurry.',
            'Usual priorities are performance, UI clarity, maintainable architecture, and getting features out without creating future pain.'
        ],
        stack: () => [
            'Flutter · Dart · Firebase · TypeScript/Node.js · Cloudflare Workers · REST APIs · CI/CD · Git.',
            'Comfortable with performance profiling, state management patterns, and design-system builds.'
        ],
        uses: () => [
            'Daily lane: Flutter + Dart for product work, Firebase when speed matters, TypeScript/Node.js for backend glue, Git for keeping things sane.',
            'Also comfortable with API integration, deployment flow, and the unglamorous fixing work that usually decides whether a product feels solid.'
        ],
        experience: () => [
            'NexTurn — Cloud Frontend Engineer (Dec 2024–Present)',
            'ChefKart — Software Engineer (May 2023–Dec 2024)',
            'A.P. Moller - Maersk — Associate Software Engineer (Jul 2022–Jan 2023)',
            '1985 Web Solutions — Software Engineer (Sep 2020–Feb 2022)',
            'ISRO — Onboard Software Development Group (Jan 2020–Apr 2020)'
        ],
        ships: () => [
            'wheel_slider — Dart package for wheel-like pickers',
            'Smart Water Tank Monitor — IoT + Cloudflare Worker for live readings',
            'link-in-bio — minimal link hub',
            'AI Face Generator — C++ + Flutter experiment'
        ],
        projects: () => terminalCommands.ships(),
        bestat: () => [
            'Best fit: Flutter apps that need to feel sharp, fast, and production-ready instead of demo-ready.',
            'That includes UI implementation, app architecture, feature shipping, performance cleanup, and product-minded engineering.'
        ],
        status: () => [
            'Status: available for meaningful Flutter work, selective collaborations, and builds that actually need engineering depth.',
            'Translation: clear scope gets a faster yes.'
        ],
        availability: () => [
            'Open to impactful Flutter builds, performance passes, and rapid prototypes.',
            'Time zone: IST (UTC+5:30). Expect quick async replies.'
        ],
        location: () => [
            'Bengaluru, India · IST (UTC+5:30). Comfortable working remote-first.'
        ],
        socials: () => [
            'Website: https://srinivasa.dev',
            'GitHub: https://github.com/srinivasa-dev',
            'LinkedIn: https://linkedin.com/in/srinivasa-yadav',
            'Medium: https://medium.com/@srinivasa-yadav',
            'Resume: https://srinivasa.dev/srinivasa-resume.pdf',
            'Email: mailto:hello@srinivasa.dev'
        ],
        github: () => [
            'GitHub: https://github.com/srinivasa-dev'
        ],
        linkedin: () => [
            'LinkedIn: https://linkedin.com/in/srinivasa-yadav'
        ],
        email: () => [
            'mailto:hello@srinivasa.dev'
        ],
        ip: async () => {
            try {
                const primaryIp = await getPublicIp();
                const { ipv4, ipv6 } = await getIpv4AndIpv6();

                return [
                    `Public IP: ${primaryIp}`,
                    `IPv4: ${ipv4 || 'unavailable'}`,
                    `IPv6: ${ipv6 || 'unavailable'}`
                ];
            } catch (error) {
                return ['Could not fetch IP right now. Check network and try again (timeout ~3.5s).'];
            }
        },
        ping: async () => {
            try {
                const latency = await measureHttpPing();
                return [
                    `HTTP ping to ${window.location.hostname}: ${latency} ms`,
                    'Browser note: actual ICMP ping is not available here, so this is real request latency instead.'
                ];
            } catch (error) {
                return ['Could not measure ping right now. Network or host did not cooperate.'];
            }
        },
        weather: async () => {
            return startWeatherCityPrompt();
        },
        theme: () => {
            pendingThemePrompt = true;
            return [
                'Choose a theme: default, matrix, amber',
                'Type the theme name.'
            ];
        },
        advice: async () => {
            try {
                const response = await fetchWithTimeout('https://api.adviceslip.com/advice', {
                    cache: 'no-store',
                    headers: {
                        Accept: 'application/json',
                    },
                });
                if (!response.ok) throw new Error('advice lookup failed');
                const data = await response.json();
                const advice = data?.slip?.advice;
                if (!advice) throw new Error('advice unavailable');
                return [advice];
            } catch (error) {
                return ['Advice service is being mysterious right now. Try again in a bit.'];
            }
        },
        fact: async () => {
            try {
                const response = await fetchWithTimeout('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', {
                    cache: 'no-store',
                    headers: {
                        Accept: 'application/json',
                    },
                });
                if (!response.ok) throw new Error('fact lookup failed');
                const data = await response.json();
                const fact = data?.text || data?.fact;
                if (!fact) throw new Error('fact unavailable');
                return [fact];
            } catch (error) {
                return ['Fact service is unavailable right now. The universe kept the trivia to itself.'];
            }
        },
        game: () => startGuessGame(),
        time: () => [
            `Local time (browser): ${formatTimeString()}`
        ],
        date: () => [
            `Today: ${formatDateString()}`
        ],
        tz: () => [
            `Timezone (browser guess): ${Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unavailable'}`
        ],
        pwd: () => [
            '/home/visitor/srinivasa.dev'
        ],
        ls: () => [
            'about.txt  experience.log  projects/  resume.pdf  socials.json  terminal.sh'
        ],
        uname: () => [
            'srinivasa.dev-terminal 1.0.0 frontend-browser x86_64-ish'
        ],
        fortune: () => [
            terminalFortunes[Math.floor(Math.random() * terminalFortunes.length)]
        ],
        hack: () => [
            'Initializing cinematic hack sequence...',
            'Access denied.',
            'Good. That would have been irresponsible.'
        ],
        neofetch: () => [
            'site: srinivasa.dev',
            'shell: browser-terminal',
            'theme: dark-clean',
            'uptime: depends on refresh discipline',
            'status: operational'
        ],
        echo: () => [
            'echo... echo... terminal is awake.'
        ],
        coffee: () => [
            'Caffeine levels: operational.',
            'Build quality improves noticeably after one more cup.'
        ],
        sudo: () => [
            '[sudo] password for visitor: nice try.'
        ],
        joke: () => [
            terminalJokes[Math.floor(Math.random() * terminalJokes.length)]
        ],
        matrix: () => [
            '01010011 01101110 00101110',
            'Glitch level nominal. Reality still compiling.'
        ],
        resume: () => ['https://srinivasa.dev/srinivasa-resume.pdf'],
        contact: () => [
            'Email: mailto:hello@srinivasa.dev',
            'I usually respond same day.'
        ]
    };

    // Aliases
    terminalCommands.projects = () => terminalCommands.ships();
    terminalCommands.myip = () => terminalCommands.ip();
    terminalCommands.timezone = () => terminalCommands.tz();
    terminalCommands.social = () => terminalCommands.socials();
    terminalCommands.current = () => terminalCommands.now();
    terminalCommands.tools = () => terminalCommands.uses();
    terminalCommands.work = () => terminalCommands.bestat();

    const handleTerminalCommand = (rawCommand) => {
        const command = rawCommand.trim();
        if (!command || !terminalScreen) return;

        addTerminalLine('', { prompt: 'visitor@srinivasa:~$', cmd: command });

        const normalized = command.toLowerCase();

        if (activeMiniGame && normalized !== 'help') {
            const gameReply = handleGuessGame(command);
            if (gameReply) {
                gameReply.forEach((line) => addTerminalLine(line, { output: line }));
                return;
            }
        }

        if (pendingTerminalPrompt?.type === 'weather-city' && normalized !== 'help') {
            const cityQuery = command.trim();
            pendingTerminalPrompt = null;
            if (!cityQuery) {
                addTerminalLine('City name was empty. Run `weather` again.', { output: 'City name was empty. Run `weather` again.' });
                return;
            }

            getWeatherSummaryForCity(cityQuery)
                .then((lines) => lines.forEach((line) => addTerminalLine(line, { output: line })))
                .catch(() => addTerminalLine(`Could not fetch weather for ${cityQuery}.`, { output: `Could not fetch weather for ${cityQuery}.` }));
            return;
        }

        if (pendingThemePrompt && normalized !== 'help') {
            pendingThemePrompt = false;
            if (!availableThemes.includes(normalized)) {
                addTerminalLine('Unknown theme. Choose: default, matrix, amber.', { output: 'Unknown theme. Choose: default, matrix, amber.' });
                return;
            }

            applyTerminalTheme(normalized);
            addTerminalLine(`Theme changed to ${normalized}.`, { output: `Theme changed to ${normalized}.` });
            return;
        }

        if (normalized === 'clear') {
            terminalScreen.innerHTML = '';
            return;
        }

        if (normalized === 'exit' || normalized === 'close' || normalized === 'quit') {
            closeTerminal();
            return;
        }

        const handler = terminalCommands[normalized];
        if (handler) {
            const result = handler();
            if (result instanceof Promise) {
                result
                    .then(lines => (Array.isArray(lines) ? lines : [String(lines)]))
                    .then(lines => {
                        if (normalized === 'help') {
                            addTerminalHelpColumns();
                            return;
                        }
                        lines.forEach(line => addTerminalLine(line, { output: line }));
                    })
                    .catch(() => addTerminalLine('command failed. try again.', { output: 'command failed. try again.' }));
            } else {
                if (normalized === 'help') {
                    addTerminalHelpColumns();
                } else {
                    (Array.isArray(result) ? result : [String(result)]).forEach(line => addTerminalLine(line, { output: line }));
                }
            }
            return;
        }

        addTerminalLine(`command not found: ${command}. try 'help'.`, { output: `command not found: ${command}. try 'help'.` });
    };

    const openTerminal = () => {
        if (!terminalOverlay) return;
        syncTerminalViewportHeight();
        lockedScrollY = window.scrollY || window.pageYOffset || 0;
        document.body.style.top = `-${lockedScrollY}px`;
        terminalOverlay.hidden = false;
        terminalOverlay.removeAttribute('hidden');
        document.body.classList.add('terminal-mode-open');
        printTerminalIntro();
        window.requestAnimationFrame(() => terminalInput?.focus());
    };

    const closeTerminal = () => {
        if (!terminalOverlay) return;
        terminalOverlay.hidden = true;
        terminalOverlay.setAttribute('hidden', 'true');
        document.body.classList.remove('terminal-mode-open');
        document.body.style.top = '';
        window.scrollTo(0, lockedScrollY);
        terminalHistoryIndex = -1;
    };

    terminalLaunchers.forEach(launcher => launcher.addEventListener('click', openTerminal));
    terminalClose?.addEventListener('click', closeTerminal);

    terminalOverlay?.addEventListener('click', (event) => {
        if (event.target === terminalOverlay) {
            closeTerminal();
        }
    });

    restoreTerminalTheme();
    syncTerminalViewportHeight();
    window.addEventListener('resize', syncTerminalViewportHeight);
    window.visualViewport?.addEventListener('resize', syncTerminalViewportHeight);

    terminalInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const value = terminalInput.value;
            if (value) {
                terminalHistory.unshift(value);
                terminalHistoryIndex = -1;
            }
            handleTerminalCommand(value);
            terminalInput.value = '';
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (terminalHistory.length === 0) return;
            terminalHistoryIndex = Math.min(terminalHistoryIndex + 1, terminalHistory.length - 1);
            terminalInput.value = terminalHistory[terminalHistoryIndex];
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (terminalHistoryIndex <= 0) {
                terminalHistoryIndex = -1;
                terminalInput.value = '';
            } else {
                terminalHistoryIndex -= 1;
                terminalInput.value = terminalHistory[terminalHistoryIndex] || '';
            }
        } else if (event.key === 'Escape') {
            closeTerminal();
        }
    });

    window.addEventListener('keydown', (event) => {
        const isTerminalShortcut = event.ctrlKey && event.shiftKey && (event.key === 'T' || event.key === 't');
        if (isTerminalShortcut) {
            event.preventDefault();
            if (terminalOverlay?.hidden) {
                openTerminal();
            } else {
                closeTerminal();
            }
        }
    });
});
