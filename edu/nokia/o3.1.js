// edu/nokia/o3.1.js — Nokia DCF: configure and verify interfaces and routing protocols (SR Linux CLI)
// Hands-on lab: labs/srl-ebgp-underlay/ (containerlab topology, configs, tests)
eduTopic('nokia', 'o3.1', {
  updated: '2026-11-16',
  summary: 'SR Linux basics through a small eBGP leaf-spine underlay: interfaces, network-instance, BGP groups, routing policy and verification.',

  body: `
## Getting SR Linux
- The SR Linux container image is free to pull, no registration or licence: \`docker pull ghcr.io/nokia/srlinux\` [documented][1]
- Without a licence it emulates the 7220 IXR types; datapath is limited to 1000 PPS and \`sr_linux\` restarts once a week [documented][1]
- containerlab kind is \`nokia_srlinux\`; default type \`ixr-d2l\`; default login \`admin\` / \`NokiaSrl1!\` [documented][1]

## Config model — what is different from IOS
- Model-driven (YANG). Changes go into a candidate and are applied with commit, e.g. \`enter candidate\` ... \`commit now\` [documented][2]
- Routing lives inside a **network-instance**. \`network-instance default\` is the global table (≈ IOS global RIB); other instances ≈ VRFs [derived]
- Interfaces are \`ethernet-1/N\` (line card 1, port N); IP addresses sit on a **subinterface**, e.g. \`ethernet-1/1.0\`, and the subinterface must be added to a network-instance [documented][1]
- \`info\` shows config at the current level; \`info flat\` prints it as \`set\` lines (like Junos display set) [documented][1]
- Saving: running config lives in memory; \`tools system configuration save\` writes the startup config [documented][1]

## BGP underlay (RFC 7938 style)
- Nokia's tutorials use eBGP as the fabric underlay for simplicity, scale and multi-vendor interop [documented][2]
- An eBGP peer needs import/export policy to advertise and install routes; the tutorials use a permissive policy \`all\` with default-action accept [documented][2]
- Peers are grouped: common settings (peer-as, policies, address family) in a **group**, neighbors reference it with \`peer-group\` [documented][2]
- Newer releases use \`afi-safi ipv4-unicast { admin-state enable }\` and list syntax \`export-policy [ all ]\` [documented][3][4]
- In the lab both spines share one AS and every leaf has its own AS — leaf-to-leaf AS path \`65100 650xx\` [derived]

## Minimal leaf config (from the lab)
\`\`\`
routing-policy {
    policy all {
        default-action {
            policy-result accept
        }
    }
}
network-instance default {
    interface ethernet-1/1.0 {
    }
    protocols {
        bgp {
            admin-state enable
            autonomous-system 65001
            router-id 10.255.0.11
            group spines {
                peer-as 65100
                export-policy [ all ]
                import-policy [ all ]
                afi-safi ipv4-unicast {
                    admin-state enable
                }
            }
            neighbor 10.0.1.0 {
                peer-group spines
            }
        }
    }
}
\`\`\`
The interface IPs in the lab come from containerlab link addressing (it configures subinterface 0) [documented][1]

## Cisco mental map [derived]
- \`network-instance default\` ≈ global routing table; \`network-instance <name>\` ≈ VRF
- \`group\` ≈ peer-group / template; \`neighbor ... peer-group\` ≈ \`neighbor x peer-group y\`
- policy \`all\` accept ≈ route-map permit everything — fine in a lab, never in production

## To find out in the lab
- ECMP: does a leaf install both spine paths by default? [derived] — check the route table
- Failover: lost packets for interface-down vs silent failure (BGP timers) — results in the lab's testing/failover-testing.md
`,

  sources: [
    { id: 1, title: 'containerlab — Nokia SR Linux kind', url: 'https://containerlab.dev/manual/kinds/srl/' },
    { id: 2, title: 'learn.srlinux.dev — L2 EVPN tutorial, fabric (underlay) configuration', url: 'https://learn-srlinux.pages.dev/tutorials/l2evpn/fabric' },
    { id: 3, title: 'learn.srlinux.dev — L2 EVPN tutorial, EVPN (afi-safi syntax)', url: 'https://learn-srlinux.pages.dev/tutorials/l2evpn/evpn' },
    { id: 4, title: 'learn.srlinux.dev — RT5 L3 EVPN tutorial, underlay', url: 'https://learn-srlinux.pages.dev/tutorials/l3evpn/rt5-only/underlay' },
    { id: 5, title: 'Nokia — Data Center Fabric Fundamentals course outline', url: 'https://nokia.com/networks/training/dcf/self-paced/data-center-fabric-fundamentals/' },
  ],

  commands: [
    { cmd: 'sudo containerlab deploy -t topology.clab.yml', d: 'start the lab', tags: ['containerlab'], k: 'bring up lab', grp: 'lab', lang: 'bash' },
    { cmd: 'sudo containerlab destroy -t topology.clab.yml', d: 'stop and remove the lab', tags: ['containerlab'], k: 'tear down lab', grp: 'lab', lang: 'bash' },
    { cmd: 'sudo containerlab inspect -t topology.clab.yml', d: 'list nodes, state and mgmt IPs', tags: ['containerlab'], k: 'which nodes are up, mgmt address', grp: 'lab', lang: 'bash' },
    { cmd: 'sudo containerlab save -t topology.clab.yml', d: 'save running config on all SR Linux nodes', tags: ['containerlab', 'srlinux'], k: 'keep my lab config', grp: 'lab', lang: 'bash' },
    { cmd: 'docker exec -it <container> sr_cli', d: 'open the SR Linux CLI of a lab node', tags: ['containerlab', 'srlinux'], k: 'get into the switch', grp: 'lab', lang: 'bash' },
    { cmd: 'enter candidate', d: 'start editing the candidate config', tags: ['srlinux'], k: 'config mode, like conf t', grp: 'config', lang: 'SR Linux' },
    { cmd: 'commit now', d: 'apply the candidate to running', tags: ['srlinux'], k: 'apply changes', grp: 'config', lang: 'SR Linux' },
    { cmd: 'info flat', d: 'current config level as set-style lines', tags: ['srlinux'], k: 'show run | display set', grp: 'config', lang: 'SR Linux' },
    { cmd: 'tools system configuration save', d: 'write running config to startup', tags: ['srlinux'], k: 'wr mem', grp: 'config', lang: 'SR Linux' },
    { cmd: 'show network-instance default protocols bgp neighbor', d: 'BGP peers and state (verify on your version)', tags: ['srlinux'], k: 'show bgp summary', grp: 'verify', lang: 'SR Linux' },
    { cmd: 'show network-instance default route-table ipv4-unicast summary', d: 'IPv4 routing table of the global instance (verify on your version)', tags: ['srlinux'], k: 'show ip route', grp: 'verify', lang: 'SR Linux' },
  ],

  links: ['theory/routing/bgp', 'cisco/iosxe/routing', 'cisco/aci/theory'],
});
