# Addressing

| Link | Side A | IP A | Side B | IP B |
|---|---|---|---|---|
| spine1 – leaf1 | spine1 e1-1 | 10.0.1.0/31 | leaf1 e1-1 | 10.0.1.1/31 |
| spine1 – leaf2 | spine1 e1-2 | 10.0.1.2/31 | leaf2 e1-1 | 10.0.1.3/31 |
| spine2 – leaf1 | spine2 e1-1 | 10.0.2.0/31 | leaf1 e1-2 | 10.0.2.1/31 |
| spine2 – leaf2 | spine2 e1-2 | 10.0.2.2/31 | leaf2 e1-2 | 10.0.2.3/31 |
| leaf1 – client1 | leaf1 e1-3 | 10.11.0.1/24 | client1 eth1 | 10.11.0.10/24 |
| leaf2 – client2 | leaf2 e1-3 | 10.12.0.1/24 | client2 eth1 | 10.12.0.10/24 |

| Node | AS | Router ID |
|---|---|---|
| spine1 | 65100 | 10.255.0.1 |
| spine2 | 65100 | 10.255.0.2 |
| leaf1 | 65001 | 10.255.0.11 |
| leaf2 | 65002 | 10.255.0.12 |

Interface IPs come from the `ipv4:` fields in `topology.clab.yml` (containerlab writes them into
subinterface 0). Management network is containerlab's default (172.20.20.0/24).
Clients have a static route `10.0.0.0/8 via <leaf>` on eth1, set by `exec` in the topology.
