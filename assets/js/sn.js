document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const menuToggleBtn = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggleBtn && navLinks) {
        menuToggleBtn.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('active');
            menuToggleBtn.setAttribute('aria-expanded', String(isOpen));

            const icon = menuToggleBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars', !isOpen);
                icon.classList.toggle('fa-xmark', isOpen);
            }
        });

        // Close menu on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuToggleBtn.setAttribute('aria-expanded', 'false');

                const icon = menuToggleBtn.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-xmark');
                }
            });
        });
    }

    // Hide navbar on scroll down
    let lastScrollY = window.scrollY;
    const navbar = document.querySelector('.navbar');
    const brandName = document.querySelector('[data-brand-name]');
    const brandNameText = brandName?.querySelector('.logo-text') || brandName;
    const scrollTopButton = document.querySelector('.scroll-top');
    const brandSwitchThreshold = 180;
    let activeBrandName = '';
    const setInitialBrandName = () => {
        if (!brandNameText) {
            return;
        }

        activeBrandName = window.scrollY < brandSwitchThreshold ? 'Sn.' : 'Srinivasa.';
        brandNameText.textContent = activeBrandName;
    };

    const updateBrandName = () => {
        if (!brandNameText) {
            return;
        }

        const nextBrandName = window.scrollY < brandSwitchThreshold ? 'Sn.' : 'Srinivasa.';

        if (nextBrandName === activeBrandName) {
            return;
        }

        activeBrandName = nextBrandName;
        brandNameText.classList.add('is-switching');

        window.setTimeout(() => {
            brandNameText.textContent = nextBrandName;
            brandNameText.classList.remove('is-switching');
        }, 110);
    };

    const updateScrollTopTheme = () => {
        if (!scrollTopButton || scrollTopButton.hidden) {
            return;
        }

        const rect = scrollTopButton.getBoundingClientRect();
        const x = Math.max(0, Math.min(window.innerWidth - 1, Math.round(rect.left + rect.width / 2)));
        const y = Math.max(0, Math.min(window.innerHeight - 1, Math.round(rect.top + rect.height / 2)));

        scrollTopButton.style.visibility = 'hidden';
        const underlyingElement = document.elementFromPoint(x, y);
        scrollTopButton.style.visibility = '';

        let node = underlyingElement;
        let backgroundColor = 'rgb(255, 255, 255)';

        while (node && node !== document.body) {
            const computed = window.getComputedStyle(node);
            const color = computed.backgroundColor;

            if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
                backgroundColor = color;
                break;
            }

            node = node.parentElement;
        }

        const match = backgroundColor.match(/\d+(\.\d+)?/g);
        const [r, g, b] = match ? match.slice(0, 3).map(Number) : [255, 255, 255];
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const useLightButton = luminance < 0.45;

        scrollTopButton.classList.toggle('is-light', useLightButton);
        scrollTopButton.classList.toggle('is-dark', !useLightButton);
    };

    window.addEventListener('scroll', () => {
        if (navbar && window.scrollY > lastScrollY && window.scrollY > 100) {
            navbar.classList.add('nav-hidden');
        } else if (navbar) {
            navbar.classList.remove('nav-hidden');
        }

        updateBrandName();

        if (scrollTopButton) {
            scrollTopButton.hidden = window.scrollY < 300;
            updateScrollTopTheme();
        }

        lastScrollY = window.scrollY;
    });

    if (scrollTopButton) {
        scrollTopButton.classList.add('is-light');
        scrollTopButton.hidden = window.scrollY < 300;
        scrollTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        window.addEventListener('resize', updateScrollTopTheme);
        updateScrollTopTheme();
    }

    setInitialBrandName();

    // Contact form
    const contactForm = document.querySelector('#contact-form');
    const contactStatus = document.querySelector('#contact-status');

    if (contactForm && contactStatus) {
        const formStartedAtField = contactForm.querySelector('input[name="form_started_at"]');
        const minimumFillTimeMs = 4000;
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const nameField = contactForm.querySelector('input[name="name"]');
        const emailField = contactForm.querySelector('input[name="email"]');
        const messageField = contactForm.querySelector('textarea[name="message"]');
        const requiredFields = [nameField, emailField, messageField].filter(Boolean);

        const setStatus = (message, type) => {
            contactStatus.textContent = message;
            contactStatus.classList.remove('is-loading', 'is-success', 'is-error');
            contactStatus.hidden = !message;

            if (message && type) {
                contactStatus.classList.add(`is-${type}`);
            }
        };

        const clearFieldErrors = () => {
            requiredFields.forEach(field => field.classList.remove('is-error'));
        };

        const markMissingFields = () => {
            if (!nameField?.value.trim()) nameField?.classList.add('is-error');
            if (!emailField?.value.trim()) emailField?.classList.add('is-error');
            if (!messageField?.value.trim()) messageField?.classList.add('is-error');
        };

        const setLoadingState = isLoading => {
            contactForm.classList.toggle('is-loading', isLoading);

            if (submitButton) {
                submitButton.disabled = isLoading;
                submitButton.textContent = isLoading ? 'Sending...' : 'Get In Touch';
            }
        };

        requiredFields.forEach(field => {
            field.addEventListener('input', () => {
                if (field.value.trim()) {
                    field.classList.remove('is-error');
                }
            });
        });

        setStatus('');

        if (formStartedAtField) {
            formStartedAtField.value = String(Date.now());
        }

        contactForm.addEventListener('submit', async event => {
            event.preventDefault();

            const formData = new FormData(contactForm);
            const startedAtRaw = formData.get('form_started_at')?.toString().trim();
            const startedAt = Number(startedAtRaw || '0');
            const payload = {
                name: formData.get('name')?.toString().trim(),
                email: formData.get('email')?.toString().trim(),
                message: formData.get('message')?.toString().trim(),
                company: formData.get('company')?.toString().trim(),
                website: formData.get('website')?.toString().trim(),
                formStartedAt: startedAtRaw
            };
            clearFieldErrors();

            if (!payload.name || !payload.email || !payload.message) {
                markMissingFields();
                setStatus('Fill required fields.', 'error');
                return;
            }

            if (!startedAt || Date.now() - startedAt < minimumFillTimeMs) {
                setStatus('Try again in a moment.', 'error');
                return;
            }

            setStatus('Sending...', 'loading');
            setLoadingState(true);

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Failed to send');
                }

                contactForm.reset();
                if (formStartedAtField) {
                    formStartedAtField.value = String(Date.now());
                }
                clearFieldErrors();
                setStatus('Sent.', 'success');
            } catch (error) {
                setStatus(error.message || 'Send failed.', 'error');
            } finally {
                setLoadingState(false);
            }
        });
    }

    // Projects show more toggle
    const projectsList = document.querySelector('.projects-list');
    const projectsToggle = document.querySelector('.projects-toggle');
    const projectCards = Array.from(document.querySelectorAll('.project-row[data-project-url]'));

    projectCards.forEach(card => {
        const projectUrl = card.dataset.projectUrl;

        if (!projectUrl) {
            return;
        }

        card.addEventListener('click', event => {
            if (event.target.closest('a')) {
                return;
            }

            window.open(projectUrl, '_blank', 'noopener,noreferrer');
        });

        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                window.open(projectUrl, '_blank', 'noopener,noreferrer');
            }
        });
    });

    if (projectsList && projectsToggle) {
        const visibleProjectCards = Array.from(projectsList.querySelectorAll('.project-row'));
        const mobileLimit = Number(projectsList.dataset.projectLimitMobile || 4);
        const desktopLimit = Number(projectsList.dataset.projectLimitDesktop || 6);
        const isMobile = window.matchMedia('(max-width: 900px)').matches;
        const initialVisibleCount = isMobile ? mobileLimit : desktopLimit;
        const shouldCollapse = visibleProjectCards.length > initialVisibleCount;

        if (shouldCollapse) {
            projectsList.classList.add('is-collapsed');
            visibleProjectCards.forEach((card, index) => {
                if (index >= initialVisibleCount) {
                    card.classList.add('is-hidden');
                }
            });

            projectsToggle.hidden = false;
            projectsToggle.textContent = 'Show more';
            projectsToggle.setAttribute('aria-expanded', 'false');

            projectsToggle.addEventListener('click', () => {
                const isExpanded = projectsList.classList.toggle('is-collapsed') === false;
                projectsToggle.textContent = isExpanded ? 'Show less' : 'Show more';
                projectsToggle.setAttribute('aria-expanded', String(isExpanded));
            });
        }
    }

    // URL-driven X post previews
    const xPostsSection = document.querySelector('#latest-thoughts');
    const xPostsContainer = document.querySelector('[data-x-posts]');
    const xPostsDivider = document.querySelector('[data-x-posts-divider]');
    const xCarouselControls = document.querySelector('[data-x-carousel-controls]');
    const xCarouselPrevious = document.querySelector('[data-x-carousel-previous]');
    const xCarouselNext = document.querySelector('[data-x-carousel-next]');

    if (xPostsSection && xPostsContainer) {
        const MAX_X_POSTS = 12;
        const X_POST_URL_PATTERN = /^https:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})\/status\/(\d+)(?:[/?#].*)?$/;
        let controlsFrame;

        const updateCarouselControls = () => {
            if (!xCarouselControls || !xCarouselPrevious || !xCarouselNext) return;

            const cardCount = xPostsContainer.querySelectorAll('.x-post-slot').length;
            const mobileView = window.matchMedia('(max-width: 900px)').matches;
            const exceedsThreshold = cardCount > (mobileView ? 1 : 3);
            const hasOverflow = xPostsContainer.scrollWidth > xPostsContainer.clientWidth + 2;
            const showControls = exceedsThreshold && hasOverflow;
            const atStart = xPostsContainer.scrollLeft <= 2;
            const atEnd = xPostsContainer.scrollLeft + xPostsContainer.clientWidth >= xPostsContainer.scrollWidth - 2;

            xCarouselControls.hidden = !showControls;
            xCarouselPrevious.disabled = !showControls || atStart;
            xCarouselNext.disabled = !showControls || atEnd;
        };

        const scheduleControlsUpdate = () => {
            window.clearTimeout(controlsFrame);
            controlsFrame = window.setTimeout(updateCarouselControls, 0);
        };

        const scrollCarousel = direction => {
            const card = xPostsContainer.querySelector('.x-post-slot');
            if (!card) return;

            const gap = Number.parseFloat(window.getComputedStyle(xPostsContainer).columnGap) || 0;
            xPostsContainer.scrollBy({
                left: direction * (card.getBoundingClientRect().width + gap),
                behavior: 'smooth'
            });
        };

        xCarouselPrevious?.addEventListener('click', () => scrollCarousel(-1));
        xCarouselNext?.addEventListener('click', () => scrollCarousel(1));
        xPostsContainer.addEventListener('scroll', scheduleControlsUpdate, { passive: true });

        window.addEventListener('resize', scheduleControlsUpdate);

        const parseXPost = value => {
            if (typeof value !== 'string') {
                return null;
            }

            const url = value.trim();
            const match = url.match(X_POST_URL_PATTERN);

            return match ? { url, id: match[2] } : null;
        };

        const createSkeleton = () => {
            const skeleton = document.createElement('div');
            skeleton.className = 'x-post-skeleton';
            skeleton.setAttribute('aria-hidden', 'true');
            skeleton.innerHTML = Array.from({ length: 4 }, () => '<div class="x-post-skeleton-line"></div>').join('');
            return skeleton;
        };

        const showFallback = (slot, post) => {
            slot.replaceChildren();

            const fallback = document.createElement('div');
            fallback.className = 'x-post-fallback';

            const icon = document.createElement('i');
            icon.className = 'fa-brands fa-x-twitter x-post-fallback-icon';
            icon.setAttribute('aria-hidden', 'true');

            const copy = document.createElement('p');
            copy.className = 'x-post-fallback-copy';
            copy.textContent = 'This preview could not load here. You can try opening the post directly on X.';

            const link = document.createElement('a');
            link.className = 'x-post-fallback-link';
            link.href = post.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.innerHTML = 'View post on X <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>';

            fallback.append(icon, copy, link);
            slot.append(fallback);
            scheduleControlsUpdate();
        };

        const loadXWidgets = () => new Promise((resolve, reject) => {
            if (window.twttr?.widgets?.createTweet) {
                resolve(window.twttr);
                return;
            }

            const existingScript = document.querySelector('script[data-x-widgets]');
            const script = existingScript || document.createElement('script');
            let settled = false;

            const finish = callback => value => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeoutId);
                callback(value);
            };

            const waitForWidgets = () => {
                if (window.twttr?.widgets?.createTweet) {
                    finish(resolve)(window.twttr);
                } else {
                    finish(reject)(new Error('X widgets were unavailable.'));
                }
            };

            const timeoutId = window.setTimeout(
                finish(reject),
                10_000,
                new Error('X widgets timed out.')
            );

            script.addEventListener('load', waitForWidgets, { once: true });
            script.addEventListener('error', finish(reject), { once: true });

            if (!existingScript) {
                script.src = 'https://platform.twitter.com/widgets.js';
                script.async = true;
                script.charset = 'utf-8';
                script.dataset.xWidgets = 'true';
                document.head.append(script);
            }
        });

        const renderXPosts = async posts => {
            let widgets;

            try {
                widgets = await loadXWidgets();
            } catch {
                posts.forEach(({ post, slot }) => showFallback(slot, post));
                return;
            }

            posts.forEach(({ post, slot, skeleton }) => {
                let embedSeen = false;
                let settled = false;

                const observer = new MutationObserver(() => {
                    const iframe = slot.querySelector('iframe');
                    const hasEmbed = Boolean(iframe);

                    if (hasEmbed) {
                        embedSeen = true;
                        skeleton.remove();
                        scheduleControlsUpdate();
                        return;
                    }

                    if (embedSeen && !settled) {
                        settled = true;
                        observer.disconnect();
                        window.clearTimeout(timeoutId);
                        showFallback(slot, post);
                    }
                });

                const timeoutId = window.setTimeout(() => {
                    if (!slot.querySelector('iframe')) {
                        showFallback(slot, post);
                    }
                    settled = true;
                    observer.disconnect();
                }, 12_000);

                observer.observe(slot, { childList: true, subtree: true });

                widgets.widgets.createTweet(post.id, slot, {
                    cards: 'hidden',
                    conversation: 'none',
                    dnt: true,
                    theme: 'light'
                }).catch(() => {
                    if (settled) return;
                    settled = true;
                    observer.disconnect();
                    window.clearTimeout(timeoutId);
                    showFallback(slot, post);
                });
            });
        };

        fetch('/api/x-posts')
            .then(response => {
                if (!response.ok) {
                    throw new Error('API failed');
                }
                return response.json();
            })
            .catch(() => {
                // Fallback to static JSON if API fails or for local dev without wrangler
                return fetch('/assets/data/x-posts.json', { cache: 'no-store' })
                    .then(r => {
                        if (!r.ok) throw new Error('Could not load X post URLs.');
                        return r.json();
                    });
            })
            .then(values => {
                if (!Array.isArray(values)) {
                    return;
                }

                const seenIds = new Set();
                const posts = values
                    .map(parseXPost)
                    .filter(post => post && !seenIds.has(post.id) && seenIds.add(post.id))
                    .slice(0, MAX_X_POSTS);

                if (!posts.length) {
                    return;
                }

                const renderEntries = posts.map(post => {
                    const slot = document.createElement('article');
                    slot.className = 'x-post-slot';
                    slot.setAttribute('aria-label', `Post preview from @${post.url.match(X_POST_URL_PATTERN)[1]}`);
                    const skeleton = createSkeleton();
                    slot.append(skeleton);
                    xPostsContainer.append(slot);
                    return { post, slot, skeleton };
                });

                xPostsSection.hidden = false;
                if (xPostsDivider) xPostsDivider.hidden = false;
                scheduleControlsUpdate();

                const loadPosts = () => renderXPosts(renderEntries);

                if (!('IntersectionObserver' in window)) {
                    loadPosts();
                    return;
                }

                const observer = new IntersectionObserver(entries => {
                    if (!entries.some(entry => entry.isIntersecting)) {
                        return;
                    }

                    observer.disconnect();
                    loadPosts();
                }, { rootMargin: '500px 0px' });

                observer.observe(xPostsSection);
            })
            .catch(() => {
                xPostsSection.hidden = true;
                if (xPostsDivider) xPostsDivider.hidden = true;
            });
    }

    // Experience show more toggle
    const experienceList = document.querySelector('.experience-list');
    const experienceToggle = document.querySelector('.experience-toggle');

    if (experienceList && experienceToggle) {
        const experienceCards = Array.from(experienceList.querySelectorAll('.experience-card'));
        const initialVisibleCount = Number(experienceList.dataset.experienceLimit || 3);
        const shouldCollapse = experienceCards.length > initialVisibleCount;

        if (shouldCollapse) {
            experienceList.classList.add('is-collapsed');
            experienceCards.forEach((card, index) => {
                if (index >= initialVisibleCount) {
                    card.classList.add('is-hidden');
                }
            });

            experienceToggle.hidden = false;
            experienceToggle.textContent = 'Show more';
            experienceToggle.setAttribute('aria-expanded', 'false');

            experienceToggle.addEventListener('click', () => {
                const isExpanded = experienceList.classList.toggle('is-collapsed') === false;
                experienceToggle.textContent = isExpanded ? 'Show less' : 'Show more';
                experienceToggle.setAttribute('aria-expanded', String(isExpanded));
            });
        }
    }
});
