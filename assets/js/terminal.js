document.addEventListener('DOMContentLoaded', () => {
    const terminalOverlay = document.querySelector('[data-terminal]');
    const terminalLaunchers = document.querySelectorAll('[data-terminal-launch]');
    const terminalInput = terminalOverlay?.querySelector('.terminal-input');
    const terminalScreen = terminalOverlay?.querySelector('.terminal-screen');
    const terminalClose = terminalOverlay?.querySelector('.terminal-close');

    const terminalHistory = [];
    let terminalHistoryIndex = -1;
    let terminalBooted = false;
    let activeMiniGame = null;

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
        addTerminalLine("type 'help' to inspect available commands");
        terminalBooted = true;
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
    const getPublicIp = async () => {
        if (cachedIp) return cachedIp;
        const response = await fetchWithTimeout('https://api64.ipify.org?format=json', { cache: 'no-store' });
        if (!response.ok) throw new Error('ip lookup failed');
        const data = await response.json();
        cachedIp = data?.ip || null;
        if (!cachedIp) throw new Error('ip unavailable');
        return cachedIp;
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

    const getIpLocation = async () => {
        if (cachedIpLocation) return cachedIpLocation;

        const response = await fetchWithTimeout('https://ipapi.co/json/', {
            cache: 'no-store',
            headers: {
                Accept: 'application/json',
            },
        });

        if (!response.ok) throw new Error('location lookup failed');

        const data = await response.json();
        if (typeof data?.latitude !== 'number' || typeof data?.longitude !== 'number') {
            throw new Error('location unavailable');
        }

        cachedIpLocation = data;
        return cachedIpLocation;
    };

    const getWeatherSummary = async () => {
        const location = await getIpLocation();
        const latitude = location.latitude;
        const longitude = location.longitude;
        const cityBits = [location.city, location.region, location.country_name].filter(Boolean);
        const placeLabel = cityBits.join(', ') || 'your area';

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
                const ip = await getPublicIp();
                return [`Public IP (via ipify): ${ip}`];
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
            try {
                return await getWeatherSummary();
            } catch (error) {
                return ['Could not fetch weather for your IP location right now. Try again in a bit.'];
            }
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
        terminalHistoryIndex = -1;
    };

    terminalLaunchers.forEach(launcher => launcher.addEventListener('click', openTerminal));
    terminalClose?.addEventListener('click', closeTerminal);

    terminalOverlay?.addEventListener('click', (event) => {
        if (event.target === terminalOverlay) {
            closeTerminal();
        }
    });

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
