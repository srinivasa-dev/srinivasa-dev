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
