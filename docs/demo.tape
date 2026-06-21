# Renders docs/demo.gif — a redis-cli session against myown-redis.
# Generate with:  vhs docs/demo.tape
# Prereqs: build the server first (`pnpm run build`), and have `redis-cli` on PATH.

Output docs/demo.gif

Require redis-cli

Set Shell "bash"
Set FontSize 16
Set Width 1100
Set Height 760
Set Padding 20

# Start the server in the background without showing the noise.
Hide
Type "node dist/main.js > /dev/null 2>&1 &"  Enter
Sleep 1500ms
Ctrl+L
Show

Type "redis-cli"  Sleep 500ms  Enter
Sleep 1s

Type "PING"                                  Sleep 400ms  Enter  Sleep 1s
Type "SET user:1 marcus EX 60"               Sleep 400ms  Enter  Sleep 1s
Type "GET user:1"                            Sleep 400ms  Enter  Sleep 1s
Type "TYPE user:1"                           Sleep 400ms  Enter  Sleep 1s
Type "RPUSH colors red green blue"           Sleep 400ms  Enter  Sleep 1s
Type "LRANGE colors 0 -1"                    Sleep 400ms  Enter  Sleep 1s
Type "HSET car:1 make toyota model corolla"  Sleep 400ms  Enter  Sleep 1s
Type "HGETALL car:1"                         Sleep 400ms  Enter  Sleep 1s
Type "XADD events * action login"            Sleep 400ms  Enter  Sleep 1s
Type "XRANGE events - +"                     Sleep 400ms  Enter  Sleep 1500ms
Type "KEYS *"                                Sleep 400ms  Enter  Sleep 2s

Type "exit"  Enter  Sleep 500ms
