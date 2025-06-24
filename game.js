document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const startScreen = document.getElementById('startScreen');
  const gameOverScreen = document.getElementById('gameOver');
  const finalScore = document.getElementById('finalScore');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const highScoreDisplay = document.getElementById('highScoreDisplay');
  const newHighScore = document.getElementById('newHighScore');
  const startButton = document.getElementById('startButton');
  const restartButton = document.getElementById('restartButton');
  const themeButtons = document.querySelectorAll('.theme-btn');

  // Game constants
  const THEMES = {
    default: {
      sky: ['#56ccf2', '#2f80ed'],
      bird: '#ffdd59',
      pipe: '#2ecc71',
      ground: '#5a3921'
    },
    nature: {
      sky: ['#a8ff78', '#78ffd6'],
      bird: '#ff9a00',
      pipe: '#00b09b',
      ground: '#3a5a40'
    },
    sunset: {
      sky: ['#ff416c', '#ff4b2b'],
      bird: '#fff700',
      pipe: '#ff7b00',
      ground: '#5d2906'
    },
    purple: {
      sky: ['#8e2de2', '#4a00e0'],
      bird: '#f9d423',
      pipe: '#00d2ff',
      ground: '#2c003e'
    },
    dark: {
      sky: ['#000000', '#434343'],
      bird: '#f9d423',
      pipe: '#575757',
      ground: '#1a1a1a'
    }
  };

  // Set canvas size
  canvas.width = 400;
  canvas.height = 600;

  // Game variables
  let bird = {
    x: 100,
    y: 300,
    radius: 18,
    velocity: 0,
    gravity: 0.4,
    jump: -9,
    color: '#ffdd59',
    rotation: 0,
    wingAngle: 0,
    wingDirection: 1
  };

  let pipes = [];
  let score = 0;
  let highScore = localStorage.getItem('flappyHighScore') || 0;
  let gameRunning = false;
  let animationId;
  let pipeGap = 180;
  let pipeFrequency = 1800; // milliseconds
  let lastPipeTime = 0;
  let currentTheme = 'default';
  let particles = [];
  let groundOffset = 0;
  let clouds = [];
  let gameSpeed = 1;

  // Initialize clouds
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * canvas.width,
      y: Math.random() * 200,
      width: 60 + Math.random() * 40,
      speed: 0.2 + Math.random() * 0.5
    });
  }

  // Event listeners
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  canvas.addEventListener('click', handleJump);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') handleJump();
  });

  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentTheme = btn.dataset.theme;
      updateTheme();
    });
  });

  function handleJump() {
    if (!gameRunning && startScreen.classList.contains('hidden')) {
      startGame();
    } else if (gameRunning) {
      birdJump();
    }
  }

  // Start game function
  function startGame() {
    bird = {
      x: 100,
      y: 300,
      radius: 18,
      velocity: 0,
      gravity: 0.4,
      jump: -9,
      color: THEMES[currentTheme].bird,
      rotation: 0,
      wingAngle: 0,
      wingDirection: 1
    };
    pipes = [];
    particles = [];
    score = 0;
    gameRunning = true;
    gameSpeed = 1;
    lastPipeTime = 0;
    groundOffset = 0;
    scoreDisplay.textContent = '0';
    newHighScore.classList.add('hidden');
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
  }

  // Bird jump function
  function birdJump() {
    bird.velocity = bird.jump;
    bird.rotation = -20;
    createParticles(10);
  }

  // Game loop
  function gameLoop(timestamp) {
    update(timestamp);
    draw();
    if (gameRunning) {
      animationId = requestAnimationFrame(gameLoop);
    }
  }

  // Update game state
  function update(timestamp) {
    // Update bird
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
    
    // Bird rotation based on velocity
    bird.rotation = Math.min(Math.max(bird.velocity * 3, -25), 25);
    
    // Wing animation
    bird.wingAngle += bird.wingDirection * 0.2;
    if (bird.wingAngle > 0.5 || bird.wingAngle < -0.5) {
      bird.wingDirection *= -1;
    }

    // Check for collisions with ground or ceiling
    if (bird.y + bird.radius > canvas.height - 20 || bird.y - bird.radius < 0) {
      createParticles(30);
      gameOver();
    }

    // Update clouds
    clouds.forEach(cloud => {
      cloud.x -= cloud.speed;
      if (cloud.x + cloud.width < 0) {
        cloud.x = canvas.width;
        cloud.y = Math.random() * 200;
      }
    });

    // Generate new pipes
    if (timestamp - lastPipeTime > pipeFrequency / gameSpeed) {
      createPipe();
      lastPipeTime = timestamp;
      // Gradually increase difficulty
      if (score > 0 && score % 5 === 0) {
        gameSpeed = Math.min(gameSpeed + 0.05, 1.5);
      }
    }

    // Update pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= pipes[i].speed * gameSpeed;

      // Check for collisions with pipes
      if (
        bird.x + bird.radius > pipes[i].x &&
        bird.x - bird.radius < pipes[i].x + pipes[i].width
      ) {
        if (
          bird.y - bird.radius < pipes[i].topHeight ||
          bird.y + bird.radius > pipes[i].topHeight + pipeGap
        ) {
          createParticles(30);
          gameOver();
        }
      }

      // Check if bird passed the pipe
      if (pipes[i].x + pipes[i].width < bird.x && !pipes[i].passed) {
        pipes[i].passed = true;
        score++;
        scoreDisplay.textContent = score;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('flappyHighScore', highScore);
          highScoreDisplay.textContent = `High: ${highScore}`;
        }
      }

      // Remove pipes that are off screen
      if (pipes[i].x + pipes[i].width < 0) {
        pipes.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].vx;
      particles[i].y += particles[i].vy;
      particles[i].vy += particles[i].gravity;
      particles[i].life--;
      
      if (particles[i].life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Update ground offset for parallax effect
    groundOffset = (groundOffset - 2 * gameSpeed) % 20;
  }

  // Draw everything
  function draw() {
    // Clear canvas with sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, THEMES[currentTheme].sky[0]);
    skyGradient.addColorStop(1, THEMES[currentTheme].sky[1]);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    clouds.forEach(cloud => {
      drawCloud(ctx, cloud.x, cloud.y, cloud.width);
    });

    // Draw pipes
    ctx.fillStyle = THEMES[currentTheme].pipe;
    pipes.forEach(pipe => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
      // Add pipe cap
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, pipe.width + 10, 20);
      
      // Bottom pipe
      const bottomY = pipe.topHeight + pipeGap;
      ctx.fillRect(pipe.x, bottomY, pipe.width, canvas.height - bottomY - 20);
      // Add pipe cap
      ctx.fillRect(pipe.x - 5, bottomY, pipe.width + 10, 20);
    });

    // Draw ground with parallax effect
    ctx.fillStyle = THEMES[currentTheme].ground;
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    // Ground details
    ctx.fillStyle = '#3d291a';
    for (let x = groundOffset; x < canvas.width; x += 20) {
      ctx.fillRect(x, canvas.height - 20, 10, 5);
    }

    // Draw particles
    particles.forEach(particle => {
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.life / 100;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    ctx.globalAlpha = 1;

    // Draw bird with rotation
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation * Math.PI / 180);
    
    // Bird body
    ctx.fillStyle = bird.color;
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird wing
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.ellipse(-10, 0, 10, 5, bird.wingAngle, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird eye
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(5, -5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird beak
    ctx.fillStyle = '#ff9500';
    ctx.beginPath();
    ctx.moveTo(bird.radius, 0);
    ctx.lineTo(bird.radius + 12, -5);
    ctx.lineTo(bird.radius + 12, 5);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }

  // Create new pipe
  function createPipe() {
    const minHeight = 80;
    const maxHeight = canvas.height - pipeGap - minHeight - 20; // 20 for ground
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

    pipes.push({
      x: canvas.width,
      width: 70,
      topHeight,
      speed: 3,
      passed: false
    });
  }

  // Create particles for effects
  function createParticles(count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: bird.x,
        y: bird.y,
        vx: Math.random() * 6 - 3,
        vy: Math.random() * 6 - 3,
        size: Math.random() * 5 + 2,
        color: ['#ffdd59', '#ff9500', '#ffcc00', '#ffdd59'][Math.floor(Math.random() * 4)],
        gravity: 0.1,
        life: 50 + Math.random() * 50
      });
    }
  }

  // Draw cloud helper function
  function drawCloud(ctx, x, y, width) {
    const height = width * 0.6;
    const segments = 5;
    const segmentWidth = width / segments;
    
    for (let i = 0; i < segments; i++) {
      const segmentX = x + i * segmentWidth;
      const segmentY = y + (i % 2 === 0 ? 0 : -5);
      const segmentSize = height * (0.8 + Math.random() * 0.4);
      
      ctx.beginPath();
      ctx.arc(segmentX, segmentY, segmentSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Update theme colors
  function updateTheme() {
    bird.color = THEMES[currentTheme].bird;
  }

  // Game over function
  function gameOver() {
    gameRunning = false;
    finalScore.textContent = score;
    
    if (score > highScore - 1) {
      newHighScore.classList.remove('hidden');
    }
    
    gameOverScreen.classList.remove('hidden');
    cancelAnimationFrame(animationId);
  }

  // Initialize high score display
  highScoreDisplay.textContent = `High: ${highScore}`;
});