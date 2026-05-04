(() => {
    'use strict';

    const THEME_NAMES = ['prime', 'iron', 'zeus', 'miami', 'black', 'hyper', 'mecha', 'galactic', 'cyber'];
    const TYPING_WORDS = ['AI Developer', 'Robotics Engineer', 'Game Modder', 'Creative Designer'];
    const root = document.documentElement;
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 947px)');
    const saveData = Boolean(navigator.connection && navigator.connection.saveData);

    const $ = (selector, scope = document) => scope.querySelector(selector);
    const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

    let shaderController = null;

    function requestIdle(callback) {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(callback, { timeout: 1200 });
        } else {
            window.setTimeout(callback, 1);
        }
    }

    function updateNavHeightVariable() {
        const navbar = $('.navbar');
        if (!navbar) return;
        root.style.setProperty('--site-nav-height', `${Math.ceil(navbar.getBoundingClientRect().height)}px`);
    }

    function setupNavigation() {
        const navbar = $('.navbar');
        const scrollBtn = $('.scroll-up-btn');
        const navToggle = $('.nav-toggle');
        const navMenu = $('.navbar .menu');
        const navLinks = $$('.navbar .menu li a');
        const smoothLinks = $$('.navbar .menu li a, .home .home-content a, .navbar .logo a');
        const sections = navLinks
            .map(link => $(link.getAttribute('href')))
            .filter(Boolean);

        if ('ResizeObserver' in window && navbar) {
            const observer = new ResizeObserver(() => updateNavHeightVariable());
            observer.observe(navbar);
        }
        updateNavHeightVariable();

        function closeMenu() {
            if (!navMenu || !navToggle) return;
            navMenu.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
            const icon = $('i', navToggle);
            if (icon) {
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-xmark');
            }
        }

        function updateActiveLink() {
            if (!sections.length) return;
            let currentId = sections[0].id || 'home';
            const offset = window.innerHeight * 0.35;

            for (const section of sections) {
                if (section.getBoundingClientRect().top <= offset) {
                    currentId = section.id;
                }
            }

            for (const link of navLinks) {
                link.classList.toggle('active-link', link.getAttribute('href') === `#${currentId}`);
            }
        }

        function updateScrollState() {
            const y = window.scrollY || window.pageYOffset;
            if (navbar) navbar.classList.toggle('sticky', y > 20);
            if (scrollBtn) scrollBtn.classList.toggle('show', y > 500);
            updateActiveLink();
        }

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                updateScrollState();
                ticking = false;
            });
        }, { passive: true });

        window.addEventListener('resize', () => {
            requestAnimationFrame(() => {
                updateNavHeightVariable();
                updateScrollState();
            });
        }, { passive: true });

        if (scrollBtn) {
            scrollBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: reduceMotionQuery.matches ? 'auto' : 'smooth' });
            });
        }

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', event => {
                event.stopPropagation();
                const isOpen = navMenu.classList.toggle('active');
                navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                const icon = $('i', navToggle);
                if (icon) {
                    icon.classList.toggle('fa-bars', !isOpen);
                    icon.classList.toggle('fa-xmark', isOpen);
                }
            });
        }

        for (const link of smoothLinks) {
            link.addEventListener('click', event => {
                const href = link.getAttribute('href');
                if (!href || !href.startsWith('#')) return;

                const target = $(href);
                if (!target) return;

                event.preventDefault();
                const navHeight = navbar ? navbar.getBoundingClientRect().height : 0;
                const breathingRoom = mobileQuery.matches ? 12 : 10;
                const targetY = href === '#home'
                    ? 0
                    : target.getBoundingClientRect().top + window.pageYOffset - navHeight - breathingRoom;

                window.scrollTo({
                    top: Math.max(0, targetY),
                    behavior: reduceMotionQuery.matches ? 'auto' : 'smooth'
                });
                closeMenu();
            });
        }

        document.addEventListener('click', event => {
            if (!event.target.closest('.navbar .menu, .nav-toggle')) closeMenu();
        });

        updateScrollState();
    }

    function setupThemeSelector() {
        const selector = $('.theme-selector');
        const button = $('.theme-toggle-btn');
        const dropdown = $('.theme-dropdown');
        const options = $$('.theme-option');

        function setTheme(theme) {
            for (const name of THEME_NAMES) root.classList.remove(`theme-${name}`);
            if (theme && theme !== 'prime') root.classList.add(`theme-${theme}`);
            localStorage.setItem('selectedTheme', theme || 'prime');

            for (const option of options) {
                option.classList.toggle('selected', option.dataset.theme === theme);
            }

            if (shaderController) shaderController.updateColors();
        }

        if (button && selector && dropdown) {
            button.addEventListener('click', event => {
                event.stopPropagation();
                selector.classList.toggle('is-open');
            });

            document.addEventListener('click', event => {
                if (!event.target.closest('.theme-selector')) {
                    selector.classList.remove('is-open');
                }
            });
        }

        for (const option of options) {
            option.addEventListener('click', event => {
                event.stopPropagation();
                setTheme(option.dataset.theme || 'prime');
                if (selector && dropdown) {
                    selector.classList.remove('is-open');
                }
            });
        }

        const savedTheme = localStorage.getItem('selectedTheme') || 'prime';
        setTheme(savedTheme);
    }

    function setupTyping(selector) {
        const element = $(selector);
        if (!element) return;

        if (reduceMotionQuery.matches || saveData) {
            element.textContent = TYPING_WORDS[0];
            return;
        }

        let wordIndex = 0;
        let charIndex = 0;
        let deleting = false;
        let timeoutId = 0;

        function tick() {
            if (document.hidden) {
                timeoutId = window.setTimeout(tick, 500);
                return;
            }

            const word = TYPING_WORDS[wordIndex];
            element.textContent = word.slice(0, charIndex);

            if (!deleting && charIndex < word.length) {
                charIndex += 1;
                timeoutId = window.setTimeout(tick, 95);
                return;
            }

            if (!deleting && charIndex === word.length) {
                deleting = true;
                timeoutId = window.setTimeout(tick, 1150);
                return;
            }

            if (deleting && charIndex > 0) {
                charIndex -= 1;
                timeoutId = window.setTimeout(tick, 55);
                return;
            }

            deleting = false;
            wordIndex = (wordIndex + 1) % TYPING_WORDS.length;
            timeoutId = window.setTimeout(tick, 240);
        }

        tick();
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !timeoutId) tick();
        });
    }

    function setupHeroImageHeight() {
        const images = $('.images');
        if (!images) return;

        function setHeight() {
            images.style.height = `${window.innerHeight}px`;
            root.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        }

        setHeight();
        let resizeTimer = 0;
        window.addEventListener('resize', () => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(setHeight, 120);
        }, { passive: true });
    }

    class Carousel {
        constructor(container, dotsContainer) {
            this.container = container;
            this.dotsContainer = dotsContainer;
            this.cards = $$('.card', container);
            this.totalCards = this.cards.length;
            this.currentIndex = Math.min(2, Math.max(0, this.totalCards - 1));
            this.isAnimating = false;
            this.touchStartX = 0;
            this.touchEndX = 0;
            this.autoRotateId = 0;
            this.autoRotateDelay = saveData || reduceMotionQuery.matches ? 0 : 4200;
            this.isPaused = false;

            if (!this.totalCards) return;
            this.init();
        }

        init() {
            this.setupDots();
            this.setupEventListeners();
            this.preloadNearbyImages();
            this.updateCards();
            this.startAutoRotate();
        }

        startAutoRotate() {
            if (!this.autoRotateDelay) return;
            this.autoRotateId = window.setInterval(() => {
                if (!this.isPaused && !document.hidden) {
                    this.goToCard((this.currentIndex + 1) % this.totalCards);
                }
            }, this.autoRotateDelay);
        }

        preloadNearbyImages() {
            for (const card of this.cards) {
                const img = $('img', card);
                if (!img) continue;
                const index = Number(card.dataset.index || 0);
                const distance = Math.abs(index - this.currentIndex);
                if (distance <= 1 || distance >= this.totalCards - 1) img.loading = 'eager';
            }
        }

        calculatePositions(index) {
            const position = ((index - this.currentIndex + this.totalCards) % this.totalCards + this.totalCards) % this.totalCards;

            if (mobileQuery.matches) {
                if (position === 0) return { transform: 'translateX(0) scale(1)', opacity: 1, zIndex: 4 };
                if (position === 1) return { transform: 'translateX(112%) scale(0.88)', opacity: 0, zIndex: 2 };
                if (position === this.totalCards - 1) return { transform: 'translateX(-112%) scale(0.88)', opacity: 0, zIndex: 2 };
                const direction = position <= this.totalCards / 2 ? 1 : -1;
                return { transform: `translateX(${direction * 140}%) scale(0.82)`, opacity: 0, zIndex: 1 };
            }

            if (position === 0) return { transform: 'translateX(0) scale(1)', opacity: 1, zIndex: 3 };
            if (position === 1) return { transform: 'translateX(160%) scale(0.7)', opacity: 0.6, zIndex: 2 };
            if (position === this.totalCards - 1) return { transform: 'translateX(-160%) scale(0.7)', opacity: 0.6, zIndex: 2 };
            const direction = position <= this.totalCards / 2 ? 1 : -1;
            return { transform: `translateX(${direction * 250}%) scale(0.6)`, opacity: 0.6, zIndex: 1 };
        }

        setupDots() {
            this.dotsContainer.textContent = '';
            for (let i = 0; i < this.totalCards; i += 1) {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = `dot${i === this.currentIndex ? ' active' : ''}`;
                dot.setAttribute('aria-label', `Show project ${i + 1}`);
                dot.addEventListener('click', () => this.goToCard(i));
                this.dotsContainer.appendChild(dot);
            }
        }

        setupEventListeners() {
            this.container.addEventListener('click', event => {
                const card = event.target.closest('.card');
                if (!card || !this.container.contains(card)) return;
                if (event.target.closest('.explore-btn')) return;

                const index = this.cards.indexOf(card);
                if (index !== -1 && index !== this.currentIndex) this.goToCard(index);
            });

            this.container.addEventListener('mouseenter', () => { this.isPaused = true; });
            this.container.addEventListener('mouseleave', () => { this.isPaused = false; });

            this.container.addEventListener('touchstart', event => {
                this.touchStartX = event.touches[0].clientX;
                this.touchEndX = this.touchStartX;
                this.isPaused = true;
            }, { passive: true });

            this.container.addEventListener('touchmove', event => {
                this.touchEndX = event.touches[0].clientX;
            }, { passive: true });

            this.container.addEventListener('touchend', () => {
                const swipeDistance = this.touchEndX - this.touchStartX;
                if (Math.abs(swipeDistance) > 50) {
                    const direction = swipeDistance > 0 ? -1 : 1;
                    this.goToCard((this.currentIndex + direction + this.totalCards) % this.totalCards);
                }
                window.setTimeout(() => { this.isPaused = false; }, 700);
            }, { passive: true });

            this.container.addEventListener('transitionend', event => {
                if (event.target.classList.contains('card')) {
                    this.isAnimating = false;
                    this.preloadNearbyImages();
                }
            });

            window.addEventListener('resize', () => requestAnimationFrame(() => this.updateCards()), { passive: true });
        }

        updateCards() {
            requestAnimationFrame(() => {
                for (let index = 0; index < this.cards.length; index += 1) {
                    const card = this.cards[index];
                    const { transform, opacity, zIndex } = this.calculatePositions(index);
                    card.style.transform = transform;
                    card.style.opacity = opacity;
                    card.style.zIndex = zIndex;
                    card.classList.toggle('main-card', index === this.currentIndex);
                    card.classList.toggle('side-card', index !== this.currentIndex);
                    card.classList.toggle('active', index === this.currentIndex);
                    card.setAttribute('aria-hidden', index === this.currentIndex ? 'false' : 'true');
                }

                const dots = $$('.dot', this.dotsContainer);
                for (let index = 0; index < dots.length; index += 1) {
                    dots[index].classList.toggle('active', index === this.currentIndex);
                    dots[index].setAttribute('aria-current', index === this.currentIndex ? 'true' : 'false');
                }
            });
        }

        goToCard(index) {
            if (this.isAnimating || index === this.currentIndex || index < 0 || index >= this.totalCards) return;
            this.isAnimating = true;
            this.currentIndex = index;
            this.updateCards();
        }
    }

    function setupProjectCarousel() {
        const projectsContainer = $('.projects');
        const navigationDots = $('.navigation-dots');
        if (projectsContainer && navigationDots) new Carousel(projectsContainer, navigationDots);
    }

    function setupHiddenIcon() {
        const hiddenIcon = $('#hidden-icon');
        if (!hiddenIcon) return;
        hiddenIcon.addEventListener('click', () => {
            const password = window.prompt('Enter the password:');
            if (password === '8055') {
                window.open('https://hackmd.io/@UsqfrpfnRwuTsLQGJGrx7w/Zeus', '_blank', 'noopener,noreferrer');
            } else if (password !== null) {
                window.alert('Incorrect password. Try again.');
            }
        });
    }

    function parseColor(color) {
        const value = color.trim();
        if (value.startsWith('#')) {
            const hex = value.length === 4
                ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
                : value;
            return [
                parseInt(hex.slice(1, 3), 16) / 255,
                parseInt(hex.slice(3, 5), 16) / 255,
                parseInt(hex.slice(5, 7), 16) / 255
            ];
        }
        return [1, 1, 1];
    }

    function setupWebGLBackground() {
        const canvas = $('#neuro');
        const vertexSource = $('#vertShader')?.textContent;
        const fragmentSource = $('#fragShader')?.textContent;
        if (!canvas || !vertexSource || !fragmentSource) return null;

        const gl = canvas.getContext('webgl', {
            antialias: false,
            alpha: true,
            depth: false,
            stencil: false,
            powerPreference: saveData ? 'low-power' : 'default',
            preserveDrawingBuffer: false
        }) || canvas.getContext('experimental-webgl');

        if (!gl) {
            canvas.style.opacity = '0';
            return null;
        }

        function createShader(source, type) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        const vertexShader = createShader(vertexSource, gl.VERTEX_SHADER);
        const fragmentShader = createShader(fragmentSource, gl.FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) return null;

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Shader link error:', gl.getProgramInfoLog(program));
            return null;
        }

        gl.useProgram(program);

        const uniforms = Object.create(null);
        const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i += 1) {
            const name = gl.getActiveUniform(program, i).name;
            uniforms[name] = gl.getUniformLocation(program, name);
        }

        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
        let dpr = 1;
        let colorCache = {
            top: [1, 1, 1],
            middle: [1, 1, 1],
            bottom: [1, 1, 1]
        };
        let frameId = 0;
        let lastFrameTime = 0;
        const targetFps = saveData ? 20 : (mobileQuery.matches ? 30 : 45);
        const frameInterval = 1000 / targetFps;

        function updateColors() {
            const styles = getComputedStyle(root);
            colorCache = {
                top: parseColor(styles.getPropertyValue('--top')),
                middle: parseColor(styles.getPropertyValue('--middle')),
                bottom: parseColor(styles.getPropertyValue('--bottom'))
            };
        }

        function resizeCanvas() {
            const cap = saveData ? 0.9 : (mobileQuery.matches ? 1 : 1.35);
            dpr = Math.min(window.devicePixelRatio || 1, cap);
            const width = Math.max(1, Math.floor(window.innerWidth * dpr));
            const height = Math.max(1, Math.floor(window.innerHeight * dpr));

            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                gl.viewport(0, 0, width, height);
                if (uniforms.u_ratio) gl.uniform1f(uniforms.u_ratio, width / height);
            }
        }

        function updatePointer(x, y) {
            pointer.targetX = x;
            pointer.targetY = y;
        }

        function render(now = 0) {
            frameId = requestAnimationFrame(render);
            if (document.hidden) return;
            if (now - lastFrameTime < frameInterval) return;
            lastFrameTime = now;

            pointer.x += (pointer.targetX - pointer.x) * 0.35;
            pointer.y += (pointer.targetY - pointer.y) * 0.35;

            if (uniforms.u_time) gl.uniform1f(uniforms.u_time, now);
            if (uniforms.u_pointer_position) {
                gl.uniform2f(
                    uniforms.u_pointer_position,
                    pointer.x / Math.max(1, window.innerWidth),
                    1 - pointer.y / Math.max(1, window.innerHeight)
                );
            }
            if (uniforms.u_top_color) gl.uniform3fv(uniforms.u_top_color, colorCache.top);
            if (uniforms.u_middle_color) gl.uniform3fv(uniforms.u_middle_color, colorCache.middle);
            if (uniforms.u_bottom_color) gl.uniform3fv(uniforms.u_bottom_color, colorCache.bottom);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        let resizePending = false;
        window.addEventListener('resize', () => {
            if (resizePending) return;
            resizePending = true;
            requestAnimationFrame(() => {
                resizeCanvas();
                resizePending = false;
            });
        }, { passive: true });

        window.addEventListener('pointermove', event => updatePointer(event.clientX, event.clientY), { passive: true });
        window.addEventListener('click', event => updatePointer(event.clientX, event.clientY), { passive: true });
        window.addEventListener('touchmove', event => {
            const touch = event.targetTouches[0];
            if (touch) updatePointer(touch.clientX, touch.clientY);
        }, { passive: true });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !frameId) render(performance.now());
        });

        updateColors();
        resizeCanvas();

        if (reduceMotionQuery.matches) {
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        } else {
            frameId = requestAnimationFrame(render);
        }

        return { updateColors };
    }

    function init() {
        setupNavigation();
        setupThemeSelector();
        setupHeroImageHeight();
        setupHiddenIcon();
        requestIdle(() => {
            setupTyping('.typing');
            setupTyping('.typing-2');
            setupProjectCarousel();
        });
        shaderController = setupWebGLBackground();
        if (shaderController) shaderController.updateColors();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
