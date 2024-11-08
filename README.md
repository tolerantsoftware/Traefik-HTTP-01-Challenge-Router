# Traefik HTTP-01 Router

Specifically made for the Docker provider.

## How it works

```mermaid
%%{ init: { 'flowchart': { 'curve': 'linear', 'defaultRenderer': 'elk' } } }%%
flowchart TB
    LE((Let's Encrypt))
    fw[[Firewall]]
    client((Clients))
    subgraph Routing Server
        traefik-routerMiddleware[/"Router Middleware<br>(this project)"/]
        traefik-router[/"Traefik - Routing Instance<br>(Routes HTTP-01 Challenge)"/]
        traefik-app[/"Traefik - Main Instance<br>(For Apps on routing Server - Optional)"/]
    end
    server-1["Some other app-server with Traefik"]

    LE -->|80<br>HTTP-01 Challenge| fw -->|81<br>HTTP-01 Challenge| traefik-router
    client -.->|80+443<br>App access| traefik-app & server-1
    traefik-router -->|80<br>HTTP-01 Challenge| traefik-app & server-1
    traefik-router <-->|3000<br>Dynamic Conf| traefik-routerMiddleware
    traefik-routerMiddleware -->|443<br>API GET Req| traefik-app & server-1
```

## Dev setup

> This Project uses [bun](https://bun.sh/).

1. To install dependencies:

```bash
bun install
```

2. To run:

```bash
bun start
```
