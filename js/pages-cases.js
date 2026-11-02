// pages-cases.js — real incident write-ups (anonymised: no people, companies, sites, tickets or real IPs).

(function () {
  const sub = TREE.find(t => t.id === 'cisco').subs.find(s => s.id === 'vpn');
  if (!sub.pages.some(p => p.id === 'case-partner')) sub.pages.push({ id: 'case-partner', label: 'Case: partner tunnel drops' });
})();

function pgCasePartnerVPN() {
  return '<div class="ph"><div class="pt">Case: partner site-to-site tunnel dropping every ~2 hours</div>'
    + '<div class="ps">Cisco ASA (our side) &harr; Palo Alto (partner, behind NAT), IKEv1. Short outages with auto-recovery, "you must have changed something", an unfinished IKEv2 migration on the partner side.</div>'
    + '<div class="tags">' + tag('tp', 'Cisco ASA') + tag('tb', 'Palo Alto') + tag('tb', 'IPsec') + tag('ta', 'IKEv1 / IKEv2') + tag('ta', 'DPD') + tag('tr', 'Incident') + '</div></div>'
    + '<div class="content">'
    + tbl(['Summary', ''], [
      ['Symptom', 'tunnel down for a few minutes, regularly (DPD loss every ~2 h), several sites red in the partner\'s monitoring, recovers by itself'],
      ['Root cause', 'partner side: IKE gateway left on "auto" &rarr; Aggressive Mode; per-host /32 selectors against our subnet selectors; 5 s DPD; leftovers of an IKEv2 attempt'],
      ['Our side', 'no change &mdash; proven with session data, logs and captures'],
      ['Resolution', 'partner set Main Mode and relaxed DPD &rarr; stable. Selector clean-up and a coordinated IKEv2 migration left for a planned change'],
      ['Theory behind it', '<a href="#theory/security/ike-nat">IKE: NAT &amp; aggressive mode</a> &middot; <a href="#cisco/vpn/theory">VPN / IPsec theory</a>'],
    ])
    + '<h2>Story and evidence</h2>'
    + '<p style="color:var(--text2)">Real incident, anonymised. The partner changed their side without telling us; the tunnel became intermittent and their logs showed IKE phase 1 failures in Aggressive Mode ("failed as initiator … cookie …:0000 … timeout").</p>'
    + '<div class="flow">'
    + '<div class="fs"><div class="fsn">1</div><div class="fsb"><div class="fst">What they did</div><p>Switched their gateway to IKEv2 on their own, turned on aggressive mode, changed identity settings &mdash; and defined the traffic selectors <strong>per host (/32)</strong>, while our side protects whole networks (/16 and similar). When it did not come up, they switched back to IKEv1 &mdash; but kept much of the IKEv2 configuration (proposals, identity type, timers). The result was a mix that neither matched the old agreement nor a clean IKEv2 setup.</p>'
    + co('r', '&#x1F3AF;', 'Root cause: three things on the partner side at once', '<strong>1)</strong> IKE gateway left on <strong>"auto"</strong> after an unfinished IKEv2 attempt &mdash; it initiated IKEv1 <strong>Aggressive Mode</strong> (their own log); our gateway drops Aggressive Mode. <strong>2)</strong> <strong>Traffic selectors</strong> did not mirror ours (host /32 entries vs our subnets) &rarr; traffic put into the wrong SA. <strong>3)</strong> <strong>DPD every 5 s</strong> &rarr; dead-peer declared on short hiccups &rarr; tunnel torn down and rebuilt. Nothing was wrong or changed on our side.')
    + '</div></div>'
    + '<div class="fs"><div class="fsn">2</div><div class="fsb"><div class="fst">What it looked like</div>'
    + tbl(['Symptom', 'Explanation'], [
      ['phase 1 timeout as initiator, responder cookie 0', 'our side did not accept their packets (version / mode / ID did not match any config) &rarr; no reply'],
      ['their private IP in the log', 'IP-type identity sent from behind NAT'],
      ['intermittent', 'a repeating cycle &mdash; see below'],
      ['drops around <strong>09:00</strong> and again before <strong>17:00</strong>, a few minutes each, fine the rest of the day', 'typical for a timer (SA lifetime / rekey) or for tunnels re-created when traffic starts after an idle period &mdash; not for a config change (a change breaks it permanently)'],
      ['several countries / sites "down" in their monitoring at once', 'all behind the same tunnel; part of the red was unrelated ports &mdash; separate monitoring noise from real impact'],
      ['partner: "you must have changed something"', 'nobody had &mdash; proven with the session data below'],
      ['no useful network documentation', 'their IP mapping list did not show the NAT or the change'],
    ])
    + '<h3>The cycle that made it "intermittent"</h3>'
    + cb('sequence', `1. partner tries IKEv2 (host /32 selectors)          -> does not come up
2. partner falls back to IKEv1 AGGRESSIVE mode        -> our ASA drops it immediately (aggressive mode disabled)
                                                         = their log: "failed as initiator, aggressive mode … cookie …:0000 … timeout"
3. IKEv1 eventually negotiates                         -> tunnel UP, traffic works for a while
4. DPD (5 s) declares the peer dead on a short hiccup  -> SAs deleted, "Lost Service"
   or traffic hits the wrong (host /32) SA              -> dropped (%ASA-4-402116)
   rebuild: partner tries AGGRESSIVE mode (dropped),    -> minutes of outage until IKEv1 Main Mode
   our ASA tries IKEv2 first (unanswered)                  finally succeeds
5. back to step 1`)
    + co('p', '&#x2139;&#xFE0F;', 'Lifetimes were not the trigger', 'Both sides had phase 1 = 24 h and phase 2 = 8 h. The drops matched <strong>DPD loss</strong> timestamps in the ASA log instead (see the log timeline below). Always check the timers against real log times before blaming them.')
    + '<p>Every "it works again" was just step 3 &mdash; nothing had been fixed. The pattern only becomes visible when you line up <strong>tunnel up/down times</strong> with <strong>rekey lifetimes</strong> and the partner\'s change attempts.</p>'
    + '</div></div>'
    + '<div class="fs"><div class="fsn">3</div><div class="fsb"><div class="fst">How to recognise version / mode mismatch in debug</div>'
    + tbl(['Seen', 'Meaning'], [
      ['IKEv2 packet on an IKEv1-only peer (or v1 on v2-only)', 'ignored or answered with an error such as <code>INVALID_MAJOR_VERSION</code>; often looks like a plain timeout on the other side'],
      ['aggressive mode packet, aggressive mode disabled / not configured', 'dropped, no reply'],
      ['ID payload with an unexpected type/value', 'no matching tunnel-group / profile / phase1 &rarr; dropped or auth failure'],
      ['works only when one side initiates', 'parameters differ per direction &mdash; compare both configs line by line'],
    ])
    + '</div></div>'
    + '<div class="fs"><div class="fsn">4</div><div class="fsb"><div class="fst">Proving it is not your side (took days of discussion)</div>'
    + tbl(['Evidence', 'How to get it'], [
      ['your config did not change', 'config change log / commit history / archive diff for the tunnel since the last working day'],
      ['their packets arrive and are different from the agreement', 'capture on your gateway from their public IP: IKE version, exchange type (aggressive / main / IKE_SA_INIT), ID payload'],
      ['why your side does not answer', 'IKE debug on your gateway filtered on their public IP: "no matching peer / ID", "aggressive mode not allowed", version error'],
      ['it works when the agreed parameters are used', 'a successful SA from the same peer when your side initiates (or from the time before their change)'],
      ['timeline', 'first failure time vs. their change window &mdash; ask them for their change log'],
    ])
    + '<h3>The ASA log of one outage</h3>'
    + cb('ASA syslog (UTC)', `11:00:42  %ASA-5-713120: Group = 203.0.113.104, PHASE 2 COMPLETED
11:01:41  %ASA-4-750003: Local:203.0.113.90:500 Remote:203.0.113.104:500
          IKEv2 Negotiation aborted due to ERROR: Maximum number of retransmissions reached   <- OUR ASA trying IKEv2 first (see capture)
11:03:38  %ASA-6-302016: Teardown UDP connection … 203.0.113.104/500 to 203.0.113.90/500
12:58:56  %ASA-3-713123: Group = 203.0.113.104, IKE lost contact with remote peer,
          deleting connection (keepalive type: DPD)                                         <- DPD loss
12:58:57  %ASA-6-602304: IPSEC: An outbound LAN-to-LAN SA (SPI= 0x…) … has been deleted.
12:58:57  %ASA-6-602304: IPSEC: An inbound LAN-to-LAN SA (SPI= 0x…) … has been deleted.
12:58:57  %ASA-5-713259: Session is being torn down. Reason: Lost Service
12:59:32  %ASA-6-713172: Automatic NAT Detection Status: Remote end IS behind a NAT device
12:59:32  %ASA-6-713905: Floating NAT-T to port 4500                                         <- rebuilt 35 s later`)
    + tbl(['Message', 'Meaning'], [
      ['<code>713123 … lost contact … (keepalive type: DPD)</code>', 'our side sent DPD and got no answer &rarr; declares the peer dead and deletes everything'],
      ['<code>602304 … SA has been deleted</code>, <code>713259 … Lost Service</code>', 'consequence of the DPD loss; the partner only sees "SA delete received from peer" and restarts'],
      ['<code>750003 … IKEv2 … maximum number of retransmissions</code>', 'IKEv2 attempt got no answer. The capture showed these <code>IKE_SA_INIT</code> packets were sent by <strong>our</strong> ASA: with both IKEv1 and IKEv2 enabled for the peer, the ASA as initiator tries IKEv2 first and falls back to IKEv1'],
      ['<code>750001 … Received request to establish an IPsec tunnel; local/remote traffic selector = single address</code>', 'logged when traffic triggers tunnel setup &mdash; the /32 ranges are most likely the <strong>triggering packets</strong>, not a peer proposal. Do not read them as the partner\'s selectors without a capture'],
      ['<code>113019 Session disconnected … Duration 4h:04m … Reason: Lost Service</code>', 'session summary: how long it lived and why it ended'],
      ['later <code>Reason: Peer Terminate</code> / <code>User Requested</code>', 'the <strong>peer</strong> requested the deletion &mdash; not a DPD decision of our side'],
      ['<code>713172</code> / <code>713905</code>', 'new IKE SA: NAT detected on their side, NAT-T on UDP 4500 &mdash; tunnel back'],
    ])
    + '<h3>The partner\'s log of the same outage (Palo Alto system log)</h3>'
    + cb('Palo Alto system log (UTC, newest last)', `06:58:12 … 06:58:42  ike-recv-notify     IKE notification received: INVALID-SPI (11)          (every 6 s)
08:59:55  ike-recv-p2-delete  IPsec SA delete message received from peer. SPI:0x…    (x10)
08:59:55  ike-recv-p1-delete  phase-1 SA delete message received from peer
08:59:55  ike-nego-p1-start   phase-1 negotiation started as INITIATOR, AGGRESSIVE mode.
                              172.16.100.50[500]-203.0.113.90[500] cookie:…:0000000000000000
08:59:56  ike-nego-p1-start   phase-1 negotiation started as RESPONDER, MAIN mode
08:59:56  ike-nego-p1-expire  phase-1 SA is expired (old SA)
09:00:20  ike-nego-p1-succ    phase-1 negotiation succeeded as RESPONDER, MAIN mode.
                              172.16.100.50[4500]-203.0.113.90[4500] … lifetime 86400 Sec.
09:00:27  ike-nego-p1-fail    phase-1 negotiation failed as INITIATOR, AGGRESSIVE mode … Due to timeout.`)
    + tbl(['Lines', 'What it proves'], [
      ['<code>INVALID-SPI</code> notifications at 06:58', 'right after the <strong>previous</strong> teardown (ASA DPD at 06:56): our ASA kept receiving ESP with SPIs it had already deleted &rarr; the partner went on sending into dead SAs, i.e. it did not process (or receive) our delete messages. On the ASA look for messages about ESP with an invalid/unknown SPI at the same times.'],
      ['SA deletes received at 08:59:55', 'the ASA DPD teardown (08:59:56 in the ASA log) &mdash; both logs match within a second'],
      ['p1 start as <strong>initiator, aggressive mode</strong> right after the delete', 'the "auto" gateway does initiate in Aggressive Mode &mdash; contrary to the partner\'s statement'],
      ['p1 start as responder, main mode one second later', 'our ASA initiates in parallel &mdash; both sides race'],
      ['succeeded as <strong>responder</strong>, main mode, port 4500', 'the tunnel came back because <strong>our</strong> ASA initiated it (NAT-T) &mdash; ~25 s'],
      ['failed as initiator, aggressive mode, timeout', 'their own attempt never works: our side drops Aggressive Mode'],
    ])
    + '<h3>Our side: the DPD losses of one day</h3>'
    + cb('ASA syslog, search "DPD" (UTC)', `04:54:41  %ASA-3-713123: IKE lost contact with remote peer, deleting connection (keepalive type: DPD)
06:56:35  %ASA-3-713123: … (keepalive type: DPD)
08:59:56  %ASA-3-713123: … (keepalive type: DPD)
10:59:32  %ASA-3-713123: … (keepalive type: DPD)
12:58:47  %ASA-3-713123: … (keepalive type: DPD)`)
    + co('r', '&#x23F1;&#xFE0F;', 'Every ~2 hours', 'A regular interval is a <strong>timer</strong>, not a random network problem. It did not match the lifetimes the partner reported (24 h / 8 h) &mdash; so ask for everything periodic on their side: IKE/IPsec lifetimes actually in use, tunnel monitor, path monitoring, scheduled jobs/automation. Searching your own log for one keyword (here "DPD") and lining up the timestamps is the fastest way to see such a pattern.')
    + '<h3>The partner\'s IKE SA view</h3>'
    + cb('Palo Alto: IKE Info for the gateway', `NAME        GATEWAY  ROLE  MODE  ALGORITHM          CREATED          EXPIRES
<ike-gw>    1        Init  Aggr  PSK/DH5/AES/SHA1   Jun.12 07:08:10  Jun.13 07:08:10`)
    + co('t', '&#x1F4A1;', 'Ask for the partner\'s system log early', 'One screenshot of their IKE system log around the outage answered more than days of discussion: their mode, who rebuilt the tunnel, and that SAs were out of sync before. Ask for it in the first request.')
    + '<h3>Reading the IKE capture (Wireshark)</h3>'
    + cb('capture (simplified)', `13:14:10  OUR-ASA -> PEER  IKE_SA_INIT MID=00 Initiator Request     <- IKEv2, no answer
13:14:10  OUR-ASA -> PEER  Identity Protection (Main Mode)          <- IKEv1 Main Mode
13:14:16  PEER -> OUR-ASA  Identity Protection (Main Mode)          <- peer answers v1
13:14:16  …               Identity Protection (Main Mode) x6       <- v1 phase 1 done
13:14:23  OUR-ASA -> PEER  IKE_SA_INIT MID=00 Initiator Request     <- v2 retries keep going,
13:14:38  OUR-ASA -> PEER  IKE_SA_INIT …                               never answered
13:15:07  OUR-ASA -> PEER  IKE_SA_INIT …`)
    + tbl(['Wireshark "Info"', 'Protocol'], [
      ['<code>IKE_SA_INIT</code>, <code>IKE_AUTH</code>, <code>CREATE_CHILD_SA</code>, <code>INFORMATIONAL</code>', 'IKEv2'],
      ['<code>Identity Protection (Main Mode)</code>', 'IKEv1 phase 1, main mode'],
      ['<code>Aggressive</code>', 'IKEv1 phase 1, aggressive mode'],
      ['<code>Quick Mode</code>', 'IKEv1 phase 2'],
    ])
    + co('p', '&#x1F4A1;', 'Check who sends what', 'Look at the <strong>source</strong> column before concluding who is "trying IKEv2". Here it was our own ASA. If the partner does not run IKEv2 yet, an IKEv2 entry in your crypto map only adds unanswered retries to every re-establishment: <code>show run crypto map | include &lt;seq&gt;|ikev2</code>.')
    + '<h3>Traffic in the wrong SA: %ASA-4-402116</h3>'
    + cb('ASA syslog', `%ASA-4-402116: IPSEC: Received an ESP packet (SPI= 0xC06BBCE9) from 203.0.113.104 to 203.0.113.90.
The decapsulated inner packet doesn't match the negotiated policy in the SA.
The packet specifies its destination as 10.200.65.2, its source as 10.30.154.64, and its protocol as udp.
The SA specifies its local proxy as 198.51.100.151/255.255.255.255/ip/0
and its remote proxy as 10.200.66.6/255.255.255.255/ip/0.`)
    + '<p>The partner encrypted a packet between two <strong>subnets</strong> (10.30.x &harr; 10.200.65.x) into the <strong>host-to-host</strong> SA. The ASA checks every decrypted packet against the SA proxies and drops it. This message is proof of a <strong>selector mismatch on the sending side</strong>. Our selectors for reference: local 198.51.100.144/28 + 10.30.0.0/16, remote 10.200.64.0/22.</p>'
    + '<h3>Day 2: one DPD teardown, then peer-initiated deletes</h3>'
    + cb('ASA syslog (UTC)', `07:07:42  %ASA-3-713123: IKE lost contact with remote peer, deleting connection (keepalive type: DPD)
07:07:42  %ASA-5-713259: Session is being torn down. Reason: Lost Service
07:07:42  %ASA-4-113019: Session disconnected. Session Type: LAN-to-LAN, Duration: 4h:04m:45s,
          Bytes xmt: 4380726157, Bytes rcv: 455083664, Reason: Lost Service
07:07:42  %ASA-6-602304: IPSEC: An outbound LAN-to-LAN SA (SPI= 0x…) … has been deleted.   (many)
07:07:42  %ASA-6-602304: IPSEC: An inbound LAN-to-LAN SA (SPI= 0x…) … has been deleted.    (many)
07:07:42  %ASA-5-750001: Local:203.0.113.90:500 Remote:203.0.113.104:500 IKEv2 Received request to
          establish an IPsec tunnel; local traffic selector = 10.30.43.7-10.30.43.7
          remote traffic selector = 10.200.65.3-10.200.65.3                      <- single hosts
07:07:42  %ASA-5-750001: … local TS = 10.40.155.151-10.40.155.151, remote TS = 10.200.65.7-10.200.65.7
07:07:42  %ASA-5-713041: IKE Initiator: New Phase 1, IKE Peer 203.0.113.104
          local Proxy Address 10.40.155.0, remote Proxy Address 10.200.64.0       <- subnets (IKEv1)
07:08:06  %ASA-5-713119: PHASE 1 COMPLETED
07:08:06  %ASA-5-713041: IKE Initiator: New Phase 2, local Proxy 100.96.0.0, remote Proxy 10.200.64.0
07:09:56  %ASA-4-750003: IKEv2 Negotiation aborted due to ERROR: Maximum number of retransmissions reached
later     … Connection terminated … Reason: Peer Terminate
          … Session is being torn down. Reason: User Requested`)
    + tbl(['Observation', 'Reading'], [
      ['tunnel is built fine (phase 1 + 2 complete in ~24 s)', 'no missing tunnel-group, no basic NAT-T reachability problem'],
      ['one teardown by <strong>our DPD</strong>', 'the partner stopped answering DPD for a moment'],
      ['IKEv1 rebuild with <strong>subnet</strong> proxies next to IKEv2 entries with <strong>single-host</strong> selectors', 'mixed IKE behaviour during recovery; see the 750001 / 750003 notes above for how to tell who sends what'],
      ['later drops: <code>Peer Terminate</code> / <code>User Requested</code>', 'the <strong>partner</strong> asked to delete the tunnel &mdash; not our DPD'],
    ])
    + '<p><strong>Working theory:</strong> something on the partner side periodically resets its IKE/IPsec state; after that our ASA no longer gets valid DPD answers (and drops the tunnel), or the partner deletes it itself. Questions for the partner:</p>'
    + '<ul style="margin:0 0 10px 22px"><li>rekey at fixed intervals?</li><li>tunnel monitor / path monitoring action?</li><li>automation or a scheduled clear/restart of the tunnel?</li><li>stale-SA cleanup?</li><li>a still active IKEv2 / proxy-ID object for this peer?</li></ul>'
    + '<h3>What to request from the partner (Palo Alto)</h3>'
    + cb('request', `Please check the logs around the exact DPD loss timestamps (UTC):
  - <date> 08:59:56Z
  - <date> 12:58:47Z
We need to know whether the gateway received DPD/IKE packets from our peer and whether it replied.
Please provide:
  - ikemgr.log around those timestamps
  - IKE / IPsec SA lifetime values
  - DPD settings
  - tunnel monitor settings
  - NAT-T settings
  - IKE gateway version / exchange mode
  - whether any IKEv2 rekey/migration attempt happens at those times
  - whether the IKE daemon, dataplane or HA/path monitoring had any event at those times
  - routing / policy-based forwarding for the VPN traffic and the proxy-IDs (traffic selectors)
For the next expected outage, simultaneously on the partner side:
  1. packet capture (receive / transmit / drop) for both peer addresses on UDP/500 and UDP/4500
  2. ikemgr.log with IKE debug enabled, at least 60 s before and after our DPD event
  3. the IKE pcap from the IKE debug`)
    + '<h3>Where is the problem? Capture on both ends at the same time</h3>'
    + tbl(['Partner\'s capture during the outage shows', 'Problem is in'], [
      ['our UDP/4500 IKE/DPD packets arrive, <strong>no reply</strong> leaves', 'partner\'s IKE processing (daemon, config, CPU)'],
      ['reply leaves, but our ASA never receives it', 'return path: NAT, upstream firewall, ISP'],
      ['our packets <strong>never arrive</strong>', 'forward path between the two gateways'],
    ])
    + '<p>On Palo Alto: packet capture with receive / transmit / drop stages filtered on both peer addresses and UDP 500/4500, plus <code>ikemgr.log</code> with IKE debug and the IKE pcap, for at least 60 s around the expected outage.</p>'
    + co('a', '&#x26A0;&#xFE0F;', 'Trust the logs, not the description', 'The partner\'s answer was "IKE mode auto &mdash; accepts both, but initiates in main" while their own log said <em>aggressive mode</em> as initiator. When a statement contradicts a log line, ask for the log, not for another statement.')
    + '<h3>Targeted VPN logging on the ASA (instead of a full debug)</h3>'
    + '<p>With no syslog access and a busy box, the default buffer was overwritten within minutes. A message list keeps only the IKE/IPsec messages, in a bigger buffer, and streams them to the SSH session (saved to a file on the jump host):</p>'
    + cb('Cisco ASA', `logging list VPN_DEBUG message 713001-713905      ! IKEv1 …
logging list VPN_DEBUG message 713907-715999      ! … without 713906 (very chatty on a busy NAT-T tunnel)
logging list VPN_DEBUG message 750001-751999      ! IKEv2 (e.g. 750001, 750003)
logging list VPN_DEBUG message 602303-602304      ! IPsec SA created / deleted
logging list VPN_DEBUG message 402114-402120      ! ESP with invalid SPI / not matching the SA policy (402116)
logging list VPN_DEBUG message 113019             ! session disconnected + duration + reason
logging buffer-size 4194304                       ! 4 MB buffer
logging buffered VPN_DEBUG
logging monitor VPN_DEBUG
terminal monitor                                  ! stream to this SSH session; log the session to a file

! afterwards
terminal no monitor
no logging monitor VPN_DEBUG
show logging | include 713123|713259|750003|402116`)
    + co('a', '&#x26A0;&#xFE0F;', 'Mind the load', 'Keep the list narrow and remove the monitor logging when done &mdash; on a busy firewall a broad list (or debug level) floods the session and costs CPU. Restore the previous <code>logging buffered</code> / <code>logging monitor</code> settings.')
    + '<h3>The commands that settled it (ASA)</h3>'
    + cb('Cisco ASA', `capture VA match ip any host 10.30.68.5          # during the outage: "Capturing - 0 bytes" = no traffic in the tunnel
show capture VA

show vpn-sessiondb l2l filter ipaddress 203.0.113.104
  Protocol     : IKEv1 IPsecOverNatT
  Encryption   : IKEv1: (1)AES128  IPsecOverNatT: (10)AES128
  Hashing      : IKEv1: (1)SHA1    IPsecOverNatT: (10)SHA1
  Login Time   : 12:59:32 UTC        <- tunnel was (re)built right at the reported outage
  Duration     : 0h:15m:51s
show clock                                         # compare with Login Time

show crypto ipsec sa peer 203.0.113.104 | include ident|pkts|settings
  local ident  (10.30.0.0/255.255.0.0)   remote ident (10.200.64.0/255.255.252.0)
  #pkts encaps: 142271  #pkts decaps: 82780        <- both directions counting
  in use settings ={L2L, Tunnel, NAT-T-Encaps, PFS Group 5, IKEv1, }`)
    + co('t', '&#x1F50E;', 'Login Time is the key evidence', '<code>Login Time</code> / <code>Duration</code> in <code>show vpn-sessiondb</code> tell you exactly when the tunnel was last (re)established. If that matches the outage and your change log is empty, the tunnel went down and was rebuilt &mdash; without anyone touching your side.')
    + co('a', '&#x26A0;&#xFE0F;', 'Many SAs, easy to misread', 'With ten local subnets there are ten SA blocks per peer. Filter on one ident before reading "in use settings" &mdash; it is easy to look at the wrong block (e.g. think it runs IKEv2 when it is IKEv1).')
    + '<p>Send the capture summary + debug lines + timeline in one message. Facts from your own gateway end the "it is your firewall" discussion much faster than describing the config.</p>'
    + '</div></div>'
    + '<div class="fs"><div class="fsn">5</div><div class="fsb"><div class="fst">Resolution</div>'
    + '<p>Interim step on our side: less strict DPD on the ASA so that it does not tear the tunnel down on short hiccups:</p>'
    + cb('Cisco ASA', `tunnel-group 203.0.113.104 ipsec-attributes
 isakmp keepalive threshold 30 retry 5`)
    + '<p>Result: the drops still happened, only a few minutes later than before &mdash; expected, it only extends the time before the peer is declared dead. It confirmed that DPD loss was a symptom, not the cause.</p>'
    + '<p>Recommendation sent to the partner:</p>'
    + cb('message', `The IKE gateway on your side is configured with IKE mode "auto", which initiates
IKEv1 Aggressive Mode as the first option. Our gateway does not permit Aggressive
Mode - hence the timeout and the log you see. No changes are required on our side.

Recommended: switch the gateway to IKEv2, which is already supported and configured
on our side for this peer.
Alternatively, if IKEv1 must be kept, set the IKE mode explicitly to Main Mode.`)
    + '<p>Follow-up hint sent: align the traffic selectors with our crypto ACL (one entry per our ACL line, no /32 shortcuts) and the timers with our policy (IKEv1: AES, SHA, DH 5, lifetime 86400) &mdash; or, better, do the IKEv2 migration jointly under a proper change request.</p>'
    + '<p>Outcome: the incident was lowered to low priority (short drops with auto-recovery, impact only on monitoring, no user complaints). The partner set <strong>Main Mode</strong> and adjusted <strong>DPD</strong>; the VPN has been stable since. The selector clean-up and the IKEv2 migration (needs a change request and an agreed weekend window with engineers on both sides) were left for later.</p>'
    + '<p>The partner\'s management still asked "did you change anything on your side?" &mdash; closing answer: the likely trigger was the partner\'s IKEv2 attempt with different selectors, and the gateway left on "auto" (occasional Aggressive Mode, not supported on our side); our side accepts IKEv1 and IKEv2; the migration needs a coordinated change with agreed parameters and matching selectors.</p>'
    + co('a', '&#x26A0;&#xFE0F;', 'DPD mismatch alone can drop tunnels', 'Very aggressive DPD on one side (short interval, few retries) tears the SA down on a short packet loss, while the other side still uses it &rarr; one-way traffic until the next rekey. Compare DPD interval / retries on both sides (ASA: <code>isakmp keepalive threshold … retry …</code> in the tunnel-group).')
    + '</div></div>'
    + '<div class="fs"><div class="fsn">6</div><div class="fsb"><div class="fst">Fix and lesson</div>'
    + '<ul style="margin:0 0 6px 20px"><li>Agree <strong>one</strong> parameter set in writing and have both sides fill it: IKE version, mode, auth (PSK/cert), local + remote IKE ID (type and value), public IPs (after NAT), phase 1 and 2 proposals, lifetimes, DPD, NAT-T, PFS, protected subnets.</li>'
    + '<li>Ask the partner for their <strong>current running config</strong> of the tunnel (sanitised), not their intention.</li>'
    + '<li>Never leave mode/version on <strong>auto</strong> for a site-to-site peer &mdash; set exactly what was agreed (version, Main Mode, proposals).</li>'
    + '<li>Keep <strong>DPD</strong> reasonable on both sides (seconds-level DPD turns every short hiccup into a full teardown) and align lifetimes.</li>'
    + '<li>Collect logs <strong>off the box</strong>: the local buffer on a busy firewall overwrites within minutes. Without syslog access, save a terminal-monitor session to a file on the jump host and run a capture on the box.</li>'
    + '<li>Answer the partner\'s open questions explicitly in one written summary (trigger, what was checked, next step) &mdash; otherwise the same question comes back a month later.</li>'
    + '<li>Take the chance to retire weak parameters: this tunnel still ran IKEv1 + AES128/SHA1 + DH group 5 &mdash; target IKEv2, AES-GCM, DH 19/20.</li>'
    + '<li>An IKE version migration is a <strong>synchronised event</strong>, not a one-sided experiment: agreed window, both sides online, same new parameter set, rollback plan &mdash; and leftovers of the other version removed completely.</li></ul>'
    + '</div></div>'
    + '</div>'
    + '</div>';
}

RENDERERS['cisco/vpn/case-partner'] = pgCasePartnerVPN;
IDX.push(
  { t: 'ASA logging list for VPN troubleshooting', p: 'cisco/vpn/case-partner', k: 'asa logging list message 713001 715999 750001 602303 402116 113019 logging buffered monitor terminal monitor buffer-size', v: 'Only IKE/IPsec messages, bigger buffer, streamed to SSH' },
  { t: 'Case: partner tunnel drops every 2 hours (ASA <-> Palo Alto)', p: 'cisco/vpn/case-partner', k: 'case incident partner tunnel drops asa palo alto aggressive mode dpd selectors ikev2 migration', v: 'Full incident write-up with logs from both sides' },
);

// ═══════════════════════════════════════════════════════════════════
// Case: ASA multi-context — packet-tracer shows another context's route and ACL
// ═══════════════════════════════════════════════════════════════════
(function () {
  const sub = TREE.find(t => t.id === 'cisco').subs.find(s => s.id === 'asa');
  if (!sub.pages.some(p => p.id === 'case-multicontext')) sub.pages.push({ id: 'case-multicontext', label: 'Case: packet-tracer across contexts' });
})();

const ASA_MC = 'cisco/asa/case-multicontext';
defCmds(ASA_MC, [
  { grp: 'system', lang: 'ASA (system context)', cmd: 'show context', d: 'contexts, their interfaces, config URLs', tags: ['cisco-asa', 'asa-multicontext'], k: 'list contexts which contexts exist where am i multi-context' },
  { grp: 'system', lang: 'ASA (system context)', cmd: 'changeto context <name>', d: 'switch to a context', tags: ['cisco-asa', 'asa-multicontext'], k: 'switch context go into context' },
  { grp: 'system', lang: 'ASA (system context)', cmd: 'changeto system', d: 'back to the system context', tags: ['cisco-asa', 'asa-multicontext'], k: 'leave context back to system admin' },
  { grp: 'context', lang: 'ASA (in a context)', cmd: 'show nameif', d: 'interfaces of THIS context', tags: ['cisco-asa', 'asa-multicontext'], k: 'which interfaces does this context have interface not found egress ifc belongs to another context' },
  { grp: 'context', lang: 'ASA (in a context)', cmd: 'packet-tracer input <ifc> tcp <src> 12345 <dst> 443 detailed', d: 'simulate a packet through the policy', tags: ['cisco-asa'], k: 'why is the packet dropped trace flow simulate acl nat route drop' },
  { grp: 'context', lang: 'ASA (in a context)', cmd: 'show run access-group', d: 'which ACL is applied where', tags: ['cisco-asa'], k: 'acl applied to interface access-group' },
  { grp: 'context', lang: 'ASA (in a context)', cmd: 'show run access-list <acl> | include <dst>', d: 'is the destination in the ACL?', tags: ['cisco-asa'], k: 'host missing in acl rule exists permit' },
  { grp: 'context', lang: 'ASA (in a context)', cmd: 'show run object id <name>', d: 'show one object', tags: ['cisco-asa'], k: 'object network range host group contents' },
  { grp: 'context', lang: 'ASA (in a context)', cmd: 'show route <dst>', d: 'route used for a destination', tags: ['cisco-asa'], k: 'next hop egress interface routing lookup' },
]);

function pgCaseASAMultiContext() {
  return caseRender({
    page: ASA_MC,
    title: 'Case: ASA packet-tracer &ldquo;sees&rdquo; another context',
    subtitle: 'Multi-context ASA: a VPN context hands traffic to a customer firewall context. packet-tracer in the VPN context showed an egress interface and an ACL rule that do not exist in that context &mdash; and a drop caused by a missing host in the <em>other</em> context.',
    tags: [['tp', 'Cisco ASA'], ['tb', 'Multi-context'], ['ta', 'packet-tracer']],
    summary: [
      ['Symptom', 'traffic from the partner to some hosts dropped; packet-tracer in the VPN context: drop with the egress interface <code>backbone</code>'],
      ['Cause', 'the destination hosts were missing in the ACL / object of the <strong>firewall</strong> context'],
      ['Fix', 'host range added as an object to the firewall-context policy'],
    ],
    problem: '<p>Traffic from a partner VPN to some internal hosts was dropped, to others it worked. packet-tracer in the VPN context reported a drop on transmit towards an interface that the VPN context does not have, and for a working host it showed an ACL rule that is not in the VPN context\'s configuration.</p>',
    environment: tbl(['Item', 'Value'], [
      ['Platform', 'Cisco ASA in multiple-context mode'],
      ['Path', 'cascaded contexts: <strong>VPN context</strong> (terminates the partner tunnel) &rarr; <strong>firewall context</strong> of the customer (security policy) &rarr; backbone'],
      ['Connection between contexts', 'shared / internal interfaces'],
    ]),
    investigation: [
      { title: 'Interfaces of the VPN context', body: cb('ASA (vpn context)', `vpn# show nameif
Interface              Name     Security
Ethernet1/15.74        IA       90
Ethernet1/16.1013      ID403    90
Ethernet1/16.1626      VA       90          <- no "backbone" here`) },
      { title: 'packet-tracer for a failing host: route via "backbone"', dead: true, body: cb('ASA (vpn context)', `Phase: 17
Type: INPUT-ROUTE-LOOKUP
Subtype: Resolve Egress Interface
Result: ALLOW
Additional Information:
Found next-hop 192.0.2.134 using egress ifc  backbone     <- interface of ANOTHER context
…
Result: … drop`) + '<p>Looked like a routing problem in the VPN context &mdash; it was not.</p>' },
      { title: 'packet-tracer for a working host', body: cb('ASA (vpn context)', `Phase: 17
Type: ACCESS-LIST
Subtype: log
Result: ALLOW
Additional Information:
Forward Flow based lookup yields rule:
 in  id=0x…, priority=12, domain=permit, deny=false
     src ip/id=10.200.66.1, mask=255.255.255.255, port=0
     dst ip/id=10.112.114.56, mask=255.255.255.252, port=443     <- rule NOT in the vpn context config
     input_ifc=any, output_ifc=any`) + '<p>"Where does this context take a /30 on port 443 from, when it is not in its config?" &mdash; it is the rule of the <strong>firewall context</strong>.</p>' },
      { title: 'Fix in the firewall context', body: cb('ASA (firewall context)', `fw# show run object id HOSTS_10.112.114.1-59
object network HOSTS_10.112.114.1-59
 range 10.112.114.1 10.112.114.59
! object referenced in the access rule for the partner traffic`) },
    ],
    commandGroups: { system: 'System / admin context', context: 'Inside a context' },
    rootCause: [
      { src: 'documented', text: 'The destination hosts were missing in the object / access rule of the <strong>firewall</strong> context; adding the host range fixed the traffic.' },
      { src: 'derived', text: 'With cascaded contexts the packet leaves the VPN context through an internal/shared interface and is classified into the next context. The packet-tracer output contained phases evaluated <strong>after the hand-off</strong> (route lookup and access rule of the next context) &mdash; which is why the egress interface and the ACL rule were not in the VPN context\'s configuration.' },
      { src: 'derived', text: 'For the failing hosts the firewall context had no matching rule, so the trace did not end in a clean "ACL drop" there but in a drop on transmit towards the backbone &mdash; a misleading place for a missing ACL entry.' },
    ],
    resolution: '<p>Host range added as an object to the firewall-context access rule for the partner traffic.</p>'
      + co('t', '&#x1F4A1;', 'Reading packet-tracer on a multi-context ASA', 'Before trusting a phase, ask: <strong>which context does it belong to?</strong> Compare interface names with <code>show nameif</code> and rules with <code>show run access-list</code> of each context. If something is not in "your" context, the trace has crossed into the next one.'),
    rollback: '<p>Remove the added object from the access rule (or the rule entry) in the firewall context.</p>',
    lessons: [
      'A drop shown in one context can be caused by the policy of the next one &mdash; trace in <strong>each</strong> context along the path.',
      'Compare a failing host with a working one: the difference in the trace (here an access rule vs. a route to the backbone) points to the missing piece.',
      'Interface and rule names that are not in <code>show nameif</code> / the context config are the hint that the trace crossed a context boundary.',
    ],
  });
}

RENDERERS[ASA_MC] = pgCaseASAMultiContext;
