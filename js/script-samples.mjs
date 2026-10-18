export const scriptSamples = [
  { name: "hello.lsc", content: `rem Hello: a gentle tour of LUMEN Script. Open hello.lsc in Notes to read it and change the picture
window "Hello", 440, 320, "notes"
screen "auto", 2
slider "speed", "Animation", 0, 3, 1, 0.1
t = 0
while 1
  w = width()
  h = height()
  warp
    for y = 0 to h - 1
      rect 0, y, w, 1, hsv(228 - y / h * 30, 0.55, 0.2 + y / h * 0.35)
    next
    for i = 0 to 44
      sx = (i * 73 + t * (3 + i % 4 * 2)) % w
      sy = (i * 37) % floor(h * 0.5)
      pixel sx, sy, rgba(255, 255, 255, 80 + 150 * abs(sin(t * 1.7 + i)))
    next
    for layer = 0 to 2
      for x = 0 to w - 1
        y = h * (0.6 + layer * 0.09) + sin(x / (18 - layer * 4) + t * (1.2 + layer * 0.5)) * h * 0.06
        rect x, y, 1, h - y, hsv(195 + layer * 22 + x / w * 30, 0.6, 0.45 + layer * 0.2)
      next
    next
  end warp
  text w / 2 + 1, h * 0.17 + 1, "Hello from LUMEN Script", "#00000090", 16, 1, "title"
  text w / 2, h * 0.17, "Hello from LUMEN Script", "#ffffff", 16, 1, "title"
  text w / 2, h * 0.17 + 22, "Open hello.lsc in Notes to change this picture", "#d8e4ff", 7, 1, "sans"
  t = t + delta() * value("speed")
  frame
wend` },
  { name: "flappy.lsc", content: `rem Flappy LUMEN: press Space, click, or tap to flap between the pipes. Your best score is saved in Files
window "Flappy LUMEN", 360, 460, "fortune"
screen "auto", 3
button "restart", "Restart"; checkbox "pause", "Paused", 0
best = 0
if hasfile("flappy-best.txt") then best = num(readfile("flappy-best.txt"))
pipes = 3
spacing = 76
gapsize = 42
dim pipex(pipes)
dim pipey(pipes)
dim passed(pipes)
dim cloudx(5)
dim cloudy(5)
for i = 0 to 4
  cloudx[i] = rnd(60)
  cloudy[i] = 6 + rnd(34)
next
dim towers(40)
for i = 0 to 39
  towers[i] = 8 + rnd(24)
next
far = 0
near = 0
flash = 0
gosub reset
while 1
  w = width()
  h = height()
  ground = h - 20
  if clicked("restart") or keyhit("r") then gosub reset
  if keyhit("p") then setvalue "pause", not value("pause")
  if value("pause") then frame
  if value("pause") then continue
  k = min(3, delta() * 60)
  flap = keyhit("space") or keyhit("arrowup") or keyhit("w") or mousehit()
  if mode == 0 then
    birdy = ground * 0.42 + sin(clock() * 5) * 3
    vy = 0
    if flap then
      mode = 1
      gosub flapup
    end if
  else
    if mode == 1 then
      if flap then gosub flapup
      vy = min(4.5, vy + 0.17 * k)
      birdy = birdy + vy * k
      for i = 0 to pipes - 1
        pipex[i] = pipex[i] - 1.15 * k
        if pipex[i] < -24 then
          pipex[i] = pipex[i] + pipes * spacing
          call newgap(i)
        end if
        if passed[i] == 0 and pipex[i] + 18 < birdx - 5 then
          passed[i] = 1
          score = score + 1
          tone 1175, 90, "square", 0.05
        end if
        if birdx + 5 > pipex[i] and birdx - 5 < pipex[i] + 18 and (birdy - 4 < pipey[i] or birdy + 4 > pipey[i] + gapsize) then gosub crash
      next
      if birdy + 5 > ground or birdy < -12 then gosub crash
    else
      vy = min(5, vy + 0.25 * k)
      birdy = min(ground - 5, birdy + vy * k)
      deadtime = deadtime + k
      if deadtime > 14 then noshader "shake"
      if flap and deadtime > 40 then gosub reset
    end if
  end if
  if mode < 2 then
    far = far + 0.3 * k
    near = near + 1.15 * k
  end if
  gosub draw
  frame
wend
draw:
cls
for y = 0 to ground - 1 step 2
  rect 0, y, w, 2, hsv(190 - y / ground * 10, 0.6 - y / ground * 0.32, 0.78 + y / ground * 0.17)
next
for i = 0 to 4
  cx = w + 30 - (far * 0.5 + cloudx[i] * 4) % (w + 60)
  cy = cloudy[i]
  circle cx, cy, 6, "#f4fbff"
  circle cx + 7, cy + 2, 5, "#f4fbff"
  circle cx - 7, cy + 2, 4, "#f4fbff"
  rect cx - 10, cy + 2, 20, 5, "#f4fbff"
next
offset = floor(far / 8)
for j = 0 to floor(w / 8) + 1
  tall = towers[(j + offset) % 40]
  tx = j * 8 - far % 8
  rect tx, ground - 10 - tall, 8, tall + 10, "#b9e4d9"
  rect tx, ground - 10 - tall, 8, 1, "#d6f1ea"
  for wy = ground - 6 - tall to ground - 12 step 4
    pixel tx + 2, wy, "#9fd3c6"
    pixel tx + 5, wy, "#9fd3c6"
  next
next
bush = near * 0.5
for j = -1 to floor(w / 14) + 1
  bx = j * 14 - bush % 14
  circle bx, ground - 1, 9, "#56b94f"
  circle bx - 2, ground - 4, 5, "#6fcc63"
next
for i = 0 to pipes - 1
  call column(pipex[i], 0, pipey[i] - 8)
  call cap(pipex[i], pipey[i] - 8)
  call cap(pipex[i], pipey[i] + gapsize)
  call column(pipex[i], pipey[i] + gapsize + 8, ground - pipey[i] - gapsize - 8)
next
rect 0, ground, w, h - ground, "#ded895"
rect 0, ground, w, 1, "#543847"
rect 0, ground + 1, w, 5, "#9ce659"
rect 0, ground + 6, w, 1, "#5d9c2a"
for gx = -12 - near % 12 to w step 12
  rect gx, ground + 1, 6, 5, "#84d64c"
  rect gx + 4, ground + 11, 2, 1, "#c9bd76"
next
wing = 0
if mode < 2 then wing = round(sin(clock() * 22) * 1.5)
tilt = clamp(vy * 0.5, -1.5, 2.5)
circle birdx, birdy, 6, "#543847"
circle birdx, birdy, 5, "#f8d030"
circle birdx - 1, birdy + 2, 3, "#fbe9a0"
rect birdx - 7, birdy - 1 + wing, 6, 4, "#543847"
rect birdx - 6, birdy + wing, 4, 2, "#fff6c8"
circle birdx + 2, birdy - 2, 2, "#ffffff"
pixel birdx + 3, birdy - 2, "#000000"
rect birdx + 4, birdy + tilt, 5, 2, "#f87830"
rect birdx + 4, birdy + 2 + tilt, 4, 1, "#c84e10"
if flash > 0 then
  rect 0, 0, w, h, rgba(255, 255, 255, flash * 40)
  flash = flash - k
end if
if mode == 0 then
  text w / 2 + 1, ground * 0.2 + 1, "Get Ready!", "#543847", 16, 1, "title"
  text w / 2, ground * 0.2, "Get Ready!", "#ffb23f", 16, 1, "title"
  text w / 2 + 1, ground * 0.2 + 23, "Press Space or click to flap", "#00000080", 6, 1, "bold"
  text w / 2, ground * 0.2 + 22, "Press Space or click to flap", "#ffffff", 6, 1, "bold"
  text w / 2, ground + 9, "Best " + best, "#8a6d3b", 6, 1, "bold"
else
  if mode == 1 or deadtime <= 18 then text w / 2 + 1, 9, score, "#543847", 18, 1, "title"
  if mode == 1 or deadtime <= 18 then text w / 2, 8, score, "#ffffff", 18, 1, "title"
end if
if mode == 2 and deadtime > 18 then
  px0 = floor(w / 2 - 50)
  py0 = floor(ground * 0.34)
  text w / 2 + 1, py0 - 21, "Game Over", "#543847", 16, 1, "title"
  text w / 2, py0 - 22, "Game Over", "#ff8a2a", 16, 1, "title"
  rect px0 - 1, py0 - 1, 102, 52, "#543847"
  rect px0, py0, 100, 50, "#ded895"
  rect px0 + 2, py0 + 2, 96, 46, "#efe8b8"
  medal = "#e4dbac"
  if score >= 10 then medal = "#d48a4a"
  if score >= 20 then medal = "#e0e0e8"
  if score >= 40 then medal = "#f7d14a"
  circle px0 + 22, py0 + 25, 12, "#cbbf8a"
  circle px0 + 22, py0 + 25, 10, medal
  if score >= 10 then circle px0 + 19, py0 + 21, 3, "#ffffff80"
  text px0 + 92, py0 + 7, "SCORE", "#e86a17", 5, 2, "bold"
  text px0 + 92, py0 + 14, score, "#543847", 9, 2, "title"
  text px0 + 92, py0 + 27, "BEST", "#e86a17", 5, 2, "bold"
  text px0 + 92, py0 + 34, best, "#543847", 9, 2, "title"
  if newbest then text px0 + 46, py0 + 29, "NEW", "#ff4a3a", 5, 0, "bold"
  if deadtime > 40 then
    text w / 2 + 1, py0 + 61, "Flap to play again", "#00000080", 6, 1, "bold"
    text w / 2, py0 + 60, "Flap to play again", "#ffffff", 6, 1, "bold"
  end if
end if
return
flapup:
vy = -2.9
tone 660, 45, "square", 0.04
return
crash:
if mode != 1 then return
mode = 2
deadtime = 0
vy = -2.2
flash = 6
sound "thud"
tone 130, 260, "sawtooth", 0.08
shader "shake", 3
newbest = 0
if score > best then
  best = score
  newbest = 1
  writefile "flappy-best.txt", best
end if
return
reset:
mode = 0
score = 0
vy = 0
birdx = 34
newbest = 0
noshader "shake"
for i = 0 to pipes - 1
  pipex[i] = width() + 40 + i * spacing
  call newgap(i)
next
return
sub newgap(n)
  pipey[n] = 14 + rnd(max(1, height() - 20 - gapsize - 34))
  passed[n] = 0
end sub
sub column(x, y, tall)
  if tall <= 0 then return
  rect x, y, 18, tall, "#2d4a14"
  rect x + 1, y, 16, tall, "#73bf2e"
  rect x + 2, y, 3, tall, "#a8e86a"
  rect x + 13, y, 3, tall, "#4f8f22"
end sub
sub cap(x, y)
  rect x - 2, y, 22, 8, "#2d4a14"
  rect x - 1, y + 1, 20, 6, "#73bf2e"
  rect x, y + 1, 3, 6, "#a8e86a"
  rect x + 15, y + 1, 3, 6, "#4f8f22"
end sub` },
  { name: "snake.lsc", content: `rem Snake: steer with the arrow keys or W A S D. Eat apples, grow longer, and keep clear of the walls and your tail
window "Snake", 372, 420, "minesweeper"
button "restart", "Restart"; checkbox "pause", "Paused", 0
cols = 17
rows = 15
cell = 10
top = 16
screen cols * cell, rows * cell + top
for y = 0 to rows - 1
  for x = 0 to cols - 1
    c = "#aad751"
    if (x + y) % 2 then c = "#93c443"
    rect x * cell, top + y * cell, cell, cell, c
  next
next
capture "board", 0, top, cols * cell, rows * cell
best = 0
if hasfile("snake-best.txt") then best = num(readfile("snake-best.txt"))
dim sx(cols * rows + 1)
dim sy(cols * rows + 1)
dim ox(cols * rows + 1)
dim oy(cols * rows + 1)
shaketime = 0
gosub reset
while 1
  gosub controls
  if clicked("restart") or keyhit("r") then gosub reset
  if keyhit("p") then setvalue "pause", not value("pause")
  if value("pause") then frame
  if value("pause") then continue
  t = 1
  if mode == 1 then
    acc = acc + delta()
    pace = max(0.065, 0.13 - (length - 4) * 0.002)
    while acc >= pace and mode == 1
      acc = acc - pace
      gosub step
    wend
    if mode == 1 then t = acc / pace
  end if
  if shaketime > 0 then
    shaketime = shaketime - delta()
    if shaketime <= 0 then noshader "shake"
  end if
  gosub draw
  frame
  if mode >= 2 and (keyhit("space") or keyhit("enter") or mousehit()) then gosub reset
wend
reset:
length = 4
for i = 0 to length - 1
  sx[i] = 5 - i
  sy[i] = 7
  ox[i] = sx[i]
  oy[i] = sy[i]
next
dx = 1
dy = 0
qx = []
qy = []
acc = 0
mode = 0
gosub food
return
controls:
if keyhit("arrowup") or keyhit("w") then call turn(0, -1)
if keyhit("arrowdown") or keyhit("s") then call turn(0, 1)
if keyhit("arrowleft") or keyhit("a") then call turn(-1, 0)
if keyhit("arrowright") or keyhit("d") then call turn(1, 0)
return
step:
if len(qx) > 0 then
  dx = shift(qx)
  dy = shift(qy)
end if
for i = 0 to length - 1
  ox[i] = sx[i]
  oy[i] = sy[i]
next
for i = length - 1 to 1 step -1
  sx[i] = sx[i - 1]
  sy[i] = sy[i - 1]
next
sx[0] = sx[0] + dx
sy[0] = sy[0] + dy
if sx[0] < 0 or sx[0] >= cols or sy[0] < 0 or sy[0] >= rows then gosub die
for i = 1 to length - 1
  if mode == 1 and sx[i] == sx[0] and sy[i] == sy[0] then gosub die
next
if mode == 1 and sx[0] == fx and sy[0] == fy then
  sx[length] = ox[length - 1]
  sy[length] = oy[length - 1]
  ox[length] = ox[length - 1]
  oy[length] = oy[length - 1]
  length = length + 1
  tone 784, 70, "triangle", 0.14
  gosub food
end if
return
food:
if length >= cols * rows then mode = 3
if mode == 3 then best = max(best, length - 4)
if mode == 3 then writefile "snake-best.txt", best
if mode == 3 then return
repeat
  fx = rnd(cols)
  fy = rnd(rows)
  clash = 0
  for i = 0 to length - 1
    if sx[i] == fx and sy[i] == fy then clash = 1
  next
until clash == 0
return
die:
if mode != 1 then return
mode = 2
for i = 0 to length - 1
  sx[i] = ox[i]
  sy[i] = oy[i]
next
sound "thud"
tone 110, 320, "sawtooth", 0.08
shader "shake", 2
shaketime = 0.3
if length - 4 > best then
  best = length - 4
  writefile "snake-best.txt", best
end if
return
draw:
cls
stamp "board", 0, top
w = cols * cell
rect 0, 0, w, top, "#4a752c"
rect 0, top - 1, w, 1, "#3c5f23"
circle 9, 8, 4, "#e7471d"
rect 9, 2, 1, 3, "#6b3e1f"
rect 10, 2, 3, 2, "#62a83a"
text 17, 3, length - 4, "#ffffff", 10, 0, "bold"
text w - 4, 3, "Best " + best, "#e6f2d8", 10, 2, "bold"
ax = fx * cell + 5
ay = top + fy * cell + 5
circle ax, ay + 2, 4, "#00000028"
circle ax, ay, 4 + round(sin(clock() * 6) * 0.6), "#e7471d"
circle ax - 1, ay - 1, 1, "#ff9f86"
rect ax, ay - 6, 1, 2, "#6b3e1f"
rect ax + 1, ay - 6, 3, 2, "#62a83a"
last = length - 1
call segment(ox[last] + (sx[last] - ox[last]) * t, oy[last] + (sy[last] - oy[last]) * t, last)
for i = last to 1 step -1
  call segment(sx[i], sy[i], i)
next
hx = (ox[0] + (sx[0] - ox[0]) * t) * cell
hy = top + (oy[0] + (sy[0] - oy[0]) * t) * cell
call segment(ox[0] + (sx[0] - ox[0]) * t, oy[0] + (sy[0] - oy[0]) * t, 0)
ex = -dy * 2.5
ey = dx * 2.5
circle hx + 5 + ex + dx * 1.5, hy + 5 + ey + dy * 1.5, 2, "#ffffff"
circle hx + 5 - ex + dx * 1.5, hy + 5 - ey + dy * 1.5, 2, "#ffffff"
pixel hx + 5 + ex + dx * 2.5, hy + 5 + ey + dy * 2.5, "#1a1a2a"
pixel hx + 5 - ex + dx * 2.5, hy + 5 - ey + dy * 2.5, "#1a1a2a"
if mode == 0 then
  rect 0, top, w, rows * cell, "#00000048"
  text w / 2 + 1, top + 41, "SNAKE", "#00000080", 22, 1, "title"
  text w / 2, top + 40, "SNAKE", "#ffffff", 22, 1, "title"
  text w / 2, top + 76, "Press an arrow key to start", "#f0f6e8", 8, 1, "bold"
end if
if mode >= 2 then
  rect 0, top, w, rows * cell, "#00000070"
  text w / 2 + 1, top + 37, "Game over", "#00000080", 18, 1, "title"
  text w / 2, top + 36, "Game over", "#ffffff", 18, 1, "title"
  if mode == 3 then text w / 2, top + 36, "BOARD COMPLETE!", "#ffe9a8", 15, 1, "title"
  text w / 2, top + 64, "Score " + (length - 4) + "     Best " + best, "#ffe9a8", 9, 1, "bold"
  text w / 2, top + 84, "Press Space or click to play again", "#e8f0e0", 7, 1, "sans"
end if
return
sub segment(gx, gy, index)
  px = gx * cell
  py = top + gy * cell
  c = hsv(222, 0.68, 0.97 - index / max(1, length) * 0.35)
  rect px + 1, py, cell - 2, cell, c
  rect px, py + 1, cell, cell - 2, c
  rect px + 2, py + 1, cell - 4, 2, "#ffffff30"
end sub
sub turn(nx, ny)
  if mode == 2 then return
  if mode == 0 then mode = 1
  lx = dx
  ly = dy
  if len(qx) > 0 then
    lx = qx[len(qx) - 1]
    ly = qy[len(qy) - 1]
  end if
  if nx == -lx and ny == -ly then return
  if nx == lx and ny == ly then return
  if len(qx) < 3 then
    n = push(qx, nx)
    n = push(qy, ny)
  end if
end sub` },
  { name: "life.lsc", content: `rem Life: Conway's cellular automaton with glowing trails. Drag on the screen to bring cells to life
window "Life", 540, 470, "charmap"
w = 112
h = 80
screen w, h + 9
button "random", "Randomize"
button "gun", "Glider gun"
button "clear", "Clear"
checkbox "run", "Running", 1
button "step", "Single step"
slider "speed", "Speed", 1, 60, 24
dim cells(w * h)
dim nxt(w * h)
dim age(w * h)
pal = []
for a = 0 to 63
  n = push(pal, hsv(170 + a * 3.2, min(0.85, 0.15 + a * 0.05), 1))
next
shader "glow", 2, "#3fc8ff"
gosub randomize
acc = 0
while 1
  if clicked("random") then gosub randomize
  if clicked("clear") then gosub wipe
  if clicked("gun") then gosub gun
  if mousedown() then
    mx = mousex()
    my = mousey()
    if mx >= 0 and my >= 0 and mx < w - 1 and my < h - 1 then
      cells[my * w + mx] = 1
      cells[my * w + mx + 1] = 1
      cells[(my + 1) * w + mx] = 1
      cells[(my + 1) * w + mx + 1] = 1
    end if
  end if
  steps = clicked("step")
  if value("run") then
    acc = acc + delta() * value("speed")
    steps = min(3, floor(acc))
    acc = acc - floor(acc)
  end if
  warp
    for s = 1 to steps
      gosub generation
    next
    rect 0, 0, w, h, "#04060e48"
    pop = 0
    for i = 0 to w * h - 1
      if cells[i] then
        pixel i % w, floor(i / w), pal[min(63, age[i])]
        pop = pop + 1
      end if
    next
  end warp
  rect 0, h, w, 9, "#0b1020"
  rect 0, h, w, 1, "#22304e"
  text 3, h + 2, "Generation " + gen + "    Cells " + pop, "#a8dcff", 4, 0, "sans"
  frame
wend
generation:
for y = 0 to h - 1
  up = ((y + h - 1) % h) * w
  row = y * w
  down = ((y + 1) % h) * w
  for x = 0 to w - 1
    l = (x + w - 1) % w
    r = (x + 1) % w
    n = cells[up + l] + cells[up + x] + cells[up + r] + cells[row + l] + cells[row + r] + cells[down + l] + cells[down + x] + cells[down + r]
    i = row + x
    if n == 3 or (n == 2 and cells[i]) then
      nxt[i] = 1
      age[i] = age[i] + 1
    else
      nxt[i] = 0
      age[i] = 0
    end if
  next
next
swap = cells
cells = nxt
nxt = swap
gen = gen + 1
return
randomize:
for i = 0 to w * h - 1
  cells[i] = 0
  age[i] = 0
  if rnd(5) == 0 then cells[i] = 1
next
gen = 0
return
wipe:
for i = 0 to w * h - 1
  cells[i] = 0
  age[i] = 0
next
gen = 0
return
gun:
gosub wipe
spots = split("24,0 22,1 24,1 12,2 13,2 20,2 21,2 34,2 35,2 11,3 15,3 20,3 21,3 34,3 35,3 0,4 1,4 10,4 16,4 20,4 21,4 0,5 1,5 10,5 14,5 16,5 17,5 22,5 24,5 10,6 16,6 24,6 11,7 15,7 12,8 13,8", " ")
for i = 0 to len(spots) - 1
  xy = split(spots[i], ",")
  cells[(num(xy[1]) + 6) * w + num(xy[0]) + 6] = 1
next
return` },
  { name: "mandelbrot.lsc", content: `rem Mandelbrot: a smooth-shaded render of the famous set. When it finishes, the colors cycle with a hue shader
window "Mandelbrot", 500, 400, "paint"
screen "auto", 2
button "render", "Render again"; checkbox "cycle", "Cycle colors", 1
render:
w = width()
h = height()
limit = 200
cx = -0.7
cy = 0
scale = max(3.4 / w, 2.5 / h)
sr = [0, 32, 237, 255, 0]
sg = [7, 107, 255, 170, 2]
sb = [100, 203, 255, 0, 0]
row = 0
started = clock()
while row < h
  warp
    t0 = clock()
    while row < h and clock() - t0 < 0.03
      gosub drawrow
      row = row + 1
    wend
  end warp
  text w - 4, h - 10, floor(row / h * 100) + "%", "#ffffffb0", 6, 2, "sans"
  frame
wend
text w - 4, h - 10, "", "#ffffff", 6, 2
print "Mandelbrot done in " + fixed(clock() - started, 1) + " seconds."
hue = 0
while 1
  if clicked("render") or resized() then goto render
  if value("cycle") then hue = (hue + delta() * 30) % 360
  shader "hue", hue
  frame
wend
drawrow:
y0 = cy + (row - h / 2) * scale
for px = 0 to w - 1
  x0 = cx + (px - w / 2) * scale
  x = 0
  y = 0
  x2 = 0
  y2 = 0
  i = 0
  while x2 + y2 < 256 and i < limit
    y = 2 * x * y + y0
    x = x2 - y2 + x0
    x2 = x * x
    y2 = y * y
    i = i + 1
  wend
  if i >= limit then
    pixel px, row, "#000000"
  else
    m = i + 1 - log(log(x2 + y2) / 2 / log(2)) / log(2)
    p = fract(m * 0.03) * 5
    a = floor(p)
    f = p - a
    b = (a + 1) % 5
    pixel px, row, rgb(lerp(sr[a], sr[b], f), lerp(sg[a], sg[b], f), lerp(sb[a], sb[b], f))
  end if
next
return` },
  { name: "sketch.lsc", content: `rem Sketch: drag to paint and pick colors from the palette. Try Mirror for kaleidoscope drawings and Rainbow for shifting colors
window "Sketch", 560, 460, "paint"
screen "auto", 1
slider "size", "Brush", 1, 30, 5
checkbox "mirror", "Mirror", 0
checkbox "rainbow", "Rainbow", 0
button "clear", "Clear"
colors = ["#000000", "#7f7f7f", "#880015", "#ed1c24", "#ff7f27", "#fff200", "#22b14c", "#00a2e8", "#3f48cc", "#a349a4", "#ffffff", "#c3c3c3", "#b97a57", "#ffaec9", "#ffc90e", "#b5e61d", "#99d9ea", "#7092be", "#c8bfe7"]
button "undo", "Undo last stroke"
paper = "#fffdf8"
cls paper
color = "#000000"
pick = 0
hue = 0
lastx = -1
lasty = -1
while 1
  w = width()
  h = height()
  bar = h - 26
  if clicked("undo") and undoReady then stamp "undo", 0, 0
  if clicked("clear") then rect 0, 0, w, bar, paper
  if mousedown() then
    mx = mousex()
    my = mousey()
    if lastx == -1 and my >= bar then
      gosub pickcolor
      lastx = -2
    end if
    if lastx != -2 then
      if lastx == -1 then undoReady = 1
      if lastx == -1 then capture "undo", 0, 0, w, bar
      if lastx < 0 then
        lastx = mx
        lasty = my
      end if
      call stroke(lastx, lasty, mx, my)
      lastx = mx
      lasty = my
    end if
  else
    lastx = -1
  end if
  gosub palette
  frame
wend
pickcolor:
i = floor((mx - 6) / 18)
if i >= 0 and i < len(colors) then
  pick = i
  color = colors[i]
  setvalue "rainbow", 0
end if
return
palette:
rect 0, bar, w, 26, "#ece9d8"
rect 0, bar, w, 1, "#aca899"
rect 0, bar + 1, w, 1, "#ffffff"
for i = 0 to len(colors) - 1
  x = 6 + i * 18
  rect x, bar + 6, 15, 15, "#808080"
  rect x + 1, bar + 7, 13, 13, colors[i]
  if i == pick and value("rainbow") == 0 then box x - 2, bar + 4, 19, 19, "#000000"
next
rect w - 46, bar + 5, 40, 17, "#808080"
rect w - 45, bar + 6, 38, 15, color
circle w - 26, bar + 13, min(6, value("size") / 2), "#ffffff"
circle w - 26, bar + 13, max(1, min(5, value("size") / 2 - 1)), color
return
sub stroke(x1, y1, x2, y2)
  if value("rainbow") then
    hue = (hue + 4) % 360
    color = hsv(hue, 0.8, 1)
  end if
  r = value("size") / 2
  call dab(x1, y1, x2, y2, r)
  if value("mirror") then
    mw = width()
    mh = bar
    call dab(mw - x1, y1, mw - x2, y2, r)
    call dab(x1, mh - y1, x2, mh - y2, r)
    call dab(mw - x1, mh - y1, mw - x2, mh - y2, r)
  end if
end sub
sub dab(x1, y1, x2, y2, r)
  steps = max(1, ceil(dist(x1, y1, x2, y2) / max(1, r * 0.4)))
  for s = 0 to steps
    circle lerp(x1, x2, s / steps), lerp(y1, y2, s / steps), r, color
  next
end sub` },
  { name: "fizzbuzz.lsc", content: `rem FizzBuzz printed in the Command Prompt
for i = 1 to 30
  out = ""
  if i % 3 == 0 then out = out + "Fizz"
  if i % 5 == 0 then out = out + "Buzz"
  if out == "" then out = i
  print out
next` },
  { name: "guess.lsc", content: `rem Guess the number, using INPUT dialogs
secret = rnd(100) + 1
tries = 0
ask:
input guess, "Guess a number from 1 to 100"
if guess == "" then end
tries = tries + 1
if guess < secret then print guess + " is too low."
if guess > secret then print guess + " is too high."
if guess != secret then goto ask
print "Got it in " + tries + " tries!"` },
  { name: "tapemachine.lsc", content: `rem A tape machine interpreter for the classic eight-symbol language
rem Running any program for that language here shows LUMEN Script is Turing complete
code = "++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++."
dim tape(30000)
cell = 0
at = 0
out = ""
while at < len(code)
  c = mid(code, at, 1)
  if c == ">" then cell = cell + 1
  if c == "<" then cell = cell - 1
  if c == "+" then tape[cell] = (tape[cell] + 1) % 256
  if c == "-" then tape[cell] = (tape[cell] + 255) % 256
  if c == "." and tape[cell] != 10 then out = out + chr(tape[cell])
  if c == "[" and tape[cell] == 0 then gosub forward
  if c == "]" and tape[cell] != 0 then gosub back
  at = at + 1
wend
print out
end
forward:
depth = 1
while depth > 0
  at = at + 1
  c = mid(code, at, 1)
  if c == "[" then depth = depth + 1
  if c == "]" then depth = depth - 1
wend
return
back:
depth = 1
while depth > 0
  at = at - 1
  c = mid(code, at, 1)
  if c == "]" then depth = depth + 1
  if c == "[" then depth = depth - 1
wend
return` },
  { name: "explorer.lsc", content: `rem Mandelbrot Explorer: scroll to zoom toward the pointer, drag to pan, and raise Detail for deep zooms
window "Mandelbrot Explorer", 580, 480, "paint"
screen "auto", 2
slider "detail", "Detail", 32, 1200, 160, 8
button "colors", "Colors"
button "reset", "Reset"
sr = [0, 32, 237, 255, 0]
button "tour", "Interesting location"
sg = [7, 107, 255, 170, 2]
sb = [100, 203, 255, 0, 0]
tint = 0
cx = -0.6
cy = 0
zoom = 1
hint = 1
dragging = 0
gosub restart
while 1
  w = width()
  h = height()
  scale = 3 / (zoom * min(w, h))
  turn = wheel()
  if turn != 0 then
    hint = 0
    mx = cx + (mousex() - w / 2) * scale
    my = cy + (mousey() - h / 2) * scale
    zoom = clamp(zoom * pow(0.8, turn), 0.4, 100000000000000)
    scale = 3 / (zoom * min(w, h))
    cx = mx - (mousex() - w / 2) * scale
    cy = my - (mousey() - h / 2) * scale
    gosub restart
  end if
  if mousedown() then
    if dragging and (mousex() != lastx or mousey() != lasty) then
      scroll mousex() - lastx, mousey() - lasty, 0, 0
      cx = cx - (mousex() - lastx) * scale
      cy = cy - (mousey() - lasty) * scale
      hint = 0
      gosub restart
    end if
    dragging = 1
    lastx = mousex()
    lasty = mousey()
  else
    dragging = 0
  end if
  if clicked("reset") then
    cx = -0.6
    cy = 0
    zoom = 1
    gosub restart
  end if
  if clicked("colors") then
    tint = (tint + 1) % 3
    gosub restart
  end if
  if changed("detail") or resized() then gosub restart
  if clicked("tour") then gosub destination
  if pass < 2 then
    limit = value("detail")
    started = clock()
    warp
      while pass < 2 and clock() - started < 0.03
        if pass == 0 then
          for px = 0 to w - 1 step 4
            x0 = cx + (px + 2 - w / 2) * scale
            y0 = cy + (row + 2 - h / 2) * scale
            gosub iterate
            rect px, row, 4, 4, c
          next
          row = row + 4
        else
          y0 = cy + (row - h / 2) * scale
          for px = 0 to w - 1
            x0 = cx + (px - w / 2) * scale
            gosub iterate
            pixel px, row, c
          next
          row = row + 1
        end if
        if row >= h then
          row = 0
          pass = pass + 1
        end if
      wend
    end warp
  end if
  text 7, h - 12, "Zoom " + fixed(zoom, 1) + "x", "#000000a0", 6, 0, "sans"
  text 6, h - 13, "Zoom " + fixed(zoom, 1) + "x", "#ffffff", 6, 0, "sans"
  status = ""
  if pass < 2 then status = "Rendering " + floor((pass * h + row) / (2 * h) * 100) + "%"
  text w - 6, h - 13, status, "#ffffff", 6, 2, "sans"
  tip = ""
  if hint then tip = "Scroll to zoom, drag to pan"
  text w / 2, 6, tip, "#ffffff", 7, 1, "bold"
  frame
wend
restart:
row = 0
pass = 0
return
destination:
tour = (tour + 1) % 3
cx = [-0.6, -0.743643887037151, -0.101096363845][tour]
cy = [0, 0.13182590420533, 0.956286510809][tour]
zoom = [1, 180, 95][tour]
setvalue "detail", [160, 640, 480][tour]
gosub restart
return
iterate:
x = 0
y = 0
x2 = 0
y2 = 0
i = 0
while x2 + y2 < 256 and i < limit
  y = 2 * x * y + y0
  x = x2 - y2 + x0
  x2 = x * x
  y2 = y * y
  i = i + 1
wend
if i >= limit then
  c = "#000000"
  return
end if
m = i + 1 - log(log(x2 + y2) / 2 / log(2)) / log(2)
if tint == 0 then
  p = fract(m * 0.03) * 5
  a = floor(p)
  f = p - a
  b = (a + 1) % 5
  c = rgb(lerp(sr[a], sr[b], f), lerp(sg[a], sg[b], f), lerp(sb[a], sb[b], f))
end if
if tint == 1 then c = hsv(m * 7, 0.65, 1)
if tint == 2 then
  v = 0.5 + 0.5 * cos(m * 0.2)
  c = rgb(255 * v, 210 * v * v, 120 * v * v * v)
end if
return` },
  { name: "plasma.lsc", content: `rem Plasma: every pixel comes from the plasma function below, run as a shader. Screen effects stack on top
window "Plasma", 500, 440, "fortune"
screen "auto", 4
slider "speed", "Speed", 0, 4, 1, 0.1
slider "scale", "Scale", 3, 24, 9, 1
button "colors", "Colors"
button "fx", "Effect"
checkbox "crt", "CRT", 1
checkbox "pause", "Paused", 0
label "info", "Effect: none"
effects = ["none", "kaleido", "ripple", "wave", "posterize", "edges", "chroma", "spin", "mirror"]
palettes = [0, 0.33, 0.67, 0, 0.1, 0.2, 0.5, 0.6, 0.75, 0.8, 0.9, 0.3]
choice = 0
fx = 0
time = 0
scale = 9
halfw = width() / 2
halfh = height() / 2
gosub colors
shader "custom", "128 + 127 * cos(6.283 * (plasma(x, y) * 0.22 + pr))", "128 + 127 * cos(6.283 * (plasma(x, y) * 0.22 + pg))", "128 + 127 * cos(6.283 * (plasma(x, y) * 0.22 + pb))"
call crt
while 1
  scale = value("scale")
  halfw = width() / 2
  halfh = height() / 2
  if not value("pause") then time = time + value("speed") * delta()
  if changed("crt") then call crt
  if clicked("colors") then
    choice = (choice + 1) % 4
    gosub colors
  end if
  if clicked("fx") then
    if fx > 0 then noshader effects[fx]
    fx = (fx + 1) % len(effects)
    if fx > 0 then shader effects[fx]
    setvalue "info", "Effect: " + effects[fx]
  end if
  text width() - 2, height() - 7, fps() + " fps", "#ffffffa0", 5, 2, "sans"
  frame
wend
colors:
pr = palettes[choice * 3]
pg = palettes[choice * 3 + 1]
pb = palettes[choice * 3 + 2]
return
function plasma(x, y)
  local v = sin(x / scale + time)
  v = v + sin((y / scale - time) * 0.7)
  v = v + sin((x + y) / (scale * 1.6) + time * 0.8)
  local dx = x - halfw + sin(time * 0.6) * halfw * 0.66
  local dy = y - halfh + cos(time * 0.4) * halfh * 0.66
  return v + sin(sqrt(dx * dx + dy * dy) / scale - time * 1.3)
end function
sub crt
  if value("crt") then
    shader "scanlines", 0.3
    shader "vignette", 0.7
  else
    noshader "scanlines"
    noshader "vignette"
  end if
end sub` },
  { name: "raycaster.lsc", content: `rem Raycaster: explore a 3D maze and collect every glowing orb. W A S D or the arrow keys move, Q and E step sideways
window "Raycaster", 580, 420, "minesweeper"
sw = 240
sh = 150
screen sw, sh
button "restart", "New expedition"; checkbox "pause", "Paused", 0; checkbox "map", "Map", 1
map = ["################", "#......#.......#", "#.SSS..#..WWW..#", "#.S....#....W..#", "#.S..###..#.W..#", "#........#.....#", "#.WW..S..#..SS.#", "#.W...S.....S..#", "#.W.SSS..##.S..#", "#........#.....#", "#..####..#..WW.#", "#..............#", "################"]
orbs = 8
ox = [3.5, 13.5, 5.5, 10.5, 1.5, 14.5, 7.5, 4.5]
oy = [1.5, 1.5, 5.5, 7.5, 11.5, 11.5, 9.5, 7.5]
dim got(orbs)
dim zbuf(sw)
found = 0
px = 1.5
py = 1.5
angle = 0.3
bob = 0
flash = 0
started = clock()
finished = 0
shader "vignette", 0.6
while 1
  if keyhit("p") then setvalue "pause", not value("pause")
  k = min(0.05, delta())
  if keyhit("m") then setvalue "map", not value("map")
  if clicked("restart") or keyhit("r") then gosub expedition
  if value("pause") then frame
  if value("pause") then continue
  turn = 0
  if key("arrowleft") or key("a") then turn = -1
  if key("arrowright") or key("d") then turn = 1
  angle = angle + turn * 2.4 * k
  dirx = cos(angle)
  diry = sin(angle)
  fwd = 0
  side = 0
  if key("arrowup") or key("w") then fwd = 1
  if key("arrowdown") or key("s") then fwd = -1
  if key("q") then side = -1
  if key("e") then side = 1
  if fwd != 0 or side != 0 then
    mvx = (dirx * fwd - diry * side) * (2.6 + 1.4 * key("shift")) * k
    mvy = (diry * fwd + dirx * side) * (2.6 + 1.4 * key("shift")) * k
    if mid(map[floor(py)], floor(px + mvx + sign(mvx) * 0.2), 1) == "." then px = px + mvx
    if mid(map[floor(py + mvy + sign(mvy) * 0.2)], floor(px), 1) == "." then py = py + mvy
    bob = bob + k * 11
  end if
  horizon = sh / 2 + sin(bob) * 1.5
  planex = -diry * 0.66
  planey = dirx * 0.66
  warp
    gosub sky
    gosub walls
    gosub sprites
    if value("map") then gosub minimap
  end warp
  if flash > 0 then
    rect 0, 0, sw, sh, rgba(255, 230, 140, flash * 90)
    flash = flash - k * 3
  end if
  text sw - 5, 6, "Orbs " + found + " of " + orbs, "#00000090", 8, 2, "bold"
  text sw - 6, 5, "Orbs " + found + " of " + orbs, "#ffe58a", 8, 2, "bold"
  rect sw - 68, 17, 62, 2, "#ffffff30"; rect sw - 68, 17, 62 * found / orbs, 2, "#ffe58a"
  tip = ""
  if clock() - started < 7 and found == 0 then tip = "WASD / arrows move   Q/E strafe   Shift sprint   M map   P pause"
  text sw / 2, sh - 12, tip, "#ffffff", 6, 1, "sans"
  if found == orbs then
    if finished == 0 then
      finished = clock() - started
      caption "Raycaster / Expedition complete"
      if not hasfile("raycaster-best.txt") or finished < num(readfile("raycaster-best.txt")) then writefile "raycaster-best.txt", fixed(finished, 2)
      tone 523, 120, "triangle", 0.15
      tone 784, 400, "triangle", 0.12
    end if
    rect 0, sh / 2 - 22, sw, 40, "#00000080"
    text sw / 2, sh / 2 - 16, "You found every orb!", "#ffe58a", 14, 1, "title"
    text sw / 2, sh / 2 + 4, "Time " + fixed(finished, 1) + " seconds", "#ffffff", 7, 1, "sans"
  end if
  frame
wend
expedition:
found = 0; finished = 0; started = clock(); px = 1.5; py = 1.5; angle = 0.3; bob = 0; flash = 0
for o = 0 to orbs - 1
  got[o] = 0
next
caption "Raycaster / New expedition"
return
sky:
for y = 0 to sh - 1 step 2
  if y < horizon then
    f = y / horizon
    rect 0, y, sw, 2, rgb(14 + 26 * f, 18 + 30 * f, 40 + 48 * f)
  else
    f = (y - horizon) / (sh - horizon)
    rect 0, y, sw, 2, rgb(24 + 70 * f, 20 + 52 * f, 18 + 34 * f)
  end if
next
return
walls:
for col = 0 to sw - 1
  camx = 2 * col / sw - 1
  rx = dirx + planex * camx
  ry = diry + planey * camx
  if abs(rx) < 0.00001 then rx = 0.00001
  if abs(ry) < 0.00001 then ry = 0.00001
  mx = floor(px)
  my = floor(py)
  ddx = abs(1 / rx)
  ddy = abs(1 / ry)
  stx = 1
  sdx = (mx + 1 - px) * ddx
  if rx < 0 then
    stx = -1
    sdx = (px - mx) * ddx
  end if
  sty = 1
  sdy = (my + 1 - py) * ddy
  if ry < 0 then
    sty = -1
    sdy = (py - my) * ddy
  end if
  hit = 0
  tile = "."
  repeat
    if sdx < sdy then
      sdx = sdx + ddx
      mx = mx + stx
      hit = 0
    else
      sdy = sdy + ddy
      my = my + sty
      hit = 1
    end if
    tile = mid(map[my], mx, 1)
  until tile != "."
  if hit == 0 then
    d = sdx - ddx
    wx = py + d * ry
  else
    d = sdy - ddy
    wx = px + d * rx
  end if
  wx = wx - floor(wx)
  zbuf[col] = d
  tall = sh / max(0.05, d)
  top = horizon - tall / 2
  light = clamp(1.3 - d / 7, 0.1, 1)
  if hit == 1 then light = light * 0.72
  gosub texture
next
return
texture:
if tile == "W" then
  u = fract(wx * 4)
  grain = 0.82 + 0.18 * sin(wx * 70 + floor(wx * 4) * 5)
  if u < 0.07 then
    rect col, top, 1, tall, rgb(54 * light, 34 * light, 18 * light)
  else
    rect col, top, 1, tall, rgb(158 * grain * light, 104 * grain * light, 56 * grain * light)
  end if
  return
end if
bh = tall / 5
for b = 0 to 4
  y0 = top + b * bh
  shift = (b % 2) * 0.5
  u = fract(wx * 2 + shift)
  seed = fract(sin((floor(wx * 2 + shift) + b * 7 + mx * 13 + my * 29) * 12.9898) * 43758.5)
  v = (0.78 + 0.22 * seed) * light
  if tile == "S" then
    mortar = rgb(60 * light, 62 * light, 68 * light)
    stone = rgb(128 * v, 132 * v, 142 * v)
  else
    mortar = rgb(92 * light, 86 * light, 80 * light)
    stone = rgb(166 * v, 66 * v, 46 * v)
  end if
  if u < 0.05 then
    rect col, y0, 1, bh + 1, mortar
  else
    rect col, y0, 1, bh + 1, stone
    rect col, y0, 1, max(1, bh * 0.1), mortar
  end if
next
return
sprites:
inv = 1 / (planex * diry - dirx * planey)
for o = 0 to orbs - 1
  if got[o] == 0 then
    ex = ox[o] - px
    ey = oy[o] - py
    tx = inv * (diry * ex - dirx * ey)
    ty = inv * (-planey * ex + planex * ey)
    if ty > 0.2 then
      scr = sw / 2 * (1 + tx / ty)
      r = sh / ty * 0.16
      oc = horizon + sh / ty * 0.12 + sin(clock() * 3 + o) * r * 0.4
      fade = clamp(1.4 - ty / 8, 0.35, 1)
      for c2 = max(0, floor(scr - r)) to min(sw - 1, floor(scr + r))
        if zbuf[c2] > ty then
          half = sqrt(max(0, r * r - (c2 - scr) * (c2 - scr)))
          g = 1 - abs(c2 - scr) / max(1, r)
          rect c2, oc - half, 1, half * 2, hsv(48 + o * 38, 0.75 - g * 0.6, (0.55 + g * 0.45) * fade)
        end if
      next
    end if
    if dist(px, py, ox[o], oy[o]) < 0.5 then
      got[o] = 1
      found = found + 1
      flash = 1
      tone 660 + found * 110, 160, "sine", 0.15
    end if
  end if
next
return
minimap:
rect 3, 3, 35, 29, "#00000088"
for row = 0 to 12
  mrow = map[row]
  for c = 0 to 15
    if mid(mrow, c, 1) != "." then rect 4 + c * 2, 4 + row * 2, 2, 2, "#ffffff60"
  next
next
for o = 0 to orbs - 1
  if got[o] == 0 then pixel 4 + ox[o] * 2, 4 + oy[o] * 2, "#ffe58a"
next
line 4 + px * 2, 4 + py * 2, 4 + (px + dirx * 1.5) * 2, 4 + (py + diry * 1.5) * 2, "#ff8080"
rect 3 + px * 2, 3 + py * 2, 2, 2, "#ff3030"
return` },
  { name: "fireworks.lsc", content: `rem Fireworks over a sleeping city. Click anywhere to launch a rocket toward that spot
window "Fireworks", 580, 440, "fortune"
screen "auto", 2
slider "rate", "Launches / sec", 0, 4, 1, 0.1; checkbox "pause", "Paused", 0; checkbox "audio", "Sound", 1
count = 1600
dim x(count)
dim y(count)
dim vx(count)
dim vy(count)
dim life(count)
dim full(count)
dim hue(count)
dim slow(count)
slot = 0
rockets = 10
dim rx(rockets)
dim ry(rockets)
dim rvy(rockets)
dim live(rockets)
stars = 80
dim starx(stars)
dim stary(stars)
for i = 0 to stars - 1
  starx[i] = random()
  stary[i] = random() * 0.6
next
flash = 0
shader "glow", 2, "#ffd9a0"
gosub skyline
while 1
  w = width()
  h = height()
  if resized() then gosub skyline
  if keyhit("p") then setvalue "pause", not value("pause")
  if value("pause") then frame
  if value("pause") then continue
  k = min(3, delta() * 60)
  d1 = pow(0.975, k)
  d2 = pow(0.955, k)
  rect 0, 0, w, h, "#05071430"
  if flash > 0 then
    rect 0, 0, w, h, rgba(255, 210, 160, flash * 30)
    flash = flash * 0.8 - 0.02
  end if
  for i = 0 to stars - 1
    pixel starx[i] * w, stary[i] * h, rgba(255, 255, 255, 110 + 90 * sin(clock() * 2 + i * 1.7))
  next
  if mousehit() then call launch(mousex(), mousey())
  if random() < 1 - exp(-value("rate") * delta()) then call launch(random(w * 0.12, w * 0.88), random(h * 0.12, h * 0.42))
  warp
    for j = 0 to rockets - 1
      if live[j] then
        rvy[j] = rvy[j] + 0.02 * k
        ry[j] = ry[j] + rvy[j] * k
        call spark(rx[j] + random(-0.5, 0.5), ry[j], random(-0.15, 0.15), random(0, 0.3), 30, 14 + rnd(10), 0)
        pixel rx[j], ry[j], "#fff2d0"
        if rvy[j] >= -0.15 then
          live[j] = 0
          call burst(rx[j], ry[j])
        end if
      end if
    next
    for i = 0 to count - 1
      if life[i] > 0 then
        if slow[i] then
          vx[i] = vx[i] * d2
          vy[i] = vy[i] * d2 + 0.012 * k
        else
          vx[i] = vx[i] * d1
          vy[i] = vy[i] * d1 + 0.02 * k
        end if
        x[i] = x[i] + vx[i] * k
        y[i] = y[i] + vy[i] * k
        life[i] = life[i] - k
        v = life[i] / full[i]
        if v > 0.25 or rnd(3) > 0 then pixel x[i], y[i], hsv(hue[i], 0.75 * v + 0.1, min(1, v * 1.7))
      end if
    next
  end warp
  gosub city
  frame
wend
skyline:
w = width()
h = height()
blocks = []
heights = []
windows = []
bx = 0
while bx < w
  bw = 8 + rnd(14)
  n = push(blocks, bx)
  n = push(heights, 10 + rnd(floor(h * 0.18)))
  bx = bx + bw + rnd(2)
wend
n = push(blocks, w + 20)
for b = 0 to len(heights) - 1
  for wy = h - heights[b] + 3 to h - 4 step 4
    for wx = blocks[b] + 2 to blocks[b + 1] - 4 step 3
      if rnd(4) == 0 then n = push(windows, wx + wy * 10000)
    next
  next
next
return
city:
for b = 0 to len(heights) - 1
  rect blocks[b], h - heights[b], blocks[b + 1] - blocks[b] - 1, heights[b], "#0a0c18"
  rect blocks[b], h - heights[b], blocks[b + 1] - blocks[b] - 1, 1, "#161a2e"
next
for i = 0 to len(windows) - 1
  pixel windows[i] % 10000, floor(windows[i] / 10000), "#e8c870"
next
return
sub launch(tx, ty)
  for j = 0 to rockets - 1
    if live[j] == 0 then
      live[j] = 1
      rx[j] = tx
      ry[j] = height()
      rvy[j] = -sqrt(2 * 0.02 * max(10, height() - ty))
      if value("audio") then tone 260, 300, "sine", 0.025
      return
    end if
  next
end sub
sub burst(bx, by)
  kind = rnd(5)
  base = rnd(360)
  flash = 1
  if value("audio") then tone 60 + rnd(40), 380, "sawtooth", 0.06
  for n = 1 to 120
    a = n / 120 * 2 * pi()
    s = random(0.3, 1.9)
    vxs = cos(a) * s
    vys = sin(a) * s
    if kind == 0 then
      a = random(0, 2 * pi())
      vxs = cos(a) * s
      vys = sin(a) * s
    end if
    if kind == 1 then
      vxs = cos(a) * 1.7
      vys = sin(a) * 1.7
    end if
    if kind == 2 then
      s = 1 + (n % 2) * 0.8
      vxs = cos(a) * s
      vys = sin(a) * s
    end if
    if kind == 3 then
      vxs = vxs * 0.8
      vys = vys * 0.8
      call spark(bx, by, vxs, vys, 38 + rnd(12), 110 + rnd(40), 1)
    else
      if kind == 4 then
        vxs = 16 * pow(sin(a), 3) * 0.1
        vys = -(13 * cos(a) - 5 * cos(2 * a) - 2 * cos(3 * a) - cos(4 * a)) * 0.1
      end if
      call spark(bx, by, vxs, vys, base + rnd(40), 55 + rnd(30), 0)
    end if
  next
end sub
sub spark(sx, sy, svx, svy, shue, slife, sslow)
  x[slot] = sx
  y[slot] = sy
  vx[slot] = svx
  vy[slot] = svy
  hue[slot] = shue
  life[slot] = slife
  full[slot] = slife
  slow[slot] = sslow
  slot = (slot + 1) % count
end sub` },
  { name: "synth.lsc", content: `rem Synth: play the piano with the mouse, or type A W S E D F T G Y H U J K for one octave. Record a tune and play it back
window "Synth", 540, 380, "fortune"
screen 224, 132
slider "octave", "Octave", 2, 6, 4
button "wave", "Wave"
button "rec", "Record"
button "play", "Play back"
button "demo", "Demo song"
button "stop", "Stop"; button "save", "Save tune"; button "load", "Load tune"
label "info", "Square wave"
waves = ["square", "sine", "triangle", "sawtooth"]
wave = 0
whites = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23]
blackafter = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12]
names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
keys = "awsedftgyhujk"
demo = [4, 4, 5, 7, 7, 5, 4, 2, 0, 0, 2, 4, 4, 2, 2]
beats = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2]
demotimes = []
at = 0
for i = 0 to len(beats) - 1
  n = push(demotimes, at)
  at = at + beats[i] * 0.32
next
dim glow(24)
song = []
times = []
qn = []
qt = []
recording = 0
lastnote = 0
lastat = -10
top = 44
while 1
  now = clock()
  if clicked("wave") then
    wave = (wave + 1) % 4
    setvalue "info", upper(left(waves[wave], 1)) + mid(waves[wave], 1) + " wave"
  end if
  if clicked("rec") then
    recording = 1 - recording
    if recording then
      song = []
      times = []
      recstart = now
      setvalue "info", "Recording. Press Record again to stop"
    else
      setvalue "info", len(song) + " notes recorded"
    end if
  end if
  if clicked("play") and len(song) > 0 then call schedule(song, times)
  if clicked("demo") then call schedule(demo, demotimes)
  if clicked("load") and hasfile("synth-tune.txt") then gosub loadtune
  if clicked("save") and len(song) > 0 then writefile "synth-tune.txt", join(song, ",") + chr(10) + join(times, ",")
  if clicked("stop") then call schedule([], [])
  if len(qn) == 0 then qt = []
  for i = 0 to 12
    if keyhit(mid(keys, i, 1)) then call play(i)
  next
  if mousehit() then gosub clickkey
  due = 1
  while due
    due = 0
    if len(qn) > 0 then
      if qt[0] <= now then
        due = 1
        t = shift(qt)
        fromqueue = 1; call play(shift(qn)); fromqueue = 0
      end if
    end if
  wend
  gosub draw
  frame
wend
loadtune:
saved = split(readfile("synth-tune.txt"), chr(10))
if len(saved) < 2 then return
loadednotes = split(saved[0], ","); loadedtimes = split(saved[1], ",")
if len(loadednotes) != len(loadedtimes) then return
song = loadednotes; times = loadedtimes
for j = 0 to len(song) - 1
  song[j] = clamp(floor(num(song[j])), 0, 23); times[j] = max(0, num(times[j]))
  if j > 0 then times[j] = max(times[j], times[j - 1])
next
setvalue "info", "Loaded " + len(song) + " notes"
return
clickkey:
mx = mousex()
my = mousey()
if my < top then return
if my < top + 52 then
  for j = 0 to len(blackafter) - 1
    bx = blackafter[j] * 16 + 11
    if mx >= bx and mx < bx + 10 then
      call play(whites[blackafter[j]] + 1)
      return
    end if
  next
end if
i = floor(mx / 16)
if i >= 0 and i < 14 then call play(whites[i])
return
draw:
cls "#1c1c24"
rect 4, 4, 216, 36, "#0b1a10"
for gx = 4 to 220 step 18
  rect gx, 5, 1, 34, "#12301b"
next
rect 5, 22, 214, 1, "#1d4a2a"
box 4, 4, 216, 36, "#3d4d3d"
env = max(0, 1 - (now - lastat) / 0.7)
cycles = 2 + (lastnote % 12) / 4
prevy = 22
for xx = 0 to 211
  ph = fract(xx / 212 * cycles + now * 3)
  v = sin(ph * 2 * pi())
  if wave == 0 then
    v = 1
    if ph >= 0.5 then v = -1
  end if
  if wave == 2 then v = 1 - 4 * abs(ph - 0.5)
  if wave == 3 then v = 2 * ph - 1
  yy = 22 - v * 13 * env
  line 5 + xx, prevy, 6 + xx, yy, "#5cff8a"
  prevy = yy
next
notename = names[lastnote % 12] + (value("octave") + floor(lastnote / 12))
text 8, 6, notename, "#5cff8a", 6, 0, "mono"
text 216, 6, waves[wave], "#3fbf6a", 5, 2, "mono"
if recording and floor(now * 2) % 2 == 0 then
  circle 200, 34, 2, "#ff3b3b"
  text 196, 31, "REC", "#ff6b6b", 5, 2, "bold"
end if
for i = 0 to 13
  x0 = i * 16
  g = glow[whites[i]]
  rect x0, top, 16, 87, "#26262c"
  c = "#f6f5ef"
  if g > 0 then c = hsv(205, 0.55 * g, 1)
  rect x0 + 1, top, 14, 86, c
  rect x0 + 1, top + 80, 14, 6, "#d6d4cb"
  if whites[i] <= 12 then text x0 + 8, top + 68, upper(mid(keys, whites[i], 1)), "#8a8a90", 5, 1, "bold"
next
for j = 0 to len(blackafter) - 1
  n = whites[blackafter[j]] + 1
  x0 = blackafter[j] * 16 + 11
  g = glow[n]
  c = "#1a1a1e"
  if g > 0 then c = hsv(205, 0.8, 0.4 + 0.6 * g)
  rect x0, top, 10, 52, c
  rect x0 + 2, top, 2, 48, "#ffffff22"
  rect x0, top + 48, 10, 4, "#00000060"
  if n <= 12 then text x0 + 5, top + 40, upper(mid(keys, n, 1)), "#9a9aa8", 4, 1, "bold"
next
for n = 0 to 23
  glow[n] = max(0, glow[n] - delta() * 3)
next
return
sub play(n)
  freq = 261.63 * pow(2, value("octave") - 4 + n / 12)
  tone freq, 380, waves[wave], 0.18
  glow[n] = 1
  lastnote = n
  lastat = clock()
  if recording and not fromqueue then
    c = push(song, n)
    c = push(times, clock() - recstart)
  end if
end sub
sub schedule(notes, offsets)
  qn = []; qt = []
  base = clock() + 0.1
  for i = 0 to len(notes) - 1
    c = push(qn, notes[i])
    c = push(qt, base + offsets[i])
  next
end sub` },
  { name: "typewriter.lsc", content: `rem Typewriter: type on a sheet of paper, complete with carriage returns. Save writes typed.txt into Files
window "Typewriter", 540, 460, "notes"
screen "auto", 1
button "save", "Save to typed.txt"
button "new", "New sheet"
label "info", ""
lines = [""]
if hasfile("typed.txt") then lines = split(readfile("typed.txt"), chr(10))
size = 15
lineh = 24
tick = 0
while 1
  w = width()
  h = height()
  paperx = 28
  paperw = w - 56
  margin = 60
  charw = max(1, textwidth("M", size, "type"))
  maxchars = max(8, floor((paperw - margin - 30) / charw))
  k = lastkey()
  while k != ""
    if k == chr(10) then
      n = push(lines, "")
      tone 330, 110, "triangle", 0.06
    else
      if k == chr(8) then
        gosub rubout
      else
        if k != chr(9) then gosub typechar
      end if
    end if
    tick = 0
    k = lastkey()
  wend
  if clicked("save") then
    writefile "typed.txt", join(lines, chr(10))
    setvalue "info", "Saved " + len(lines) + " lines"
  end if
  if clicked("new") then
    lines = [""]
    setvalue "info", ""
  end if
  caption "Typewriter / " + len(join(lines, chr(10))) + " characters"
  cls "#5b3a29"
  for y = 0 to h step 6
    rect 0, y, w, 2, rgba(0, 0, 0, 18 + 14 * sin(y * 0.7))
  next
  visible = max(1, floor((h - 60) / lineh))
  first = max(0, len(lines) - visible)
  rect paperx + 4, 16, paperw, h, "#00000060"
  rect paperx, 12, paperw, h, "#fbf7ec"
  rect paperx + margin - 10, 12, 1, h, "#f0a8a8"
  for i = 0 to visible
    rect paperx + 6, 42 + i * lineh + size, paperw - 12, 1, "#d6e4f2"
  next
  for hole = 0 to 2
    circle paperx + 18, 80 + hole * 110, 6, "#5b3a29"
  next
  for i = first to len(lines) - 1
    text paperx + margin, 40 + (i - first) * lineh, lines[i], "#25252e", size, 0, "type"
  next
  tick = tick + delta() * 60
  cy = 40 + (len(lines) - 1 - first) * lineh
  if tick % 50 < 28 then rect paperx + margin + len(lines[len(lines) - 1]) * charw, cy, 2, size + 2, "#25252e"
  frame
wend
typechar:
current = lines[len(lines) - 1]
if len(current) >= maxchars then
  cut = len(current) - 1
  while cut > 0 and mid(current, cut, 1) != " "
    cut = cut - 1
  wend
  if k != " " and cut > 0 then
    lines[len(lines) - 1] = left(current, cut)
    n = push(lines, mid(current, cut + 1))
  else
    n = push(lines, "")
  end if
  tone 2093, 400, "sine", 0.06
  if k == " " then return
end if
lines[len(lines) - 1] = lines[len(lines) - 1] + k
tone 1700 + rnd(500), 12, "square", 0.03
return
rubout:
last = lines[len(lines) - 1]
if len(last) > 0 then
  lines[len(lines) - 1] = left(last, len(last) - 1)
else
  if len(lines) > 1 then n = pop(lines)
end if
tone 900, 10, "square", 0.02
return` },
  { name: "breakout.lsc", content: `window "BREAKOUT / 01", 600, 500, "minesweeper"
screen 240, 180
button "new", "New game"
checkbox "pause", "Paused", 0
checkbox "audio", "Sound", 1
dim bricks(60)
dim sx(64)
dim sy(64)
dim svx(64)
dim svy(64)
dim life(64)
dim shades(64)
dim trailx(8)
dim traily(8)
best = 0
if hasfile("breakout-best.txt") then best = clamp(num(readfile("breakout-best.txt")), 0, 99999999)
slot = 0
gosub newgame
while 1
  dt = min(0.04, delta())
  fire = keyhit("space") or mousehit()
  if keyhit("p") then setvalue "pause", not value("pause")
  if clicked("new") or keyhit("r") then gosub newgame
  if not value("pause") then
    if mousex() != lastmouse then paddle = clamp(mousex(), 24, 216)
    lastmouse = mousex()
    if key("arrowleft") or key("a") then paddle = max(24, paddle - 170 * dt)
    if key("arrowright") or key("d") then paddle = min(216, paddle + 170 * dt)
    if mode == 3 and fire then
      level = level + 1
      gosub build
      fire = 0
    end if
    if mode == 2 and fire then
      gosub newgame
      fire = 0
    end if
    if mode == 0 then
      bx = paddle
      by = 150
      if fire then mode = 1
    end if
    if mode == 1 then
      steps = max(1, ceil(speed * dt / 2))
      for step = 1 to steps
        if mode == 1 then gosub physics
      next
    end if
    for i = 0 to 63
      if life[i] > 0 then
        sx[i] = sx[i] + svx[i] * dt
        sy[i] = sy[i] + svy[i] * dt
        svy[i] = svy[i] + 70 * dt
        life[i] = max(0, life[i] - dt)
      end if
    next
    for i = 7 to 1 step -1
      trailx[i] = trailx[i - 1]
      traily[i] = traily[i - 1]
    next
    trailx[0] = bx
    traily[0] = by
  end if
  gosub draw
  frame
wend
newgame:
score = 0
level = 1
lives = 3
paddle = 120
lastmouse = mousex()
setvalue "pause", 0
gosub build
return
build:
remaining = 0
for i = 0 to 59
  bricks[i] = 1
  if level % 3 == 2 and (floor(i / 10) + i % 10) % 3 == 0 then bricks[i] = 0
  if level % 3 == 0 and abs(i % 10 - 4.5) < abs(floor(i / 10) - 2.5) then bricks[i] = 0
  remaining = remaining + bricks[i]
next
speed = min(190, 105 + level * 8)
gosub ready
return
ready:
mode = 0
bx = paddle
by = 150
vx = speed * 0.38
vy = -sqrt(speed * speed - vx * vx)
for i = 0 to 7
  trailx[i] = bx
  traily[i] = by
next
return
physics:
prevx = bx
prevy = by
bx = bx + vx * dt / steps
by = by + vy * dt / steps
if bx <= 5 or bx >= 235 then
  bx = clamp(bx, 5, 235)
  vx = -vx
end if
if by <= 24 then
  by = 24
  vy = abs(vy)
end if
if vy > 0 and prevy <= 151 and by >= 151 and abs(bx - paddle) <= 23 then
  bx = clamp(bx, paddle - 23, paddle + 23)
  by = 151
  aim = clamp((bx - paddle) / 23, -1, 1)
  vx = sin(aim * 1.05) * speed
  vy = -max(35, cos(aim * 1.05) * speed)
  if value("audio") then tone 330, 45, "triangle", 0.07
end if
hit = -1
for b = 0 to 59
  if bricks[b] and hit == -1 then
    rx = 11 + (b % 10) * 22
    ry = 33 + floor(b / 10) * 11
    if bx + 2 >= rx and bx - 2 < rx + 20 and by + 2 >= ry and by - 2 < ry + 8 then hit = b
  end if
next
if hit >= 0 then
  rx = 11 + (hit % 10) * 22
  ry = 33 + floor(hit / 10) * 11
  bricks[hit] = 0
  remaining = remaining - 1
  score = score + (6 - floor(hit / 10)) * 10 * level
  if prevy + 2 <= ry or prevy - 2 >= ry + 8 then
    vy = -vy
    by = prevy
  else
    vx = -vx
    bx = prevx
  end if
  for spark = 0 to 7
    sx[slot] = rx + 10
    sy[slot] = ry + 4
    svx[slot] = random(-55, 55)
    svy[slot] = random(-65, 20)
    life[slot] = random(0.2, 0.55)
    shades[slot] = 330 - floor(hit / 10) * 35
    slot = (slot + 1) % 64
  next
  if value("audio") then tone 440 * pow(2, (6 - floor(hit / 10)) / 12), 70, "triangle", 0.06
  if score > best then
    best = score
    writefile "breakout-best.txt", best
  end if
  if remaining == 0 then mode = 3
end if
if by > 174 then
  lives = lives - 1
  if value("audio") then tone 110, 180, "triangle", 0.08
  gosub ready
  if lives <= 0 then mode = 2
end if
return
draw:
cls "#080e20"
for gx = 9 to 239 step 12
  line gx, 23, gx, 170, "#101a30"
next
for gy = 26 to 170 step 12
  line 4, gy, 235, gy, "#101a30"
next
rect 3, 22, 2, 149, "#2a3d61"
rect 235, 22, 2, 149, "#2a3d61"
text 6, 5, pad(score, 6, "0"), "#ffffff", 10, 0, "mono"
text 120, 6, "STAGE " + level, "#82ddff", 7, 1, "bold"
text 234, 6, "BEST " + best, "#90a4c4", 7, 2, "mono"
for b = 0 to 59
  if bricks[b] then
    rx = 11 + (b % 10) * 22
    ry = 33 + floor(b / 10) * 11
    shade = 330 - floor(b / 10) * 35
    rect rx + 1, ry + 2, 20, 8, "#00000070"
    rect rx, ry, 20, 8, hsv(shade, 0.7, 0.88)
    rect rx, ry, 20, 1, hsv(shade, 0.35, 1)
    rect rx, ry + 7, 20, 1, hsv(shade, 0.8, 0.5)
  end if
next
for i = 0 to 63
  if life[i] > 0 then rect sx[i], sy[i], 2, 2, hsv(shades[i], 0.65, min(1, life[i] * 3))
next
rect paddle - 22, 156, 44, 5, "#208ac0"
rect paddle - 22, 155, 44, 2, "#a1f3ff"
rect paddle - 18, 157, 36, 2, "#4ec9ed"
if mode <= 1 then
  for i = 7 to 1 step -1
    circle trailx[i], traily[i], 1, hsv(190, 0.6, (8 - i) / 10)
  next
  circle bx, by, 2, "#ffffff"
end if
text 6, 172, "LIVES " + max(0, lives), "#a1c4ea", 6, 0, "mono"
text 234, 172, "P pause   R restart", "#637b9c", 6, 2, "mono"
if mode != 1 or value("pause") then
  rect 28, 105, 184, 39, "#080e20ed"
  box 28, 105, 184, 39, "#3d679a"
  heading = "READY TO LAUNCH"
  detail = "Move mouse or arrows. Space / click to launch"
  if mode == 2 then heading = "GAME OVER"
  if mode == 2 then detail = "Score " + score + ". Space / click to play again"
  if mode == 3 then heading = "STAGE CLEAR"
  if mode == 3 then detail = "Space / click for stage " + (level + 1)
  if value("pause") then heading = "PAUSED"
  if value("pause") then detail = "Press P or uncheck Paused to resume"
  text 120, 112, heading, "#f8dc8a", 12, 1, "title"
  text 120, 130, detail, "#bdcde6", 6, 1, "sans"
end if
return` },
  { name: "orbits.lsc", content: `window "ORBITAL / gravity laboratory", 660, 540, "charmap"
screen 280, 210
button "solar", "Orbital system"
button "binary", "Binary stars"
button "clear", "Clear"
checkbox "pause", "Paused", 0
checkbox "trails", "Trails", 1
slider "speed", "Time", 0.1, 3, 1, 0.1
slider "mass", "Launch mass", 1, 20, 3
label "hint", "Drag to launch. Space pauses. R resets."
dim x(24)
dim y(24)
dim vx(24)
dim vy(24)
dim mass(24)
dim ax(24)
dim ay(24)
dim previousx(24)
dim previousy(24)
dim hue(24)
count = 0
launching = 0
elapsed = 0
gosub solar
while 1
  if clicked("solar") or keyhit("r") then gosub solar
  if clicked("binary") then gosub binary
  if clicked("clear") then
    count = 0
    cls "#050916"
  end if
  if keyhit("space") then setvalue "pause", not value("pause")
  if mousehit() and mousey() > 20 then
    launching = 1
    startx = clamp(mousex(), 1, 279)
    starty = clamp(mousey(), 21, 209)
  end if
  if launching and not mousedown() then
    if count < 24 then call body(startx, starty, (startx - mousex()) * 0.45, (starty - mousey()) * 0.45, value("mass"), 160 + count * 37)
    launching = 0
  end if
  dt = min(0.035, delta()) * value("speed")
  previousx = copy(x); previousy = copy(y)
  if not value("pause") and not launching then
    for tick = 1 to 4
      gosub gravity
      for i = 0 to count - 1
        vx[i] = vx[i] + ax[i] * dt / 8
        vy[i] = vy[i] + ay[i] * dt / 8
        x[i] = x[i] + vx[i] * dt / 4
        y[i] = y[i] + vy[i] * dt / 4
      next
      gosub gravity
      for i = 0 to count - 1
        vx[i] = vx[i] + ax[i] * dt / 8
        vy[i] = vy[i] + ay[i] * dt / 8
      next
    next
    elapsed = elapsed + dt
  end if
  if not value("trails") or launching then cls "#050916"
  text 140, 192, "", "#c3e9ff", 7, 1, "sans"
  if value("trails") and not value("pause") and not launching then rect 0, 19, 280, 191, "#05091602"
  for i = 0 to count - 1
    radius = max(1, sqrt(mass[i]) * 0.55)
    if value("trails") then line previousx[i], previousy[i], x[i], y[i], hsv(hue[i], 0.7, 0.7)
    if x[i] >= 0 and x[i] < 280 and y[i] > 19 and y[i] < 210 then
      circle round(x[i]), round(y[i]), radius + 2, hsv(hue[i], 0.8, 0.18)
      circle round(x[i]), round(y[i]), radius, hsv(hue[i], 0.35, 1)
      if mass[i] > 30 then pixel round(x[i]), round(y[i]), "#ffffff"
    end if
  next
  if launching then
    line startx, starty, mousex(), mousey(), "#587494"
    line startx, starty, startx + (startx - mousex()) * 0.6, starty + (starty - mousey()) * 0.6, "#80e6ff"
    circle startx, starty, sqrt(value("mass")), "#80e6ff", 0
    text 140, 192, "Release to launch opposite your drag", "#c3e9ff", 7, 1, "sans"
  end if
  rect 0, 0, 280, 19, "#101b30"
  line 0, 18, 279, 18, "#284461"
  text 6, 5, "ORBITAL", "#9eeaff", 9, 0, "title"
  text 274, 6, count + "/24 bodies   t " + fixed(elapsed, 1), "#a9bed5", 7, 2, "mono"
  if count == 0 then text 140, 100, "Drag anywhere to create your first body", "#8baccb", 9, 1, "sans"
  text 140, 28, repeat("PAUSED", num(value("pause"))), "#ffe0a3", 8, 1, "bold"
  if count >= 24 then text 140, 192, "24 bodies. Clear or choose a preset to start again", "#ffe0a3", 7, 1, "sans"
  frame
wend
gravity:
for i = 0 to count - 1
  ax[i] = 0
  ay[i] = 0
next
for i = 0 to count - 2
  for j = i + 1 to count - 1
    dx = x[j] - x[i]
    dy = y[j] - y[i]
    r2 = dx * dx + dy * dy + 36
    force = 90 / (r2 * sqrt(r2))
    ax[i] = ax[i] + dx * mass[j] * force
    ay[i] = ay[i] + dy * mass[j] * force
    ax[j] = ax[j] - dx * mass[i] * force
    ay[j] = ay[j] - dy * mass[i] * force
  next
next
return
solar:
count = 0
elapsed = 0
launching = 0
cls "#050916"
call body(140, 114, 0, 0, 160, 42)
for p = 0 to 5
  radius = 20 + p * 14
  angle = p * 2.39996
  velocity = sqrt(90 * 160 / radius)
  call body(140 + cos(angle) * radius, 114 + sin(angle) * radius, -sin(angle) * velocity, cos(angle) * velocity, 0.25 + p * 0.12, 170 + p * 37)
next
gosub center
return
binary:
count = 0
elapsed = 0
launching = 0
cls "#050916"
call body(120, 114, 0, -10.5, 100, 32)
call body(160, 114, 0, 10.5, 100, 210)
for p = 0 to 9
  angle = p / 10 * pi() * 2
  radius = 78 + p % 3 * 5
  velocity = sqrt(90 * 200 / radius)
  call body(140 + cos(angle) * radius, 114 + sin(angle) * radius, -sin(angle) * velocity, cos(angle) * velocity, 0.1, p * 36)
next
gosub center
return
center:
totalmass = 0
mx = 0
my = 0
for i = 0 to count - 1
  totalmass = totalmass + mass[i]
  mx = mx + mass[i] * vx[i]
  my = my + mass[i] * vy[i]
next
for i = 0 to count - 1
  vx[i] = vx[i] - mx / totalmass
  vy[i] = vy[i] - my / totalmass
next
return
sub body(bx, by, bvx, bvy, bm, bh)
  if count >= 24 then return
  x[count] = bx
  y[count] = by
  vx[count] = bvx
  vy[count] = bvy
  mass[count] = bm
  hue[count] = bh
  count = count + 1
end sub` },
  { name: "sorting.lsc", content: `window "SORT / algorithm race", 640, 500, "logs"
screen 288, 196
button "shuffle", "Shuffle"
button "reverse", "Reverse"
button "nearly", "Nearly sorted"
checkbox "pause", "Paused", 0
checkbox "sound", "Sound", 0
slider "rate", "Steps / frame", 1, 32, 4
label "help", "Identical inputs. Live comparisons and writes. Space pauses."
count = 56
dim bubble(count)
dim insertion(count)
dim selection(count)
dim source(count)
dim comparisons(3)
dim writes(3)
dim done(3)
dim highlights(3)
names = ["BUBBLE", "INSERTION", "SELECTION"]
hues = [192, 320, 42]
pattern = 0
gosub reset
while 1
  if clicked("shuffle") or keyhit("r") then
    pattern = 0
    gosub reset
  end if
  if clicked("reverse") then
    pattern = 1
    gosub reset
  end if
  if clicked("nearly") then
    pattern = 2
    gosub reset
  end if
  if keyhit("space") then setvalue "pause", not value("pause")
  if not value("pause") then
    for batch = 1 to value("rate")
      if not done[0] then gosub bubbleStep
      if not done[1] then gosub insertionStep
      if not done[2] then gosub selectionStep
    next
  end if
  cls "#090f1e"
  for lane = 0 to 2
    top = lane * 62 + 5
    text 5, top, names[lane], hsv(hues[lane], 0.4, 1), 9, 0, "bold"
    state = comparisons[lane] + " comparisons / " + writes[lane] + " writes"
    if done[lane] then state = "SORTED / " + state
    text 282, top + 1, state, "#9aabc3", 6, 2, "mono"
    line 5, top + 50, 282, top + 50, "#263652"
    values = bubble
    if lane == 1 then values = insertion
    if lane == 2 then values = selection
    for i = 0 to count - 1
      bar = values[i] / count * 34
      c = hsv(hues[lane], 0.65, 0.7)
      if done[lane] then c = "#76e5ad"
      if i == highlights[lane] and not done[lane] then c = "#ffffff"
      rect 5 + i * 5, top + 49 - bar, 4, bar, c
    next
  next
  footer = "One logical step per lane. Change the input to compare."
  if value("pause") then footer = "PAUSED / Space resumes"
  if done[0] and done[1] and done[2] then footer = "All three agree. Try Reverse or Nearly sorted."
  text 144, 190, footer, "#a6bed8", 6, 1, "sans"
  if value("sound") and not value("pause") and not done[1] then tone 180 + insertion[highlights[1]] * 12, 22, "sine", 0.025
  frame
wend
reset:
for i = 0 to count - 1
  source[i] = i + 1
next
if pattern == 0 then
  for i = count - 1 to 1 step -1
    j = rnd(i + 1)
    swap = source[i]
    source[i] = source[j]
    source[j] = swap
  next
end if
if pattern == 1 then n = reverse(source)
if pattern == 2 then
  for i = 0 to 3
    j = 3 + i * 13
    swap = source[j]
    source[j] = source[j + 1]
    source[j + 1] = swap
  next
end if
bubble = copy(source)
insertion = copy(source)
selection = copy(source)
for lane = 0 to 2
  comparisons[lane] = 0
  writes[lane] = 0
  done[lane] = 0
  highlights[lane] = 0
next
bi = 0
bend = count - 1
bswapped = 0
ii = 1
ij = 1
si = 0
sj = 1
smin = 0
return
bubbleStep:
comparisons[0] = comparisons[0] + 1
highlights[0] = bi + 1
if bubble[bi] > bubble[bi + 1] then
  swap = bubble[bi]
  bubble[bi] = bubble[bi + 1]
  bubble[bi + 1] = swap
  writes[0] = writes[0] + 2
  bswapped = 1
end if
bi = bi + 1
if bi >= bend then
  bend = bend - 1
  bi = 0
  if bend <= 0 or not bswapped then done[0] = 1
  bswapped = 0
end if
return
insertionStep:
highlights[1] = ij
if ij > 0 then
  comparisons[1] = comparisons[1] + 1
  if insertion[ij - 1] > insertion[ij] then
    swap = insertion[ij]
    insertion[ij] = insertion[ij - 1]
    insertion[ij - 1] = swap
    writes[1] = writes[1] + 2
    ij = ij - 1
    return
  end if
end if
ii = ii + 1
ij = ii
if ii >= count then done[1] = 1
return
selectionStep:
highlights[2] = sj
comparisons[2] = comparisons[2] + 1
if selection[sj] < selection[smin] then smin = sj
sj = sj + 1
if sj >= count then
  if smin != si then
    swap = selection[si]
    selection[si] = selection[smin]
    selection[smin] = swap
    writes[2] = writes[2] + 2
  end if
  si = si + 1
  sj = si + 1
  smin = si
  if si >= count - 1 then done[2] = 1
end if
return` },
];
export const retiredSamples = ["hello.lsc:10us677", "flappy.lsc:1qya8nk", "snake.lsc:cou7bx", "life.lsc:1vb7pw0", "mandelbrot.lsc:s3veta", "sketch.lsc:16lfkex", "explorer.lsc:kzp9bu", "plasma.lsc:nkojl6", "raycaster.lsc:1ozb5c3", "fireworks.lsc:mkyozi", "synth.lsc:hoipcy", "typewriter.lsc:1ibyt1c", "hello.lsc:11d8pa0", "flappy.lsc:15lvqj7", "snake.lsc:1rr4amn", "life.lsc:ytihny", "mandelbrot.lsc:syvmcp", "sketch.lsc:rwbl4l", "explorer.lsc:yjc2m", "plasma.lsc:jvsdjp", "raycaster.lsc:1yyhbnm", "fireworks.lsc:v67we5", "synth.lsc:1gav2xo", "typewriter.lsc:1svenu1"];
export const sampleHash = (text) => { let hash = 2166136261; for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(36); };
