// pages-f5.js — F5 BIG-IP pages from Mirek's work notes ("f5 hints") + earlier sessions.
// Replaces the older F5 pages that lived in content.js. Hostnames, people, customer/app names,
// certificate subjects and internal CA names replaced with neutral examples (public repository).
//
// Example environment used on every page:
//   route domain 10: VIP 10.20.2.210%10   members 10.20.2.5 / .6 / .8 / .12
//   route domain 11: VIP 10.20.8.211%11   members 10.20.8.21 / .27   SNAT 10.20.8.201   client 10.50.8.38

// new leaf page under F5 › Logs & Debug
(function () {
  const sub = TREE.find(t => t.id === 'f5').subs.find(s => s.id === 'logs');
  if (!sub.pages.some(p => p.id === 'tcpdump')) sub.pages.push({ id: 'tcpdump', label: 'tcpdump & flows' });
})();

const F5_TAGS = (...x) => '<div class="tags">' + tag('tg', 'F5') + x.map(([c, t]) => tag(c, t)).join('') + '</div>';
const step = (n, title, body) => '<div class="fs"><div class="fsn">' + n + '</div><div class="fsb"><div class="fst">' + title + '</div>' + body + '</div></div>';

// ═══════════════════════════════════════════════════════════════════
// Provisioning: pool first, then the virtual server
// ═══════════════════════════════════════════════════════════════════
function pgF5LTM() {
  return '<div class="ph"><div class="pt">F5 LTM &mdash; Provisioning (pool &rarr; virtual server)</div>'
    + '<div class="ps">Nodes &rarr; monitor &rarr; pool &rarr; virtual server &rarr; persistence &rarr; verify. GUI fields and the tmsh equivalent.</div>'
    + F5_TAGS(['tg', 'LTM'], ['ta', 'Route Domain'], ['tb', 'tmsh']) + '</div>'
    + '<div class="content">'
    + co('t', '&#x1F4A1;', 'Pool first, virtual server second', 'Prepare and verify the pool (members UP) before building the VS. The VS then just points to a working pool.')
    + co('a', '&#x26A0;&#xFE0F;', 'Route domain notation', '<code>10.20.2.210%10</code> = IP in route domain 10. Every address (VIP, members, source) must carry the right <code>%RD</code> &mdash; check which RD the client and server subnets live in (<em>Network &rsaquo; Route Domains</em>).')

    + '<h2>GUI flow</h2><div class="flow">'
    + step(1, 'Nodes (real servers) &mdash; check what exists', '<p><em>Local Traffic &rsaquo; Nodes</em>. Search by IP; reuse an existing node instead of creating a duplicate.</p>'
      + cb('tmsh', `tmsh list ltm node | grep -B2 -A5 10.20.2.8
tmsh show ltm node 10.20.2.8%10`))
    + step(2, 'Health monitor ("probe")', '<p>Create it first (see <a href="#f5/ltm/monitors">HTTPS Monitors</a>), or at least use <code>gateway_icmp</code>. The pool is UP only while the monitor succeeds &mdash; only then is traffic dispatched.</p>')
    + step(3, 'Pool &mdash; <em>Local Traffic &rsaquo; Pools &rsaquo; Create</em>', tbl(['Field', 'Value', 'Note'], [
      ['Name', 'same as the service, e.g. <code>VL557_Order_Status</code>', 'VLAN prefix + service name'],
      ['Health Monitors', 'the monitor from step 2', 'more monitors = all must pass (AND)'],
      ['Load Balancing Method', '<strong>Least Connections (member)</strong>', 'for 2+ members; "Predictor" in older GUI wording'],
      ['New Members', 'real server IP + service port &rarr; <strong>Add</strong>', 'repeat per member; the form keeps the last values, change only IP/port'],
    ]))
    + step(4, 'Virtual server &mdash; <em>Local Traffic &rsaquo; Virtual Servers &rsaquo; Create</em>', tbl(['Field', 'Value', 'Note'], [
      ['Name', '<code>VS_&lt;pool name&gt;</code> / <code>Intranet-&lt;Service&gt;</code>', 'follow the existing naming'],
      ['Destination', 'service IP with route domain: <code>10.20.2.210%10</code>', 'check the VIP is free: search VS list by IP'],
      ['Service Port', 'mostly TCP, e.g. <code>443</code> / <code>9026</code>', ''],
      ['Profiles', '<code>tcp</code>; + <code>http</code>, <code>clientssl</code>, <code>serverssl</code> if you terminate TLS', 'Resources tab for pool / iRules'],
      ['iRule', '<code>*snat-&lt;VLAN-ID&gt;</code>', 'VLAN ID of the server subnet &mdash; or SNAT Automap'],
      ['Default Pool', 'pool from step 3', ''],
      ['Default Persistence', '<code>source_addr</code> (+ timeout)', 'only if the app needs sticky sessions'],
      ['Traffic Group', '<strong>Intranet (Floating)</strong> for intranet VIPs', 'set on the virtual address'],
    ]))
    + co('r', '&#x26A0;&#xFE0F;', 'Traffic group', 'Intranet VIPs must use the <strong>Intranet (Floating)</strong> traffic group (<em>Virtual Address List</em> &rsaquo; VIP &rsaquo; Traffic Group). Wrong group = the VIP does not move on failover.')
    + co('p', '&#x2139;&#xFE0F;', 'Persistence ("sticky")', 'Source-address affinity keeps a client on the same member for the timeout. Useful when the app keeps session state (e.g. a web shop) &mdash; otherwise follow-up requests land on a different server. Check the table: <code>tmsh show ltm persistence persist-records</code>.')
    + step(5, 'Verify', cb('tmsh', `tmsh show ltm pool VL557_Order_Status members
tmsh show ltm virtual VS_VL557_Order_Status
tmsh show sys log ltm range now-1h`))
    + '</div>'

    + '<h2>tmsh &mdash; the same in one go</h2>'
    + cb('tmsh', `# pool (monitor must already exist)
tmsh create ltm pool VL557_Order_Status \\
    load-balancing-mode least-connections-member \\
    monitor VL557_Order_Status \\
    members add { 10.20.2.8%10:9026 10.20.2.12%10:9026 10.20.2.5%10:9026 10.20.2.6%10:9026 }

# virtual server: plain TCP pass-through + SNAT automap
tmsh create ltm virtual VS_VL557_Order_Status \\
    destination 10.20.2.210%10:9026 \\
    ip-protocol tcp \\
    profiles add { tcp } \\
    pool VL557_Order_Status \\
    source 0.0.0.0%10/0 \\
    source-address-translation { type automap }

# virtual server: TLS terminated on F5 and re-encrypted to the members
tmsh create ltm virtual VS_VL557_Order_Status_443 destination 10.20.2.210%10:443 ip-protocol tcp \\
    pool VL557_Order_Status \\
    profiles add { tcp http clientssl-mycert { context clientside } serverssl { context serverside } } \\
    source-address-translation { type automap }

tmsh save sys config`)
    + co('a', '&#x26A0;&#xFE0F;', 'Correction to the original note', 'In the multi-line version the line <code>destination 10.20.2.210%10:9026</code> had no trailing <code>\\</code> &mdash; bash ends the command there and the rest fails. In the TLS variant use your own client-ssl profile with the right certificate (the built-in <code>clientssl</code> has the default self-signed cert).')
    + '<h3>One-liners (paste inside tmsh)</h3>'
    + cb('tmsh', `create ltm pool VL444_Order_Status load-balancing-mode round-robin monitor VL444_Order_Status members add { 10.20.8.21%11:9026 10.20.8.27%11:9026 }
create ltm virtual VS_VL444_Order_Status destination 10.20.8.211%11:9026 ip-protocol tcp profiles add { tcp } pool VL444_Order_Status source 0.0.0.0%11/0 source-address-translation { type automap }`)

    + '<h2>HTTP response codes (for monitors and curl tests)</h2>'
    + tbl(['Code', 'Meaning', 'For a health monitor'], [
      ['2xx (200)', 'OK', 'ideal'],
      ['3xx', 'redirect', 'server alive, URL/scheme differs &mdash; usually fine as "alive"'],
      ['400', 'bad request (missing parameters)', 'backend alive, only validation fails &mdash; valid receive string'],
      ['404', 'not found', 'server up, URI wrong &mdash; usable but weak'],
      ['405', 'method not allowed', 'backend alive; e.g. HEAD/GET on a POST-only endpoint'],
      ['5xx', 'server-side error (502/503/504 often = app or its backend down)', '<strong>not</strong> healthy &mdash; never use as receive string'],
    ])
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// HTTPS monitors
// ═══════════════════════════════════════════════════════════════════
function pgF5Mon() {
  return '<div class="ph"><div class="pt">F5 HTTPS Monitors &mdash; build &amp; test</div>'
    + '<div class="ps">Find the monitor, reproduce its request by hand, choose the receive string</div>'
    + F5_TAGS(['tg', 'Monitor'], ['tg', 'HTTPS'], ['tb', 'Jetty'], ['ta', 'SNI']) + '</div>'
    + '<div class="content">'

    + '<h2>Find the monitor and its send / receive strings</h2>'
    + cb('tmsh', `tmsh list ltm monitor | grep -B2 -A20 VL444_ws_Product      # by name, with context
tmsh list ltm monitor https VL444_ws_Product all-properties    # everything incl. defaults
tmsh list ltm pool VL557_Order_Status monitor                   # which monitor(s) a pool uses`)

    + '<h2>Test by hand &mdash; from the F5, in the right route domain</h2><div class="flow">'
    + step(1, 'TCP', cb('bash', `rdexec 11 timeout 5 nc -v 10.20.8.21 18090      # "Connected" = TCP handshake OK`)
      + tbl(['Result', 'Meaning'], [
        ['<code>Connected</code>', 'port open'],
        ['<code>Connection refused</code>', 'host reachable but <strong>nothing listens</strong> on the port (or host firewall rejects) &rarr; application/server team'],
        ['timeout (no answer)', 'packet dropped: routing, firewall, wrong route domain &rarr; network'],
      ]))
    + step(2, 'TLS handshake and certificate', cb('bash', `rdexec 11 openssl s_client -connect 10.20.8.21:18090 -servername 10.20.8.211
# look at: subject=…CN=…, issuer=, verify return code, "No client certificate CA names sent"`)
      + cb('output (shortened)', `subject=/C=FR/L=Paris/O=Example SAS/CN=ws-esb.example.com
issuer=/C=BE/O=GlobalSign nv-sa/CN=GlobalSign Non-Public SHA256 CA - G3
No client certificate CA names sent      <- server does not ask for a client cert (no mTLS)`))
    + step(3, 'HTTP with curl', cb('bash', `rdexec 11 curl -v  --connect-timeout 5 http://10.20.8.21:18090/            # plain HTTP
rdexec 11 curl -vkI --connect-timeout 5 -H 'Host: 10.20.8.210' https://10.20.8.21:18090/DEU/sales/services
rdexec 11 curl -vkI --connect-timeout 5 -H 'Host: 10.20.8.210' https://10.20.8.21:9008/`)
      + '<p>All curl options, timing and exit codes: <a href="#tools/http/curl">Testing Tools &rsaquo; curl</a>. Raw requests and how to read the answer: <a href="#tools/http/raw">Raw HTTP requests</a>.</p>'
      + co('a', '&#x26A0;&#xFE0F;', '-I is not what the monitor sends', '<code>curl -I</code> sends <strong>HEAD</strong>. A monitor with <code>POST</code> in its send string can get a different answer (e.g. 405 for HEAD but 200 for POST). Reproduce the exact request: <code>curl -sk -o /dev/null -w \'%{http_code}\\n\' -X POST -H \'Content-Length: 0\' -H \'Host: 10.20.8.211\' https://10.20.8.21:9021/de/productomd/v1.0.5/product/byGTIN</code>'))
    + step(4, 'Exact monitor request over TLS (byte for byte)', cb('bash', `(echo -e "POST /de/productomd/v1.0.5/product/byGTIN HTTP/1.1\\r\\nHost: 10.20.8.211\\r\\nContent-Length: 0\\r\\nConnection: Close\\r\\n\\r\\n"; sleep 1) \\
  | rdexec 11 openssl s_client -connect 10.20.8.21:9021 -servername 10.20.8.211 -quiet`)
      + co('a', '&#x26A0;&#xFE0F;', 'Jetty is strict about spaces', '<code>GET&nbsp;&nbsp;/path</code> (double space) &rarr; <code>400 Illegal character SPACE</code>. Exactly one space between method, URI and version.'))
    + step(5, 'Pick the receive string from the real response', cb('response', `HTTP/1.1 400 Bad Request
Server: Jetty(9.4.53.v20231009)
{"messageID":"…","errorCode":"DataException","errorMessage":"Account Number Cannot be Empty"}`)
      + tbl(['Receive string', 'Strength'], [
        ['<code>HTTP/1.1 400</code>', 'OK &mdash; but any 400 matches, also one from a proxy or a malformed request'],
        ['<code>DataException</code> or <code>Account Number Cannot be Empty</code>', '<strong>better</strong> &mdash; only the application itself produces it; crash or unexpected error &rarr; DOWN'],
      ])
      + co('p', '&#x2139;&#xFE0F;', 'recv is a regular expression', 'Matched anywhere in the response (headers + start of the body). Escape special characters: <code>.</code> <code>(</code> <code>[</code> <code>?</code> &rarr; <code>\\.</code> etc. Optional <code>recv-disable</code> string puts the member into <em>disabled</em> (drain) instead of down.'))
    + '</div>'

    + '<h2>Test all members at once &mdash; script</h2>'
    + '<p>Runs on the BIG-IP (bash). For every member: TCP state (<strong>OK / REFUSED / TIMEOUT</strong>), HTTP code for the same request the monitor sends, and the certificate CN + expiry. File: <a href="https://github.com/mirek-techlab/net-hub/blob/main/tools/f5-test-members.sh" target="_blank" rel="noopener"><code>tools/f5-test-members.sh</code></a>.</p>'
    + cb('bash', `# copy to the F5 (e.g. /shared/tmp), then:
chmod +x f5-test-members.sh
./f5-test-members.sh -r 10 -p 9026 -H 10.20.2.210 -m POST -u /de/customer/v1.0.0/1234/status/ \\
    10.20.2.8 10.20.2.12 10.20.2.5 10.20.2.6`)
    + cb('output', `MEMBER           TCP       HTTP   CERT
10.20.2.8        OK        405    CN=ws-esb.example.com until Mar 29 23:59:59 2027 GMT
10.20.2.12       REFUSED   -      -
10.20.2.5        TIMEOUT   -      -`)
    + '<details><summary style="cursor:pointer;color:var(--teal)">Show the script</summary>' + cb('bash', F5_SCRIPT) + '</details>'
    + '<h3>Quick loop without the script</h3>'
    + cb('bash', `for ip in 10.20.2.8 10.20.2.12 10.20.2.5 10.20.2.6; do
  echo -n "$ip: "; rdexec 10 timeout 5 nc -v $ip 9026 </dev/null 2>&1 | grep -E 'Connected|refused|timed out' || echo "no answer"
done`)

    + '<h2>Monitor templates</h2>'
    + '<h3>POST endpoint, receive 405</h3>'
    + cb('tmsh', `ltm monitor https VL444_ws_Product {
    destination *:*
    send "POST /de/productomd/v1.0.5/product/byGTIN HTTP/1.1\\r\\nHost: 10.20.8.211\\r\\nContent-Length: 0\\r\\nConnection: Close\\r\\n\\r\\n"
    recv "HTTP/1.1 405"
    interval 5
    timeout 16
}
ltm monitor https VL444_ws_Customer {
    send "POST /de/customer/v1.0.0/1234/status/ HTTP/1.1\\r\\nHost: 10.20.8.211\\r\\nContent-Length: 0\\r\\nConnection: Close\\r\\n\\r\\n"
    recv "HTTP/1.1 405"
}`)
    + co('a', '&#x26A0;&#xFE0F;', 'Correction to the original note', 'The customer send string was <code>POST de/customer/…</code> &mdash; the URI must start with <code>/</code>, otherwise the server answers 400 and the receive string does not match.')
    + co('p', '&#x2139;&#xFE0F;', 'Two monitors on one pool', 'With <code>monitor VL444_ws_Product and VL444_ws_Customer</code> a member is UP only if <strong>both</strong> pass. If one is enough: <code>monitor min 1 of { VL444_ws_Product VL444_ws_Customer }</code>. Confirm which behaviour the service owner expects.')
    + '<h3>POST endpoint without body, receive 400 (Order API)</h3>'
    + cb('tmsh', `ltm monitor https VL557_Order_API {
    destination *:9701
    send "POST /common/v1.0/de/order HTTP/1.1\\r\\nHost: 10.20.8.211\\r\\nContent-Length: 0\\r\\nConnection: close\\r\\n\\r\\n"
    recv "HTTP/1.1 400"
    interval 5
    timeout 16
}`)
    + co('t', '&#x1F4A1;', 'Prefer a real health endpoint', 'Ask the application team for <code>/health</code>, <code>/status</code> or <code>/ping</code> &mdash; 200 without business data is the most reliable monitor and avoids false DOWNs when the API validation changes.')
    + '<h3>GET endpoint, receive 400, with SNI</h3>'
    + cb('tmsh', `ltm monitor https VL557_Customer_API {
    destination *:9711
    send "GET /common/v1.0/de/customer/details HTTP/1.1\\r\\nHost: 10.20.8.211\\r\\nConnection: close\\r\\n\\r\\n"
    recv "HTTP/1.1 400"
    interval 5
    timeout 16
    server-name 10.20.8.211
}`)
    + '<p>Rule of thumb: <code>timeout = 3 &times; interval + 1</code>.</p>'

    + '<h2>Troubleshooting</h2>'
    + tbl(['Symptom', 'Cause', 'Fix'], [
      ['DOWN, log says <code>Response Code: 200</code>', 'answer arrived but the receive string is not in it', 'compare the real response with <code>recv</code>'],
      ['<code>400 Illegal character SPACE</code>', 'double space in the send string', 'one space only'],
      ['400 instead of expected 405', 'URI without leading <code>/</code>, missing Host / Content-Length', 'fix the send string'],
      ['All members <code>Connection refused</code>', 'service not listening on that port', 'application / server team &mdash; not F5'],
      ['Timeout', 'routing / firewall / wrong route domain', 'test with <code>rdexec &lt;RD&gt;</code>, tcpdump'],
      ['TLS handshake fails', 'missing SNI, old ciphers, server wants client cert', '<code>server-name</code> in the monitor; <code>openssl s_client -servername</code>'],
    ])
    + '<p>SSL error on the VIP while the members refuse connections: <a href="#tools/tcp/errors">Reading errors &rsaquo; case</a>.</p>'
    + '</div>';
}

const F5_SCRIPT = `#!/bin/bash
# f5-test-members.sh — test pool members from the F5 itself, inside a route domain.
# Usage: ./f5-test-members.sh -r <RD> -p <port> [-H <Host>] [-m GET|POST|HEAD] [-u <URI>] [-s] <ip> [ip ...]
#   -s  plain HTTP instead of HTTPS     -t  timeout in seconds (default 5)
RD=0; PORT=443; HOSTHDR=""; METHOD=GET; URI=/; SCHEME=https; TO=5
while getopts "r:p:H:m:u:st:" o; do
  case $o in
    r) RD=$OPTARG ;; p) PORT=$OPTARG ;; H) HOSTHDR=$OPTARG ;; m) METHOD=$OPTARG ;;
    u) URI=$OPTARG ;; s) SCHEME=http ;; t) TO=$OPTARG ;;
  esac
done
shift $((OPTIND - 1))
[[ $URI == /* ]] || URI="/$URI"          # fixes the "missing /" mistake

printf '%-16s %-9s %-6s %s\\n' MEMBER TCP HTTP CERT
for ip in "$@"; do
  # TCP via bash /dev/tcp: exit 124 = timeout, "refused" = RST
  err=$(rdexec "$RD" timeout "$TO" bash -c "exec 3<>/dev/tcp/$ip/$PORT" 2>&1); rc=$?
  if [ $rc -eq 0 ]; then tcp=OK; elif [ $rc -eq 124 ]; then tcp=TIMEOUT
  elif [[ $err == *refused* ]]; then tcp=REFUSED; else tcp=ERR; fi
  http=-; cert=-
  if [ "$tcp" = OK ]; then
    args=(-s -o /dev/null -w '%{http_code}' --connect-timeout "$TO" -m $((TO*2)) -k -X "$METHOD")
    [ "$METHOD" = POST ] && args+=(-H 'Content-Length: 0')
    [ -n "$HOSTHDR" ] && args+=(-H "Host: $HOSTHDR")
    http=$(rdexec "$RD" curl "\${args[@]}" "$SCHEME://$ip:$PORT$URI" 2>/dev/null)
    [ "$SCHEME" = https ] && cert=$(echo | rdexec "$RD" timeout "$TO" openssl s_client -connect "$ip:$PORT" \\
        \${HOSTHDR:+-servername "$HOSTHDR"} 2>/dev/null | openssl x509 -noout -subject -enddate 2>/dev/null | paste -sd' ' -)
  fi
  printf '%-16s %-9s %-6s %s\\n' "$ip" "$tcp" "$http" "$cert"
done`;

// ═══════════════════════════════════════════════════════════════════
// CLI reference
// ═══════════════════════════════════════════════════════════════════
function pgF5CLI() {
  return '<div class="ph"><div class="pt">F5 LTM &mdash; CLI reference</div>'
    + '<div class="ps">tmsh show / list, route domains in bash, connectivity tests</div>'
    + F5_TAGS(['tg', 'tmsh'], ['tb', 'bash'], ['ta', 'Route Domain']) + '</div>'
    + '<div class="content">'
    + '<h2>show vs list</h2>'
    + tbl(['Command', 'Shows'], [
      ['<code>show ltm virtual &lt;VS&gt;</code>', 'state/availability, destination, traffic counters'],
      ['<code>list ltm virtual &lt;VS&gt;</code>', 'configuration: pool, profiles, iRules, SNAT, destination'],
      ['<code>show ltm pool &lt;POOL&gt; members</code>', 'pool + member state, monitor, active members, reason for DOWN'],
      ['<code>list ltm pool &lt;POOL&gt; all-properties</code>', 'full pool config: members IP/port, LB mode, monitor, state'],
    ])
    + '<p><code>show</code> = runtime state and statistics, <code>list</code> = configuration. Run from <code>tmsh</code> or prefix with <code>tmsh</code> in bash.</p>'
    + cb('tmsh', `tmsh list ltm virtual | grep -B3 -A15 10.20.2.210          # find a VS by VIP
tmsh show ltm virtual VS_VL557_Order_Status
tmsh show ltm pool VL557_Order_Status members
tmsh list ltm pool VL557_Order_Status all-properties
tmsh list ltm monitor https VL444_ws_Product all-properties
tmsh list ltm rule | grep -i snat                          # *snat-<VLAN> iRules
tmsh show ltm persistence persist-records
tmsh show /ltm virtual profiles | egrep 'Ltm::Virtual Server:|Ltm::ClientSSL Profile:'
tmsh save sys config`)

    + '<h2>Route domains in bash</h2>'
    + cb('bash', `rdsh 10                        # open a shell inside route domain 10 ("like vsenv / VSX context")
exit                           # back

rdexec 10 <command>            # run ONE command inside RD 10
rdexec 10 ping -c3 10.20.2.8
rdexec 11 timeout 5 nc -v 10.20.8.21 18090
rdexec 11 curl -vkI --connect-timeout 5 https://10.20.8.21:18090/`)
    + co('a', '&#x26A0;&#xFE0F;', 'Without rdexec you test the wrong network', 'A plain <code>ping</code>/<code>curl</code> in bash uses route domain 0 (management/default). Members in <code>%10</code> are only reachable via <code>rdexec 10</code> / <code>rdsh 10</code>.')

    + '<h2>Reading test results</h2>'
    + cb('bash', `# refused = host answers with RST, nothing listening on the port
rdexec 10 timeout 5 nc -v 10.20.2.8 9026
Ncat: Connection refused.

rdexec 10 curl -v --connect-timeout 5 http://10.20.2.8:9026/
* connect to 10.20.2.8 port 9026 failed: Connection refused
curl: (7) Failed to connect to 10.20.2.8 port 9026: Connection refused`)
    + tbl(['curl exit code', 'Meaning'], [
      ['<code>(7)</code> refused', 'nothing listening &mdash; service down / wrong port'],
      ['<code>(28)</code> timeout', 'no answer &mdash; routing / firewall / route domain'],
      ['<code>(35)</code>', 'TLS handshake failed'],
      ['<code>(60)</code>', 'certificate not trusted (use <code>-k</code> to test anyway)'],
      ['<code>(52)</code> empty reply', 'TCP OK but the server closed without an answer (e.g. HTTP to a TLS port)'],
    ])
    + co('t', '&#x1F50E;', 'All members refused = not an F5 problem', 'If every member returns <em>Connection refused</em> on the service port, the application is not running/listening. Hand over to the server/app team with the test output.')
    + '<p>Test many members at once: script on the <a href="#f5/ltm/monitors">HTTPS Monitors</a> page.</p>'

    + '<h2>Partitions on an unfamiliar box</h2>'
    + cb('tmsh', `cd /                          # "recursive" only walks the current partition
list ltm virtual recursive one-line
list net route-domain          # RDs that exist (more reliable than list auth partition)
cd /Common                     # run util bash does not work from /`)
    + '<p>More lessons: <a href="#f5/ltm/case-preview-vip">Case: new HTTPS VIP + SAN cert</a>.</p>'
    + '<h2>Packet capture</h2>'
    + cb('bash', `tcpdump -nni 0.0:nnn 'host 10.20.8.21 and port 18090'`)
    + '<p>Details and how to read the F5-specific fields: <a href="#f5/logs/tcpdump">tcpdump &amp; flows</a>.</p>'
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// Logs
// ═══════════════════════════════════════════════════════════════════
function pgF5Logs() {
  return '<div class="ph"><div class="pt">F5 &mdash; LTM log analysis</div>'
    + '<div class="ps">Monitor up/down events, searching current and rotated logs</div>'
    + F5_TAGS(['ta', 'Logs'], ['ta', 'Debug']) + '</div>'
    + '<div class="content">'
    + '<h2>Commands</h2>'
    + cb('tmsh', `show /sys log ltm range now-4d
show /sys log ltm range now-1h`)
    + cb('bash', `cd /var/log
grep appsrv02 ltm                                   # current log
zgrep appsrv02 ltm*                                  # current + rotated + .gz in one go
zcat -f ltm.1 ltm.2.gz ltm.3.gz | grep appsrv02      # -f also reads non-compressed files
tail -f ltm | grep -i 'monitor status'               # live`)
    + co('a', '&#x26A0;&#xFE0F;', 'gzip: ltm.1.gz: No such file or directory', 'The first rotation <code>ltm.1</code> is <strong>not compressed</strong>; only <code>ltm.2.gz</code> and older are. Use <code>zgrep … ltm*</code> or <code>zcat -f</code> and you do not need to care.')
    + '<h2>Monitor events</h2>'
    + cb('log', `Dec 12 00:44:14 f5-lb01 notice mcpd[5266]: 01070638:5: Pool /Common/Intranet-APP-PROD_80 member /Common/Intranet-appsrv024:8099 monitor status down.
  [ /Common/Intranet-APP-PROD_80: down; last error: /Common/Intranet-APP-PROD_80:  Response Code: 200 @2023/12/12 00:44:14. ]  [ was up for 266hrs:45mins:44sec ]
Dec 12 00:47:48 f5-lb01 notice mcpd[5266]: 01070727:5: Pool /Common/Intranet-APP-PROD_80 member /Common/Intranet-appsrv024:8099 monitor status up.
  [ was down for 0hr:3mins:34sec ]`)
    + tbl(['Message ID', 'Event', 'What to do'], [
      ['<code>01070638</code>', 'member DOWN', 'read <em>last error</em>, test the member by hand'],
      ['<code>01070727</code>', 'member UP', 'recovered &mdash; watch for flapping (several down/up in a row)'],
      ['<code>01010028</code>', 'no members available for a pool', 'VS has nothing to send traffic to'],
    ])
    + co('a', '&#x26A0;&#xFE0F;', '"Response Code: 200" in a DOWN event', 'The member answered 200, but the <strong>receive string did not match</strong> (or the answer came after the timeout). Compare the real response with the monitor <code>recv</code>.')
    + co('p', '&#x2139;&#xFE0F;', 'Several members down within minutes', 'Members going down one after another for ~3&ndash;4 minutes (as in the example) usually means the application side (deploy, restart, backend DB) &mdash; not the network.')
    + '<h2>Log files</h2>'
    + tbl(['File', 'Content'], [['/var/log/ltm', 'current LTM log'], ['/var/log/ltm.1', 'first rotation &mdash; plain text'], ['/var/log/ltm.2.gz …', 'older rotations &mdash; compressed'], ['/var/log/audit', 'who changed what (config changes)'], ['/var/log/gtm, apm, asm', 'other modules']])
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// Certificates
// ═══════════════════════════════════════════════════════════════════
function pgF5Certs() {
  return '<div class="ph"><div class="pt">F5 &mdash; Certificates</div>'
    + '<div class="ps">Which client-SSL profiles are used, certificate expiry, installing a renewed certificate</div>'
    + F5_TAGS(['tb', 'TLS'], ['tb', 'Certificates']) + '</div>'
    + '<div class="content">'
    + '<h2>Client-SSL profiles used by virtual servers</h2>'
    + cb('bash', `tmsh show /ltm virtual profiles | egrep 'Ltm::Virtual Server:| Ltm::ClientSSL Profile:'
tmsh show /ltm virtual profiles | egrep 'Ltm::ClientSSL Profile:' | sort | uniq -c    # how many VS per profile`)
    + cb('output', `  | Ltm::ClientSSL Profile: wildcard_corp.example.net_4096
  | Ltm::ClientSSL Profile: wildcard_example.com_2025
  | Ltm::ClientSSL Profile: wildcard_example.com_2025`)
    + '<h2>Expiry of all certificates</h2>'
    + cb('tmsh', `tmsh run sys crypto check-cert                         # expired / expiring soon (built-in)
tmsh list sys crypto cert all-properties | egrep 'sys crypto cert|expiration-string|subject '`)
    + cb('bash', `# raw files in the filestore: issuer + validity of every cert
find /config/filestore/files_d/*_d/certificate_d -name "*_*" \\
  | egrep -v 'bundle|default|irule' \\
  | xargs -i openssl x509 -in {} -text -noout -inform pem 2>&- \\
  | awk '/Issuer:/,/Not After :/ {print $0}'`)
    + cb('output (shortened)', `Issuer: C=US, O=DigiCert Inc, CN=DigiCert Global G2 TLS RSA SHA256 2020 CA1
    Not After : May 13 23:59:59 2025 GMT     <- expired
Issuer: C=US, O=Example Corp, CN=Corporate Issuing CA
    Not After : Oct 14 23:59:59 2026 GMT`)
    + co('a', '&#x26A0;&#xFE0F;', 'The filestore also holds CA bundles and unused certs', 'An expired file is a problem only if a client-SSL/server-SSL profile still uses it. Cross-check with the profile list above.')
    + '<h2>What a member / VIP presents</h2>'
    + cb('bash', `echo | rdexec 11 openssl s_client -connect 10.20.8.21:9021 -servername ws-esb.example.com 2>/dev/null | openssl x509 -noout -subject -issuer -enddate
curl -v --resolve app.example.com:443:192.168.10.220 https://app.example.com/   # test a VIP by name before DNS points to it`)
    + '<h2>Generate key + CSR with SANs on the F5</h2>'
    + cb('tmsh', `create sys crypto key app.example.com_2026 key-size 4096 gen-csr common-name app.example.com \\
    subject-alternative-name "DNS:app.example.com, DNS:app"
list sys crypto csr app.example.com_2026      # PEM block for the CA`)
    + co('a', '&#x26A0;&#xFE0F;', 'Put the CN into the SAN list too', 'Browsers ignore the CN and check only SANs. Full worked example: <a href="#f5/ltm/case-preview-vip">Case: new HTTPS VIP + SAN cert</a>.')
    + '<h2>Install a renewed certificate</h2>'
    + cb('tmsh', `tmsh install sys crypto cert wildcard_example.com_2026 from-local-file /var/tmp/wildcard_2026.crt
tmsh install sys crypto key  wildcard_example.com_2026 from-local-file /var/tmp/wildcard_2026.key
tmsh modify ltm profile client-ssl wildcard_example.com_2025 cert-key-chain replace-all-with { default { cert wildcard_example.com_2026 key wildcard_example.com_2026 chain <intermediate-bundle> } }
tmsh save sys config`)
    + co('t', '&#x2714;', 'Tip', 'Replacing the cert inside the existing profile updates every VS that uses it at once &mdash; no VS change needed. Sync the config to the peer afterwards (<code>run cm config-sync to-group &lt;group&gt;</code>).')
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// tcpdump on BIG-IP & full-proxy flows
// ═══════════════════════════════════════════════════════════════════
function pgF5Tcpdump() {
  return '<div class="ph"><div class="pt">F5 &mdash; tcpdump &amp; full-proxy flows</div>'
    + '<div class="ps">Capturing on TMM, reading the extra F5 fields, matching client side to server side</div>'
    + F5_TAGS(['tr', 'tcpdump'], ['tb', 'TCP'], ['ta', 'Full proxy']) + '</div>'
    + '<div class="content">'
    + '<h2>Capture</h2>'
    + cb('bash', `tcpdump -nni 0.0:nnn 'host 10.20.8.211 and port 9026'                 # both sides, with F5 metadata
tcpdump -nni 0.0:nnn -s0 -vv 'host 10.20.8.211 and port 9026'
tcpdump -nni 0.0:nnnp -s0 -w /var/tmp/case.pcap 'host 10.50.8.38'       # p = also the peer (server-side) flow
tcpdump -nni 444 'port 9026'                                            # only VLAN 444`)
    + tbl(['Part', 'Meaning'], [
      ['<code>0.0</code>', 'all TMM interfaces/VLANs'],
      ['<code>:n</code> / <code>:nn</code> / <code>:nnn</code>', 'amount of F5 metadata per packet (nnn = everything below)'],
      ['<code>:p</code>', 'also capture the peer flow &mdash; filter on the client, get the server side too'],
      ['<code>-s0</code>', 'whole packet'], ['<code>-w file.pcap</code>', 'save for Wireshark (F5 dissector shows the metadata)'],
    ])

    + '<h2>F5 fields</h2>'
    + tbl(['Field', 'Meaning', 'In practice'], [
      ['<code>in</code> / <code>out</code>', 'direction relative to TMM', '<code>in</code> = into F5, <code>out</code> = from F5'],
      ['<code>slot1/tmm1</code>', 'slot + TMM instance', 'informational'],
      ['<code>lis=</code>', 'listener = virtual server', 'empty on the very first SYN, then the VS name'],
      ['<code>flowid=</code>', 'this half of the connection', 'grep it in a saved capture to follow one flow'],
      ['<code>peerid=</code>', 'the other half (server side)', 'F5 is a full proxy = 2 TCP connections'],
      ['<code>peerremote=</code>', 'remote IP of the other half', 'IPv4-mapped IPv6 in hex &mdash; usually the <strong>pool member</strong>'],
      ['<code>peerlocal=</code>', 'F5 IP of the other half', 'typically the <strong>SNAT</strong> address'],
      ['<code>remoteport=</code> / <code>localport=</code>', 'ports of the peer flow', 'e.g. member port 9026'],
      ['<code>vlan=</code>', 'VLAN of the flow', 'e.g. 444'],
      ['<code>proto=</code>', 'IP protocol', '6 = TCP, 17 = UDP, 1 = ICMP'],
      ['<code>flowtype, conflags, haunit, inslot/inport, priority</code>', 'internal TMM data', 'ignore (deep troubleshooting only)'],
    ])
    + '<h3>Decode peerremote / peerlocal</h3>'
    + cb('bash', `# peerremote=00000000:00000000:0000FFFF:0A14081B  -> last 8 hex digits = IPv4
#   0A 14 08 1B  ->  10.20.8.27
hex2ip(){ h=\${1: -8}; printf '%d.%d.%d.%d\\n' 0x\${h:0:2} 0x\${h:2:2} 0x\${h:4:2} 0x\${h:6:2}; }
hex2ip 0A14081B      # 10.20.8.27   (pool member)
hex2ip 0A1408C9      # 10.20.8.201  (SNAT)`)

    + '<h2>One connection, step by step</h2><div class="flow">'
    + step(1, 'Client SYN &mdash; not yet matched', cb('tcpdump', `10.50.8.38.52268 > 10.20.8.211.9026: Flags [S], seq 4225504250, win 65535, options [mss 1272,nop,wscale 8,…]
   in slot1/tmm1 lis= flowid=0 peerid=0 peerremote=00…00`)
      + '<p>No listener, no flow yet. Note the client offers <code>wscale 8</code> and MSS 1272 (smaller than 1460 &rarr; a tunnel/VPN on the client path).</p>')
    + step(2, 'F5 answers SYN/ACK itself', cb('tcpdump', `10.20.8.211.9026 > 10.50.8.38.52268: Flags [S.], ack 4225504251, win 12720, options [mss 1460,…,wscale 0,…]
   out slot1/tmm1 lis=/Common/VS_VL444_Order_Status flowid=4000546DBC00 peerid=0`)
      + '<p>The VS matched (<code>lis=</code>), the client-side flow got an ID. The server is not contacted yet &mdash; <strong>full proxy</strong>.</p>')
    + step(3, 'First data &rarr; server-side flow appears', cb('tcpdump', `10.50.8.38.52268 > 10.20.8.211.9026: Flags [P.], seq 1:231, ack 1, win 255, length 230
   in … flowid=4000546DBC00 peerid=4000546E6E00
   peerremote=…0000FFFF:0A14081B  peerlocal=…0000FFFF:0A1408C9  remoteport=9026 localport=52268 proto=6 vlan=444`)
      + '<p><code>peerid</code> links to the server-side connection: member <strong>10.20.8.27:9026</strong>, from SNAT <strong>10.20.8.201</strong>, on VLAN 444.</p>')
    + step(4, 'Response from the member, relayed to the client', cb('tcpdump', `10.20.8.211.9026 > 10.50.8.38.52268: Flags [P.], seq 1:1273, ack 231, length 1272  out …
10.20.8.211.9026 > 10.50.8.38.52268: Flags [P.], seq 1273:2545, ack 231, length 1272 out …
10.50.8.38.52268 > 10.20.8.211.9026: Flags [.], ack 2545, win 255 in …`))
    + '</div>'

    + '<h2>TCP fields refresher</h2>'
    + tbl(['Field', 'Meaning'], [
      ['<code>seq 1:231</code>', 'relative sequence range: this packet carries bytes 1&ndash;230 (= <code>length 230</code>)'],
      ['<code>ack 231</code>', '"I have everything up to byte 230, send 231 next"'],
      ['<code>win 255</code>', 'advertised receive window &mdash; multiply by the window scale from the SYN: <code>255 &times; 2<sup>8</sup> = 65&nbsp;280</code> bytes'],
      ['<code>mss</code>', 'max segment size offered in the SYN (1460 on plain Ethernet)'],
      ['<code>cksum … (incorrect)</code>', 'on packets <strong>sent</strong> by F5: normal &mdash; checksum is computed later in hardware (offload). Ignore.'],
      ['Flags <code>S</code>, <code>S.</code>, <code>.</code>, <code>P.</code>, <code>F.</code>, <code>R</code>', 'SYN, SYN-ACK, ACK, PUSH+ACK (data), FIN+ACK, RESET'],
    ])
    + co('t', '&#x1F50E;', 'Typical findings', '<strong>Client side OK, no peerid</strong> &rarr; F5 could not pick a member (pool down) or waits for data. <strong>Server-side SYN without answer</strong> &rarr; member/route/SNAT return path. <strong>R from member</strong> &rarr; nothing listening (= "Connection refused").')
    + '</div>';
}

Object.assign(RENDERERS, {
  'f5/ltm/workflow': pgF5LTM,
  'f5/ltm/monitors': pgF5Mon,
  'f5/ltm/cli': pgF5CLI,
  'f5/logs/ltm': pgF5Logs,
  'f5/logs/certs': pgF5Certs,
  'f5/logs/tcpdump': pgF5Tcpdump,
});

IDX.push(
  { t: 'F5 show vs list ltm virtual / pool', p: 'f5/ltm/cli', k: 'show list ltm virtual pool members all-properties tmsh', v: 'show = runtime state, list = configuration' },
  { t: 'rdexec / rdsh route domain test', p: 'f5/ltm/cli', k: 'rdexec rdsh route domain nc curl test member bash', v: 'rdexec 10 timeout 5 nc -v <ip> <port>' },
  { t: 'Connection refused vs timeout', p: 'f5/ltm/cli', k: 'connection refused timeout curl 7 28 nc ncat member down', v: 'refused = nothing listening; timeout = network' },
  { t: 'Test all pool members (script)', p: 'f5/ltm/monitors', k: 'script bash loop members test f5-test-members nc curl openssl', v: 'tools/f5-test-members.sh -r RD -p port -m POST -u URI ips…' },
  { t: 'curl reproduce monitor POST', p: 'f5/ltm/monitors', k: 'curl -X POST content-length host header -k -I head 405', v: 'curl -I sends HEAD — monitor may send POST' },
  { t: 'Two monitors on a pool (and / min 1 of)', p: 'f5/ltm/monitors', k: 'monitor and min 1 of pool multiple monitors', v: 'and = all must pass; min 1 of = any' },
  { t: 'tmsh create ltm pool / virtual', p: 'f5/ltm/workflow', k: 'tmsh create ltm pool virtual members add destination source-address-translation automap profiles clientssl serverssl', v: 'create pool + VS with automap / TLS' },
  { t: 'zgrep rotated LTM logs (ltm.1 not gz)', p: 'f5/logs/ltm', k: 'zgrep zcat ltm.1.gz no such file rotated logs', v: 'zgrep pattern /var/log/ltm*' },
  { t: 'tmsh run sys crypto check-cert', p: 'f5/logs/certs', k: 'certificate expiry check-cert clientssl profile renew install', v: 'Expired / expiring certificates' },
  { t: 'F5 tcpdump 0.0:nnn fields', p: 'f5/logs/tcpdump', k: 'tcpdump 0.0:nnn flowid peerid peerremote peerlocal lis full proxy', v: 'Match client-side flow to server-side member + SNAT' },
  { t: 'Decode peerremote hex to IP', p: 'f5/logs/tcpdump', k: 'peerremote peerlocal hex ip decode 0000ffff', v: 'last 8 hex digits = IPv4' },
  { t: 'TCP seq ack win window scale', p: 'f5/logs/tcpdump', k: 'seq ack win wscale window scaling mss cksum incorrect offload', v: 'win × 2^wscale = real window' },
);
