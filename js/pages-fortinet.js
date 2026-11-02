// pages-fortinet.js — built-in pages from Mirek's work notes (FortiGate VDOM, troubleshooting, IPsec).
// Hostnames, VDOM/interface/tunnel names and IPs replaced with neutral examples (public repository).
// Commands are unchanged.

// ═══════════════════════════════════════════════════════════════════
// FortiGate — troubleshooting toolbox
// ═══════════════════════════════════════════════════════════════════
function pgFGTshoot() {
  return '<div class="ph"><div class="pt">FortiGate &mdash; Troubleshooting toolbox</div>'
    + '<div class="ps">VDOMs, interfaces, ping with source, routing table, debug flow and the packet sniffer</div>'
    + '<div class="tags">' + tag('ta', 'Fortinet') + tag('ta', 'FortiGate') + tag('tb', 'VDOM') + tag('tr', 'debug flow') + tag('tr', 'sniffer') + '</div></div>'
    + '<div class="content">'

    + '<h2>VDOMs &mdash; get into the right virtual firewall</h2>'
    + cb('FortiOS CLI', `fw01a $ config vdom
fw01a (vdom) $ edit ?            # lists VDOMs: VDOM-A  Prod-FW  Test-FW  root
fw01a (vdom) $ edit VDOM-A
current vf=VDOM-A:2
fw01a (VDOM-A) $                 # every command now runs inside this VDOM

config global                     # global settings (interfaces, HA, admins) — from the top level
end                               # leave the VDOM / global context`)
    + co('a', '&#x26A0;&#xFE0F;', 'Wrong VDOM = wrong answers', 'Routing table, policies, sessions and VPN tunnels are per VDOM. If a tunnel or route "does not exist", check the prompt first.')

    + '<h2>Interfaces</h2>'
    + cb('FortiOS CLI', `diagnose netlink interface list          # kernel view of all interfaces in the VDOM (index, MTU, flags)
diagnose netlink interface list TUN_PARTNER
get system interface physical            # physical ports: link, speed, duplex (global)
show system interface WAN-A              # configuration`)
    + cb('output (shortened)', `if=WAN-A family=00 type=1 index=73 mtu=1500 ... flags=up broadcast run promsic multicast
if=TUN_PARTNER family=00 type=768 index=98 mtu=1420 ... flags=up p2p run noarp multicast`)
    + tbl(['Field', 'Meaning'], [
      ['<code>type=1</code>', 'Ethernet (physical / VLAN / aggregate)'],
      ['<code>type=768</code>, <code>p2p</code>, <code>noarp</code>', 'IPsec tunnel interface &mdash; MTU 1420 because of ESP overhead'],
      ['<code>type=772</code>, <code>loopback</code>', 'the VDOM\'s own loopback (interface named like the VDOM)'],
      ['<code>naf.*</code>, <code>l2t.*</code>, <code>ssl.*</code>', 'internal helper interfaces (NAT64/NAT46, L2TP, SSL-VPN) &mdash; ignore'],
      ['<code>flags=up … run</code>', 'admin up and running'],
    ])

    + '<h2>Ping from a specific source</h2>'
    + cb('FortiOS CLI', `execute ping-options source 10.1.60.23     # source IP must be on this FortiGate (VDOM)
execute ping 198.51.100.247
execute ping-options view-settings         # check what is set
execute ping-options reset                 # back to defaults
execute traceroute-options source 10.1.60.23
execute traceroute 198.51.100.247`)
    + co('p', '&#x2139;&#xFE0F;', 'Why source matters', 'Without a source the FortiGate uses the egress interface IP, which usually does not match the IPsec phase 2 selectors or the remote side\'s policy &mdash; the ping fails even though real traffic would work (or the other way round).')

    + '<h2>Routing</h2>'
    + cb('FortiOS CLI', `get router info routing-table all               # full RIB
get router info routing-table details 198.51.100.247   # which route wins for one destination
get router info routing-table database          # also inactive / backup routes
diagnose firewall proute list                   # policy routes (they beat the routing table)`)
    + cb('output', `S*  0.0.0.0/0 [10/0] via 100.64.20.249, WAN-A, [1/0]
S   198.51.100.0/24 [10/0] via TUN_PARTNER tunnel 203.0.113.83, [1/0]`)
    + '<p>Format: <code>[distance/metric]</code>, then next-hop and interface, <code>[priority/weight]</code>. Lower distance wins; with equal distance, lower priority wins.</p>'

    + '<h2>Debug flow &mdash; why is a packet dropped / where does it go</h2>'
    + cb('FortiOS CLI', `diagnose debug reset
diagnose debug flow filter clear
diagnose debug flow filter addr 198.51.100.247     # or: saddr / daddr / port / proto
diagnose debug flow show function-name enable
diagnose debug flow show console enable
diagnose debug console timestamp enable
diagnose debug flow trace start 20                  # number of packets to trace
diagnose debug enable
# … generate traffic …
diagnose debug disable
diagnose debug reset`)
    + tbl(['Message in the trace', 'Meaning'], [
      ['<code>find a route: … via WAN-A</code>', 'routing decision &mdash; check the egress interface'],
      ['<code>Allowed by Policy-12</code>', 'matched firewall policy ID 12'],
      ['<code>Denied by forward policy check (policy 0)</code>', 'no policy matched &rarr; implicit deny'],
      ['<code>reverse path check fail, drop</code>', 'RPF: no route back to the source via the ingress interface'],
      ['<code>enter IPsec interface TUN_PARTNER</code>', 'packet goes into the tunnel'],
      ['<code>SNAT … / DNAT …</code>', 'NAT applied (VIP / IP pool / interface NAT)'],
    ])
    + co('a', '&#x26A0;&#xFE0F;', 'Always disable', 'Leave the box with <code>diagnose debug disable</code> + <code>diagnose debug reset</code>. Debug output on a busy firewall costs CPU.')

    + '<h2>Packet sniffer</h2>'
    + cb('FortiOS CLI', `diagnose sniffer packet any "host 10.1.60.23 and port 10051" 4
diagnose sniffer packet TUN_PARTNER "host 10.1.60.23" 4 100     # 100 packets, then stop
diagnose sniffer packet any "host 10.1.60.23 and port 10051" 6 0 l   # verbosity 6 + local time → convertible to pcap`)
    + tbl(['Verbosity', 'Shows'], [
      ['1', 'IP headers'], ['4', 'IP headers <strong>+ interface name and direction</strong> &mdash; the most useful one'],
      ['5', 'IP headers + IP payload, with interface name'],
      ['6', 'headers + full Ethernet frame, with interface name &mdash; convertible to pcap for Wireshark (fgt2eth script)'],
    ])
    + '<p>Filter syntax is tcpdump/BPF: <code>host</code>, <code>net 10.0.0.0/8</code>, <code>port</code>, <code>tcp</code>, <code>and / or / not</code>. Port 10051 = Zabbix server/proxy trapper.</p>'
    + co('t', '&#x1F50E;', 'Reading verbosity 4', 'Each line is <code>time interface in|out src -> dst: flags</code>. Follow one SYN through the interfaces: where it comes <strong>in</strong>, where it goes <strong>out</strong>. If the last <code>out</code> is a physical/underlay port instead of the tunnel, routing is wrong (see the case on the <a href="#fortinet/vpn/ipsec">IPsec VPN</a> page).')
    + co('p', '&#x2139;&#xFE0F;', '"pcap_lookupnet: … no IPv4 address assigned"', 'Shown when sniffing on a tunnel interface without an IP. It is only a warning &mdash; the capture still runs. If nothing appears, the traffic really is not entering the tunnel.')
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// FortiGate — IPsec VPN
// ═══════════════════════════════════════════════════════════════════
function pgFGIPsec() {
  return '<div class="ph"><div class="pt">FortiGate &mdash; IPsec VPN</div>'
    + '<div class="ps">Route-based IPsec: status, counters, debug &mdash; and the classic "traffic goes to the underlay instead of the tunnel"</div>'
    + '<div class="tags">' + tag('ta', 'Fortinet') + tag('ta', 'FortiGate') + tag('tb', 'IPsec') + tag('tb', 'IKEv2') + tag('tr', 'Routing') + '</div></div>'
    + '<div class="content">'

    + '<h2>Status in 3 commands</h2>'
    + cb('FortiOS CLI', `get vpn ipsec tunnel summary                  # one line per tunnel: selectors up, rx/tx
diagnose vpn ike gateway list name TUN_PARTNER # phase 1 (IKE SA)
diagnose vpn tunnel list name TUN_PARTNER      # phase 2 (IPsec SAs, selectors, counters)`)
    + cb('get vpn ipsec tunnel summary', `'TUN_PARTNER' 203.0.113.83:4500  selectors(total,up): 5/4  rx(pkt,err): 0/0  tx(pkt,err): 0/0`)
    + co('a', '&#x26A0;&#xFE0F;', 'selectors 5/4', 'One of five phase 2 selectors is <strong>down</strong>. Compare the phase 2 subnets on both sides (<code>show vpn ipsec phase2-interface</code>) &mdash; they must mirror each other exactly.')
    + cb('diagnose vpn ike gateway list name TUN_PARTNER', `name: TUN_PARTNER
version: 2                                     <- IKEv2
interface: WAN-A 73
addr: 100.64.20.252:4500 -> 203.0.113.83:4500  <- local -> peer, 4500 = NAT-T
created: 37s ago                               <- keeps resetting? → phase 1 flapping
transport: TCP                                 <- IKE/ESP over TCP (FortiOS 7.2+), not UDP
IKE SA: created 1/1
IPsec SA: created 1/1`)

    + '<h2>Counters &mdash; who is not answering?</h2>'
    + cb('FortiOS CLI', `diagnose vpn tunnel list name TUN_PARTNER | grep pkts`)
    + cb('output', `  dec:pkts/bytes=0/0, enc:pkts/bytes=0/0
  dec:pkts/bytes=0/0, enc:pkts/bytes=2/1176
  dec:pkts/bytes=0/0, enc:pkts/bytes=0/0
  dec:pkts/bytes=1/60, enc:pkts/bytes=13168/14907792    <- we send a lot, get (almost) nothing back`)
    + tbl(['enc (sent)', 'dec (received)', 'Conclusion'], [
      ['0', '0', 'traffic does not reach the tunnel &rarr; local routing / policy / selector'],
      ['grows', '0', 'we encrypt and send, nothing returns &rarr; <strong>remote side</strong>: their routing back, policy, selectors, NAT'],
      ['0', 'grows', 'remote sends, we do not answer &rarr; local policy (tunnel &rarr; LAN) or the server'],
      ['grows', 'grows', 'tunnel works &rarr; look at the application / server'],
    ])

    + '<h2>Configuration</h2>'
    + cb('FortiOS CLI', `show vpn ipsec phase1-interface TUN_PARTNER
show vpn ipsec phase2-interface              # all phase 2 selectors
show firewall policy | grep -f TUN_PARTNER   # policies using the tunnel interface`)
    + co('p', '&#x2139;&#xFE0F;', 'Route-based VPN needs three things', '<strong>1)</strong> phase 1 + phase 2 up, <strong>2)</strong> a <strong>route</strong> to the remote subnet via the tunnel interface, <strong>3)</strong> <strong>firewall policies</strong> LAN &rarr; tunnel (and tunnel &rarr; LAN for the return direction). Phase 2 selectors do <em>not</em> create routes on a site-to-site tunnel.')

    + '<h2>IKE debug</h2>'
    + cb('FortiOS CLI', `diagnose vpn ike log filter rem-addr4 203.0.113.83   # FortiOS 7.4+  (older: diagnose vpn ike log-filter dst-addr4 …)
diagnose debug application ike -1
diagnose debug console timestamp enable
diagnose debug enable
# … bring the tunnel up / wait …
diagnose debug disable
diagnose debug reset
diagnose vpn ike restart                     # careful: restarts IKE for ALL tunnels in the VDOM`)
    + tbl(['Seen in IKE debug', 'Typical cause'], [
      ['<code>no proposal chosen</code>', 'encryption/DH/PRF mismatch in phase 1 or 2'],
      ['<code>AUTHENTICATION_FAILED</code>, <code>auth … failed</code>', 'PSK / certificate / peer ID mismatch'],
      ['<code>TS_UNACCEPTABLE</code>', 'phase 2 selectors (subnets) do not match'],
      ['<code>negotiation timeout</code>, no response', 'peer unreachable, UDP 500/4500 blocked, wrong peer IP'],
    ])

    + '<h2>Case: traffic to the remote subnet goes to the underlay, not into the tunnel</h2>'
    + '<div class="flow">'
    + '<div class="fs"><div class="fsn">1</div><div class="fsb"><div class="fst">Symptom</div>'
    + '<p>Server 10.1.60.23 (Zabbix, TCP 10051) cannot reach 198.51.100.247 behind the partner tunnel. Tunnel is up, but <code>enc/dec</code> counters for the flow stay at zero.</p></div></div>'
    + '<div class="fs"><div class="fsn">2</div><div class="fsb"><div class="fst">Sniffer shows where the SYN leaves</div>'
    + cb('sniffer verbosity 4', `LAN-INFRA  in  10.1.60.23.55628 -> 198.51.100.247.10051: syn
...
WAN-A      out 10.1.60.23.55628 -> 198.51.100.247.10051: syn
AGG-PO4    out 10.1.60.23.55628 -> 198.51.100.247.10051: syn
port3      out 10.1.60.23.55628 -> 198.51.100.247.10051: syn    <- leaves in clear text via the physical port`)
    + '</div></div>'
    + '<div class="fs"><div class="fsn">3</div><div class="fsb"><div class="fst">Routing table explains it</div>'
    + cb('FortiOS CLI', `get router info routing-table details 198.51.100.247
S*  0.0.0.0/0 [10/0] via 100.64.20.249, WAN-A, [1/0]     <- only the default route matches`)
    + '<p>No specific route for the remote subnet &rarr; the default route sends it to the underlay (the physical network the tunnel itself runs over) instead of into the IPsec tunnel on top of it.</p></div></div>'
    + '<div class="fs"><div class="fsn">4</div><div class="fsb"><div class="fst">Fix: static route via the tunnel interface</div>'
    + cb('FortiOS CLI', `config router static
    edit 0
        set dst 198.51.100.0 255.255.255.0
        set device "TUN_PARTNER"
        set comment "partner subnet via IPsec"
    next
end`)
    + co('t', '&#x2714;', 'Best practice: add a blackhole backup', 'So the traffic is dropped (not leaked to the underlay in clear text) when the tunnel goes down:'
      + '<br><code>config router static / edit 0 / set dst 198.51.100.0 255.255.255.0 / set blackhole enable / set distance 254 / next / end</code>')
    + '</div></div>'
    + '<div class="fs"><div class="fsn">5</div><div class="fsb"><div class="fst">Verify</div>'
    + cb('FortiOS CLI', `get router info routing-table details 198.51.100.247       # now via TUN_PARTNER
diagnose sniffer packet TUN_PARTNER "host 10.1.60.23" 4    # SYNs now enter the tunnel
diagnose vpn tunnel list name TUN_PARTNER | grep pkts      # enc AND dec growing`)
    + '<p>Also check a firewall policy LAN &rarr; TUN_PARTNER exists, otherwise debug flow shows <code>policy 0</code> deny once the route is fixed.</p>'
    + '</div></div>'
    + '</div>'
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// FortiGate — CLI quick reference
// ═══════════════════════════════════════════════════════════════════
function pgFGCLI() {
  const rows = [
    ['Context', 'config vdom → edit <VDOM>', 'enter a VDOM'],
    ['Context', 'config global', 'global settings'],
    ['System', 'get system status', 'version, serial, HA mode, VDOM mode'],
    ['System', 'get system performance status', 'CPU, memory, sessions'],
    ['System', 'diagnose sys session filter dst <ip> → diagnose sys session list', 'live sessions for a flow'],
    ['System', 'get system ha status', 'HA cluster state'],
    ['Interfaces', 'diagnose netlink interface list', 'kernel interface list'],
    ['Interfaces', 'get system arp', 'ARP table'],
    ['Routing', 'get router info routing-table all', 'routing table'],
    ['Routing', 'get router info routing-table details <ip>', 'route used for one destination'],
    ['Routing', 'get router info bgp summary', 'BGP neighbors'],
    ['Test', 'execute ping-options source <ip> → execute ping <ip>', 'ping from a chosen source'],
    ['Debug', 'diagnose debug flow filter addr <ip> … trace start 20 … debug enable', 'packet path + policy decision'],
    ['Debug', 'diagnose sniffer packet any "host <ip>" 4', 'capture with interface names'],
    ['VPN', 'get vpn ipsec tunnel summary', 'all tunnels, selectors up'],
    ['VPN', 'diagnose vpn ike gateway list name <tun>', 'phase 1'],
    ['VPN', 'diagnose vpn tunnel list name <tun>', 'phase 2, counters'],
    ['VPN', 'diagnose debug application ike -1', 'IKE negotiation debug'],
    ['Cleanup', 'diagnose debug disable → diagnose debug reset', 'always at the end'],
  ];
  return '<div class="ph"><div class="pt">FortiGate &mdash; CLI quick reference</div>'
    + '<div class="ps">The commands from the other Fortinet pages on one screen</div>'
    + '<div class="tags">' + tag('ta', 'Fortinet') + tag('ta', 'FortiOS') + tag('tb', 'CLI') + '</div></div>'
    + '<div class="content">'
    + tbl(['Area', 'Command', 'Purpose'], rows.map(r => [r[0], '<code>' + esc(r[1]) + '</code>', r[2]]))
    + '<p>Details: <a href="#fortinet/fg/tshoot">Troubleshooting toolbox</a> &middot; <a href="#fortinet/vpn/ipsec">IPsec VPN</a></p>'
    + '</div>';
}

Object.assign(RENDERERS, {
  'fortinet/fg/tshoot': pgFGTshoot,
  'fortinet/vpn/ipsec': pgFGIPsec,
  'fortinet/cli/commands': pgFGCLI,
});

IDX.push(
  { t: 'FortiGate config vdom / edit VDOM', p: 'fortinet/fg/tshoot', k: 'fortigate fortios vdom config global virtual domain', v: 'config vdom → edit <VDOM>' },
  { t: 'FortiGate debug flow', p: 'fortinet/fg/tshoot', k: 'diagnose debug flow filter trace policy 0 deny reverse path', v: 'diagnose debug flow filter addr … trace start 20' },
  { t: 'FortiGate packet sniffer', p: 'fortinet/fg/tshoot', k: 'diagnose sniffer packet verbosity 4 interface capture tcpdump', v: 'diagnose sniffer packet any "host X and port Y" 4' },
  { t: 'FortiGate ping with source', p: 'fortinet/fg/tshoot', k: 'execute ping-options source traceroute', v: 'execute ping-options source <ip>; execute ping <dst>' },
  { t: 'FortiGate routing table', p: 'fortinet/fg/tshoot', k: 'get router info routing-table all details distance priority', v: 'get router info routing-table details <ip>' },
  { t: 'FortiGate IPsec tunnel status', p: 'fortinet/vpn/ipsec', k: 'get vpn ipsec tunnel summary selectors ike gateway list tunnel list', v: 'selectors(total,up), phase 1 / phase 2 status' },
  { t: 'FortiGate IPsec enc/dec counters', p: 'fortinet/vpn/ipsec', k: 'enc dec pkts counters tunnel list grep', v: 'enc grows + dec 0 = remote side not answering' },
  { t: 'Traffic to underlay instead of tunnel', p: 'fortinet/vpn/ipsec', k: 'default route underlay ipsec static route tunnel interface blackhole', v: 'Add static route via tunnel interface + blackhole backup' },
  { t: 'FortiGate IKE debug', p: 'fortinet/vpn/ipsec', k: 'diagnose debug application ike no proposal chosen ts_unacceptable', v: 'diagnose debug application ike -1' },
);
