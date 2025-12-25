// Matter.js aliases
const { Engine, Render, World, Bodies, Body, Events } = Matter;

// State
let resolutions = [];
let expandedMarble = null;
let introComplete = false;

// Physics
let engine;
let world;
let marblesData = []; // Stores {body, element, resolution}

// Configuration
const INTRO_DURATION = 1500; // ms
const PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Responsive sizing
let JAR_WIDTH, MARBLE_SIZE, JAR_PADDING;

function updateDimensions() {
    const isMobile = window.innerWidth < 768;
    JAR_WIDTH = isMobile ? 340 : 600;
    MARBLE_SIZE = isMobile ? 70 : 100;
    JAR_PADDING = 20;
}

// Initialize
async function init() {
    updateDimensions();
    await loadResolutions();
    const jar = renderJar();
    const jarPos = initPhysics(jar);
    addMarblesWithPhysics(jarPos);
    startPhysicsLoop();

    // Keep at top for now (no intro scroll)
    window.scrollTo(0, 0);
    introComplete = true;

    // Stop physics after 5 seconds
    setTimeout(() => {
        freezeAllMarbles();
    }, 5000);
}

// Load resolutions from JSON
async function loadResolutions() {
    try {
        const response = await fetch('resolutions.json');
        resolutions = await response.json();
        // Reverse so oldest are at bottom (added first)
        resolutions.reverse();
    } catch (error) {
        console.error('Error loading resolutions:', error);
    }
}

// Render the jar container first to get its position
function renderJar() {
    const container = document.getElementById('container');
    const jar = document.createElement('div');
    jar.className = 'jar';
    jar.id = 'jar';

    // Calculate jar height dynamically
    const estimatedRows = Math.ceil(resolutions.length / 5);
    const jarHeight = Math.max(600, estimatedRows * MARBLE_SIZE + 200);
    jar.style.height = jarHeight + 'px';

    container.appendChild(jar);

    return jar;
}

// Initialize physics engine
function initPhysics(jar) {
    engine = Engine.create({
        gravity: { x: 0, y: 1 }
    });
    world = engine.world;

    // Get jar's actual position (including scroll offset)
    const jarRect = jar.getBoundingClientRect();
    const jarX = jarRect.left + jarRect.width / 2;
    const jarY = jarRect.top + window.scrollY; // Add scroll offset for absolute positioning
    const jarHeight = jarRect.height;

    console.log('Jar position:', {
        jarX,
        jarY,
        jarWidth: JAR_WIDTH,
        jarHeight,
        'jarRect.top': jarRect.top,
        'window.scrollY': window.scrollY
    });

    // Create jar boundaries
    const wallThickness = 10;

    // Match the marble spawn offset
    const physicsOffsetX = -100;

    // Left wall (inner edge)
    const leftWall = Bodies.rectangle(
        jarX + physicsOffsetX - JAR_WIDTH / 2 + wallThickness / 2,
        jarY + jarHeight / 2,
        wallThickness,
        jarHeight,
        { isStatic: true, label: 'leftWall' }
    );

    // Right wall (inner edge)
    const rightWall = Bodies.rectangle(
        jarX + physicsOffsetX + JAR_WIDTH / 2 - wallThickness / 2,
        jarY + jarHeight / 2,
        wallThickness,
        jarHeight,
        { isStatic: true, label: 'rightWall' }
    );

    // Bottom floor
    const floorY = jarY + jarHeight - wallThickness / 2;
    const floor = Bodies.rectangle(
        jarX + physicsOffsetX,
        floorY,
        JAR_WIDTH - wallThickness * 2,
        wallThickness,
        { isStatic: true, label: 'floor' }
    );

    console.log('Floor position:', { floorY, jarY, jarHeight });
    console.log('Wall positions:', {
        leftWallX: jarX + physicsOffsetX - JAR_WIDTH / 2,
        rightWallX: jarX + physicsOffsetX + JAR_WIDTH / 2
    });

    World.add(world, [leftWall, rightWall, floor]);

    return { jarX, jarY, jarHeight };
}

// Add marbles with physics
function addMarblesWithPhysics(jarPos) {
    const marblesLayer = document.getElementById('marbles-layer');
    const { jarX, jarY } = jarPos;

    // Shift marbles left on X-axis
    const offsetX = -100; // Adjust this value as needed

    resolutions.forEach((resolution, index) => {
        // Create physics body
        const radius = MARBLE_SIZE / 2;
        // Drop from jar center with slight randomness, shifted left
        const x = jarX + offsetX + (Math.random() - 0.5) * 50;
        const y = jarY + 20 + index * 5; // Start from top of jar, staggered

        console.log(`Marble ${index}:`, { x, y, radius, jarX, jarY, offsetX });

        const body = Bodies.circle(x, y, radius, {
            restitution: 0.3,
            friction: 0.5,
            density: 0.001,
            label: `marble-${index}`
        });

        World.add(world, body);

        // Create DOM element
        const marble = createMarbleElement(resolution);
        marblesLayer.appendChild(marble);

        // Store reference
        marblesData.push({ body, element: marble, resolution });

        // Add click handler
        marble.addEventListener('click', () => expandMarble(marble, resolution, body));
    });
}

// Create marble DOM element
function createMarbleElement(resolution) {
    const marble = document.createElement('div');
    marble.className = 'marble';
    marble.dataset.id = resolution.id;

    const text = document.createElement('div');
    text.className = 'marble-text';
    text.textContent = resolution.resolution;

    const metadata = document.createElement('div');
    metadata.className = 'marble-metadata';
    metadata.innerHTML = `
        ${resolution.age}<br>
        ${resolution.location}<br>
        ${resolution.initials}
    `;

    marble.appendChild(text);
    marble.appendChild(metadata);

    return marble;
}

// Physics update loop
function startPhysicsLoop() {
    function update() {
        Engine.update(engine, 1000 / 60);

        // Sync DOM elements with physics bodies
        marblesData.forEach(({ body, element }) => {
            if (!element.classList.contains('expanded')) {
                const x = body.position.x - MARBLE_SIZE / 2;
                const y = body.position.y - MARBLE_SIZE / 2;
                const angle = body.angle;

                element.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
            }
        });

        requestAnimationFrame(update);
    }

    update();
}

// Perform intro scroll animation
function performIntroScroll() {
    // Start at bottom
    window.scrollTo(0, document.body.scrollHeight);

    let cancelled = false;

    const cancelScroll = () => {
        cancelled = true;
        cleanup();
    };

    const cleanup = () => {
        window.removeEventListener('wheel', cancelScroll);
        window.removeEventListener('touchstart', cancelScroll);
        window.removeEventListener('keydown', cancelScroll);
        introComplete = true;
    };

    // Listen for user interaction
    window.addEventListener('wheel', cancelScroll, { passive: true });
    window.addEventListener('touchstart', cancelScroll, { passive: true });
    window.addEventListener('keydown', cancelScroll);

    // Smooth scroll to top
    const startTime = Date.now();
    const startScroll = window.scrollY;
    const targetScroll = 0;

    function animateScroll() {
        if (cancelled) return;

        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / INTRO_DURATION, 1);

        // Ease out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        const currentScroll = startScroll - (startScroll - targetScroll) * easeProgress;
        window.scrollTo(0, currentScroll);

        if (progress < 1) {
            requestAnimationFrame(animateScroll);
        } else {
            cleanup();
        }
    }

    requestAnimationFrame(animateScroll);
}

// Expand marble on click
function expandMarble(marbleElement, resolution, body) {
    if (expandedMarble) {
        collapseMarble();
        return;
    }

    expandedMarble = {
        element: marbleElement,
        scrollPosition: window.scrollY,
        body: body,
        originalPosition: { x: body.position.x, y: body.position.y }
    };

    // Make body static while expanded
    Body.setStatic(body, true);

    // Show overlay
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');

    // Expand marble
    marbleElement.classList.add('expanded');

    // Disable body scroll
    document.body.style.overflow = 'hidden';

    // Click overlay to close
    overlay.addEventListener('click', collapseMarble, { once: true });
}

// Collapse marble
function collapseMarble() {
    if (!expandedMarble) return;

    const overlay = document.getElementById('overlay');
    overlay.classList.remove('visible');

    expandedMarble.element.classList.remove('expanded');

    // Restore physics body
    Body.setStatic(expandedMarble.body, false);
    Body.setPosition(expandedMarble.body, expandedMarble.originalPosition);

    // Re-enable body scroll
    document.body.style.overflow = '';

    // Restore scroll position
    window.scrollTo(0, expandedMarble.scrollPosition);

    // Clean up overlay after transition
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 300);

    expandedMarble = null;
}

// Freeze all marbles (make them static)
function freezeAllMarbles() {
    console.log('Freezing all marbles...');
    marblesData.forEach(({ body }) => {
        Body.setStatic(body, true);
    });
}

// Escape key to close expanded marble
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && expandedMarble) {
        collapseMarble();
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    updateDimensions();
    // Note: Full physics rebuild on resize would be complex
    // For now, dimensions update on next page load
});

// Start the app
init();
