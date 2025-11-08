# moth_simulation.py (with outlined moths)
import pygame
import random
import math
import time

# ----------------- Parameters -----------------
WINDOW_SIZE = 600           # square window (pixels)
SPAWN_INTERVAL = 0.4        # seconds between spawning moths (n)
INITIAL_MOTHS = 300
MAX_MOTHS = 300
MOTH_RADIUS = 6             # pixels (filled radius)
OUTLINE_WIDTH = 2           # pixels for moth outline
PREDATOR_RADIUS = 40        # pixels
PREDATOR_SPEED = 500.0      # pixels per second
MOTH_WANDER_SPEED = 50.0    # pixels per second (small random drift)
FPS = 60

# New reproduction / mutation parameters
MUTATION_STD = 0.06         # standard deviation for color mutation (0..1)
SPAWN_NEAR_RADIUS = 64.0    # pixels: offspring spawn within this radius of parent
# ----------------------------------------------

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
PREDATOR_EDGE = (255, 0, 255)

pygame.init()
screen = pygame.display.set_mode((WINDOW_SIZE, WINDOW_SIZE))
pygame.display.set_caption("Natural selection: moths vs predator")
font = pygame.font.SysFont(None, 20)
clock = pygame.time.Clock()

# Precompute gradient surface (horizontal gradient left=black -> right=white)
gradient_surf = pygame.Surface((WINDOW_SIZE, WINDOW_SIZE))
for x in range(WINDOW_SIZE):
    val = int(255 * (x / (WINDOW_SIZE - 1)))
    color = (val, val, val)
    pygame.draw.line(gradient_surf, color, (x, 0), (x, WINDOW_SIZE - 1))

def bg_gray_at_x(px):
    """Return background grayscale in [0..1] at pixel x (left->right)."""
    # clamp and convert to [0..1]
    cx = max(0, min(WINDOW_SIZE - 1, int(px)))
    return cx / (WINDOW_SIZE - 1)

def similarity(moth_gray, bg_gray):
    """Similarity in [0..1] where 1 = identical, 0 = opposite"""
    return 1.0 - abs(moth_gray - bg_gray)

def scale_similarity(similarity):
    """Adjust the probability curve"""
    return similarity**(1/3.5)

class Moth:
    def __init__(self, x=None, y=None, gray=None):
        margin = MOTH_RADIUS + OUTLINE_WIDTH
        if x is None:
            self.x = random.uniform(margin, WINDOW_SIZE - margin)
        else:
            self.x = max(margin, min(WINDOW_SIZE - margin, x))
        if y is None:
            self.y = random.uniform(margin, WINDOW_SIZE - margin)
        else:
            self.y = max(margin, min(WINDOW_SIZE - margin, y))
        self.gray = gray if gray is not None else random.random()  # 0..1
        self.radius = MOTH_RADIUS
        self.alive = True
        self.fade = 1.0  # alpha factor (1 = visible, 0 = removed)

    def step(self, dt):
        # small random walk
        angle = random.uniform(0, 2 * math.pi)
        dx = math.cos(angle) * MOTH_WANDER_SPEED * dt * random.uniform(0.2, 1.0)
        dy = math.sin(angle) * MOTH_WANDER_SPEED * dt * random.uniform(0.2, 1.0)
        margin = self.radius + OUTLINE_WIDTH
        self.x = max(margin, min(WINDOW_SIZE - margin, self.x + dx))
        self.y = max(margin, min(WINDOW_SIZE - margin, self.y + dy))
        if not self.alive:
            # fade out visually
            self.fade -= dt / 1.0  # 1 second to fade
            if self.fade < 0:
                self.fade = 0

    def draw(self, surf):
        if self.fade <= 0:
            return
        # integer grayscale for filled circle
        val = int(255 * self.gray)
        alpha = int(255 * self.fade)

        # Decide outline color to contrast with self.gray.
        bg_g = self.gray #bg_gray_at_x(self.x)
        # If self.gray is bright, use black outline; otherwise white outline.
        if bg_g > 0.5:
            outline_color = (0, 0, 0, alpha)
        else:
            outline_color = (255, 255, 255, alpha)

        # Create a surface with padding for the outline
        pad = OUTLINE_WIDTH
        surf_size = int(self.radius * 2 + pad * 2 + 2)
        ms = pygame.Surface((surf_size, surf_size), pygame.SRCALPHA)

        center = (surf_size // 2, surf_size // 2)

        # Draw outline (circle with width=OUTLINE_WIDTH)
        pygame.draw.circle(ms, outline_color, center, self.radius + OUTLINE_WIDTH // 2, width=OUTLINE_WIDTH)

        # Draw filled moth circle (with alpha)
        pygame.draw.circle(ms, (val, val, val, alpha), center, self.radius)

        # Blit with correct offset
        blit_x = int(self.x - surf_size // 2)
        blit_y = int(self.y - surf_size // 2)
        surf.blit(ms, (blit_x, blit_y))

class Predator:
    def __init__(self):
        self.x = WINDOW_SIZE / 2.0 + random.uniform(-40, 40)
        self.y = WINDOW_SIZE / 2.0 + random.uniform(-40, 40)
        self.angle = random.uniform(0, 2 * math.pi)
        self.speed = PREDATOR_SPEED
        self.radius = PREDATOR_RADIUS

    def step(self, dt):
        # random turning (brownian turn)
        self.angle += random.gauss(0, 1.6 * math.sqrt(dt))
        self.x += math.cos(self.angle) * self.speed * dt
        self.y += math.sin(self.angle) * self.speed * dt
        # bounce off walls
        if self.x < self.radius:
            self.x = self.radius
            self.angle = math.pi - self.angle
        if self.x > WINDOW_SIZE - self.radius:
            self.x = WINDOW_SIZE - self.radius
            self.angle = math.pi - self.angle
        if self.y < self.radius:
            self.y = self.radius
            self.angle = -self.angle
        if self.y > WINDOW_SIZE - self.radius:
            self.y = WINDOW_SIZE - self.radius
            self.angle = -self.angle

    def draw(self, surf):
        pygame.draw.circle(surf, PREDATOR_EDGE, (int(self.x), int(self.y)), int(self.radius), width=2)

# initialize
moths = [Moth() for _ in range(INITIAL_MOTHS)]
pred = Predator()
last_spawn = time.time()
eaten_count = 0

def spawn_offspring(moths_list):
    """Spawn either from a random parent (if any) or randomly if no parents exist."""
    if not moths_list:
        # no parents — spawn randomly
        return Moth()
    parent = random.choice(moths_list)
    # place offspring near parent within SPAWN_NEAR_RADIUS
    angle = random.uniform(0, 2 * math.pi)
    r = random.uniform(0, SPAWN_NEAR_RADIUS)
    ox = parent.x + math.cos(angle) * r
    oy = parent.y + math.sin(angle) * r
    # mutated color (clamp 0..1)
    mutated_gray = parent.gray + random.gauss(0, MUTATION_STD)
    mutated_gray = max(0.0, min(1.0, mutated_gray))
    return Moth(x=ox, y=oy, gray=mutated_gray)

running = True
while running:
    dt = clock.tick(FPS) / 1000.0  # seconds elapsed since last frame
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    # reproduction / spawn offsprings periodically
    now = time.time()
    if (now - last_spawn) >= SPAWN_INTERVAL and len(moths) < MAX_MOTHS:
        moths.append(spawn_offspring(moths))
        last_spawn = now

    # update predator
    pred.step(dt)

    # update moths
    for m in moths:
        m.step(dt)

    # collision detection and predation
    for m in list(moths):
        if not m.alive:
            continue
        dist = math.hypot(pred.x - m.x, pred.y - m.y)
        if dist <= (pred.radius + m.radius):
            bg_g = bg_gray_at_x(m.x)
            sim = similarity(m.gray, bg_g)
            eat_prob = 1.0 - scale_similarity(sim)  # more different -> higher chance of getting eaten
            if random.random() < eat_prob:
                m.alive = False
                eaten_count += 1

    # remove moths fully faded out
    moths = [m for m in moths if m.fade > 0.001]

    # draw
    screen.blit(gradient_surf, (0, 0))  # gradient background
    for m in moths:
        m.draw(screen)
    pred.draw(screen)

    # HUD / stats
    alive = sum(1 for m in moths if m.alive)
    on_screen = len(moths)
    txt1 = font.render(f"Spawn interval: {SPAWN_INTERVAL:.2f}s  |  Predator speed: {PREDATOR_SPEED:.1f}px/s", True, WHITE)
    txt2 = font.render(f"Moths alive: {alive}  |  On-screen: {on_screen}  |  Eaten: {eaten_count}", True, WHITE)
    hud_bg = pygame.Surface((WINDOW_SIZE, 42), pygame.SRCALPHA)
    hud_bg.fill((0,0,0,160))
    screen.blit(hud_bg, (0, 0))
    screen.blit(txt1, (6, 2))
    screen.blit(txt2, (6, 20))

    pygame.display.flip()

pygame.quit()
