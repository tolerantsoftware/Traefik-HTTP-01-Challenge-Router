# Org script from https://bun.sh/guides/ecosystem/docker

# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
# install with --production (exclude devDependencies)
COPY package.json bun.lockb .
RUN bun install --production

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /usr/src/app/node_modules ./node_modules
COPY . .

# run the app
# DISABLED: Causes permission issues
# USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "start"]
