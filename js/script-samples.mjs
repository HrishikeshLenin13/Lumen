export const scriptSamples = [
  { name: "hello.lsc", content: `rem Hello window: draws text and a sine wave
window "Hello", 320, 220, "notes"
screen 160, 100
cls 1
text 8, 6, "Hello from LUMEN Script", 15
for x = 0 to 159
  pixel x, 60 + int(sin(x / 10) * 20), hsv(x * 2, 1, 1)
next
print "Drew " + 160 + " pixels."` },
  { name: "flappy.lsc", content: `rem Flappy LUMEN: press Space, click the screen, or use the Flap button
window "Flappy LUMEN", 320, 290, "fortune"
screen 160, 120
button "flap", "Flap"
best = 0
game:
y = 50
vy = 0
score = 0
alive = 1
gosub newpipe
while alive
  if keyhit("space") or keyhit("arrowup") or mousehit() or clicked("flap") then vy = -2.3
  vy = vy + 0.16
  y = y + vy
  px = px - 1.3
  if px < -14 then gosub newpipe
  if scored == 0 and px + 14 < 30 then gosub point
  if y > 102 or y < 0 then alive = 0
  if px < 38 and px + 14 > 30 and (y < gap or y + 6 > gap + 36) then alive = 0
  cls "#4ec0ca"
  rect px, 0, 14, gap, "#5ee270"
  rect px, gap + 36, 14, 108 - gap - 36, "#5ee270"
  rect px - 1, gap - 4, 16, 4, "#3ca750"
  rect px - 1, gap + 36, 16, 4, "#3ca750"
  rect 0, 108, 160, 12, "#ded895"
  rect 0, 108, 160, 2, "#73bf2e"
  rect 30, y, 8, 6, "#f8e030"
  pixel 36, y + 1, 0
  rect 37, y + 3, 3, 2, "#f0a030"
  text 4, 2, "Score " + score, 15
  frame
wend
if score > best then best = score
sound "thud"
rect 28, 38, 104, 44, "#00309c"
text 34, 44, "Game over", 15
text 34, 56, "Score " + score + "  Best " + best, 15
text 34, 68, "Flap to try again", 14
retry:
frame
if keyhit("space") or mousehit() or clicked("flap") then goto game
goto retry
newpipe:
px = 160
gap = 18 + rnd(54)
scored = 0
return
point:
score = score + 1
scored = 1
return` },
  { name: "snake.lsc", content: `rem Snake: steer with the arrow keys
window "Snake", 320, 320, "minesweeper"
screen 60, 56
best = 0
newgame:
dim sx(900)
dim sy(900)
length = 3
for i = 0 to 2
  sx[i] = 12 - i
  sy[i] = 14
next
dx = 1
dy = 0
tick = 0
alive = 1
gosub food
while alive
  if keyhit("arrowup") and dy == 0 then
    dx = 0
    dy = -1
  end if
  if keyhit("arrowdown") and dy == 0 then
    dx = 0
    dy = 1
  end if
  if keyhit("arrowleft") and dx == 0 then
    dx = -1
    dy = 0
  end if
  if keyhit("arrowright") and dx == 0 then
    dx = 1
    dy = 0
  end if
  tick = tick + 1
  if tick % 6 == 0 then gosub step
  cls "#0b3d0b"
  rect fx * 2, fy * 2, 2, 2, "#ff4040"
  for i = 1 to length - 1
    rect sx[i] * 2, sy[i] * 2, 2, 2, "#7cfc00"
  next
  rect sx[0] * 2, sy[0] * 2, 2, 2, "#ffff60"
  frame
wend
if length - 3 > best then best = length - 3
text 2, 18, "Game over", 15
text 2, 28, "Score " + (length - 3), 15
text 2, 38, "Space: again", 14
waitkey:
frame
if keyhit("space") then goto newgame
goto waitkey
step:
for i = length - 1 to 1 step -1
  sx[i] = sx[i - 1]
  sy[i] = sy[i - 1]
next
sx[0] = sx[0] + dx
sy[0] = sy[0] + dy
if sx[0] < 0 or sx[0] > 29 or sy[0] < 0 or sy[0] > 27 then alive = 0
for i = 1 to length - 1
  if sx[i] == sx[0] and sy[i] == sy[0] then alive = 0
next
if sx[0] == fx and sy[0] == fy then
  length = length + 1
  sx[length - 1] = sx[length - 2]
  sy[length - 1] = sy[length - 2]
  sound "flip"
  gosub food
end if
return
food:
fx = rnd(30)
fy = rnd(28)
return` },
  { name: "life.lsc", content: `rem Conway's Game of Life on a wrapping 64 by 48 grid
window "Life", 330, 300, "charmap"
screen 64, 48
button "seed", "Randomize"
w = 64
h = 48
dim cells(w * h)
dim nxt(w * h)
gosub seed
while 1
  if clicked("seed") then gosub seed
  cls 0
  for i = 0 to w * h - 1
    if cells[i] then pixel i % w, int(i / w), 10
  next
  frame
  for y = 0 to h - 1
    up = ((y + h - 1) % h) * w
    mid = y * w
    down = ((y + 1) % h) * w
    for x = 0 to w - 1
      l = (x + w - 1) % w
      r = (x + 1) % w
      n = cells[up + l] + cells[up + x] + cells[up + r] + cells[mid + l] + cells[mid + r] + cells[down + l] + cells[down + x] + cells[down + r]
      alive = cells[mid + x]
      nxt[mid + x] = 0
      if n == 3 or (alive and n == 2) then nxt[mid + x] = 1
    next
  next
  swap = cells
  cells = nxt
  nxt = swap
wend
seed:
for i = 0 to w * h - 1
  cells[i] = 0
  if rnd(4) == 0 then cells[i] = 1
next
return` },
  { name: "mandelbrot.lsc", content: `rem The Mandelbrot set, one row at a time
window "Mandelbrot", 340, 270, "paint"
screen 160, 120
cls 0
for py = 0 to 119
  for px = 0 to 159
    cx = px / 160 * 3.5 - 2.5
    cy = py / 120 * 2.4 - 1.2
    x = 0
    y = 0
    i = 0
    while x * x + y * y < 4 and i < 48
      t = x * x - y * y + cx
      y = 2 * x * y + cy
      x = t
      i = i + 1
    wend
    c = hsv(200 + i * 12, 0.8, i / 48)
    if i == 48 then c = "#000000"
    pixel px, py, c
  next
  frame
next
print "Mandelbrot done."` },
  { name: "sketch.lsc", content: `rem Sketch: drag on the screen to draw
window "Sketch", 340, 300, "paint"
screen 160, 120
button "clear", "Clear"
button "color", "Next color"
cls 15
color = 0
lastx = -1
lasty = -1
while 1
  if clicked("clear") then cls 15
  if clicked("color") then color = (color + 1) % 15
  if mousedown() then
    if lastx >= 0 then line lastx, lasty, mousex(), mousey(), color
    lastx = mousex()
    lasty = mousey()
  else
    lastx = -1
  end if
  rect 0, 0, 8, 8, color
  frame
wend` },
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
];
