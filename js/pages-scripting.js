// pages-scripting.js — bash scripting basics and the library of F5 scripts used so far.
// Examples use neutral addresses (10.20.x.x) and placeholders. Never add real names or addresses.

(function () {
  if (!TREE.some(t => t.id === 'scripting')) TREE.push({
    id: 'scripting', label: 'Scripting', col: '#e0c040', subs: [
      { id: 'bash', label: 'Bash', pages: [
        { id: 'basics', label: 'Basics' },
        { id: 'text', label: 'Working with output' },
        { id: 'f5', label: 'F5 script library' },
      ] },
    ]
  });
  IDX.push(
    { t: 'bash for loop', p: 'scripting/bash/basics', k: 'bash script loop for done nested repeat command over ips', v: 'for ip in a b; do ...; done — run one command against many targets' },
    { t: 'bash single vs double quotes', p: 'scripting/bash/basics', k: 'quoting variable not expanded single double quotes', v: "'$ip' stays literal, \"$ip\" is expanded" },
    { t: 'printf table columns', p: 'scripting/bash/basics', k: 'printf format %-13s columns align table newline', v: '%-13s = left-aligned text padded to 13 characters' },
    { t: 'Count and rank log lines', p: 'scripting/bash/text', k: 'sort uniq -c sort -rn top talkers count awk grep cut', v: '... | sort | uniq -c | sort -rn — how many of each, biggest first' },
  );
})();

const SCR_TAGS = (...x) => '<div class="tags">' + tag('tb', 'bash') + x.map(([c, t]) => tag(c, t)).join('') + '</div>';
const R = String.raw;

// ═══════════════════════════════════════════════════════════════════
// Basics
// ═══════════════════════════════════════════════════════════════════
function pgBashBasics() {
  return '<div class="ph"><div class="pt">Bash &mdash; basics for network engineers</div>'
    + '<div class="ps">Not programming: repeat one command over many targets, then make the output readable. Output shown here comes from running the examples in bash 5. The F5 script library page uses the same ideas on a real box.</div>'
    + SCR_TAGS(['tg', 'BIG-IP'], ['ta', 'Beginner']) + '</div>'
    + '<div class="content">'

    + '<h2>The four things that cover most of the work</h2>'
    + tbl(['Tool', 'Job', 'Example'], [
      ['loop', 'repeat a command', '<code>for ip in 5 6 8; do ...; done</code>'],
      ['variable', 'the part that changes', '<code>$ip</code>, <code>$host</code>'],
      ['<code>grep</code>', 'keep only the lines you want', '<code>| grep -E "Pool Member|Availability"</code>'],
      ['<code>printf</code>', 'turn results into a table', '<code>printf "%-13s %s\\n" "$ip" "$code"</code>'],
    ])

    + '<h2>A variable</h2>'
    + cb('bash', R`ip=10.20.2.8                 # no spaces around =
echo "$ip"                  # use it with $
code=$(curl -s -o /dev/null -w '%{http_code}' http://$ip/)   # store a command's output`)
    + '<p><code>$( ... )</code> runs the command and puts its output into the variable. <code>ip = 10.20.2.8</code> with spaces fails: bash tries to run a command called <code>ip</code>.</p>'

    + '<h2>Quotes</h2>'
    + cb('bash', R`ip=10.20.2.8
echo 'single: $ip'
echo "double: $ip"`)
    + cb('output', `single: $ip
double: 10.20.2.8`)
    + tbl(['Quote', 'Behaviour', 'Use for'], [
      ["<code>'...'</code>", 'exact text, nothing is expanded', "curl format strings: <code>-w '%{http_code}\\n'</code>, awk programs"],
      ['<code>"..."</code>', '<code>$variables</code> and <code>$(commands)</code> are expanded', 'anything containing a variable: <code>-H "Host: $host"</code>'],
    ])
    + co('a', '&#x26A0;&#xFE0F;', 'Quote your variables', 'A value with a space splits into two arguments without quotes. <code>"$host"</code> is always safe; <code>$host</code> only works while the value has no spaces.')

    + '<h2>for loops</h2>'
    + cb('bash', R`for ip in 10.20.2.8 10.20.2.12; do echo "$ip"; done     # on one line: ; before do and done

for i in {1..3}; do echo "node$i"; done                 # a range

for port in 80 443; do                                  # nested: every combination
  for host in a b; do
    echo "$host:$port"
  done
done`)
    + '<p>Typing a multi-line loop at the prompt, bash shows <code>&gt;</code> until the loop is complete. That is the same prompt you see after an unclosed quote. <kbd>Ctrl+C</kbd> gets you out.</p>'
    + '<h3>while read: one line at a time</h3>'
    + cb('bash', R`while read -r ip; do
  echo "testing $ip"
done < members.txt`)
    + co('a', '&#x26A0;&#xFE0F;', 'A pipe into while loses your variables', 'In <code>cmd | while read ...</code> the loop runs in a subshell, so a counter changed inside is back to its old value after <code>done</code>. Print inside the loop, or read from a file with <code>&lt;</code> as above.')

    + '<h2>Exit codes and decisions</h2>'
    + '<p>Every command ends with a number in <code>$?</code>: <strong>0 = success</strong>, anything else = failure. <code>grep</code> returns 0 when it found something, 1 when it did not. This is what <code>if</code>, <code>&amp;&amp;</code> and <code>||</code> test.</p>'
    + cb('bash', R`grep -q RUNNING file.html; echo "rc=$?"

grep -q RUNNING file.html && echo found          # && = only if it succeeded
grep -q RUNNING file.html || echo missing        # || = only if it failed

if grep -q RUNNING file.html; then
  echo found
else
  echo missing
fi

[ "$code" = 405 ] && echo "as expected"          # [ ] compares; spaces inside are required
[ -n "$code" ]                                   # not empty
[ -f file.html ]                                 # file exists`)
    + co('p', '&#x2139;&#xFE0F;', 'a && b || c is not a real if/else', 'If <code>b</code> itself fails, <code>c</code> runs as well. Fine for setting a variable (<code>grep -q X f &amp;&amp; body=X || body=no</code>), but use <code>if</code> when <code>b</code> does real work.')

    + '<h2>Pipes and redirection</h2>'
    + tbl(['Syntax', 'Meaning'], [
      ['<code>a | b</code>', 'output of <code>a</code> becomes input of <code>b</code>'],
      ['<code>&gt; file</code> / <code>&gt;&gt; file</code>', 'write to a file (overwrites) / append'],
      ['<code>&lt; file</code>', 'read input from a file'],
      ['<code>2&gt;/dev/null</code>', 'discard errors (stderr)'],
      ['<code>2&gt;&amp;1</code>', 'send errors to the same place as normal output, so <code>grep</code> can see them'],
      ['<code>&lt;/dev/null</code>', 'empty input, so <code>nc</code> or <code>openssl s_client</code> exits instead of waiting for you'],
      ['<code>| tee file</code>', 'show the output and save it'],
    ])
    + cb('bash', R`rdexec 10 timeout 5 nc -v 10.20.2.8 9026 </dev/null 2>&1 | grep -E 'Connected|refused'`)
    + '<p>This line uses three of them: empty input, errors merged into the output (<code>nc -v</code> prints its status on stderr), and a filter on the result.</p>'

    + '<h2>printf: a table instead of a mess</h2>'
    + tbl(['Part', 'Meaning'], [
      ['<code>%s</code>', 'put the next argument here'],
      ['<code>%13s</code>', 'pad to 13 characters, right-aligned'],
      ['<code>%-13s</code>', 'pad to 13 characters, left-aligned'],
      ['<code>\\n</code>', 'new line. <code>printf</code> does not add one by itself, <code>echo</code> does'],
    ])
    + cb('bash', R`printf '%-13s|\n' 10.20.2.8
printf '%13s|\n'  10.20.2.8
printf "%-5s %-13s -> %s\n" https 10.20.2.8 200`)
    + cb('output', `10.20.2.8    |
    10.20.2.8|
https 10.20.2.8     -> 200`)
    + co('p', '&#x2139;&#xFE0F;', 'Text glued to your prompt?', 'The output had no newline at the end. A health file containing just <code>RUNNING</code> does this. Add one in curl: <code>-w \'\\n\'</code>.')

    + '<h2>From one-liner to a script file</h2>'
    + cb('bash', R`#!/bin/bash
# check.sh — first line says which interpreter runs the file
echo "name=$0 first=$1 count=$#"
for a in "$@"; do echo "arg: $a"; done`)
    + cb('bash', R`chmod +x check.sh                 # make it executable, once
./check.sh 10.20.2.8 "two words"
bash -n check.sh                  # syntax check, runs nothing
bash -x check.sh a                # trace: print every line as it runs`)
    + cb('output', `name=./check.sh first=10.20.2.8 count=2
arg: 10.20.2.8
arg: two words`)
    + tbl(['Variable', 'Meaning'], [
      ['<code>$1 $2 ...</code>', 'arguments'],
      ['<code>"$@"</code>', 'all arguments, each kept whole'],
      ['<code>$#</code>', 'number of arguments'],
      ['<code>$?</code>', 'exit code of the last command'],
      ['<code>$0</code>', 'name of the script'],
    ])
    + '<p>A worked example with options (<code>getopts</code>) is <a href="#scripting/bash/f5">f5-test-members.sh</a>.</p>'

    + '<h2>Bash on a BIG-IP</h2>'
    + tbl(['Thing', 'What to know'], [
      ['tmsh or bash?', 'Prompt ending <code>(tmos)#</code> = tmsh. Loops, pipes to <code>awk</code>, <code>curl</code> and <code>rdexec</code> are bash. From bash, prefix: <code>tmsh show ltm pool</code>.'],
      ['<code>run util bash</code> from <code>/</code>', 'Fails with <em>In root folder, can\'t get partition folder</em>. Run <code>cd /Common</code> first.'],
      ['Partitions', 'Exist in tmsh only. Bash does not know them.'],
      ['Route domains', 'Prefix each command with <code>rdexec &lt;id&gt;</code>, or open a shell with <code>rdsh &lt;id&gt;</code>.'],
      ['<code>rdexec</code> and pipes', 'Only the command right after <code>rdexec</code> runs in the route domain. In <code>rdexec 1 openssl ... | openssl x509</code> the second part runs outside it, which is fine because it only reads text [derived].'],
    ])

    + '<h2>Before a loop touches production</h2>'
    + cb('bash', R`for pool in pool_a pool_b; do
  echo tmsh modify ltm pool "$pool" monitor http       # echo first: prints, changes nothing
done`)
    + '<p>Check the printed lines, then remove <code>echo</code>. The scripts in the F5 library only read, apart from the marked mitigation block. Anything that changes config still belongs in a change.</p>'

    + '<h2>Common mistakes</h2>'
    + tbl(['Symptom', 'Cause', 'Fix'], [
      ['<code>command not found</code> on an assignment', 'spaces around <code>=</code>', '<code>ip=1.2.3.4</code>'],
      ['prints a literal <code>$ip</code>', 'variable in single quotes', 'double quotes'],
      ['stuck on <code>&gt;</code>', 'unclosed quote, or a loop without <code>done</code>', '<kbd>Ctrl+C</kbd>, retype'],
      ['<code>[: missing ]</code>', 'no space inside the brackets', '<code>[ "$a" = b ]</code>'],
      ['multi-line command stops halfway', 'nothing, or a trailing space, after <code>\\</code>', '<code>\\</code> must be the last character of the line'],
      ['<code>grep</code> finds nothing in <code>nc</code> or <code>curl -v</code> output', 'that text goes to stderr', 'add <code>2&gt;&amp;1</code> before the pipe'],
    ])
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// Working with output
// ═══════════════════════════════════════════════════════════════════
function pgBashText() {
  return '<div class="ph"><div class="pt">Bash &mdash; working with output</div>'
    + '<div class="ps">grep, cut, awk, sed and the sort | uniq -c combination: getting an answer from thousands of log lines</div>'
    + SCR_TAGS(['tb', 'grep'], ['tb', 'awk'], ['tb', 'sed']) + '</div>'
    + '<div class="content">'

    + '<h2>Which tool</h2>'
    + tbl(['Tool', 'Use when', 'Example'], [
      ['<code>grep</code>', 'keep matching <strong>lines</strong>', '<code>grep -E "down|up" ltm</code>'],
      ['<code>cut</code>', 'take a <strong>column</strong> with a clean separator', '<code>cut -d: -f2</code>'],
      ['<code>awk</code>', 'take a column separated by spaces, or from the end', "<code>awk '{print $3}'</code>"],
      ['<code>sed</code>', 'replace text, delete lines', "<code>sed 's/old/new/'</code>"],
      ['<code>sort | uniq -c</code>', 'count how many of each', '<code>| sort | uniq -c | sort -rn</code>'],
      ['<code>head</code> / <code>tail</code>', 'first / last lines; <code>tail -f</code> follows live', '<code>| head -15</code>'],
      ['<code>zcat -f</code>', 'read plain and <code>.gz</code> files together', '<code>zcat -f /var/log/ltm*</code>'],
      ['<code>xargs</code>', 'turn input lines into arguments', '<code>| xargs -I{} echo "test {}"</code>'],
    ])

    + '<h2>grep flags worth remembering</h2>'
    + tbl(['Flag', 'Meaning'], [
      ['<code>-i</code>', 'ignore case'],
      ['<code>-v</code>', 'invert: lines that do <strong>not</strong> match'],
      ['<code>-E</code>', 'extended regex, so <code>a|b</code> means a or b'],
      ['<code>-c</code>', 'count matching lines'],
      ['<code>-o</code>', 'print only the matched part, not the line'],
      ['<code>-q</code>', 'print nothing, only set the exit code'],
      ['<code>-A 2</code> / <code>-B 2</code>', 'also show 2 lines after / before'],
    ])
    + '<p>To grep the process list without finding your own grep: <code>ps -ef | grep "[h]ttpd"</code>. The pattern matches <code>httpd</code>, but its own command line contains <code>[h]ttpd</code>, which does not.</p>'

    + '<h2>Regex in five minutes</h2>'
    + tbl(['Pattern', 'Matches'], [
      ['<code>.</code>', 'any one character; <code>\\.</code> is a real dot'],
      ['<code>*</code> / <code>+</code>', 'previous item 0+ times / 1+ times (<code>+</code> needs <code>-E</code>)'],
      ['<code>[0-9]</code>', 'one digit'],
      ['<code>^</code> / <code>$</code>', 'start / end of the line'],
      ['<code>a|b</code>', 'a or b (needs <code>-E</code>)'],
    ])

    + '<h2>The count-and-rank pattern</h2>'
    + '<p>Most log questions are "who, and how many". Three steps: extract the value, sort it so equal lines sit together, count, then sort by the count.</p>'
    + cb('bash', R`grep -oE '/Common/p[0-9]+' ltm | sort | uniq -c | sort -rn`)
    + cb('output', `      2 /Common/p1
      1 /Common/p2`)
    + co('a', '&#x26A0;&#xFE0F;', 'uniq needs sorted input', '<code>uniq</code> only merges neighbouring lines. Without the first <code>sort</code> the counts are wrong, with no error.')

    + '<h2>awk: columns</h2>'
    + cb('bash', R`awk '{print $3, $NF}' ltm            # column 3 and the last column
awk '{print $(NF-1)}' access_log      # second to last, useful when the start of the line varies
awk '/Issuer:/,/Not After :/' cert    # range: from one pattern to the next`)
    + '<p>Columns are separated by whitespace, and <code>$1</code> is the first. Always single quotes, otherwise bash expands <code>$3</code> first.</p>'

    + '<h2>sed: replace and delete</h2>'
    + cb('bash', R`sed 's/down/DOWN/' ltm                # first match on each line, printed to the screen
sed 's/down/DOWN/g' ltm               # all matches on each line
sed -i '/^:wq!$/d' file               # -i edits the file in place; /pattern/d deletes those lines`)
    + co('r', '&#x26D4;', 'sed -i has no undo', 'Run it without <code>-i</code> first and check the output, or copy the file before.')
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// F5 script library — one registry entry per script (cheat sheets, Ctrl+K).
// src: 'ran'   = output seen when it was used on a BIG-IP
//      'notes' = from notes / hub pages, no output on record
// ═══════════════════════════════════════════════════════════════════
const F5LIB = 'scripting/bash/f5';
const lib = (grp, src, lang, d, k, cmd, how) => ({ grp, src, lang, d, k, cmd, how, tags: ['linux', 'f5'] });
defCmds(F5LIB, [
  lib('connect', 'ran', 'bash', 'HTTP code from every node',
    'loop all members status code http code 405 same port which node answers',
    R`for ip in 5 6 8 12; do echo "== 10.20.2.$ip"; rdexec 10 curl -sSk --http1.1 --max-time 5 -o /dev/null -w '%{http_code}\n' https://10.20.2.$ip:9026/api/path; done`,
    '<code>000</code> means no HTTP answer at all. <code>-sS</code> stays silent but still prints the curl error, so you can tell refused from timeout.'),
  lib('connect', 'ran', 'bash', 'One request exactly like the monitor',
    'reproduce monitor post empty body connection close curl verbose member',
    R`rdexec 10 curl -vk --http1.1 --max-time 5 -X POST --data '' -H 'Host: 10.20.2.210' -H 'Connection: close' https://10.20.2.8:9016/api/path`,
    'Compare the member port with the port in the documentation by running it on both. curl prints a harmless note that <code>-X POST</code> is already implied by <code>--data</code>.'),
  lib('connect', 'notes', 'bash', 'TCP only, several nodes',
    'tcp connect refused timed out nc loop members port open',
    R`for ip in 10.20.2.8 10.20.2.12 10.20.2.5 10.20.2.6; do
  echo -n "$ip: "; rdexec 10 timeout 5 nc -v $ip 9026 </dev/null 2>&1 | grep -E 'Connected|refused|timed out' || echo "no answer"
done`),

  lib('health', 'ran', 'bash', 'Matrix: member × protocol × file × Host',
    'health file monitor test matrix nested loop running htm html virtual host table',
    R`for ip in 10.30.12.73 10.30.12.83; do
 for proto in http https; do
  for file in f5monitorApp.html F5monitorApp.htm; do
   for host in accapp.corp.local accapppreview.corp.local; do
    out=$(rdexec 1 curl -sk -m 5 -H "Host: $host" -w '\nHTTP_CODE:%{http_code}' "$proto://$ip/$file")
    code=$(echo "$out" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
    echo "$out" | grep -q RUNNING && body=RUNNING || body=no-RUNNING
    printf "%-5s %-13s %-20s %-28s -> %s %s\n" "$proto" "$ip" "$file" "$host" "$code" "$body"
   done
  done
 done
done`,
    'Four loops, 16 lines of output. It stores the whole response, takes the code from the marker added by <code>-w</code>, and checks the body for the recv string. Replace <code>RUNNING</code> with yours.'),
  lib('health', 'ran', 'bash', 'Full response of a health file from each member',
    'show headers body health file etag last-modified recv string',
    R`for ip in 10.30.12.73 10.30.12.83; do
  echo "== $ip"
  rdexec 1 curl -sk -i -m 5 -H "Host: accapppreview.corp.local" https://$ip/F5monitorApp.htm
done`,
    'Use it to choose the recv string. Same <code>ETag</code> and <code>Content-Length</code> on both members = same file.'),
  lib('health', 'ran', 'bash', 'Does the server tell two Host names apart?',
    'compare host header response size virtual host size_download same answer',
    R`for ip in 10.30.12.73 10.30.12.83; do
  rdexec 1 curl -sk -m 5 -w ' [%{http_code}]\n' -H "Host: accapppreview.corp.local" "https://$ip/F5monitorApp.htm"
  for host in accapp.corp.local accapppreview.corp.local; do
    printf "%-13s %-28s -> " "$ip" "$host"
    rdexec 1 curl -sk -m 5 -o /dev/null -w '%{http_code} %{size_download}\n' -H "Host: $host" "https://$ip/"
  done
done`,
    'Same code and same size for both names suggests one site behind both [derived]. Only the application owner can confirm it.'),
  lib('health', 'notes', 'bash', 'Byte-exact monitor request over TLS',
    'send string raw http openssl s_client quiet exact monitor crlf',
    R`(echo -e "POST /api/path HTTP/1.1\r\nHost: 10.20.8.211\r\nContent-Length: 0\r\nConnection: Close\r\n\r\n"; sleep 1) \
  | rdexec 11 openssl s_client -connect 10.20.8.21:9021 -servername 10.20.8.211 -quiet`,
    'The <code>sleep 1</code> keeps the connection open long enough to read the answer.'),

  lib('tls', 'notes', 'bash', 'SANs presented by a VIP',
    'subject alternative name san certificate vip check openssl x509',
    R`rdexec 1 openssl s_client -connect <vip>:443 -servername <name> </dev/null 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"`,
    '<code>-ext subjectAltName</code> is shorter but needs openssl 1.1.1 or later.'),
  lib('tls', 'notes', 'bash', 'Issuer and validity of every certificate in the filestore',
    'all certificates expiry filestore find xargs openssl awk',
    R`find /config/filestore/files_d/*_d/certificate_d -name "*_*" \
  | egrep -v 'bundle|default|irule' \
  | xargs -i openssl x509 -in {} -text -noout -inform pem 2>&- \
  | awk '/Issuer:/,/Not After :/ {print $0}'`,
    '<code>tmsh run sys crypto check-cert</code> is the built-in shortcut for expiry alone.'),
  lib('tls', 'notes', 'bash', 'How many virtual servers use each client-SSL profile',
    'clientssl profile per virtual server count which vs uses certificate',
    R`tmsh show /ltm virtual profiles | egrep 'Ltm::ClientSSL Profile:' | sort | uniq -c`),

  lib('state', 'ran', 'bash', 'Members of one pool, short view',
    'pool member availability grep status short',
    R`tmsh show ltm pool <pool> members | grep -E "Pool Member|Availability"`),
  lib('state', 'ran', 'tmsh', 'All pools, short view',
    'all pools offline available count compare units failover',
    R`show ltm pool | grep -E "Ltm::Pool:|Availability"`,
    'Run it on both units and compare before a failover.'),
  lib('state', 'ran', 'tmsh', 'A monitor on one line',
    'monitor send recv string find by name one-line',
    R`list ltm monitor one-line | grep <monitor>`),

  lib('logs', 'ran', 'bash', 'Client IPs from a network, ranked',
    'who connects tmui access log client ip top talkers ssl_access_log',
    R`zcat -f /var/log/httpd/ssl_access_log* | grep -oE "<prefix>\.[0-9]+\.[0-9]+" | sort | uniq -c | sort -rn`,
    '<code>-o</code> catches every address on the line, including your own self IP.'),
  lib('logs', 'ran', 'bash', 'HTTP status codes for one IP',
    'status codes one client access log awk',
    R`zcat -f /var/log/httpd/ssl_access_log* | grep <ip> | awk '{print $(NF-1)}' | sort | uniq -c | sort -rn`),
  lib('logs', 'ran', 'bash', 'Top URIs for one IP',
    'top uri requests one client scanner access log',
    R`zcat -f /var/log/httpd/ssl_access_log* | grep <ip> | grep -oE '"[^"]*"' | sort | uniq -c | sort -rn | head -15`),
  lib('logs', 'ran', 'bash', 'Successful requests only',
    'successful answers 200 access log authenticated tmui',
    R`zcat -f /var/log/httpd/ssl_access_log* | grep <ip> | grep '" 200 ' | grep -oE '"[^"]*"' | sort | uniq -c | sort -rn`),
  lib('logs', 'notes', 'bash', 'Search rotated LTM logs',
    'zcat compressed archived ltm log search hostname',
    R`zcat -f /var/log/ltm* | grep <pattern>`,
    'Plain <code>grep</code> on <code>/var/log/ltm</code> sees only the current file. A quiet result there says nothing about older events.'),
]);

const libBadge = c => c.src === 'ran'
  ? '<span class="badge b-documented">ran on F5</span>'
  : '<span class="badge b-derived">from notes</span>';
const libGroup = grp => cmdsFor(F5LIB, grp).map(c => '<h3>' + esc(c.d) + ' ' + libBadge(c) + '</h3>'
  + cb(c.lang, c.cmd) + (c.how ? '<p>' + c.how + '</p>' : '')).join('');

function pgBashF5() {
  return '<div class="ph"><div class="pt">F5 script library</div>'
    + '<div class="ps">The loops and pipelines used on BIG-IP so far, anonymised. Replace the addresses, route domain and paths. <code>&lt;placeholders&gt;</code> must be filled in before running.</div>'
    + SCR_TAGS(['tg', 'BIG-IP'], ['ta', 'Route Domain']) + '</div>'
    + '<div class="content">'
    + tbl(['Label', 'Meaning'], [
      ['<span class="badge b-documented">ran on F5</span>', 'used on a BIG-IP and its output reviewed. Only names and addresses were changed here.'],
      ['<span class="badge b-derived">from notes</span>', 'taken from notes or hub pages, no recorded output. Check it before you rely on it.'],
    ])
    + co('p', '&#x2139;&#xFE0F;', 'Bash, not tmsh', 'Everything here runs in bash, except where the code block says tmsh. All scripts only read, apart from the mitigation at the end. New to this? Start with <a href="#scripting/bash/basics">Basics</a>.')

    + '<h2>Connectivity to members</h2>' + libGroup('connect')
    + '<h2>Health files and Host headers</h2>' + libGroup('health')

    + '<h2>f5-test-members.sh</h2>'
    + '<p><span class="badge b-derived">from notes</span> For every member: TCP state, HTTP code and certificate. File: <a href="https://github.com/mirek-techlab/net-hub/blob/main/tools/f5-test-members.sh" target="_blank" rel="noopener"><code>tools/f5-test-members.sh</code></a>. Usage is on <a href="#f5/ltm/monitors">HTTPS Monitors</a>.</p>'
    + '<details><summary style="cursor:pointer;color:var(--teal)">Show the script</summary>' + cb('bash', F5_SCRIPT) + '</details>'

    + '<h2>Certificates</h2>' + libGroup('tls')
    + '<h2>Pool and monitor state</h2>' + libGroup('state')
    + '<h2>Logs</h2>' + libGroup('logs')

    + '<h2>CVE mitigation: file from a heredoc</h2>'
    + co('r', '&#x26D4;', 'This one changes the box', 'Do it in a change, on each HA peer. Full context: <a href="#' + PHP2SHELL + '">php2shell</a>.')
    + cmdBlock(PHP2SHELL, 'mitigation', 'bash')
    + '<h3>Remove a stray line from the file</h3>'
    + cmdBlock(PHP2SHELL, 'fix', 'bash')
    + '<p>Verify that it took effect:</p>'
    + cmdBlock(PHP2SHELL, 'verify', 'bash')

    + '<h2>Also on other pages</h2>'
    + tbl(['What', 'Where'], [
      ['Sweep several ports with bash <code>/dev/tcp</code>, no <code>nc</code> needed', '<a href="#tools/tcp/conn">nc, telnet, /dev/tcp</a>'],
      ['Case where the matrix loop was used', '<a href="#f5/ltm/case-preview-vip">New HTTPS VIP + SAN certificate</a>'],
    ])
    + '</div>';
}

RENDERERS['scripting/bash/basics'] = pgBashBasics;
RENDERERS['scripting/bash/text'] = pgBashText;
RENDERERS['scripting/bash/f5'] = pgBashF5;
