// Matter.js setup
const { Engine, Render, Runner, Bodies, Composite, Events } = Matter;

// Global variables
let resolutionData = [];
let marbles = [];
let engine, render, world;
let searchFilters = {
    id: '',
    resolution: '',
    initials: '',
    city: ''
};
let startTime = Date.now();
let spawnedMarbles = 0; // Count marbles as they spawn into view
let jarTopY = 0;

// Helper functions for color manipulation
function lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(2.55 * percent));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(2.55 * percent));
    const b = Math.min(255, (num & 0xff) + Math.round(2.55 * percent));
    return `rgb(${r}, ${g}, ${b})`;
}

function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(2.55 * percent));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent));
    const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent));
    return `rgb(${r}, ${g}, ${b})`;
}

// Draw simple jar with three walls (left, bottom, right) with rounded corners
function drawGlassJar(context, centerX, centerY, width, height, thickness) {
    const leftX = centerX - width / 2;
    const rightX = centerX + width / 2;
    const topY = centerY - height / 2;
    const bottomY = centerY + height / 2;
    const cornerRadius = 25; // Increased from 15 for more rounded bottom corners
    const topCurveDepth = 20; // How much the top curves down

    context.save();

    // Draw gradient background fill with rounded top
    const gradient = context.createLinearGradient(centerX, topY, centerX, bottomY);
    gradient.addColorStop(0, 'rgba(220, 230, 240, 0.3)');
    gradient.addColorStop(0.5, 'rgba(200, 215, 230, 0.4)');
    gradient.addColorStop(1, 'rgba(180, 200, 220, 0.5)');

    context.fillStyle = gradient;
    context.beginPath();
    // Start at top left
    context.moveTo(leftX, topY);
    // Top curve - rounded down like a jar opening
    context.quadraticCurveTo(centerX, topY + topCurveDepth, rightX, topY);
    // Right wall down to bottom corner
    context.lineTo(rightX, bottomY - cornerRadius);
    // Bottom right corner - rounded
    context.arcTo(rightX, bottomY, rightX - cornerRadius, bottomY, cornerRadius);
    // Bottom edge
    context.lineTo(leftX + cornerRadius, bottomY);
    // Bottom left corner - rounded
    context.arcTo(leftX, bottomY, leftX, bottomY - cornerRadius, cornerRadius);
    // Left wall back up to top
    context.lineTo(leftX, topY);
    context.closePath();
    context.fill();

    // Draw glass walls with thickness
    // Left wall
    const leftGradient = context.createLinearGradient(leftX - thickness, centerY, leftX + thickness, centerY);
    leftGradient.addColorStop(0, 'rgba(200, 220, 240, 0.4)');
    leftGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
    leftGradient.addColorStop(0.7, 'rgba(180, 200, 220, 0.3)');
    leftGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');

    context.fillStyle = leftGradient;
    context.beginPath();
    context.moveTo(leftX - thickness/2, topY);
    context.lineTo(leftX - thickness/2, bottomY - cornerRadius);
    context.arcTo(leftX - thickness/2, bottomY + thickness/2, leftX + cornerRadius, bottomY + thickness/2, cornerRadius);
    context.lineTo(leftX + thickness/2, bottomY - thickness/2);
    context.arcTo(leftX + thickness/2, bottomY - thickness/2, leftX + thickness/2, bottomY - cornerRadius, cornerRadius);
    context.lineTo(leftX + thickness/2, topY);
    context.closePath();
    context.fill();

    // Right wall
    const rightGradient = context.createLinearGradient(rightX - thickness, centerY, rightX + thickness, centerY);
    rightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    rightGradient.addColorStop(0.3, 'rgba(180, 200, 220, 0.3)');
    rightGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.6)');
    rightGradient.addColorStop(1, 'rgba(200, 220, 240, 0.4)');

    context.fillStyle = rightGradient;
    context.beginPath();
    context.moveTo(rightX - thickness/2, topY);
    context.lineTo(rightX - thickness/2, bottomY - cornerRadius);
    context.arcTo(rightX - thickness/2, bottomY - thickness/2, rightX - cornerRadius, bottomY - thickness/2, cornerRadius);
    context.lineTo(rightX + thickness/2, bottomY + thickness/2);
    context.arcTo(rightX + thickness/2, bottomY + thickness/2, rightX + thickness/2, bottomY - cornerRadius, cornerRadius);
    context.lineTo(rightX + thickness/2, topY);
    context.closePath();
    context.fill();

    // Bottom wall
    const bottomGradient = context.createLinearGradient(centerX, bottomY - thickness, centerX, bottomY + thickness);
    bottomGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    bottomGradient.addColorStop(0.4, 'rgba(180, 200, 220, 0.3)');
    bottomGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.5)');
    bottomGradient.addColorStop(1, 'rgba(200, 220, 240, 0.4)');

    context.fillStyle = bottomGradient;
    context.beginPath();
    // Outer bottom edge
    context.moveTo(leftX + cornerRadius, bottomY + thickness/2);
    context.lineTo(rightX - cornerRadius, bottomY + thickness/2);
    context.arcTo(rightX + thickness/2, bottomY + thickness/2, rightX + thickness/2, bottomY - cornerRadius, cornerRadius);
    context.lineTo(rightX + thickness/2, bottomY - thickness/2);
    context.arcTo(rightX + thickness/2, bottomY - thickness/2, rightX - cornerRadius, bottomY - thickness/2, cornerRadius);
    // Inner bottom edge
    context.lineTo(leftX + cornerRadius, bottomY - thickness/2);
    context.arcTo(leftX - thickness/2, bottomY - thickness/2, leftX - thickness/2, bottomY - cornerRadius, cornerRadius);
    context.lineTo(leftX - thickness/2, bottomY + thickness/2);
    context.arcTo(leftX - thickness/2, bottomY + thickness/2, leftX + cornerRadius, bottomY + thickness/2, cornerRadius);
    context.closePath();
    context.fill();

    // Add subtle edge highlights for definition
    context.strokeStyle = 'rgba(100, 120, 140, 0.3)';
    context.lineWidth = 1.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Outer edge - darker
    context.beginPath();
    context.moveTo(leftX, topY);
    context.lineTo(leftX, bottomY - cornerRadius);
    context.arcTo(leftX, bottomY, leftX + cornerRadius, bottomY, cornerRadius);
    context.lineTo(rightX - cornerRadius, bottomY);
    context.arcTo(rightX, bottomY, rightX, bottomY - cornerRadius, cornerRadius);
    context.lineTo(rightX, topY);
    context.stroke();

    // Inner edge - lighter
    context.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(leftX + thickness, topY);
    context.lineTo(leftX + thickness, bottomY - cornerRadius);
    context.arcTo(leftX + thickness, bottomY - thickness, leftX + cornerRadius, bottomY - thickness, cornerRadius);
    context.lineTo(rightX - cornerRadius, bottomY - thickness);
    context.arcTo(rightX - thickness, bottomY - thickness, rightX - thickness, bottomY - cornerRadius, cornerRadius);
    context.lineTo(rightX - thickness, topY);
    context.stroke();

    context.restore();
}

// Initialize the application
async function init() {
    try {
        // Try to load resolution data from JSON
        const response = await fetch('resolutions.json');
        if (!response.ok) throw new Error('Failed to load JSON');
        resolutionData = await response.json();
    } catch (error) {
        console.log('Loading from embedded data (use a local server to load from JSON)');
        // Fallback to embedded data if JSON fails to load
        resolutionData = [
            { id: "001", resolution: "Wake up before sunrise every day", initials: "DL", city: "Chicago, USA", age: 25, color: "#FFB3BA", size: 1.0 },
            { id: "002", resolution: "Complete my first triathlon in June", initials: "SK", city: "New York, USA", age: 32, color: "#FFDFBA", size: 1.1 },
            { id: "003", resolution: "Have real conversations with strangers weekly", initials: "MJ", city: "Austin, USA", age: 28, color: "#FFFFBA", size: 0.9 },
            { id: "004", resolution: "Launch the business I've been dreaming about", initials: "AP", city: "San Francisco, USA", age: 30, color: "#BAFFC9", size: 1.1 },
            { id: "005", resolution: "Stop checking phone first thing in morning", initials: "RG", city: "Seattle, USA", age: 27, color: "#BAE1FF", size: 1.0 },
            { id: "006", resolution: "Visit six countries across three continents", initials: "LC", city: "Boston, USA", age: 24, color: "#E0BBE4", size: 0.9 },
            { id: "007", resolution: "Finish writing the novel collecting dust", initials: "TH", city: "Portland, USA", age: 35, color: "#FFC8DD", size: 1.1 },
            { id: "008", resolution: "Do fifty pushups without stopping by summer", initials: "NK", city: "Denver, USA", age: 29, color: "#A2D2FF", size: 1.0 },
            { id: "009", resolution: "Cook dinner from scratch three times weekly", initials: "BW", city: "Miami, USA", age: 31, color: "#CDB4DB", size: 0.9 },
            { id: "010", resolution: "Eliminate all credit card debt completely", initials: "JS", city: "Atlanta, USA", age: 26, color: "#FEC89A", size: 1.0 },
            { id: "011", resolution: "Mentor a young person in my field", initials: "EP", city: "Philadelphia, USA", age: 33, color: "#FFB3BA", size: 1.1 },
            { id: "012", resolution: "Perform live at an open mic night", initials: "CM", city: "Nashville, USA", age: 23, color: "#BAFFC9", size: 0.9 },
            { id: "013", resolution: "Record and publish twelve podcast episodes", initials: "DK", city: "Los Angeles, USA", age: 28, color: "#BAE1FF", size: 1.0 },
            { id: "014", resolution: "Write handwritten letters to ten distant friends", initials: "AL", city: "Phoenix, USA", age: 30, color: "#E0BBE4", size: 1.1 },
            { id: "015", resolution: "Host monthly dinners to reconnect with loved ones", initials: "VM", city: "Minneapolis, USA", age: 27, color: "#FFC8DD", size: 0.9 }
        ];
    }

    // Start the physics engine
    setupPhysics();
}

function setupPhysics() {
    // Create engine with improved settings
    engine = Engine.create({
        constraintIterations: 4,
        positionIterations: 8,
        velocityIterations: 6,
        enableSleeping: true // Enable sleeping for stationary bodies
    });
    world = engine.world;
    engine.world.gravity.y = 0.8;

    // Get viewport dimensions (phone optimized)
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Fixed jar width to mimic mobile view (typical phone width ~375-428px)
    const fixedJarWidth = 330; // Fixed width regardless of screen size
    const jarWidth = fixedJarWidth;
    const marbleRadius = jarWidth / 12;
    const wallThickness = 20;

    // Jar height based on number of marbles
    // Simple linear formula: height = max(330, 9.2*N + 150)
    const N = resolutionData.length;
    const jarHeight = Math.max(330, 9.2 * N + 150);

    console.log(`Jar dimensions: ${jarWidth}px wide x ${jarHeight.toFixed(0)}px tall for ${resolutionData.length} marbles`)

    // Set canvas height to fit jar exactly
    const topMargin = 200;
    const bottomMargin = 80;
    const canvasHeight = topMargin + jarHeight + bottomMargin;

    // Create renderer with high DPI support
    render = Render.create({
        element: document.getElementById('canvas-container'),
        engine: engine,
        options: {
            width: screenWidth,
            height: canvasHeight,
            wireframes: false,
            background: 'transparent',
            showAngleIndicator: false,
            pixelRatio: window.devicePixelRatio || 1
        }
    });

    // Calculate jar position (centered horizontally, positioned from top)
    const jarX = screenWidth / 2;
    const jarY = topMargin + jarHeight / 2;
    jarTopY = jarY - jarHeight / 2; // Store jar top position globally

    // Position counter above jar - properly centered
    const counterElement = document.getElementById('counter');
    counterElement.style.left = '50%';
    counterElement.style.top = `${jarTopY - 60}px`;
    counterElement.style.transform = 'translateX(-50%)';

    // Create invisible jar walls (physics only, custom rendering)
    const jarBottom = Bodies.rectangle(
        jarX,
        jarY + jarHeight / 2,
        jarWidth,
        wallThickness,
        {
            isStatic: true,
            friction: 0.8, // Increased friction on bottom
            restitution: 0.2, // Reduced bounce on bottom
            slop: 0,
            render: {
                visible: false
            }
        }
    );

    const jarLeftWall = Bodies.rectangle(
        jarX - jarWidth / 2,
        jarY,
        wallThickness,
        jarHeight,
        {
            isStatic: true,
            friction: 0.5,
            restitution: 0.2, // Reduced bounce on walls
            slop: 0,
            render: {
                visible: false
            }
        }
    );

    const jarRightWall = Bodies.rectangle(
        jarX + jarWidth / 2,
        jarY,
        wallThickness,
        jarHeight,
        {
            isStatic: true,
            friction: 0.5,
            restitution: 0.2, // Reduced bounce on walls
            slop: 0,
            render: {
                visible: false
            }
        }
    );

    // Add jar to world
    Composite.add(world, [jarBottom, jarLeftWall, jarRightWall]);

    // Create marbles from JSON data (spawn from top of screen)
    for (let i = 0; i < resolutionData.length; i++) {
        const data = resolutionData[i];
        const sizeMultiplier = data.size || 1.0; // Default to 1.0 if not specified
        const marble = Bodies.circle(
            jarX + (Math.random() - 0.5) * (jarWidth * 0.3),
            -100 - (i * marbleRadius * 2.5), // Start above the visible canvas
            marbleRadius * sizeMultiplier,
            {
                restitution: 0.3, // Reduced from 0.5 - less bouncy
                friction: 0.5, // Increased from 0.3 - more friction
                frictionAir: 0.02, // Increased from 0.01 - more air resistance
                density: 0.008,
                slop: 0,
                sleepThreshold: 60, // Default threshold - prevents premature freezing
                render: {
                    fillStyle: data.color,
                    strokeStyle: '#ffffff',
                    lineWidth: 2
                },
                resolutionData: data,
                marbleColor: data.color
            }
        );
        marbles.push(marble);
    }

    // Add marbles to world
    Composite.add(world, marbles);

    // Run the engine with fixed timestep for stability
    const runner = Runner.create({
        delta: 1000 / 60,
        isFixed: true
    });
    Runner.run(runner, engine);
    Render.run(render);

    // Custom rendering to add 3D jar and text to marbles
    Events.on(render, 'afterRender', function() {
        const context = render.context;

        // Draw realistic 3D glass jar
        drawGlassJar(context, jarX, jarY, jarWidth, jarHeight, wallThickness);

        // Track spawned marbles (count as they enter the visible area)
        let spawned = 0;
        marbles.forEach(marble => {
            // Count marble as spawned if it has entered the visible canvas area (y > 0)
            if (marble.position.y > 0) {
                spawned++;
            }
        });

        if (spawned > spawnedMarbles) {
            spawnedMarbles = spawned;
            updateCounter();
        }

        marbles.forEach(marble => {
            const pos = marble.position;
            const radius = marble.circleRadius;
            const angle = marble.angle;
            const color = marble.marbleColor;
            const data = marble.resolutionData;
            const text = data.resolution;
            const id = data.id;

            // Check if this marble matches the search filters
            const hasActiveFilters = searchFilters.id || searchFilters.resolution || searchFilters.initials || searchFilters.city;
            const isFiltered = hasActiveFilters && !(
                (!searchFilters.id || id.toLowerCase().includes(searchFilters.id)) &&
                (!searchFilters.resolution || data.resolution.toLowerCase().includes(searchFilters.resolution)) &&
                (!searchFilters.initials || data.initials.toLowerCase().includes(searchFilters.initials)) &&
                (!searchFilters.city || data.city.toLowerCase().includes(searchFilters.city))
            );

            context.save();

            // Draw radial gradient for 3D sphere effect
            const gradient = context.createRadialGradient(
                pos.x - radius * 0.3,
                pos.y - radius * 0.3,
                radius * 0.1,
                pos.x,
                pos.y,
                radius
            );

            // Apply greyish filter if not matching search
            if (isFiltered) {
                gradient.addColorStop(0, 'rgba(200, 200, 200, 0.6)');
                gradient.addColorStop(0.4, 'rgba(180, 180, 180, 0.5)');
                gradient.addColorStop(1, 'rgba(160, 160, 160, 0.4)');
            } else {
                gradient.addColorStop(0, lightenColor(color, 40));
                gradient.addColorStop(0.4, color);
                gradient.addColorStop(1, darkenColor(color, 20));
            }

            context.beginPath();
            context.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            context.fillStyle = gradient;
            context.fill();

            // Add specular highlight for glossy effect
            const highlightGradient = context.createRadialGradient(
                pos.x - radius * 0.4,
                pos.y - radius * 0.4,
                0,
                pos.x - radius * 0.4,
                pos.y - radius * 0.4,
                radius * 0.5
            );
            highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
            highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            context.beginPath();
            context.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            context.fillStyle = highlightGradient;
            context.fill();

            // Rotate context for text based on marble angle
            context.translate(pos.x, pos.y);
            context.rotate(angle);
            context.translate(-pos.x, -pos.y);

            // Set text style with improved rendering (translucent)
            context.fillStyle = isFiltered ? 'rgba(120, 120, 120, 0.5)' : 'rgba(74, 74, 74, 0.75)';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.font = `${radius * 0.22}px 'Kalam', 'Patrick Hand', 'Caveat', cursive`;

            // Improve text rendering quality
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';

            // Word wrap the text to fit in circle (lowercase)
            const words = text.toLowerCase().split(' ');
            const lines = [];
            let currentLine = words[0];

            for (let i = 1; i < words.length; i++) {
                const testLine = currentLine + ' ' + words[i];
                const metrics = context.measureText(testLine);
                const maxWidth = radius * 1.6;

                if (metrics.width < maxWidth) {
                    currentLine = testLine;
                } else {
                    lines.push(currentLine);
                    currentLine = words[i];
                }
            }
            lines.push(currentLine);

            // Draw each line centered vertically
            const lineHeight = radius * 0.28;
            const totalHeight = lines.length * lineHeight;
            const startY = pos.y - totalHeight / 2 + lineHeight / 2;

            lines.forEach((line, index) => {
                context.fillText(line, pos.x, startY + index * lineHeight);
            });

            context.restore();
        });
    });

    // Setup interaction handlers
    setupInteractions();
    setupTiltControls();
    setupSearch();
}

function setupSearch() {
    const searchId = document.getElementById('search-id');
    const searchResolution = document.getElementById('search-resolution');
    const searchInitials = document.getElementById('search-initials');
    const searchCity = document.getElementById('search-city');

    searchId.addEventListener('input', (event) => {
        searchFilters.id = event.target.value.trim().toLowerCase();
    });

    searchResolution.addEventListener('input', (event) => {
        searchFilters.resolution = event.target.value.trim().toLowerCase();
    });

    searchInitials.addEventListener('input', (event) => {
        searchFilters.initials = event.target.value.trim().toLowerCase();
    });

    searchCity.addEventListener('input', (event) => {
        searchFilters.city = event.target.value.trim().toLowerCase();
    });

    // Clear all searches on escape key
    const clearAll = () => {
        searchId.value = '';
        searchResolution.value = '';
        searchInitials.value = '';
        searchCity.value = '';
        searchFilters.id = '';
        searchFilters.resolution = '';
        searchFilters.initials = '';
        searchFilters.city = '';
    };

    [searchId, searchResolution, searchInitials, searchCity].forEach(input => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                clearAll();
            }
        });
    });
}

function setupInteractions() {
    const modal = document.getElementById('marble-modal');
    const modalMarble = document.getElementById('modal-marble');
    const modalId = document.getElementById('modal-id');
    const modalInitials = document.getElementById('modal-initials');
    const modalCity = document.getElementById('modal-city');
    const modalAge = document.getElementById('modal-age');

    render.canvas.addEventListener('click', (event) => {
        const rect = render.canvas.getBoundingClientRect();
        const mousePosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };

        const clickedMarble = marbles.find(marble => {
            const distance = Math.sqrt(
                Math.pow(mousePosition.x - marble.position.x, 2) +
                Math.pow(mousePosition.y - marble.position.y, 2)
            );
            return distance <= marble.circleRadius;
        });

        if (clickedMarble) {
            showModal(clickedMarble);
        }
    });

    function showModal(marble) {
        const data = marble.resolutionData;
        const color = marble.marbleColor;

        modalMarble.style.backgroundColor = color;
        modalMarble.textContent = data.resolution.toLowerCase();
        modalId.textContent = `#${data.id}`;
        modalInitials.textContent = `by ${data.initials}`;
        modalCity.textContent = `from ${data.city}`;
        modalAge.textContent = `${data.age} years young`;

        modal.classList.add('active');
    }

    function closeModal() {
        modal.classList.remove('active');
    }

    // Close modal when clicking anywhere
    modal.addEventListener('click', () => {
        closeModal();
    });
}

function setupTiltControls() {
    let gravityX = 0;
    let gravityY = 1;

    function requestPermission() {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation);
                    }
                })
                .catch(console.error);
        } else {
            window.addEventListener('deviceorientation', handleOrientation);
        }
    }

    function handleOrientation(event) {
        const gamma = event.gamma;
        const beta = event.beta;

        if (gamma !== null && beta !== null) {
            gravityX = gamma / 90;
            gravityY = 1 + (beta - 90) / 90;

            engine.world.gravity.x = gravityX * 0.3;
            engine.world.gravity.y = Math.max(0.5, gravityY * 0.4);
        }
    }

    requestPermission();
}

// Handle window resize - disabled to prevent mobile browser address bar issues
// On mobile, when scrolling, the address bar shows/hides causing window.innerHeight
// to change, which would mess up the physics simulation and layout
// Instead, we keep the initial canvas size fixed
// If true responsive behavior is needed, uncomment and implement full recalculation
/*
window.addEventListener('resize', () => {
    if (render) {
        // Would need to recalculate:
        // - jar position and dimensions
        // - physics world walls
        // - counter position
        // - all marble positions
        render.canvas.width = window.innerWidth;
        render.canvas.height = window.innerHeight;
    }
});
*/

// Update counter based on spawned marbles
function updateCounter() {
    const counterElement = document.getElementById('counter');
    counterElement.textContent = spawnedMarbles;
}

// Start the app
console.log('Starting marble jar app...');
init().then(() => {
    // Initialize counter
    updateCounter();
}).catch(err => {
    console.error('Error initializing app:', err);
    alert('Error loading app. Please check console for details.');
});
