ARG BUILD_DIR=/build

# Client Build Container
FROM --platform=$BUILDPLATFORM python:3.11-slim-bullseye AS build

ARG BUILD_DIR

RUN mkdir ${BUILD_DIR}
WORKDIR ${BUILD_DIR}

RUN apt update && apt install -y npm

COPY package.json package-lock.json .htmlnanorc ./
RUN npm ci

COPY client ./client
RUN npm run build

# Pipenv Build Container
FROM python:3.11-alpine3.19 as pipenv-build

ARG BUILD_DIR

ENV APP_PATH=/app

RUN apk add --no-cache build-base rust cargo libffi libffi-dev libssl3 openssl-dev

RUN pip install --no-cache-dir pipenv

WORKDIR ${APP_PATH}

COPY LICENSE Pipfile Pipfile.lock ./
RUN mkdir .venv
RUN pipenv install --deploy --ignore-pipfile && \
    pipenv --clear

# Runtime Container
FROM python:3.11-alpine3.19

ARG BUILD_DIR

ENV PUID=1000
ENV PGID=1000

ENV APP_PATH=/app
ENV FLATNOTES_PATH=/data

RUN mkdir -p ${APP_PATH}
RUN mkdir -p ${FLATNOTES_PATH}

RUN apk add --no-cache su-exec libssl3 libgcc curl

WORKDIR ${APP_PATH}

COPY server ./server
COPY --from=build ${BUILD_DIR}/client/dist ./client/dist
COPY --from=pipenv-build ${APP_PATH}/.venv/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/

VOLUME /data
EXPOSE 8080/tcp
HEALTHCHECK --interval=60s --timeout=10s CMD curl -f http://localhost:8080/health || exit 1

COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh
ENTRYPOINT [ "/entrypoint.sh" ]
