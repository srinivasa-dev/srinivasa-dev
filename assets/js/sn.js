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
    const scrollTopButton = document.querySelector('.scroll-top');

    window.addEventListener('scroll', () => {
        if (navbar && window.scrollY > lastScrollY && window.scrollY > 100) {
            // Scrolling down and past the top
            navbar.classList.add('nav-hidden');
        } else if (navbar) {
            // Scrolling up or at the top
            navbar.classList.remove('nav-hidden');
        }

        if (scrollTopButton) {
            scrollTopButton.hidden = window.scrollY < 300;
        }

        lastScrollY = window.scrollY;
    });

    if (scrollTopButton) {
        scrollTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Contact form
    const contactForm = document.querySelector('#contact-form');
    const contactStatus = document.querySelector('#contact-status');

    if (contactForm && contactStatus) {
        const formStartedAtField = contactForm.querySelector('input[name="form_started_at"]');
        const minimumFillTimeMs = 4000;

        if (formStartedAtField) {
            formStartedAtField.value = String(Date.now());
        }

        contactForm.addEventListener('submit', async event => {
            event.preventDefault();

            const submitButton = contactForm.querySelector('button[type="submit"]');
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

            if (!payload.name || !payload.email || !payload.message) {
                contactStatus.textContent = 'Please complete all required fields.';
                return;
            }

            if (!startedAt || Date.now() - startedAt < minimumFillTimeMs) {
                contactStatus.textContent = 'Please take a moment and try again.';
                return;
            }

            contactStatus.textContent = 'Sending message...';

            if (submitButton) {
                submitButton.disabled = true;
            }

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
                contactStatus.textContent = 'Message sent successfully.';
            } catch (error) {
                contactStatus.textContent = error.message || 'Failed to send message.';
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                }
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
        const initialVisibleCount = Number(projectsList.dataset.projectLimit || 6);
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
});
