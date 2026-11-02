// pages-f5-cases.js — F5 case write-ups and security advisories from Mirek's notes.
// Customer, people, ticket numbers, hostnames, domains, VIPs and CA names are replaced with
// neutral examples (public repository). Technical steps and commands are unchanged.

(function () {
  const f5 = TREE.find(t => t.id === 'f5');
  const ltm = f5.subs.find(s => s.id === 'ltm');
  if (!ltm.pages.some(p => p.id === 'case-preview-vip')) ltm.pages.push({ id: 'case-preview-vip', label: 'Case: new HTTPS VIP + SAN cert' });
  if (!f5.subs.some(s => s.id === 'sec')) f5.subs.push({ id: 'sec', label: 'Security & CVEs', pages: [
    { id: 'php2shell', label: 'php2shell (K000163821)' },
    { id: 'mgmt-exposure', label: 'TMUI / SSH exposure audit' },
  ] });
})();


// ═══════════════════════════════════════════════════════════════════
// Case: new dedicated HTTPS VIP for an existing app ("preview") + SAN certificate
// ═══════════════════════════════════════════════════════════════════
function pgF5CasePreview() {
  return '<div class="ph"><div class="pt">Case: new HTTPS VIP for an existing app + SAN certificate</div>'
    + '<div class="ps">Customer wants a "preview" endpoint of an existing application in Acceptance (test before the same change in Production): new VIP, same servers, HTTPS only, extra SAN in the existing certificate</div>'
    + '<div class="tags">' + tag('tg', 'F5') + tag('tg', 'LTM') + tag('ta', 'Partitions') + tag('ta', 'Route Domain') + tag('tb', 'CSR / SAN') + tag('tr', 'Change') + '</div></div>'
    + '<div class="content">'

    + '<h2>Requirements (agreed with the customer)</h2>'
    + tbl(['Question', 'Answer'], [
      ['New VS / VIP?', 'yes, a new dedicated VIP'],
      ['Backend and ports', 'same servers as the existing app (.73 / .83), HTTPS only'],
      ['Health-check file', 'customer created <code>F5monitorApp.htm</code> on the servers'],
      ['Certificate', 'add SANs to the existing app certificate (signed by the customer\'s internal CA)'],
      ['DNS', 'done by the customer &mdash; we do not manage their DNS / AD / servers'],
    ])

    + '<h2>Get oriented on an unfamiliar BIG-IP</h2>'
    + cb('tmsh', `cd /                                             # start at the root, otherwise "recursive" only sees the current partition
list net route-domain                            # which RDs exist (more reliable than "list auth partition")
list cm device-group                             # which cluster / auto-sync
show cm failover-status                          # work on the ACTIVE member
cd /Internal
list ltm virtual one-line | grep -i app          # existing VS of the app`)
    + tbl(['Item', 'Value (example)'], [
      ['Acceptance pair', '<code>lb-acc-01a</code> / <code>lb-acc-01b</code>, device-group Acceptance-Cluster, auto-sync enabled'],
      ['Partitions', '<code>/Common</code>, <code>/Internal</code>, <code>/External</code> &mdash; all app config in <code>/Internal</code>'],
      ['Route domains', '0 = sync VLAN, 1 = Internal, 2 = External'],
      ['Data VLAN', '<code>/Internal/APP-Access</code>'],
      ['Pattern', 'every application has its own VIP and its own pair of servers'],
    ])

    + '<h2>The existing app (template for the new objects)</h2>'
    + tbl(['Object', 'Name (/Internal)', 'Key parameters'], [
      ['VS HTTP', '<code>websphere-app_accp_internal_http_vs</code>', ':80, http pool, profiles <code>f5-tcp-lan</code> + <code>http-cust-accp-internal-default</code>'],
      ['VS HTTPS', '<code>websphere-app_accp_internal_https_vs</code>', ':443, + <code>serverssl-cust-accp-internal-default</code>, client-ssl <code>websphere-app_accp_internal_client-ssl</code>'],
      ['Pools', '<code>websphere-app_accp_internal_http(s)_pool</code>', 'least-connections-node, .73 / .83 :80 / :443'],
      ['Monitors', '<code>websphere-app_accp_internal_http(s)_monitor</code>', '<code>GET /f5monitorApp.html</code>, Host <code>accapp.corp.local</code>, recv <code>RUNNING</code>, interval 5 / timeout 16'],
      ['Persistence', '<code>cookie-cust-accp-internal-default-persistence</code>', 'fallback <code>source_address-cust-accp-internal-default-persistence</code>'],
      ['SNAT', 'automap', ''],
    ])

    + '<h2>Testing the health-check file &mdash; matrix loop</h2>'
    + '<p>From bash on the F5, inside route domain 1. Every combination of server &times; protocol &times; file name &times; Host header:</p>'
    + cb('bash', `for ip in 10.30.12.73 10.30.12.83; do
 for proto in http https; do
  for file in f5monitorApp.html F5monitorApp.htm; do
   for host in accapp.corp.local accapppreview.corp.local; do
    out=$(rdexec 1 curl -sk -m 5 -H "Host: $host" -w '\\nHTTP_CODE:%{http_code}' "$proto://$ip/$file")
    code=$(echo "$out" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
    echo "$out" | grep -q RUNNING && body=RUNNING || body=no-RUNNING
    printf "%-5s %-13s %-20s %-28s -> %s %s\\n" "$proto" "$ip" "$file" "$host" "$code" "$body"
   done
  done
 done
done`)
    + tbl(['Day', 'File', 'Host header', 'Result (HTTP + HTTPS, both servers)'], [
      ['1', '<code>f5monitorApp.html</code>', 'both', '200 + RUNNING'],
      ['1', '<code>F5monitorApp.html</code> (capital F)', 'preview', '200'],
      ['1', '<code>F5monitorApp.htm</code> / <code>f5monitorApp.htm</code>', 'both', '404 &mdash; file not there yet'],
      ['2', '<code>F5monitorApp.htm</code>', 'preview', '200, body <code>RUNNING</code> (7 B)'],
    ])
    + co('t', '&#x1F50E;', 'Findings', '&bull; The web server is <strong>case-insensitive</strong> &mdash; only the extension matters, not upper/lower case.<br>&bull; Servers answer the same for both Host headers &rarr; they do not distinguish virtual hosts (derived).<br>&bull; <code>.htm</code> had <code>Last-Modified</code> from years ago &rarr; most likely copied from the <code>.html</code> (derived). Check with <code>curl -skI</code>.')

    + '<h2>Certificate</h2>'
    + '<p>The certificate is issued by the customer\'s internal CA, so the customer signs it. We deliver a key + CSR generated on the F5.</p>'
    + tbl(['Item', 'Value (existing cert)'], [
      ['Object', '<code>/Internal/accapp.corp.local_03122025</code> (cert + key)'],
      ['Issuer', '<code>CN=Customer Common CA 01, DC=CORP, DC=LOCAL</code>'],
      ['Subject', '<code>CN=accapp.corp.local</code>'],
      ['SAN', '<code>billing-acc.apps.example.nl</code>, <code>accapp</code>'],
      ['Key', 'RSA 4096, with bundle'],
    ])
    + co('a', '&#x26A0;&#xFE0F;', 'Name only in CN, not in SAN', '<code>accapp.corp.local</code> was only in the CN. Browsers ignore the CN and check <strong>only the SAN list</strong> &mdash; so the new CSR includes it as a SAN too.')
    + cb('tmsh', `cd /Internal
create sys crypto key accapp.corp.local_2026 key-size 4096 gen-csr common-name accapp.corp.local \\
    subject-alternative-name "DNS:accapp.corp.local, DNS:accapp, DNS:billing-acc.apps.example.nl, DNS:accapppreview, DNS:accapppreview.corp.local"
list sys crypto csr accapp.corp.local_2026          # copy the PEM block and send it for signing

# after signing: import as a NEW object (old one stays for backout)
install sys crypto cert accapp.corp.local_2026 from-local-file /var/tmp/accapp_2026.crt
list sys crypto cert accapp.corp.local_2026         # check subject, SAN, expiration`)

    + '<h2>Planned configuration</h2>'
    + '<p>New objects are HTTPS only, on the new VIP and the same servers. The only change to an existing object is the certificate in the existing app\'s client-ssl profile.</p>'
    + tbl(['Object', 'Action', 'Impact on the existing app'], [
      ['cert/key <code>accapp.corp.local_2026</code>', 'new, put into the existing client-ssl profile', '<strong>yes</strong>'],
      ['<code>websphere-apppreview_accp_internal_https_monitor</code>', 'new', 'no'],
      ['<code>websphere-apppreview_accp_internal_https_pool</code>', 'new (.73/.83:443)', 'no'],
      ['<code>websphere-apppreview_accp_internal_https_vs</code>', 'new on <code>&lt;NEW_VIP&gt;:443</code>', 'no'],
      ['http, serverssl, persistence, client-ssl profiles', 'shared, unchanged', 'no'],
    ])
    + cb('tmsh', `save sys ucs pre_CHG12345.ucs            # backup first, on the ACTIVE member
cd /Internal

create ltm monitor https websphere-apppreview_accp_internal_https_monitor defaults-from /Common/https \\
    ssl-profile /Internal/serverssl-cust-accp-internal-default interval 5 timeout 16 recv RUNNING \\
    send "GET /F5monitorApp.htm HTTP/1.1\\r\\nHost: accapppreview.corp.local\\r\\nConnection: Close\\r\\n\\r\\n"

create ltm pool websphere-apppreview_accp_internal_https_pool load-balancing-mode least-connections-node \\
    monitor websphere-apppreview_accp_internal_https_monitor members add { 10.30.12.73%1:443 10.30.12.83%1:443 }

create ltm virtual websphere-apppreview_accp_internal_https_vs destination <NEW_VIP>%1:443 mask 255.255.255.255 \\
    ip-protocol tcp pool websphere-apppreview_accp_internal_https_pool \\
    profiles add { /Common/f5-tcp-lan /Internal/http-cust-accp-internal-default \\
                   /Internal/serverssl-cust-accp-internal-default { context serverside } \\
                   /Internal/websphere-app_accp_internal_client-ssl { context clientside } } \\
    persist replace-all-with { /Internal/cookie-cust-accp-internal-default-persistence { default yes } } \\
    fallback-persistence /Internal/source_address-cust-accp-internal-default-persistence \\
    source-address-translation { type automap } vlans-enabled vlans add { /Internal/APP-Access }

modify ltm profile client-ssl websphere-app_accp_internal_client-ssl \\
    cert-key-chain replace-all-with { accapp_0 { cert accapp.corp.local_2026 key accapp.corp.local_2026 } }

save sys config                          # auto-sync pushes it to the peer`)
    + co('p', '&#x1F4A1;', 'Option to decouple the two changes', 'Instead of swapping the cert in the shared client-ssl profile right away, create a <strong>new client-ssl profile</strong> (<code>defaults-from</code> the existing one) with the new cert for the preview VS only. The preview can then be tested without touching the existing app; the cert swap of the existing profile becomes a separate, smaller step. Only worth it if the change window for the existing app is a problem.')
    + co('a', '&#x26A0;&#xFE0F;', 'Chain', 'If the CA delivers an intermediate certificate, add <code>chain &lt;bundle&gt;</code> into the cert-key-chain entry &mdash; otherwise clients that do not have the intermediate fail the handshake.')

    + '<h2>Verification</h2>'
    + tbl(['What', 'Command', 'Expected'], [
      ['Members', '<code>show ltm pool /Internal/websphere-apppreview_accp_internal_https_pool members</code>', 'both available'],
      ['VS', '<code>show ltm virtual /Internal/websphere-apppreview_accp_internal_https_vs</code>', 'available'],
      ['SAN on the new VIP', '<code>rdexec 1 openssl s_client -connect &lt;NEW_VIP&gt;:443 -servername accapppreview.corp.local &lt;/dev/null 2&gt;/dev/null | openssl x509 -noout -ext subjectAltName</code>', 'all 5 SANs (older openssl: <code>-text | grep -A1 "Subject Alternative"</code>)'],
      ['Application', '<code>rdexec 1 curl -vk https://&lt;NEW_VIP&gt;/ -H "Host: accapppreview.corp.local"</code>', 'application answers'],
      ['Existing app', '<code>show ltm virtual /Internal/websphere-app_*</code> + openssl on the old VIP', 'UP, new certificate'],
      ['Client', 'functional test by the customer', 'confirmed'],
    ])
    + '<h2>Backout</h2>'
    + '<ol style="margin:0 0 10px 22px"><li>Put the old cert (<code>accapp.corp.local_03122025</code>) back into the existing client-ssl profile.</li>'
    + '<li>Delete the preview VS, pool and monitor (in this order).</li><li>Optionally delete the new cert/key object.</li>'
    + '<li><code>save sys config</code> (auto-sync updates the peer).</li><li>Last resort: restore the UCS backup.</li>'
    + '<li>Verify the existing app is UP and presents the original certificate.</li></ol>'

    + '<h2>Open items checklist</h2>'
    + '<ul style="margin:0 0 10px 22px"><li>New VIP: customer confirms the IP is free (the F5 cannot tell whether an address is used elsewhere)</li>'
    + '<li>Generate CSR and send it to the customer</li><li>Import the signed certificate</li>'
    + '<li>DNS A record for the preview name (customer)</li><li>Change request + window (the cert swap affects the existing app)</li></ul>'

    + '<h2>tmsh lessons from this case</h2>'
    + tbl(['Observation', 'What to do'], [
      ['<code>recursive</code> only walks the current partition', 'on an unfamiliar F5 start with <code>cd /</code>'],
      ['<code>list auth partition</code> showed only Common although Internal/External exist', '<code>list net route-domain</code> is more reliable'],
      ['<code>run util bash</code> from the root <code>/</code> fails', '<code>cd /Common</code> first'],
      ['bash knows nothing about partitions', 'route domain via <code>rdexec &lt;id&gt;</code> / <code>rdsh &lt;id&gt;</code>'],
      ['local resolver on the F5 answers DNS with REFUSED', 'do <code>nslookup</code> from a jump host'],
      ['GUI shows only one partition', 'partition selector (top right) &rarr; <strong>[All]</strong>'],
    ])
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// php2shell — CVE-2026-109618 / -109619 (K000163821)
// ═══════════════════════════════════════════════════════════════════
function pgF5Php2shell() {
  return '<div class="ph"><div class="pt">php2shell &mdash; CVE-2026-109618 / -109619 on BIG-IP</div>'
    + '<div class="ps">Applicability, interim mitigation, how to verify it, after the upgrade. Source: F5 K000163821 (Final).</div>'
    + '<div class="tags">' + tag('tg', 'F5') + tag('tr', 'CVE') + tag('tr', 'TMUI') + tag('ta', 'APM') + tag('tb', 'PHP') + '</div></div>'
    + '<div class="content">'
    + co('p', '&#x2139;&#xFE0F;', 'Marking', '<strong>[F5]</strong> = stated in the F5 article. <strong>[derived]</strong> = own conclusion or only verified in practice. Always re-check the current version of K000163821 &mdash; fixed versions and mitigations can change.')

    + '<h2>1. Am I affected?</h2>'
    + cb('tmsh', `tmsh show sys version
tmsh list sys provision one-line                 # ltm { level nominal }; others "{ }" = level none   [derived]
tmsh list sys provision apm all-properties       # explicit APM level
tmsh list ltm virtual one-line | grep -i access  # virtual servers with an access profile`)
    + tbl(['Vector', 'Condition', 'Auth needed', 'CVSS'], [
      ['APM data plane', 'APM provisioned <strong>and</strong> an access profile on a VS', 'no', '8.1 [F5]'],
      ['Control plane (TMUI)', 'all modules', 'yes', '7.5 [F5]'],
    ])
    + tbl(['', 'Versions [F5]'], [
      ['Vulnerable', '17.1.0&ndash;17.1.3, 17.5.0&ndash;17.5.1, 21.1.0'],
      ['Fixed', '17.1.3.7 / 17.5.1.11 / 21.1.0.4; engineering hotfix on top of 17.1.3.6 and 17.5.1.10'],
    ])

    + '<h2>2. Mitigation until the upgrade</h2>'
    + cb('bash', `cat > /etc/php.ini.d/K000163821.ini << 'EOF'
memory_limit = -1
post_max_size = 8M
upload_max_filesize = 7M
session.upload_progress.enabled = 0
EOF
bigstart restart httpd
bigstart restart httpd_sam        # only with APM — drops webtop sessions   [F5]
# multi-blade (VIPRION): clsh bigstart restart httpd / httpd_sam      [F5]`)
    + '<ul style="margin:0 0 10px 22px"><li>Do it on <strong>every HA peer</strong>. The mitigation does <strong>not survive a TMOS upgrade</strong> [F5].</li>'
    + '<li>Covers the control plane and the APM data plane; restricting access is additional [F5].</li>'
    + '<li>Create the file with the heredoc above, not in vi &mdash; a stray <code>:wq!</code> line inside the file has really been seen [derived].</li></ul>'

    + '<h2>3. Verify the mitigation</h2>'
    + cb('bash', `cat /etc/php.ini.d/K000163821.ini
ls -l --time-style=full-iso /etc/php.ini.d/K000163821.ini
ps -eo pid,lstart,cmd | grep "[h]ttpd -D"        # master httpd must have started AFTER the file mtime
php -i | grep -E "upload_progress.enabled|post_max_size|upload_max_filesize|memory_limit"
zgrep -i -E "php|\\.ini|syntax" /var/log/httpd/httpd_errors*   # ini parser errors`)
    + '<p>Expected: <code>Off</code> / <code>8M</code> / <code>7M</code> / <code>-1</code>. <code>php -i</code> shows the CLI configuration; that httpd reads the same directory is [derived].</p>'
    + cb('bash', `# fix a stray vi line in the file
sed -i '/^:wq!$/d' /etc/php.ini.d/K000163821.ini && bigstart restart httpd`)

    + '<h2>4. Who can reach TMUI / SSH?</h2>'
    + '<p>See <a href="#f5/sec/mgmt-exposure">TMUI / SSH exposure audit</a> &mdash; allow lists, self-IP port lockdown, proof from logs, optional restriction.</p>'

    + '<h2>5. After upgrading to a fixed version</h2>'
    + cb('bash', `php --version                                    # build date 23 Oct 2026
rpm -q php --changelog | grep CVE-2026-109618`)
    + '<ul style="margin:0 0 10px 22px"><li>PHP still reports <strong>5.4.45</strong> &mdash; the fix is backported. Vulnerability scanners will report a <strong>false positive</strong>; evidence: note 5 in K000163821 and K000133035 [F5].</li>'
    + '<li>The <code>.ini</code> disappears with the upgrade and is no longer needed on a fixed version [derived].</li></ul>'
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// TMUI / SSH exposure audit (generic — useful for any management-plane CVE)
// ═══════════════════════════════════════════════════════════════════
function pgF5MgmtExposure() {
  return '<div class="ph"><div class="pt">BIG-IP &mdash; TMUI / SSH exposure audit</div>'
    + '<div class="ps">Who can reach the management plane, proof from the access logs, and how to lock it down safely. Reusable for any management-plane CVE.</div>'
    + '<div class="tags">' + tag('tg', 'F5') + tag('tr', 'Security') + tag('tr', 'TMUI') + tag('tb', 'SSH') + tag('ta', 'Self IP') + '</div></div>'
    + '<div class="content">'

    + '<h2>1. Configuration</h2>'
    + cb('tmsh', `tmsh list sys httpd allow                         # TMUI + iControl REST source allow list
tmsh list sys sshd allow
tmsh list net self one-line | grep allow-service   # port lockdown on self IPs
tmsh list sys management-ip
tmsh list sys management-route`)
    + tbl(['Finding', 'Meaning'], [
      ['<code>All</code> / <code>ALL</code> in an allow list', 'the whitelist is void &mdash; the other entries restrict nothing [derived, confirmed by logs]'],
      ['<code>allow-service all</code> on a self IP', 'TMUI (443) and SSH are reachable from the <strong>data VLANs</strong>, not only management'],
      ['httpd allow', 'only <strong>inbound</strong> access (TMUI, iControl REST). Syslog and NTP are outbound and do not belong there [derived]'],
      ['SNMP, SSH', 'have their own allow lists'],
    ])

    + '<h2>2. Proof from the logs &mdash; who actually connects</h2>'
    + cb('bash', `# the access log is syslog-formatted: first field = month, URI without the method
head -1 /var/log/httpd/ssl_access_log

# client IPs from data networks (all rotations, compressed or not)
zcat -f /var/log/httpd/ssl_access_log* | grep -oE "<prefix>\\.[0-9]+\\.[0-9]+" | sort | uniq -c | sort -rn

# status codes for one IP
zcat -f /var/log/httpd/ssl_access_log* | grep <ip> | awk '{print $(NF-1)}' | sort | uniq -c | sort -rn

# top URIs for one IP
zcat -f /var/log/httpd/ssl_access_log* | grep <ip> | grep -oE '"[^"]*"' | sort | uniq -c | sort -rn | head -15

# successful answers (look for 200 on /mgmt/... or authenticated /tmui/...)
zcat -f /var/log/httpd/ssl_access_log* | grep <ip> | grep '" 200 ' | grep -oE '"[^"]*"' | sort | uniq -c | sort -rn`)
    + tbl(['In the log', 'Meaning [derived]'], [
      ['<code>/QUALYS&lt;number&gt;</code> in the URI', 'Qualys vulnerability scanner'],
      ['<code>/mgmt/tm/util/bash</code>', 'probe for CVE-2022-1388 (iControl REST auth bypass). <strong>200 here would be critical.</strong>'],
      ['200 only on <code>/tmui/login.jsp</code>', 'unauthenticated access to the login page &mdash; reachable, not logged in'],
    ])
    + co('a', '&#x26A0;&#xFE0F;', 'grep -o catches every IP on the line', 'Including the F5\'s own self IP, not just the client. Check a few full lines before drawing conclusions.')
    + '<h3>Live connections to a self IP</h3>'
    + cb('tmsh', `tmsh show sys connection cs-server-addr <self-ip>%<rd> cs-server-port 443`)
    + '<p>With route domains use <code>%RD</code> [derived]. An empty result proves nothing &mdash; it is only a snapshot.</p>'

    + '<h2>3. Restrict access (optional, "in addition" to the fix)</h2>'
    + co('a', '&#x26A0;&#xFE0F;', 'Before you change anything', '&bull; Check in the logs who <strong>legitimately</strong> uses the self IPs (REST automation, monitoring) &mdash; a lockdown would break them.<br>&bull; Leave the <strong>HA self IPs</strong> alone or give them a custom allow-service list &mdash; F5 warns about breaking HA [F5].<br>&bull; Keep an SSH session open and test a new login from the jump host before closing it.')
    + cb('tmsh', `tmsh modify sys httpd allow replace-all-with { <mgmt and jump hosts> }
tmsh modify sys sshd allow replace-all-with { <mgmt and jump hosts> }
tmsh modify net self <name> allow-service none      # only DATA self IPs
tmsh save sys config`)
    + '<h3>Rollback</h3>'
    + cb('tmsh', `tmsh modify net self <name> allow-service all
tmsh modify sys httpd allow add { All }
tmsh modify sys sshd allow add { ALL }
tmsh save sys config`)
    + '</div>';
}

Object.assign(RENDERERS, {
  'f5/ltm/case-preview-vip': pgF5CasePreview,
  'f5/sec/php2shell': pgF5Php2shell,
  'f5/sec/mgmt-exposure': pgF5MgmtExposure,
});

IDX.push(
  { t: 'Case: new HTTPS VIP + SAN certificate', p: 'f5/ltm/case-preview-vip', k: 'new vip preview endpoint san csr certificate client-ssl partition route domain change backout', v: 'New VS/pool/monitor on same servers, CSR with SANs, backout' },
  { t: 'Generate CSR with SAN on F5', p: 'f5/ltm/case-preview-vip', k: 'create sys crypto key gen-csr subject-alternative-name common-name csr', v: 'create sys crypto key <name> key-size 4096 gen-csr … subject-alternative-name "DNS:…"' },
  { t: 'Monitor file test matrix (curl loop)', p: 'f5/ltm/case-preview-vip', k: 'curl loop host header monitor file running http_code matrix', v: 'servers × http/https × file × Host header' },
  { t: 'tmsh partitions: cd / and recursive', p: 'f5/ltm/case-preview-vip', k: 'partition recursive cd / list net route-domain auth partition run util bash', v: 'recursive only walks the current partition' },
  { t: 'php2shell CVE-2026-109618 mitigation', p: 'f5/sec/php2shell', k: 'php2shell cve-2026-109618 cve-2026-109619 k000163821 php.ini httpd mitigation apm tmui', v: '/etc/php.ini.d/K000163821.ini + bigstart restart httpd' },
  { t: 'Scanner false positive PHP 5.4.45', p: 'f5/sec/php2shell', k: 'php 5.4.45 backport false positive scanner rpm changelog', v: 'rpm -q php --changelog | grep CVE' },
  { t: 'TMUI / SSH allow list audit', p: 'f5/sec/mgmt-exposure', k: 'httpd allow sshd allow self ip allow-service port lockdown tmui management', v: 'All in allow list = no whitelist' },
  { t: 'httpd ssl_access_log analysis', p: 'f5/sec/mgmt-exposure', k: 'ssl_access_log qualys mgmt/tm/util/bash cve-2022-1388 tmui login', v: 'Who connects to TMUI, which URIs, status codes' },
);
