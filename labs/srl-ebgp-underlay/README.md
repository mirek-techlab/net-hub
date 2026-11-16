# Lab: SR Linux eBGP underlay (leaf-spine)

Small leaf-spine fabric on Nokia SR Linux in containerlab: 2 spines, 2 leaves, 2 Linux clients,
eBGP underlay in the style of RFC 7938. Goal: learn SR Linux CLI and model-driven config on a
design I already know from other vendors, then break it on purpose and watch convergence.

Study notes: NET_HUB › Edu › Nokia DCF › topic o3.1 (`edu/nokia/o3.1.js`).

**Status:** prepared, not yet run. Sections marked _TODO_ get filled from real output.

## Topology

```
        spine1 (AS65100)        spine2 (AS65100)
          |        \              /        |
          |         \            /         |
        leaf1 (AS65001)        leaf2 (AS65002)
          |                                |
       client1 10.11.0.10           client2 10.12.0.10
```

| Item | Value |
|---|---|
| NOS | Nokia SR Linux container, free image `ghcr.io/nokia/srlinux`, type `ixr-d2l` |
| Clients | `ghcr.io/hellt/network-multitool` (Linux) |
| Underlay | eBGP, spines share AS 65100, each leaf its own AS |
| Routing policy | permissive `all` (accept) as import + export — lab only |
| Licence | none — datapath limited to 1000 PPS, `sr_linux` restarts once a week (containerlab docs) |

Details: [docs/addressing.md](docs/addressing.md), [docs/routing-design.md](docs/routing-design.md).

## Repository layout

```
srl-ebgp-underlay/
├── README.md
├── topology.clab.yml        containerlab topology (links carry the interface IPs)
├── configs/                 startup configs, SR Linux CLI format
│   ├── spine1.cli  spine2.cli
│   └── leaf1.cli   leaf2.cli
├── docs/
│   ├── addressing.md
│   └── routing-design.md
└── testing/
    ├── verification.md      BGP up, routes, client-to-client reachability
    └── failover-testing.md  link / spine failures, measured loss
```

## Run it

Prerequisites: Linux host with Docker and containerlab (https://containerlab.dev/install/).

```bash
sudo containerlab deploy -t topology.clab.yml     # start
ssh admin@clab-srl-ebgp-leaf1                      # default password NokiaSrl1!
sudo containerlab destroy -t topology.clab.yml     # stop and clean up
```

Resource note [derived, not measured]: Nokia's RT5 L3 EVPN tutorial (3 SR Linux + 4 small
containers) lists 2 vCPU / 8 GB. This lab has 4 SR Linux nodes, so expect a bit more.
A 16 GB laptop should be enough. Measure and write the real numbers here: _TODO_.

## Results

_TODO after the first run_ — BGP state, route tables, ping client1 ↔ client2, failover numbers.
Write what was measured, not what was expected (no "hitless failover" unless the capture shows it).

## Sanitisation

Lab-only addressing (10.x). No real hostnames, customers or credentials except the public
SR Linux lab default.
