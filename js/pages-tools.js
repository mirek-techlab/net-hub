// pages-tools.js — vendor-neutral testing tools: curl, raw HTTP, openssl s_client, TCP connectivity.
// Examples use neutral addresses (10.20.x.x, example.com).

(function () {
  if (!TREE.some(t => t.id === 'tools')) TREE.push({
    id: 'tools', label: 'Testing Tools', col: '#e86fb4', subs: [
      { id: 'http', label: 'HTTP', pages: [{ id: 'curl', label: 'curl' }, { id: 'raw', label: 'Raw HTTP requests' }] },
      { id: 'tls', label: 'TLS', pages: [{ id: 'sclient', label: 'openssl s_client' }] },
      { id: 'tcp', label: 'TCP / connectivity', pages: [{ id: 'conn', label: 'nc, telnet, /dev/tcp' }, { id: 'errors', label: 'Reading errors' }] },
    ]
  });
})();

const TT = (...x) => '<div class="tags">' + x.map(([c, t]) => tag(c, t)).join('') + '</div>';

// ═══════════════════════════════════════════════════════════════════
// curl
// ═══════════════════════════════════════════════════════════════════
function pgToolCurl() {
  return '<div class="ph"><div class="pt">curl &mdash; HTTP(S) testing</div>'
    + '<div class="ps">The flags you actually need, reproducing a monitor, timing, SNI/DNS tricks, exit codes</div>'
    + TT(['tb', 'curl'], ['tb', 'HTTP'], ['tb', 'HTTPS']) + '</div>'
    + '<div class="content">'
    + '<h2>Everyday commands</h2>'
    + cb('bash', `curl -v  http://10.20.8.21:18090/                     # verbose: request + response headers
curl -vk https://10.20.8.21:9711/path                  # -k: do not validate the certificate
curl -skI https://10.20.8.21:9711/                     # HEAD only (headers), silent
curl -sk -o /dev/null -w '%{http_code}\\n' https://10.20.8.21:9711/   # just the status code
curl -vk -H 'Host: app.example.com' https://10.20.8.21/               # custom Host header
curl -vk -X POST -H 'Content-Length: 0' https://10.20.8.21:9701/common/v1.0/de/order
curl -vk -X POST -H 'Content-Type: application/json' -d '{"id":1}' https://10.20.8.21:9701/api
curl -vk -X OPTIONS https://10.20.8.21:9711/common/v1.0/de/customer/details   # which methods are allowed`)
    + tbl(['Flag', 'Meaning'], [
      ['<code>-v</code>', 'verbose &mdash; TLS handshake, request and response headers (<code>&gt;</code> sent, <code>&lt;</code> received)'],
      ['<code>-k</code>', 'ignore certificate validation (internal CA, self-signed, IP instead of name)'],
      ['<code>-I</code>', 'HEAD request &mdash; <strong>not</strong> the same as GET/POST; some APIs answer 405'],
      ['<code>-X METHOD</code>', 'GET / POST / PUT / DELETE / OPTIONS …'],
      ['<code>-H \'Name: value\'</code>', 'add/replace a header (Host, Content-Type, Authorization)'],
      ['<code>-d data</code>', 'request body (implies POST); <code>-d @file.json</code> from a file'],
      ['<code>-s</code> / <code>-o /dev/null</code> / <code>-w</code>', 'silent / discard body / print chosen variables'],
      ['<code>--connect-timeout 5</code> / <code>-m 10</code>', 'max time for TCP connect / for the whole request'],
      ['<code>-4</code> / <code>--http1.1</code>', 'force IPv4 / HTTP/1.1 (avoid h2 surprises)'],
      ['<code>-L</code>', 'follow redirects (3xx)'],
      ['<code>--noproxy \'*\'</code>', 'ignore http_proxy / https_proxy environment variables'],
    ])

    + '<h2>Test a name against a specific IP (SNI + Host correct, no DNS change)</h2>'
    + cb('bash', `curl -v --resolve app.example.com:443:192.168.10.220 https://app.example.com/
curl -v --connect-to app.example.com:443:10.20.8.21:9711 https://app.example.com/   # also a different port`)
    + '<p>Both send the real name in SNI and Host, so you see the certificate and virtual host the clients will get &mdash; before DNS points to the new VIP. With <code>-H \'Host: …\'</code> alone the <strong>SNI</strong> still carries the IP.</p>'

    + '<h2>Reproduce a load-balancer monitor exactly</h2>'
    + cb('bash', `# monitor send: POST /common/v1.0/de/order HTTP/1.1\\r\\nHost: 10.20.8.211\\r\\nConnection: close\\r\\n\\r\\n
curl -sk -o /dev/null -w '%{http_code}\\n' -X POST -H 'Host: 10.20.8.211' -H 'Content-Length: 0' \\
     -H 'Connection: close' https://10.20.8.21:9701/common/v1.0/de/order`)
    + co('a', '&#x26A0;&#xFE0F;', 'curl adds headers the monitor does not send', 'curl always sends <code>User-Agent</code> and <code>Accept: */*</code>. If a strict backend reacts to them, test byte-for-byte with a <a href="#tools/http/raw">raw request</a> instead.')

    + '<h2>Timing &mdash; where is the time spent?</h2>'
    + cb('bash', `curl -sk -o /dev/null -w 'dns %{time_namelookup}  tcp %{time_connect}  tls %{time_appconnect}  first-byte %{time_starttransfer}  total %{time_total}  code %{http_code}\\n' https://10.20.8.21:9711/`)
    + tbl(['Variable', 'Ends when'], [['<code>time_connect</code>', 'TCP handshake done'], ['<code>time_appconnect</code>', 'TLS handshake done'], ['<code>time_starttransfer</code>', 'first byte of the response &mdash; minus appconnect = server processing time'], ['<code>time_total</code>', 'everything received']])

    + '<h2>Certificates and client certs</h2>'
    + cb('bash', `curl -v --cacert corp-root.pem https://app.example.com/        # validate against an internal CA
curl -v --cert client.crt --key client.key https://api.example.com/   # mutual TLS
curl -vk --tlsv1.2 --tls-max 1.2 https://10.20.8.21:9711/          # force a TLS version`)

    + '<h2>Loop over several servers</h2>'
    + cb('bash', `for ip in 10.20.2.8 10.20.2.12 10.20.2.5 10.20.2.6; do
  printf '%-12s ' $ip
  curl -sk -o /dev/null -m 5 -w '%{http_code}\\n' https://$ip:9711/common/v1.0/de/customer/details || echo "curl exit $?"
done`)
    + '<p>On an F5, prefix with <code>rdexec &lt;RD&gt;</code>; a ready-made script is on <a href="#f5/ltm/monitors">F5 &rsaquo; HTTPS Monitors</a>.</p>'

    + '<h2>Exit codes</h2>'
    + tbl(['Code', 'Meaning', 'Usually'], [
      ['6', 'could not resolve host', 'DNS'],
      ['7', 'failed to connect (refused)', 'nothing listening / host firewall reject'],
      ['28', 'timeout', 'routing, firewall drop, wrong route domain'],
      ['35', 'TLS handshake failed (incl. "Unknown SSL protocol error")', 'not TLS on that port, or the connection was <strong>reset during the handshake</strong> &mdash; see <a href="#tools/tcp/errors">Reading errors</a>'],
      ['52', 'empty reply', 'TCP OK, server closed without answering'],
      ['56', 'recv failure: connection reset by peer', 'RST after connect &mdash; proxy/LB had no backend, app crashed, or plain HTTP sent to a TLS port'],
      ['60', 'certificate not trusted', 'internal CA &rarr; <code>--cacert</code> or <code>-k</code>'],
    ])
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// Raw HTTP requests (openssl s_client / nc)
// ═══════════════════════════════════════════════════════════════════
function pgToolRaw() {
  return '<div class="ph"><div class="pt">Raw HTTP requests</div>'
    + '<div class="ps">Send exactly the bytes a health monitor sends &mdash; over TLS with openssl, over plain TCP with nc</div>'
    + TT(['tb', 'HTTP'], ['tb', 'openssl'], ['tb', 'nc'], ['ta', 'Monitors']) + '</div>'
    + '<div class="content">'
    + '<h2>Anatomy of a request</h2>'
    + cb('HTTP/1.1', `POST /common/v1.0/de/order HTTP/1.1\\r\\n      <- request line: METHOD SP URI SP VERSION
Host: 10.20.8.211\\r\\n                         <- mandatory in HTTP/1.1
Content-Length: 0\\r\\n                         <- POST/PUT without a body: say so
Connection: close\\r\\n                         <- server closes after the answer
\\r\\n                                          <- empty line = end of headers`)
    + tbl(['Rule', 'If broken'], [
      ['Exactly <strong>one space</strong> between method, URI, version', 'Jetty: <code>400 Illegal character SPACE</code>'],
      ['URI is a <strong>path</strong> starting with <code>/</code> &mdash; not a full URL', '400 / 404'],
      ['Every line ends with <code>\\r\\n</code>, headers end with an empty line', 'server waits &rarr; timeout'],
      ['Method spelled right: <code>OPTIONS</code>, not <code>OPTION</code>', '400 / 501 Not Implemented'],
      ['<code>Host</code> present', 'HTTP/1.1 servers answer 400'],
    ])

    + '<h2>Over TLS &mdash; openssl s_client</h2>'
    + cb('bash', `(echo -e "GET /common/v1.0/de/customer/details HTTP/1.1\\r\\nHost: 10.20.8.211\\r\\nConnection: close\\r\\n\\r\\n"; sleep 1) \\
  | openssl s_client -connect 10.20.8.21:9711 -servername 10.20.8.211 -quiet

(echo -e "POST /common/v1.0/de/order HTTP/1.1\\r\\nHost: 10.20.8.211\\r\\nContent-Length: 0\\r\\nConnection: close\\r\\n\\r\\n"; sleep 1) \\
  | openssl s_client -connect 10.20.8.21:9701 -quiet

(echo -e "OPTIONS /common/v1.0/de/customer/details HTTP/1.1\\r\\nHost: 10.20.2.210\\r\\nConnection: close\\r\\n\\r\\n"; sleep 1) \\
  | openssl s_client -connect 10.20.2.12:9711 -quiet`)
    + tbl(['Part', 'Why'], [
      ['<code>echo -e</code>', 'turns <code>\\r\\n</code> into real CR LF (or use <code>printf \'…\\r\\n\'</code>)'],
      ['<code>sleep 1</code>', 'keeps the pipe open until the answer arrives &mdash; without it openssl may close first'],
      ['<code>-quiet</code>', 'hide the certificate dump, show only the HTTP answer'],
      ['<code>-servername</code>', 'SNI &mdash; needed if the server chooses the certificate by name'],
    ])
    + cb('response', `depth=2 C = BE, O = GlobalSign nv-sa, CN = GlobalSign Non-Public Root CA - R2
verify error:num=19:self signed certificate in certificate chain     <- root not in openssl's trust store (non-public CA) — fine for testing
HTTP/1.1 400 Bad Request
Content-Type: application/json;charset=utf-8
Server: Jetty(9.4.53.v20231009)

{"messageID":"…","errorCode":"DataException","errorMessage":"Account Number Cannot be Empty"}`)
    + co('t', '&#x2714;', 'Reading this answer', 'TLS works &middot; Host header accepted &middot; request line correct &middot; <strong>the application ran its logic</strong> and complained about a missing parameter. 400 here = a business validation error, i.e. the backend is alive. Compare with <code>400 Illegal character SPACE</code>, which is a protocol error from Jetty before the app is reached.')

    + '<h2>Plain HTTP &mdash; nc</h2>'
    + cb('bash', `printf 'GET /health HTTP/1.1\\r\\nHost: app\\r\\nConnection: close\\r\\n\\r\\n' | nc 10.20.8.21 8080
printf 'GET / HTTP/1.0\\r\\n\\r\\n' | nc -w 5 10.20.8.21 80          # HTTP/1.0: no Host needed`)
    + co('p', '&#x2139;&#xFE0F;', 'telnet connects, then the server closes as soon as you type', 'Typical for a <strong>TLS port</strong> receiving plain text. Use openssl s_client instead.')

    + '<h2>Choosing what the monitor should expect</h2>'
    + tbl(['Answer', 'Good health indicator?'], [
      ['200 on <code>/health</code>, <code>/status</code>, <code>/ping</code>', 'best &mdash; ask the app team if such an endpoint exists'],
      ['400 with the app\'s own error JSON (missing parameter)', 'yes &mdash; app alive and executing'],
      ['401 / 403', 'yes &mdash; app alive, just needs credentials'],
      ['404 / 405', 'usable &mdash; server alive, but says less about the app'],
      ['400 <code>Illegal character …</code>', 'no &mdash; your request is malformed'],
      ['5xx', 'no &mdash; server-side failure'],
    ])
    + co('t', '&#x1F4A1;', 'Match the body, not only the status', 'A receive string like <code>Account Number Cannot be Empty</code> or <code>DataException</code> proves the <em>application</em> answered &mdash; a generic 400 from a proxy or a crashed app would not match. F5 monitor setup: <a href="#f5/ltm/monitors">F5 &rsaquo; HTTPS Monitors</a>.')

    + '<h2>Learning resources</h2>'
    + '<ul style="margin:0 0 10px 22px">'
    + '<li><a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview" target="_blank" rel="noopener">MDN &mdash; HTTP overview</a> (request line, headers, status codes)</li>'
    + '<li><a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Status" target="_blank" rel="noopener">MDN &mdash; HTTP status codes</a></li>'
    + '<li><a href="https://clouddocs.f5.com/" target="_blank" rel="noopener">F5 CloudDocs</a> &mdash; search "LTM monitors reference" for send/receive string details</li>'
    + '<li><a href="https://community.f5.com/" target="_blank" rel="noopener">F5 DevCentral community</a> &mdash; monitor examples and Q&amp;A</li>'
    + '<li><a href="https://jetty.org/docs/" target="_blank" rel="noopener">Jetty documentation</a> &mdash; when the backend is Jetty</li>'
    + '</ul>'
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// openssl s_client
// ═══════════════════════════════════════════════════════════════════
function pgToolSClient() {
  return '<div class="ph"><div class="pt">openssl s_client &mdash; TLS testing</div>'
    + '<div class="ps">Handshake, certificate and chain, SNI, protocol versions, ciphers</div>'
    + TT(['tb', 'openssl'], ['tb', 'TLS'], ['ta', 'Certificates']) + '</div>'
    + '<div class="content">'
    + cb('bash', `openssl s_client -connect 10.20.8.21:9711                              # handshake + cert dump, then waits for input
openssl s_client -connect 10.20.8.21:9711 -servername app.example.com </dev/null   # with SNI, exit right away
openssl s_client -connect 10.20.8.21:9711 -brief </dev/null             # one-screen summary: protocol, cipher, peer
openssl s_client -connect 10.20.8.21:9711 -showcerts </dev/null         # every cert the server sends (chain)
openssl s_client -connect 10.20.8.21:9711 -tls1_2 </dev/null            # only TLS 1.2  (also -tls1_3, -tls1_1)
openssl s_client -connect 10.20.8.21:9711 -cipher 'ECDHE-RSA-AES256-GCM-SHA384' </dev/null
openssl s_client -connect 10.20.8.21:9711 -alpn h2,http/1.1 </dev/null  # which HTTP version the server picks
openssl s_client -connect 10.20.8.21:9711 -CAfile corp-root.pem </dev/null   # validate against an internal CA`)
    + '<h2>Just the certificate facts</h2>'
    + cb('bash', `echo | openssl s_client -connect 10.20.8.21:9711 -servername app.example.com 2>/dev/null \\
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
# OpenSSL < 1.1.1: replace "-ext subjectAltName" with  -text | grep -A1 "Subject Alternative"

echo | openssl s_client -connect 10.20.8.21:9711 -showcerts 2>/dev/null | grep -E ' s:| i:'   # chain: subject / issuer per cert`)

    + '<h2>What the output means</h2>'
    + tbl(['You see', 'Meaning'], [
      ['<code>verify return:1</code> / <code>Verify return code: 0 (ok)</code>', 'chain validated against the trust store'],
      ['<code>verify error:num=19: self signed certificate in certificate chain</code>', 'the root is not in openssl\'s trust store &mdash; normal for internal / non-public CAs. Fine for a monitor test.'],
      ['<code>num=20: unable to get local issuer certificate</code>', 'intermediate missing (server does not send the chain) or unknown CA'],
      ['<code>num=10: certificate has expired</code>', 'expired &mdash; check <code>-dates</code>'],
      ['<code>num=62: hostname mismatch</code> (with <code>-verify_hostname</code>)', 'name not in the SAN list'],
      ['<code>no peer certificate available</code> + <code>write:errno=104</code>', 'connection reset during the handshake &mdash; not TLS, or a proxy/LB reset it'],
      ['<code>wrong version number</code>', 'the port speaks plain HTTP, not TLS'],
      ['<code>handshake failure</code> / <code>alert 40</code>', 'no common protocol/cipher, or the server requires SNI / a client certificate'],
      ['<code>Acceptable client certificate CA names</code>', 'server asks for a client cert (mTLS); <code>No client certificate CA names sent</code> = it does not'],
    ])
    + co('t', '&#x1F4A1;', 'Related', '<a href="#theory/security/tls">TLS certificate basics</a> &middot; <a href="#tools/http/raw">Raw HTTP over s_client</a>')
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// TCP connectivity
// ═══════════════════════════════════════════════════════════════════
function pgToolConn() {
  return '<div class="ph"><div class="pt">TCP connectivity &mdash; nc, telnet, /dev/tcp</div>'
    + '<div class="ps">Is the port open? Three tools, depending on what is installed</div>'
    + TT(['tb', 'nc'], ['tb', 'telnet'], ['tb', 'bash'], ['ta', 'TCP']) + '</div>'
    + '<div class="content">'
    + cb('bash', `nc -zv 10.20.2.6 9701                    # -z: only check, send nothing (OpenBSD/GNU nc)
nc -v -w 5 10.20.2.6 9701 </dev/null     # Ncat (RHEL/F5) — older Ncat has no -z
telnet 10.20.2.6 9701                    # Ctrl+] then "quit" to leave
timeout 5 bash -c '</dev/tcp/10.20.2.6/9701' && echo open || echo "closed/timeout ($?)"   # no tools needed`)
    + tbl(['Output', 'Meaning'], [
      ['<code>Connected to …</code> / <code>succeeded</code> / exit 0', 'TCP handshake OK &mdash; something listens'],
      ['<code>Connection refused</code>', 'host answered with RST: <strong>nothing listens</strong> on the port, or a host firewall rejects'],
      ['no answer, then timeout (bash exit 124)', 'packets dropped: routing, firewall, wrong VRF / route domain'],
      ['<code>No route to host</code>', 'ICMP unreachable from a router/firewall, or ARP failed on the local subnet'],
      ['connects, closes when you type', 'probably TLS on that port &rarr; openssl s_client'],
    ])

    + '<h2>Scan several ports / hosts</h2>'
    + cb('bash', `for p in 9701 9711 9721; do timeout 3 bash -c "</dev/tcp/10.20.2.8/$p" 2>/dev/null && echo "$p open" || echo "$p closed"; done
nc -zv 10.20.2.8 9700-9730 2>&1 | grep succeeded                 # port range (OpenBSD nc)
nmap -Pn -p 9701,9711,9721 10.20.2.5-12                          # if nmap is allowed`)
    + co('a', '&#x26A0;&#xFE0F;', 'From which network?', 'Test from the device that will actually connect (the load balancer, in the right VRF / route domain: <code>rdexec &lt;RD&gt;</code> on F5, <code>ping vrf</code> / <code>execute ping-options source</code> elsewhere). A test from your jump host proves only the jump host\'s path.')
    + '<p>What each error means across all tools: <a href="#tools/tcp/errors">Reading errors</a>.</p>'
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// Reading errors (cross-tool) + case: SSL error on the VIP, members refusing
// ═══════════════════════════════════════════════════════════════════
function pgToolErrors() {
  return '<div class="ph"><div class="pt">Reading connection errors</div>'
    + '<div class="ps">Refused, reset, timeout, "SSL protocol error" &mdash; what each one really says, and the misleading one behind a load balancer</div>'
    + TT(['tr', 'Troubleshooting'], ['tb', 'TCP'], ['tb', 'TLS'], ['ta', 'Load balancer']) + '</div>'
    + '<div class="content">'
    + tbl(['Symptom', 'On the wire', 'Typical cause'], [
      ['<strong>Connection refused</strong> (curl 7)', 'SYN &rarr; RST', 'nothing listens on the port / host firewall reject'],
      ['<strong>Timeout</strong> (curl 28)', 'SYN &rarr; nothing', 'firewall drop, routing, wrong VRF / route domain, host down'],
      ['<strong>Connection reset by peer</strong> (curl 56)', 'connected, data sent &rarr; RST', 'app crashed, proxy/LB had no backend, idle timeout on a firewall'],
      ['<strong>Unknown SSL protocol error</strong> (curl 35)', 'connected, ClientHello &rarr; RST/FIN', 'port is not TLS, <strong>or</strong> something reset the connection during the handshake'],
      ['<strong>Empty reply</strong> (curl 52)', 'connected, request &rarr; FIN', 'server closed without answering; plain HTTP to a TLS port gives 52 or 56 depending on the server'],
      ['<strong>wrong version number</strong> (openssl)', 'TLS ClientHello &rarr; plain HTTP answer', 'the port speaks HTTP, not HTTPS'],
    ])

    + '<h2>Case: "SSL error" on the VIP &mdash; but the real problem is the servers</h2>'
    + '<p style="color:var(--text2)">Closed case from practice &mdash; resolved, the customer confirmed everything works. Kept as a pattern.</p><div class="flow">'
    + '<div class="fs"><div class="fsn">1</div><div class="fsb"><div class="fst">Setup</div>'
    + '<p>Three APIs on one VIP, each its own virtual server and port, plain TCP pass-through (<code>tcp</code> profile only, SNAT automap), same four members:</p>'
    + tbl(['Virtual server', 'VIP : port', 'LB', 'Member URL'], [
      ['<code>VL557_Customer_API</code>', '10.20.2.210 : 9711', 'round robin', '<code>https://&lt;IP&gt;:9711/common/v1.0/de/customer/details</code>'],
      ['<code>VL557_Order_API</code>', '10.20.2.210 : 9701', 'round robin', '<code>https://&lt;IP&gt;:9701/common/v1.0/de/order</code>'],
      ['<code>VL557_Product_API</code>', '10.20.2.210 : 9721', 'round robin', '<code>https://&lt;IP&gt;:9721/common/v1.0/de/product/priceandavailability</code>'],
      ['<code>VL557_webservices</code> (another service)', '10.20.2.210 : 9021', 'least conn', ''],
    ])
    + '</div></div>'
    + '<div class="fs"><div class="fsn">2</div><div class="fsb"><div class="fst">HTTPS to the VIP fails with an SSL error</div>'
    + cb('bash', `curl -vk https://10.20.2.210:9701/common/v1.0/de/order
* Connected to 10.20.2.210 port 9701
* Unknown SSL protocol error in connection to 10.20.2.210:9701
curl: (35) Unknown SSL protocol error`)
    + cb('bash', `curl -vk http://10.20.2.210:9701/common/v1.0/de/order
* Connected to 10.20.2.210 port 9701
> GET /common/v1.0/de/order HTTP/1.1
* Recv failure: Connection reset by peer
curl: (56) Recv failure: Connection reset by peer`)
    + '<p>Tempting conclusion: "SSL is not enabled on the service". <strong>Not proven by this.</strong></p></div></div>'
    + '<div class="fs"><div class="fsn">3</div><div class="fsb"><div class="fst">Test the members directly</div>'
    + cb('bash', `telnet 10.20.2.12 9701   ->  Connection refused
telnet 10.20.2.8 9711    ->  Connection refused`)
    + '</div></div>'
    + '<div class="fs"><div class="fsn">4</div><div class="fsb"><div class="fst">What really happens</div>'
    + cb('flow', `client ──SYN──> F5 VIP          F5 accepts the client TCP connection itself (full proxy)
client <─SYN/ACK── F5            → curl prints "Connected"
client ──ClientHello──> F5       F5 now opens the server side …
                    F5 ──SYN──> member :9701
                    F5 <──RST── member          nothing listens
client <──RST── F5               F5 resets the client side
→ curl https: "Unknown SSL protocol error"   (reset arrived during the TLS handshake)
→ curl http : "Connection reset by peer"     (reset arrived after the request)`)
    + co('t', '&#x2714;', 'Conclusion', 'The VIP is fine; the <strong>members are not listening</strong> on 9701/9711/9721. The SSL message is a side effect of the reset. Hand over to the application team with the member tests (step 3) &mdash; and only then check whether the service really speaks HTTPS (<code>openssl s_client</code> to a member once it listens).')
    + '</div></div></div>'

    + '<h2>F5 shows port names instead of numbers</h2>'
    + cb('tmsh', `destination 10.20.2.210%10:panagolin-ident     # = port 9021, name taken from /etc/services
grep -w 9021 /etc/services                     # translate name <-> number
tmsh modify cli global-settings service number # show numeric ports in this tmsh session's output`)
    + '</div>';
}

Object.assign(RENDERERS, {
  'tools/http/curl': pgToolCurl,
  'tools/http/raw': pgToolRaw,
  'tools/tls/sclient': pgToolSClient,
  'tools/tcp/conn': pgToolConn,
  'tools/tcp/errors': pgToolErrors,
});

IDX.push(
  { t: 'curl flags cheat sheet', p: 'tools/http/curl', k: 'curl -v -k -I -X -H -d -w -o resolve connect-to timeout http_code', v: 'curl -sk -o /dev/null -w "%{http_code}"' },
  { t: 'curl --resolve / --connect-to (SNI test)', p: 'tools/http/curl', k: 'curl resolve connect-to sni host header dns test vip', v: 'curl --resolve name:443:IP https://name/' },
  { t: 'curl timing breakdown', p: 'tools/http/curl', k: 'curl time_connect time_appconnect time_starttransfer latency slow', v: 'Where the time goes: TCP, TLS, server' },
  { t: 'curl exit codes 6 7 28 35 52 56 60', p: 'tools/http/curl', k: 'curl exit code 7 28 35 52 56 60 error', v: 'refused / timeout / TLS / empty reply / reset / untrusted' },
  { t: 'Raw HTTP request via openssl s_client', p: 'tools/http/raw', k: 'echo -e openssl s_client quiet raw http request crlf monitor send string', v: '(echo -e "GET … HTTP/1.1\\r\\nHost: …"; sleep 1) | openssl s_client -quiet' },
  { t: 'OPTIONS request (not OPTION)', p: 'tools/http/raw', k: 'options method allowed methods 501', v: 'OPTIONS /path HTTP/1.1' },
  { t: 'Which response is a good health indicator', p: 'tools/http/raw', k: 'health endpoint 400 401 403 404 405 receive string body match', v: 'Prefer /health; 400 with app JSON = alive' },
  { t: 'openssl s_client options', p: 'tools/tls/sclient', k: 'openssl s_client servername showcerts brief tls1_2 cipher alpn cafile', v: 'Handshake, chain, versions, ciphers' },
  { t: 'verify error num=19 self signed in chain', p: 'tools/tls/sclient', k: 'verify error num=19 20 10 self signed unable to get local issuer wrong version number', v: 'Non-public root CA — fine for testing' },
  { t: 'nc / telnet / bash /dev/tcp port test', p: 'tools/tcp/conn', k: 'nc -zv telnet dev/tcp timeout port open closed scan nmap', v: "timeout 5 bash -c '</dev/tcp/IP/PORT'" },
  { t: 'Unknown SSL protocol error behind a load balancer', p: 'tools/tcp/errors', k: 'unknown ssl protocol error curl 35 connection reset 56 full proxy members refused vip', v: 'Members refuse → LB resets client → looks like TLS error' },
  { t: 'F5 port names (panagolin-ident)', p: 'tools/tcp/errors', k: 'panagolin-ident etc services port name numeric cli global-settings service', v: 'tmsh modify cli global-settings service number' },
);
