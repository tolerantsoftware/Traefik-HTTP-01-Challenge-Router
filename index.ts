import { serve } from 'bun';

interface Router {
  name: String;
  rule: String;
  provider: 'internal' | 'docker';
  service: String;
}

interface Service {
  loadBalancer: {
    servers: Array<1>;
  };
  name: String;
  provider: 'internal' | 'docker';
  type: 'loadbalancer';
}

serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    // Extract path from the current URL path
    const url = new URL(req.url);
    const traefikInstances = url.pathname.split('/');
    traefikInstances.shift();

    if (!traefikInstances.length || traefikInstances[0] === '') {
      const message = `No Traefik FQDN provided! Example: "${url}traefik.server1.example.com/traefik.server2.example.com"`;
      const status = 400;
      console.error(message, status);
      return new Response(message, { status });
    }

    const routers = {};
    const services = {};

    for await (const traefikEndpoint of traefikInstances) {
      // send API request to traefik to get router and service details
      const responseRouters = await fetch(
        `${process.env.HTTPS === 'true' ? 'https' : 'http'}://${traefikEndpoint}/api/http/routers`
      );

      if (!responseRouters.ok) {
        const message = `Unable to access Traefik API server, is it reachable?\n${
          responseRouters ? `${responseRouters.statusText} - ` : ''
        }${traefikEndpoint}`;
        const status = responseRouters ? responseRouters.status : 500;
        console.error(message, status);
        return new Response(message, { status });
      }

      const routersRaw = await responseRouters.json();

      const joinName = (input: String) =>
        `${input.split('@')[0]}_${traefikEndpoint.replaceAll('.', '_')}`.replaceAll('-', '_');

      // compile data for the routing traefik to understand
      // routers
      routersRaw
        .filter((router: Router) => router.provider === 'docker')
        .forEach((router: Router) => {
          const routerName = joinName(router.name);
          routers[routerName] = {
            service: traefikEndpoint,
            rule: `${router.rule} && PathPrefix(\`/.well-known/acme-challenge/\`)`,
          };
        });

      // service
      services[traefikEndpoint] = {
        loadBalancer: {
          servers: [{ url: `http://${traefikEndpoint}:80` }],
        },
      };
    }

    const finalConfig = {
      http: {
        services,
        routers,
      },
    };

    // send response
    return new Response(JSON.stringify(finalConfig), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
});
