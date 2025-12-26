// Matter.js setup
const { Engine, Render, Runner, Bodies, Composite, Events } = Matter;

// Global variables
let resolutionData = [];
let marbles = [];
let engine, render, world;
let searchFilters = { id: '', resolution: '', initials: '', city: '' };
let spawnedMarbles = 0;
let jarTopY = 0;

// Helper function to ensure color has # prefix
function normalizeColor(color) {
    if (!color) return '#FFB3BA'; // Default color if missing
    // If color doesn't start with #, add it
    return color.startsWith('#') ? color : `#${color}`;
}

// Helper function to convert size string to multiplier
function normalizeSize(size) {
    // Handle null/undefined
    if (!size) return 1.0;

    // If already a number, validate and return it
    if (typeof size === 'number') {
        return (isFinite(size) && size > 0) ? size : 1.0;
    }

    // Convert string to lowercase for case-insensitive matching
    const sizeStr = String(size).toLowerCase().trim();

    // Map size strings to multipliers
    switch (sizeStr) {
        case 'small':
            return 0.85;
        case 'medium':
            return 1.0;
        case 'large':
            return 1.15;
        default:
            // Try to parse as number, default to 1.0
            const parsed = parseFloat(size);
            return (isFinite(parsed) && parsed > 0) ? parsed : 1.0;
    }
}

// Parse hex color to RGB components
function hexToRgb(color) {
    const hex = color.replace('#', '');
    return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
    };
}

// Check if color is dark (needs white text)
function isColorDark(color) {
    const { r, g, b } = hexToRgb(color);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
}

// Adjust color brightness
function adjustColor(color, percent) {
    const { r, g, b } = hexToRgb(color);
    const adjust = Math.round(2.55 * percent);
    const clamp = (val) => Math.max(0, Math.min(255, val));
    return `rgb(${clamp(r + adjust)}, ${clamp(g + adjust)}, ${clamp(b + adjust)})`;
}

// Truncate text to max length
function truncateText(text, maxLength = 50) {
    const lower = text.toLowerCase();
    return lower.length > maxLength ? lower.substring(0, maxLength) + '...' : lower;
}

// Helper to draw jar path (reusable for fill and stroke)
function createJarPath(context, leftX, rightX, topY, bottomY, cornerRadius, topCurveDepth = 20) {
    context.beginPath();
    context.moveTo(leftX, topY);
    context.quadraticCurveTo(leftX + (rightX - leftX) / 2, topY + topCurveDepth, rightX, topY);
    context.lineTo(rightX, bottomY - cornerRadius);
    context.arcTo(rightX, bottomY, rightX - cornerRadius, bottomY, cornerRadius);
    context.lineTo(leftX + cornerRadius, bottomY);
    context.arcTo(leftX, bottomY, leftX, bottomY - cornerRadius, cornerRadius);
    context.lineTo(leftX, topY);
}

// Draw jar with three walls
function drawGlassJar(context, centerX, centerY, width, height, thickness) {
    const halfW = width / 2, halfH = height / 2;
    const leftX = centerX - halfW, rightX = centerX + halfW;
    const topY = centerY - halfH, bottomY = centerY + halfH;
    const cornerRadius = 25;
    const t = thickness, t2 = t / 2;

    context.save();

    // Background fill
    const bgGrad = context.createLinearGradient(centerX, topY, centerX, bottomY);
    bgGrad.addColorStop(0, 'rgba(228, 233, 238, 0.5)');
    bgGrad.addColorStop(0.5, 'rgba(210, 218, 225, 0.6)');
    bgGrad.addColorStop(1, 'rgba(193, 203, 213, 0.7)');
    context.fillStyle = bgGrad;
    createJarPath(context, leftX, rightX, topY, bottomY, cornerRadius);
    context.fill();

    // Wall helper
    const drawWall = (grad, path) => {
        context.fillStyle = grad;
        context.beginPath();
        path();
        context.closePath();
        context.fill();
    };

    // Left wall
    const leftGrad = context.createLinearGradient(leftX - t, centerY, leftX + t, centerY);
    leftGrad.addColorStop(0, 'rgba(208, 218, 228, 0.6)');
    leftGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
    leftGrad.addColorStop(0.7, 'rgba(190, 203, 215, 0.5)');
    leftGrad.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
    drawWall(leftGrad, () => {
        context.moveTo(leftX - t2, topY);
        context.lineTo(leftX - t2, bottomY - cornerRadius);
        context.arcTo(leftX - t2, bottomY, leftX + cornerRadius, bottomY, cornerRadius);
        context.lineTo(leftX + cornerRadius, bottomY);
        context.arcTo(leftX, bottomY, leftX, bottomY - cornerRadius, cornerRadius);
        context.lineTo(leftX, topY);
    });

    // Right wall
    const rightGrad = context.createLinearGradient(rightX - t, centerY, rightX + t, centerY);
    rightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    rightGrad.addColorStop(0.3, 'rgba(190, 203, 215, 0.5)');
    rightGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.7)');
    rightGrad.addColorStop(1, 'rgba(208, 218, 228, 0.6)');
    drawWall(rightGrad, () => {
        context.moveTo(rightX + t2, topY);
        context.lineTo(rightX + t2, bottomY - cornerRadius);
        context.arcTo(rightX + t2, bottomY, rightX - cornerRadius, bottomY, cornerRadius);
        context.lineTo(rightX - cornerRadius, bottomY);
        context.arcTo(rightX, bottomY, rightX, bottomY - cornerRadius, cornerRadius);
        context.lineTo(rightX, topY);
    });

    // Bottom wall
    const bottomGrad = context.createLinearGradient(centerX, bottomY - t, centerX, bottomY + t);
    bottomGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    bottomGrad.addColorStop(0.4, 'rgba(190, 203, 215, 0.5)');
    bottomGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.6)');
    bottomGrad.addColorStop(1, 'rgba(208, 218, 228, 0.6)');
    drawWall(bottomGrad, () => {
        context.moveTo(leftX + cornerRadius, bottomY);
        context.arcTo(leftX, bottomY, leftX, bottomY - cornerRadius, cornerRadius);
        context.lineTo(leftX, bottomY - t2);
        context.arcTo(leftX, bottomY - t2, leftX + cornerRadius, bottomY - t2, cornerRadius - t2);
        context.lineTo(rightX - cornerRadius, bottomY - t2);
        context.arcTo(rightX, bottomY - t2, rightX, bottomY - cornerRadius, cornerRadius - t2);
        context.lineTo(rightX, bottomY - cornerRadius);
        context.arcTo(rightX, bottomY, rightX - cornerRadius, bottomY, cornerRadius);
    });

    // Edge outlines
    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.strokeStyle = 'rgba(100, 120, 140, 0.5)';
    context.lineWidth = 1.5;
    createJarPath(context, leftX, rightX, topY, bottomY, cornerRadius, 0);
    context.stroke();

    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.lineWidth = 1;
    createJarPath(context, leftX + t, rightX - t, topY, bottomY - t, cornerRadius, 0);
    context.stroke();

    context.restore();
}

// Initialize the application
async function init() {
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbzANbs-5NxxmJaeQIFv6DPzZ_G00MzObbuj0MhTh1GChN9Ri2gwDzB5StdZHsC_g_yiBQ/exec');
        if (!response.ok) throw new Error('Failed to load data');
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

    // Get viewport width
    const screenWidth = window.innerWidth;

    // Fixed jar dimensions
    const jarWidth = 330;
    const marbleRadius = jarWidth / 12;
    const wallThickness = 20;

    // Jar height based on number of marbles
    // Simple linear formula: height = max(330, 9.2*N + 150)
    const N = resolutionData.length;
    const jarHeight = Math.max(500, 9.2 * N + 150);

    console.log(`Jar dimensions: ${jarWidth}px wide x ${jarHeight.toFixed(0)}px tall for ${resolutionData.length} marbles`)

    // Set canvas height to fit jar exactly
    // Increased margins for better spacing: banner -> counter -> jar
    const topMargin = 250; // Space for banner + counter with equal spacing
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

    // Position counter above jar - properly centered with equidistant spacing
    const counterElement = document.getElementById('counter');
    counterElement.style.left = '50%';
    counterElement.style.top = `${jarTopY - 80}px`; // Increased from 60 to 80 for more space
    counterElement.style.transform = 'translateX(-50%)';

    // Create invisible jar walls
    const wallConfig = { isStatic: true, restitution: 0.2, slop: 0, render: { visible: false } };
    const walls = [
        Bodies.rectangle(jarX, jarY + jarHeight / 2, jarWidth, wallThickness, { ...wallConfig, friction: 0.8 }),
        Bodies.rectangle(jarX - jarWidth / 2, jarY, wallThickness, jarHeight, { ...wallConfig, friction: 0.5 }),
        Bodies.rectangle(jarX + jarWidth / 2, jarY, wallThickness, jarHeight, { ...wallConfig, friction: 0.5 })
    ];
    Composite.add(world, walls);

    // Create marbles from JSON data (spawn from top of screen)
    for (let i = 0; i < resolutionData.length; i++) {
        const data = resolutionData[i];
        const sizeMultiplier = normalizeSize(data.size); // Convert "Small/Medium/Large" to number
        const normalizedColor = normalizeColor(data.color); // Ensure # prefix

        // Debug: Log first marble's size for verification
        if (i === 0) {
            console.log('First marble - raw size:', data.size, '→ multiplier:', sizeMultiplier);
        }
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
                    fillStyle: normalizedColor,
                    strokeStyle: '#ffffff',
                    lineWidth: 2
                },
                resolutionData: data,
                marbleColor: normalizedColor
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

            // Skip rendering if radius is invalid
            if (!radius || !isFinite(radius) || radius <= 0) {
                console.warn('Invalid marble radius:', radius, 'for marble:', data);
                return;
            }

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
                gradient.addColorStop(0, adjustColor(color, 40));
                gradient.addColorStop(0.4, color);
                gradient.addColorStop(1, adjustColor(color, -20));
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
            // Use white text for dark marbles, dark text for light marbles
            const isDark = isColorDark(color);
            let textColor;
            if (isFiltered) {
                textColor = 'rgba(120, 120, 120, 0.5)';
            } else if (isDark) {
                textColor = 'rgba(255, 255, 255, 0.85)'; // White text for dark marbles
            } else {
                textColor = 'rgba(74, 74, 74, 0.75)'; // Dark text for light marbles
            }
            context.fillStyle = textColor;
            context.textAlign = 'center';
            context.textBaseline = 'middle';

            const displayText = truncateText(text);

            // Dynamic font size based on text length
            // Short text = larger font, long text = smaller font
            const textLength = displayText.length;
            const minFontSize = radius * 0.15;  // Minimum font size (for long text)
            const maxFontSize = radius * 0.28;  // Maximum font size (for short text)

            // Scale font size inversely with text length
            // Short text (10 chars) → maxFontSize
            // Long text (50+ chars) → minFontSize
            let fontSize;
            if (textLength <= 10) {
                fontSize = maxFontSize;
            } else if (textLength >= 50) {
                fontSize = minFontSize;
            } else {
                // Linear interpolation between min and max
                const ratio = (textLength - 10) / (50 - 10);
                fontSize = maxFontSize - (ratio * (maxFontSize - minFontSize));
            }

            context.font = `${fontSize}px 'Kalam', 'Patrick Hand', 'Caveat', cursive`;

            // Improve text rendering quality
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';

            // Word wrap the text to fit in circle
            const words = displayText.split(' ');
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
            const startY = pos.y - totalHeight / 2 + lineHeight / 2 + 1;

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
    const inputs = ['id', 'resolution', 'initials', 'city'].map(key => ({
        key,
        el: document.getElementById(`search-${key}`)
    }));

    inputs.forEach(({ key, el }) => {
        el.addEventListener('input', (e) => {
            searchFilters[key] = e.target.value.trim().toLowerCase();
        });
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                inputs.forEach(({ key: k, el: element }) => {
                    element.value = '';
                    searchFilters[k] = '';
                });
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
        const resolution = truncateText(data.resolution);
        const formattedInitials = data.initials.split('').join('.') + '.';
        const textColor = isColorDark(color) ? '#ffffff' : '#333333';

        modalMarble.style.backgroundColor = color;
        modalMarble.style.color = textColor; // Set text color based on background
        modalMarble.textContent = resolution;
        modalId.textContent = `#${data.id}`;
        modalInitials.textContent = `by ${formattedInitials}`;
        modalCity.textContent = `from ${data.city}`;

        // Only show age if it exists
        if (data.age) {
            modalAge.textContent = `${data.age} years young`;
            modalAge.style.display = 'block';
        } else {
            modalAge.style.display = 'none';
        }

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
