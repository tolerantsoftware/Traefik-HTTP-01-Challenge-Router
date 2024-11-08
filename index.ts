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
    // Extract sessionID from the current URL path
    const url = new URL(req.url);

    const fqdn = url.pathname.split('/')[1];
    if (!fqdn)
      return new Response(
        `No Traefik FQDN provided! Example: "${`${url}`.replace(
          'http:',
          'https:'
        )}traefik.somehostname.example.com"`,
        { status: 400 }
      );

    // send API request to traefik to get router and service details
    const traefikEndpoint = `${process.env.APIPREFIX}.${fqdn}`;
    let responseServices;
    let responseRouters;
    try {
      const protocol = process.env.HTTPS === 'true'  ? 'https' : 'http'
      responseServices = await fetch(`${protocol}://${traefikEndpoint}/api/http/services`);
      responseRouters = await fetch(`${protocol}://${traefikEndpoint}/api/http/routers`);
    } catch (error) {
      return new Response(`Unable to access Traefik API server, is it reachable?\n\n${error}`, { status: 500 });
    }
    
    const routersRaw = await responseRouters.json();
    const servicesRaw = await responseServices.json();

    const joinName = (input: String) => `${input.split('@')[0]}_${fqdn.replaceAll('.', '_')}`.replaceAll('-', '_');
    
    // compile data for the main traefik to understand
    const routers = {};    
    routersRaw.filter((router: Router) => router.provider === 'docker')
      .forEach((router: Router) => {
        const routerName = joinName(router.name);
        const serviceName = joinName(router.service);
        routers[routerName] = {
          service: serviceName,
          rule: router.rule
        }
      });

    const services = {};
    servicesRaw.filter((service: Service) => service.provider === 'docker' && service.type === 'loadbalancer')
    .forEach((service: Service) => {
      const serviceName = joinName(service.name);
      services[serviceName] = {
        loadBalancer: {
          servers: [
            { url: `http://${traefikEndpoint}:80` }
          ]
        },
      }
    });

    const finalConfig = {
      http: {
        services,
        routers
      }
    }


    // send response
    return new Response(JSON.stringify(finalConfig), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
});
